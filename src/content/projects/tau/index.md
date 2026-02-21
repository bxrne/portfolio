---
title: Designing Tau, a Temporal Database from Scratch
date: 2026-02-21
description: Timeseries database written in Zig, introducing a new paradigm for the organisation and relationships of timeseries data using an actor based concurrency runtime.
repoURL: "https://github.com/bxrne/tau"
---

Tau began with a straightforward question: what happens if we make time the foundational element of the data model, not an afterthought column?

Every value in Tau exists only at a specific time. There is no assumed continuity and no automatic interpolation. If no value is stored at a timestamp, the result is absent, explicitly.

This is not a layer added on top. It is baked into the model, storage, wire protocol, concurrency, and testing from the start.

## Modeling Data As Series Over Time

A series is a typed partial function:

`Series(T): timestamp -> T | null`

Each series lives within its own `TimeDomain`. Storage is append-only, and timestamps are strictly monotonic within each segment. Point lookups use binary search over sorted timestamp arrays: simple, predictable, and efficient.

This avoids the hidden assumptions common in time-series databases where application code enforces temporal semantics. In Tau, those semantics are part of the type system and runtime behavior.

## Explicit Commands, No Full Query Language

Tau has no SQL dialect and no custom query planner. Instead, it exposes a small set of clear operations:

- `create_series`, `drop_series`
- `append_point`, `query_point`
- `create_lens`, `drop_lens`, `query_lens`, `compose_lens`, `list_lenses`

This is a deliberate scope choice. A constrained command surface means:

- Every operation has predictable cost and payload shape.
- The wire protocol stays compact and easy to implement.
- Testing targets a finite set of opcodes and state transitions.

Compatibility aliases (`create`, `append`, etc.) exist for convenience, but `snake_case` is canonical.

## Lenses: Compositional Views Without Mutation

Mutations are rare in temporal systems. History should stay immutable. Tau uses lenses instead.

A `Lens(In, Out)` is a pure, lazy transformation applied at query time. It references source data without copying or materializing anything new. Composition lets you build complex views (unit conversions, financial returns, offsets) by chaining simple functions.

This keeps write paths append-only and straightforward while allowing flexible read-time transformations.

## Storage: Columnar, Append-Only, mmap-Friendly

Data lives in columnar segment blocks:

- One contiguous array of timestamps
- One contiguous array of values

File-backed mode uses `mmap` for zero-copy access and `fdatasync` (or `io_uring` on Linux) for durability. The on-disk layout supports direct offset math, with no expensive object reconstruction after restart.

In-memory mode uses the same structure for consistency across backends.

## Actor Model For Concurrency

Concurrency is built around the actor model. Each series is its own actor:

- Private state
- Mailbox for incoming messages
- Single-threaded processing per actor

The server routes operations by series label to the correct mailbox. A worker pool handles messages. Because state is owned per series and never shared, different series execute in true parallel with no lock contention on data.

Only catalog metadata (creates/drops) requires narrow synchronization. This gives natural per-series ordering, cheap isolation, and excellent scaling for workloads with many independent time series.

The same ownership model also opens a clear path to distribution later: route mailboxes remotely instead of locally, while preserving ordering and semantics.

## Binary Protocol Over TCP

Tau uses a minimal binary protocol:

- 3-byte magic `TAU`
- `version`, `opcode`, `flags` (1 byte each)
- `u32` payload length
- fixed-layout binary payloads (32-byte labels, `i64` timestamps, `f64` values)

No JSON, no HTTP.

Benefits:

- Low parsing cost
- Predictable framing
- Trivial clients in any language with sockets

## REPL And Tooling

The built-in REPL uses only Zig stdlib. No readline, no external dependencies.

It runs single-threaded blocking I/O, which is ideal for exploration. Production clients should speak the protocol directly.

## Development Discipline

Tau follows Tiger Style principles as practiced by TigerBeetle:

- Deterministic simulation with replayable seeds
- Fault injection (network, storage) at configurable rates
- Heavy use of assertions to enforce invariants
- Bounded loops and explicit integer sizes (`u32`, `i64`, etc.) everywhere
- Zero external dependencies
- Compile-time configuration in `config.zig` (edit and rebuild)

This approach emphasizes correctness-first development: proactive design, simulation as the primary testing vehicle, and owning the full stack to eliminate classes of risk around dependencies and undefined behavior.

## Benchmarks Under Real Pressure

Benchmarks measure not just happy-path latency, but system pressure: RSS, page faults, and context switches via `getrusage`.

Scenarios include ingest/query rates, lens overhead, and fault injection, giving a fuller picture of behavior under load.

## In Summary

Tau is built around a few clear opinions:

- Time is the primitive; no timeless data.
- Commands are explicit and finite.
- Protocol is binary and minimal.
- State is partitioned by actor ownership.
- Transformations happen through lazy lens composition.
- Testing is deterministic simulation-first.
- The system uses Zig stdlib only.

These are not universal best practices. They are choices that make a temporal engine easier to reason about, test under faults, and evolve without surprises.

Repo: `github.com/bxrne/tau`

Released `v1.0.0` — February 21, 2026
