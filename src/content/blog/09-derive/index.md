---
title: "derive: an embeddable RDF quad store in Zig"
description: "Six permutation indexes, string interning, and a CRC-framed WAL"
date: "Apr 17 2026"
demoURL: "#"
repoURL: "https://github.com/bxrne/derive"
---

> A small embeddable RDF 1.1 quad store written in Zig, focused on a single basic graph pattern lookup rather than full SPARQL.

## Scope

Most RDF stores ship a full SPARQL engine: join planner, property paths, aggregation, an optimiser. That is the right shape if you need SPARQL. For workloads that only require quad insertion, deletion, and pattern lookup against a single basic graph pattern, much of that surface goes unused.

[derive](https://github.com/bxrne/derive) covers that smaller surface. It is an embeddable RDF 1.1 quad store written in Zig: subject, predicate, object, graph; add, remove, match, scan. There is no join planner, no property paths, no aggregation. Durability and indexing are present.

It uses zero third-party dependencies, only Zig's `std`.

## API

The public surface is small. A `Term` is a tagged union of IRI, blank node, or literal (with optional datatype and language tag). A `Quad` is `subject`, `predicate`, `object`, `graph`. A `Pattern` has the same shape with every field optional; any field left `null` is a wildcard.

```zig
var dataset = try RDFDataset.init(process, .memory, .contiguous);
defer dataset.deinit();

try dataset.addTriple(
    .{ .iri = "http://example.org/alice" },
    "http://example.org/knows",
    .{ .iri = "http://example.org/bob" },
);

var it = dataset.match(.{
    .s = .{ .iri = "http://example.org/alice" },
    .p = "http://example.org/knows",
});
while (it.next()) |quad| {
    std.debug.print("{s}\n", .{ dataset.resolve(quad.object.iri) });
}
```

`init` takes two configuration options: a `WalMode` (`.memory` or `.{ .journal = path }`) and an `IndexBacking` (`.contiguous` or `.tree`).

## String interning

Every IRI and literal is interned through a `StringPool`: an `ArenaAllocator` that owns the bytes, a hashmap from string to handle, and an `ArrayList` for handle-to-string lookup. A `Handle` is `enum(u32)`, a Zig newtype over `u32` that prevents accidental confusion with slot indices or arithmetic offsets.

After interning, the index keys are `[4]u32` tuples. String comparison and allocation are kept off the lookup path.

## Six indexes for one query plan

derive maintains every quad in six lexicographic orderings: three triples-only permutations (`spog`, `posg`, `ospg`) and three graph-prefixed permutations (`gspo`, `gpos`, `gosp`).

When a pattern arrives, `chooseScanPlan` scores all six by counting how many leading components are bound, then selects the longest. A pattern with `{s, p}` bound and `{o, g}` free uses `spog` and binary-searches to the start of the `(s, p, *, *)` range. A pattern with `{g}` bound uses `gspo`. A pattern with everything free skips the index and walks slot order directly.

This replaces a join planner. With only one basic graph pattern at a time, the question reduces to "which permutation gives the longest prefix scan?", which is a six-way comparison.

The cost is on the write side: every insert touches all six stores, giving a write amplification of six in exchange for predictable read performance across pattern shapes.

## Two backings, one interface

`Index` is parameterised by an `IndexBacking` enum and stores either six `ContiguousStore`s or six `TreeStore`s, never mixed.

`ContiguousStore` is a `std.ArrayList` of `[4]u32` keys held in sorted order. Inserts binary-search for the position and shift the tail (O(n) per insert). Scans iterate a contiguous slice.

`TreeStore` is a treap: a randomised BST where each node's priority comes from `std.hash.Wyhash` over its key. Insert and delete are O(log n) amortised. Priority determines tree shape, and `bubbleUp` restores the heap property after insert. Because the priority is derived from the key itself, removals do not reshuffle the structure unpredictably.

Both implement the same `insert / contains / remove / scan / clear / count` interface. The scan iterator is a Zig union:

```zig
pub const KeyScan = union(enum) {
    slice: struct { items: []const Key, position: usize },
    tree:  TreeStore.Iterator,
};
```

Tagged unions and `inline for` over enum tags handle the dispatch at compile time, with no virtual call.

## Tombstones and slot stability

The quads themselves live in a `QuadStore`, which is an `ArrayList(?Quad)` plus a free list. Deletes write `null` into the slot; the free list recycles it on the next insert. Slot indices remain stable for the lifetime of any in-flight iterator, so a `LiveQuadIterator` can walk physical slot order without taking a snapshot.

A separate `AutoHashMapUnmanaged([4]u32, usize)` maps the SPOG key to a slot index for O(1) dedup on insert. The store asserts (via `std.debug.assert`) that the key is absent before appending, since the dataset has already checked `contains` upstream.

## Durability: append-only log with running CRC

The WAL format:

| Section | Field | Size |
| --- | --- | --- |
| Header | magic `"DERW"` | 4 B |
| Header | version | 1 B |
| Header | CRC seed | 4 B (u32 LE) |
| Record | kind | 1 B |
| Record | payload length | 4 B (u32 LE) |
| Record | payload | N B |
| Record | running CRC32 | 4 B (u32 LE) |

Three record kinds: `commit`, `add_quad`, `remove_quad`. Two design decisions are worth noting:

The CRC is cumulative. Every record's CRC32 covers everything from the seed through the current payload, not just that record. Corruption or truncation anywhere in the journal trips the next checksum. On replay, the loop stops at the first bad checksum and truncates the file back to `last_valid_offset`.

Payloads encode strings, not handles. Handles are indices into the in-memory `StringPool` and are not stable across restarts. Encoding the strings themselves allows the pool to be rebuilt from the WAL on a cold start.

`replay` is generic over the target type and the add/remove callbacks (`anytype` with comptime error types), so the same function is used by `RDFDataset` at startup and by tests in isolation.

## Engine seam

`Engine` is a tagged union with one variant today:

```zig
pub const Engine = union(enum) {
    memory: Core,
    pub fn core(self: *Engine) *Core { ... }
};
```

`RDFDataset` accesses engine state only through `engine.core()`. A future file-backed variant can be added by extending the union, with no change to the public API.

## Benchmarking with LUBM

The `demo/` directory contains a [Lehigh University Benchmark](http://swat.cse.lehigh.edu/projects/lubm/) generator that emits about 8,500 quads per "university" using real RDF vocabularies, then runs six query shapes covering the different scan-plan branches: predicate-object scans, predicate-only scans, subject prefix scans, graph prefix scans, and a full slot walk. Two demo binaries (`demo/contiguous` and `demo/tree`) run the same workload against the two backings.

The WAL roundtrip is run separately, untimed, so journal I/O does not pollute the load numbers.

## Out of scope

No SPARQL parser, no joins, no property paths, no aggregation, no optimiser. Each is a real RDF use case that derive does not address; the project is scoped to the embeddable single-pattern lookup case.

derive is at v1.0.2. It is an experimental project rather than a production system.
