---
title: "derive"
description: "RDF 1.1 quad store in Zig with an indexed permutation model and an optional write-ahead log."
date: "Apr 17 2026"
repoURL: "https://github.com/bxrne/derive"
---

derive is an embedded RDF 1.1 quad store written in Zig. It stores quads as `(subject, predicate, object, named graph)`, interns every string once, deduplicates quads at insert time, and serves single basic graph pattern matches over an indexed permutation model. Durability is optional: an append-only write-ahead log with running CRC32 records gives crash recovery on open.

No dependencies outside the Zig standard library. No server, no driver, no planner.

## Quad model

Every quad is four `u32` handles into a string pool. The pool stores IRIs, blank node labels, and literal payloads once. The quad store keeps a growable array of optional quads, a free list that reuses vacated slots, a hash map from SPOG keys to slot indices for deduplication, and a live count. Deletes tombstone slots rather than compacting, which keeps slot indices stable for iterators.

## Indexed permutation model

The index keeps the same quad keys in six lexicographically sorted permutations: `spog`, `posg`, `ospg`, `gspo`, `gpos`, `gosp`. Each permutation holds a run of sorted 16-byte keys encoded in that permutation's order.

`chooseScanPlan` scores every permutation by the length of the bound prefix when the pattern's components appear in that permutation's order. Longest prefix wins. Ties break in a fixed order: `gspo`, `gpos`, `gosp`, `spog`, `posg`, `ospg`. The planner prefix-scans the chosen permutation, decodes each hit back to canonical SPOG, and applies a final filter so every bound component in the original pattern matches.

Single basic graph pattern only. No joins, no `OPTIONAL`, no property paths, no cost-based planning beyond prefix length.

## Backings

Each permutation picks a storage backing at init time through a single `IndexBacking` parameter:

- **Contiguous.** One sorted list per permutation. Binary search on insert, tail shift on write, contiguous on scan. Preferred for read-heavy workloads.
- **Treap.** Randomised balanced tree with lexicographic ordering. Logarithmic inserts and deletes, in-order scans from a lower bound. Preferred for write-heavy workloads.

Both backings expose the same `KeyScan` interface so matching and iteration stay backing-agnostic. Adding or removing one quad still updates all six permutations, so total write cost scales with six index updates regardless of backing.

## Write-ahead log

The journal is append-only. The file starts with a nine-byte header: four ASCII bytes `DERW`, one byte format version, four bytes little-endian CRC32 seed. Every subsequent record is:

1. One byte `kind`: `0` commit, `0x21` add quad, `0x23` remove quad.
2. Four bytes little-endian `u32` payload length.
3. `plen` bytes of payload (zero for commits).
4. Four bytes little-endian running CRC32 up to and including the payload.

Add and remove payloads encode the full quad as UTF-8 (term tag, length-prefixed strings, literal datatype and language flags) rather than raw handles, so replay is self-contained. `commitWal` writes a zero-payload record and syncs. On open, the replay loop streams records, updates a running CRC32, validates each record's stored checksum against it, decodes payloads to `Input` values, and calls `addQuad` or `removeQuad` through the same validation path that live writes use. If the file ends mid-record or fails the checksum, replay stops cleanly and truncates the file back to the last valid record boundary.

## What it is not

Not a SPARQL engine. Not distributed. No query planner beyond the longest-prefix heuristic. No background compaction. A single-process embedded store for experiments and learning.

## Demos

`zig build demo-contiguous` and `zig build demo-tree` load a LUBM-shaped dataset at 100k and 1M quads, run the canonical basic graph pattern query suite on each backing, and print per-query timings as `k=v` log lines. Each demo finishes with an untimed WAL write and replay roundtrip to exercise durability.
