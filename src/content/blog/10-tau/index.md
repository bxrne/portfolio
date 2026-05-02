---
title: "tau: data as typed functions of time"
description: "Why I designed tau's data model around partial functions and an actor-per-series runtime"
date: "Feb 21 2026"
demoURL: "#"
repoURL: "https://github.com/bxrne/tau"
---

> Most timeseries databases are tables that happen to be sorted by a timestamp column. tau starts from the other side: a series is a function, and the database is the place those functions live.

## The premise

Pick up most timeseries databases, Influx, Timescale, even Prometheus, and the underlying picture is the same: rows in a table, indexed by `(series_id, timestamp)`. Whatever query language sits on top eventually compiles down to "scan a sorted column and aggregate". Time is a coordinate.

[tau](https://github.com/bxrne/tau) is built on a different reading. Time is not a coordinate, it's the domain of the function. A series is a partial function `S_T : ℤ ⇀ T` from integer nanoseconds since epoch to a typed value, and the database is a runtime for those functions. Operations like unit conversions or returns aren't queries; they're morphisms over the function.

This isn't dressing-up. It changes how the storage engine, the query model, and the runtime are organised.

## Partial functions, not sparse tables

The core type, in `src/core/entities.zig`, is straightforward:

```zig
pub const Timestamp = i64; // nanoseconds since epoch

pub const TimeDomain = struct {
    start: Timestamp,
    end:   Timestamp,
};

pub fn Series(comptime T: type) type {
    return struct {
        label:   [32]u8,
        domain:  TimeDomain,
        segments: std.ArrayListUnmanaged(SegmentType),
        // ...
        pub fn at(self: *const Self, timestamp: Timestamp) ?T { /* ... */ }
    };
}
```

`at` returns `?T`. Not `T` with a sentinel. Not interpolated. Not "last value seen". If there is no observation at that timestamp, you get `null`, full stop. The mathematical model is a partial function: `S_T(τ) = v_i` when there exists an `i` such that `t_i = τ`, and `S_T(τ) = ⊥` (undefined) otherwise.

The reason this matters: the moment a database starts inventing values for timestamps you didn't write, you've lost the ability to distinguish "no data" from "zero" from "previous value still holds". Every analytic that runs on top has to either know which interpolation rule was applied or stop trusting the answer. tau pushes that decision back to the caller. Want last-value-carry-forward? You write that lens explicitly, and it's a function from `?T` to `T` that you can read.

The `domain: TimeDomain` field is a fast pre-filter: any timestamp outside `[start, end]` is rejected without touching segment data. It's not metadata about what's in the series, it's an existential bound on what the function is even defined over.

## Comptime generics make this cheap

Because `Series(T)` is a Zig comptime generic, every series is monomorphised to its element type. The compiler knows the size of `T` at every callsite. The columnar segments, two contiguous arrays, `times: []Timestamp` and `values: []T`, pack tightly with no interleaving and no per-element indirection.

```zig
pub fn Segment(comptime T: type) type {
    return struct {
        times:  []Timestamp,
        values: []T,
        count:  u32,
        // ...
    };
}
```

Point lookup is O(log n) binary search over `times`. The values array is never touched until a hit is confirmed. The min/max timestamps are stored in the segment header, so `contains(ts)` rejects out-of-range queries without looking at the array at all.

A series is a list of segments, default cap 1M points each, so writes never have to rewrite a giant buffer. Lookups walk the segment list with the `contains()` early exit and binary-search inside the matching one.

## Lenses are morphisms

If a series is a function, the natural thing to compose with it is another function. tau calls these **lenses**:

```zig
pub fn Lens(comptime Out: type) type {
    return struct {
        context:     *const anyopaque,
        at_function: *const fn (*const anyopaque, Timestamp) ?Out,

        pub fn init(
            comptime In: type,
            source: *const Series(In),
            comptime transform: *const fn (In) Out,
        ) Self { /* ... */ }

        pub fn compose(
            self: *const Self,
            comptime NewOut: type,
            comptime new_transform: *const fn (Out) NewOut,
        ) Lens(NewOut) { /* ... */ }
    };
}
```

The construction is the bit of Zig I'm proudest of in the project. `init` builds an inline `Adapter` struct in comptime that captures the source `Series(In)` and the `transform` function, then erases both into `*const anyopaque` plus a function pointer. From the outside, `Lens(Out)` has one type. Inside, every lens is a specialised closure with no virtual dispatch, no allocation, and no copying of the underlying series.

A lens reflects mutations in its source automatically (there's a test for exactly that), because it's a view, not a snapshot. Composition is function composition lifted over the partial function: `f: A → B`, `g: B → C`, `lens.compose(C, g)` gives `Lens(C)` with `g ∘ f`. Null propagates, if the source returns `null` at a timestamp, the chain returns `null`.

The category laws hold trivially. That's not a flex, it's the *point*: if you respect the structure of a function-of-time, you get composition for free.

At the server boundary lenses get serialised as `LensExpr` metadata, a source label plus a transform enum, rather than function chains, because you can't ship Zig closures over a TCP socket. The currently-shipped transforms are the obvious ones: `celsius_to_fahrenheit`, `meters_to_feet`, `returns`, `log_return`, and friends. Composition at the server level rewrites the `LensExpr`, not the stored data.

## One actor per series

A read or write to one series should not be able to slow down a read or write to another. The conventional way to deliver that is sharding plus per-shard locks. tau uses an actor model instead.

```zig
pub const SeriesActor = struct {
    label:        [32]u8,
    mailbox:      Mailbox,
    series:       Series,
    file_backend: ?*FileBackend,
    is_alive:     std.atomic.Value(bool),
    processing:   std.atomic.Value(bool),
};
```

Every series gets a `SeriesActor`. The only shared lock in the system is an `RwLock` on the catalog's routing table, held shared on the read path, exclusive only when creating or dropping a series. Once a message is dispatched into an actor's mailbox, the worker that processes it acquires the actor with a CAS on `processing` rather than a mutex. There is no shared lock between two different series, ever.

Messages are a tagged union:

```zig
pub const Message = union(enum) {
    append:       struct { timestamp: Timestamp, value: f64, response: *ResponseSlot },
    query_point:  struct { timestamp: Timestamp,             response: *ResponseSlot },
    create:       struct { response: *ResponseSlot },
    drop:         struct { response: *ResponseSlot },
};
```

The `ResponseSlot` is the part that makes synchronous calls feel synchronous without a mutex on the response path. The caller posts a message with a pointer to its slot and blocks on `slot.wait()` (which parks on `std.Thread.Futex.wait`). The worker calls `slot.complete(result)`, which atomically stores the result and wakes the caller via `std.Thread.Futex.wake`. Lock-free, one-shot, and the caller pays for nothing while it sleeps.

The flow is: client pushes `(message, *slot)` into the actor's mailbox, futex-waits on the slot, a pool worker dequeues via `process_one()`, the actor performs the read or write, and `slot.complete()` wakes the client with the result. There is no shared lock between the client thread and the worker, and there is no shared lock between any two actors.

The `ActorPool` is just a fixed number of worker threads (default: CPU count) holding the routing table's read lock and walking the actor list, calling `process_one()` on each. There's a 1µs sleep when a pass finds no work. The catalog has a fallback: if the pool hasn't started yet, the API still works because the catalog itself drives `process_one()` inline. That's how the embedded mode (no server) tests run.

## File backend: mmap, page-aligned headers, comptime sanity

The on-disk format avoids serialisation overhead by being directly mmap-able. The layout is a 4096-byte header followed by `N × 8` bytes of timestamps and `N × @sizeOf(T)` bytes of values:

| Region | Size |
| --- | --- |
| Header | 4096 B (one page) |
| Timestamps | N × 8 B (`i64`) |
| Values | N × `@sizeOf(T)` B |

The header is 4096 bytes by design, one page, and a `comptime` assertion in the `extern struct` definition means the build *fails* if you change a field and forget to fix the padding. Magic, version, capacity, count, min/max timestamp, and an FNV-1a 64-bit checksum over everything in the header except itself.

```zig
const Header = extern struct {
    magic:         [8]u8 = file_backend_magic,  // "TAUFILE\0"
    version:       u32 = file_backend_version,
    capacity_max:  u32 = 0,
    count:         u32 = 0,
    min_timestamp: i64 = 0,
    max_timestamp: i64 = 0,
    checksum:      u64 = 0,
    _padding:      [4044]u8 = ...,
};
```

Open, mmap, validate magic + version + checksum, and the file is queryable. No deserialisation step. Restart is "rehydrate the actors from the data directory", which the catalog does automatically by scanning for `.tau` files.

Durability is `fdatasync` on a background path, with optional `io_uring` on Linux ≥5.1.

## Block-level compression for cold storage

The `codec.zig` module implements two complementary schemes per block of up to 1024 points, lifted from Facebook's Gorilla TSDB paper.

For timestamps: **delta-of-delta + ZigZag varint**. A regularly-sampled sensor at 1 kHz has constant deltas, so the second-order delta is zero almost everywhere, and zero ZigZag-encodes to a single byte. 100 timestamps with constant delta compress from 800 bytes to ≤116.

For `f64` values: **XOR with leading-zeros elimination**. Successive values are XOR'd; identical values compress to one byte; near-identical values strip leading zero bytes. 50 identical f64s compress from 400 bytes to ≤57.

Each `CompressedBlock` keeps `first_timestamp` and `last_timestamp` in the header, so binary-searching across compressed blocks doesn't decode anything. There's a separate `decode_timestamps()` path for searches that only need the time column, the value column stays packed.

## Configuration is code

There is no config file. There are no environment variables. Every tunable is in `src/config.zig`, and the file ends with this:

```zig
comptime {
    assert(server.port > 0);
    assert(server.port < 65535);
    assert(storage.label_length == 32);
    assert(storage.file_backend_header_size % 4096 == 0);
    // ...
}
```

Misconfiguration is a compile error. The default storage backend is selected by `pub const default_backend: Backend = .file;`, switch to `.segment` and recompile to get the in-memory variant. There is no runtime dispatch on the backend, no dynamic check on every read.

This sounds austere. In exchange, tau cannot start in a broken state, and the binary's behaviour is fully described by the source it was built from.

## Wire protocol: ten-byte header, no batching

The header is exactly 10 bytes: a three-byte magic (`'T'`, `'A'`, `'U'`), one byte of version, one byte of opcode, one byte of flags, and a four-byte big-endian payload length. Decoded with a single `read(10)` syscall, no allocation on the path.

One opcode per frame. No pipelining, no streaming. Payload max is 4 MiB, enforced at header decode before any payload bytes are read. The receive buffer is stack-allocated. There is no allocation on the header path.

This sounds primitive. The reasoning is that pipelining and batching only buy you anything if your back end is single-threaded enough that you need to amortise the cost of a request. tau's back end is per-series-actor concurrent, throughput comes from launching independent requests across the pool, not from packing them into the same TCP frame.

Authentication is a pre-shared 32-byte certificate compared in constant time with XOR-accumulate, ten lines that any reviewer can audit:

```zig
fn constant_time_equal(a: *const [32]u8, b: *const [32]u8) bool {
    var diff: u8 = 0;
    for (a, b) |byte_a, byte_b| { diff |= byte_a ^ byte_b; }
    return diff == 0;
}
```

## Testing it like a database

A storage engine is only as honest as its worst test. tau borrows TigerBeetle's deterministic simulation approach. The `src/sim/` directory runs a `StateMachine` that wraps a real `Series` against a shadow state, a sorted array that is the ground truth, and asserts they agree after every operation. A `FaultInjector` flips bits, drops writes, and returns errors at controlled rates measured in parts-per-million.

Four scenarios:

| Mode      | Duration  | Faults                                         |
| --------- | --------- | ---------------------------------------------- |
| `quick`   | 1 year    | none                                           |
| `standard`| 10 years  | mild (100 ppm write error)                     |
| `century` | 100 years | aggressive (10k ppm read err, 1k ppm bitflip)  |
| `chaos`   | 10 years  | chaos (100k ppm read/write, 50k ppm lost write)|

A SplitMix64 PRNG and a virtual `Clock` make every scenario reproducible from its seed. Failing seeds get logged so you can replay them deterministically. This is a different category of test from "does this assertion pass on a happy path?", it's "does the machine still behave when the disk is being mean?"

## Numbers (Intel i9-9980HK, ReleaseFast)

| Scenario                              | Throughput              |
| ------------------------------------- | ----------------------- |
| segment ingest                        | 105.6M points/s         |
| segment point query                   | 3.9M lookups/s          |
| segment lens query                    | 4.1M lookups/s          |
| parallel ingest (8 series)            | 109.6M points/s         |
| file-backed ingest                    | 197K points/s (fsync)   |
| protocol header roundtrip             | 1.55M iter/s            |
| auth verify (constant-time)           | 1.71B compares/s        |

The lens-query throughput being slightly *higher* than raw point query is a measurement artefact, what it really says is "the comptime-monomorphised lens path adds no measurable overhead on top of the raw lookup", which is the result I wanted.

## What's the point

You can build a perfectly good timeseries database without any of this. The market has several. What I wanted to know was: if you take the function-of-time framing seriously, all the way down through the storage layout and the runtime, do you get a system that's smaller, more honest about its semantics, and easier to compose with? I think yes. The model gives you partial functions that don't lie about missing data, lenses that compose by the same rules functions do, an actor runtime where contention is bounded by name (one series per actor), and a file format you don't have to deserialise.
