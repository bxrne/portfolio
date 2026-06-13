---
title: "tau: a bitemporal time-series database with composition"
date: 2026-06-13
description: A deep dive into Tau, a time-series database designed with correctable time in mind. Explore its unique data model, layered architecture, and rigorous testing approach that sets it apart from traditional TSDBs.
---

**[repo](https://github.com/bxrne/tau)**, **[docs](https://tau.bxrne.com)**

Tau stores data in a way that takes corrections seriously. Real-world measurements drift, get recalibrated, get restated. Tau treats every correction as a new layer rather than an edit, and the newest layer wins for query planning. On top of that it ships a small query language, TauQL, for defining and deriving lenses, either a stack of raw layers with valid and transaction time, or a series derived as an expression over other lenses. The result is something closer to a time-series-native materialized view than a bolt-on feature.


## Why write another db?

Most TSDBs make three assumptions about time, usually without saying so:

- **Time is linear and immutable.** Once a measurement lands at a timestamp, it's final. In practice measurements get corrected after the fact constantly.
- **Time is a point sample.** Each measurement is a value at an instant, which makes it awkward to represent "this was true over this interval" or to reason about the history of changes to a value.
- **Time is just a column.** Time sits alongside the other columns rather than shaping the data model, which leads to workarounds whenever you need corrections or time travel.

Domain-driven design says the data model should reflect the realities of the domain rather than forcing the domain into a generic shape. For time-series data, that means designing around correctable time from the start rather than retrofitting it. Prometheus, InfluxDB, and TimescaleDB are all excellent at what they do, but they all share the point-sample-as-column assumption, which is exactly where corrections and time travel get awkward. Tau's layered approach and its core atom are an attempt to make time a first-class concept rather than a column. It's one design decision that, as it turns out, propagates through the whole system.

## Bitemporality

A database is bitemporal if it tracks two distinct timelines: **valid time** (when a fact is true in the real world) and **transaction time** (when the database learned about it). That separation is what lets you ask "what was true at t?" and "what did we *believe* was true at t, as of when we knew it?" as two different, both-answerable questions.

Tau gets bitemporality almost for free out of its two core ideas. A value is asserted true over a half-open interval of valid time, that's the first timeline. A layer is an ordered, append-only batch of such values, and layers are ordered by when they were written, that's the second timeline, transaction time, encoded directly in layer order. Querying "as of" a point in transaction time is just "ignore any layer written after that point." Querying a specific layer by id is an audit query, "what did this layer assert, on its own." Both fall out of the same structure that gives you corrections.

`AT LENS temp 90` returns the value at t=90, newest layer wins. `AT LENS temp 90 AS OF <wallclock>` returns what the database believed at that time. `AT LENS temp 90 LAYER 1` returns what a specific layer says, for audit. `HISTORY LENS temp` returns every layer: id, written time, bounds.

SQL:2011 standardised system-versioned temporal tables for exactly this problem, with `FOR SYSTEM_TIME AS OF` and a pair of generated period columns. It's powerful and almost nobody uses it, because the ergonomics are a tax you pay on every query and every schema change: extra predicates, extra columns, extra care not to silently read stale rows. Tau's bet is that if the layer *is* the unit of transaction time, you don't need a parallel temporal schema bolted onto a normal table. The bitemporal structure is the storage structure, not an annotation on top of it.

There's a pleasant analogy here to how lambda calculus treats state. A lambda term never mutates a binding: substitution produces a new term with the old one still sitting there, unevaluated, underneath. "Evaluate this expression" always means "evaluate it with the newest substitutions applied," but nothing stops you from looking at an earlier reduction step if you want to. Tau's layers do the same thing for time-series values: each correction is a new "substitution" over the data, evaluation (a query) always sees the latest one, and the older terms are still there if you want to ask what the expression looked like before. Immutable, append-only, newest-binding-wins. It's the same shape of idea, just applied to measurements instead of variables.

**Issues with layering**

The obvious one is compaction: unbounded layers means unbounded read cost, since a query has to walk the stack from the top until it's covered every point it cares about. Tau's sweep-line compaction (more on this below) flattens multiple layers into one, resolving overlaps while preserving every value a query could observe. The threshold is configurable.

The less obvious one is that compaction can't be allowed to block reads or writes, that's a real concurrency problem. Tau's answer is that compaction runs in the background and produces new compacted layers without mutating the existing ones. Readers keep working against the current stack throughout, writers keep appending. This fell out of the layer design almost as a side effect: once layers are immutable, compaction is "build a new layer and swap it in," which is a much easier problem than "rewrite this data in place while people are reading it." It also opens an obvious door toward replication: if consensus operates at the layer level, replicas can apply layers independently without coordinating on individual mutations.

On disk, data is zstd-compressed and (optionally) encrypted at rest, and writes are replayed cleanly on startup. Because layers are append-only, disk writes are sequential, which is exactly the access pattern zstd and the page cache like. There's more efficiency to find here, particularly in how aggressively compaction runs, but the fundamentals are in place.

## The atom

The core primitive is a value asserted true over a half-open interval `[start, end)`. Half-open is a deliberate choice, not an accident. `[0, 10)` and `[10, 20)` tile perfectly, with no overlap and no gap. Closed intervals would need you to special-case the shared boundary every time two intervals meet; half-open intervals just compose.

This is a real departure from the point-sample model most TSDBs use. A point sample says "at exactly t=100, the value was x." This model says "from t=100 until t=200, the value was x," which is much closer to how people actually talk about facts: "the valve was open from 9am to noon," not "the valve was open at 9:00:00 and also at 9:00:01 and also at...".

Timestamps are plain integers, with no units attached. That's deliberate dumbness: the engine doesn't moralize about whether you're using seconds or milliseconds, it just compares numbers. The caller picks a unit and stays consistent. Pushing that decision to the edge keeps the core model simple and keeps the engine from having to carry a timezone or calendar library it doesn't need.

## Layers, and the newest layer wins

A layer is an ordered, non-overlapping run of these atoms appended together, with a monotonically increasing id. Corrections never mutate an existing layer, they append a new one that shadows the old one at query time. This is the conceptual heart of Tau; everything else in the system is downstream of it.

The mental model is a stack of transparencies on an overhead projector. Each layer is one transparency. A query looks down through the stack and, at every point, the topmost transparency that has something drawn there wins.

History is immutable and auditable, because nothing is ever thrown away, layer 1 above is still sitting there, untouched, after layer 3 was written. "As-of" queries are just "ignore any layer above N." Writes never block reads on old data, because old data never changes.

The tension, flagged honestly: unbounded layers means unbounded read cost, since a query in the worst case has to look through every layer to find coverage for every point. That's the problem compaction exists to solve, and it's worth holding onto this tension until then.

## A tour of the subsystems


### The query language

TauQL is parsed into an AST by a small parser. The statement set splits cleanly: `CREATE` / `DROP` / `USE` / `APPEND` / `COPY` / `DERIVE` are DDL, and `AT` / `RANGE` / `REDUCE` / `SHOW` / `HISTORY` are queries.

```sql
CREATE LENS temp float
APPEND LENS temp 0 60 20.5, 60 120 21.0, 120 180 21.5
APPEND LENS temp 60 120 25.0              -- correction: new layer

AT     LENS temp 90                       -- VAL f25
RANGE  LENS temp 0 180                    -- RANGE 3; 0:60:f20.5; ...
RANGE  LENS temp 0 180 WHERE temp > 24.0 LIMIT 5
REDUCE LENS temp 0 180 USING avg          -- min|max|avg|sum|count
HISTORY LENS temp

DERIVE LENS temp_f  AS temp * 1.8 + 32.0
DERIVE LENS too_hot AS temp > 24.0
DERIVE LENS rolling AS avg(temp, -3600, 0)
```

`AT`, `RANGE`, and `HISTORY` map onto the layer model almost too neatly: `AT` walks down the stack until it finds coverage, `RANGE` does the same across an interval, and `HISTORY` exposes the stack itself rather than walking it.

Adding a new statement to TauQL means touching the syntax, the parser, the execution logic, and the wire encoding in lockstep, and there's no shortcut without giving up the type safety at each stage. It's a small tax, paid on every new statement, in exchange for a pipeline where each stage is checked against the one before it. A bit of ceremony now buys you not having to think about an entire class of bugs later.

### The executor

A central executor parses each statement and dispatches it, threading two cross-cutting concerns through every one: a permission check, which checks the calling user's grants against what the statement needs, and a read-only check, which decides whether the statement needs a write lock at all.

Derived lenses are pure expressions evaluated lazily at query time, there's no caching layer. That's a deliberate simplification for now, and it's the reason materialized lenses (more on this below) exist as a planned follow-up rather than something bolted on early.

### Storage backends

There are three storage backends. An in-memory backend holds layers in a plain list. A disk backend writes one zstd-compressed file per layer. A write-ahead log wraps either of the other two and replays on startup. Underneath all three sits the same idea: something that holds the layer stack.

The layer-as-unit-of-storage mapping falls out naturally once you've committed to immutable layers: one immutable layer is one file is one compressible blob. Append-only writes on disk are sequential, which is exactly what zstd and the page cache want. The cost is the flip side of the same coin: file-per-layer means small layers proliferate, which is the other reason compaction exists.

### The write-ahead log

The write-ahead log is a fairly standard durability story, but the layering makes replay unusually clean: replaying it is just "re-append these immutable layers in order," which is close to idempotent and has none of the partial-row bookkeeping that mutable storage engines need. This pays off again in deterministic simulation testing (below), where the log is where fault injection bites hardest.

### Values and the wire

The wire protocol is line-oriented, one response per statement, type-tagged for int, float, string, and bool-or-bytes:

```markdown
client:  AT LENS temp 90
server:  VAL f25

OK                                   write / DDL success
VAL f25 . VAL NIL                    point lookup
RANGE 3; 0:60:f20.5; 60:120:f21; ...  range scan
LAYERS 2; 1:1781101736865:0:180; ...  history (id:written_at:min:max)
NAMES 4; sensor; temp; ...             SHOW
ERR <message>                        any failure
```

A boring text protocol is a feature, not a missed opportunity. It's debuggable with a plain TCP client, readable by a human without tooling, scriptable in thirty lines of Python, and trivially fuzzable. The developer experience of the protocol matters just as much as the API surface on top of it.

Undecided on whether a set of language specific libraries should be made, so for now this is the way. Everyone speaks TCP.

## The algorithm that earns its keep: sweep-line compaction

Compaction means flattening N stacked layers into one, resolving every overlap so the result is indistinguishable from querying the original stack.

The algorithm is the classic computational-geometry sweep, applied to time instead of space: take every interval endpoint across every layer, sort them, and sweep a line across them left to right. At each segment between two consecutive endpoints, exactly one value is "on top," the newest layer that covers that segment, and that's the value the compacted layer emits for that segment.

A concrete example: a base layer covers `[0, 100) = x`. A correction layer covers `[40, 60) = y`. Sweeping across the endpoints 0, 40, 60, 100 produces three segments.

> before, layer 1 covers 0 to 100 with x, layer 2 covers 40 to 60 with y, fully overlapping the middle of layer 1.
>
> after compaction, one layer covers 0 to 40 with x, then 40 to 60 with y, then 60 to 100 with x.

Three segments out of two layers, and if a third layer corrected `[40, 60)` again, or `[90, 100)`, the sweep handles it the same way regardless of how many layers are stacked. Read cost drops from O(layers) back to O(1) per point queried. The algorithm itself is sort-the-endpoints-then-sweep-once: O(n log n) in the number of endpoints, which is the honest cost of the operation.

## Property-based testing: proving the model, not the example

Tau uses property-based tests for invariants and plain regression tests for known cases, both living alongside the code they test.

The layer model has laws, and laws are exactly what property-based testing is for. The invariants checked include:

- **Compaction is value-preserving**: `AT(t)` returns the same result before and after compaction, for every t.
- **Newest-layer-wins is order-independent of batching**: appending the same corrections in different batch sizes produces the same query results.
- **Half-open intervals never produce a gap or overlap after compaction**: the sweep always tiles the input domain exactly.
- **Round-trip identity**: parsing the printed form of a statement gives back the same statement, and decoding the encoded form of a value gives back the same value.

Example-based tests check the cases you thought of. Property-based tests attack the cases you didn't. For a store where correctness is the entire point, that's the difference between "the tests pass" and "the thing is correct."

I use hegel from Antithesis for property-based testing, and it's a good fit: the test is a pure function of the input, and the framework handles shrinking counterexamples automatically. The invariants are expressed as simple predicates over the input and output, and the framework generates a wide variety of inputs to try to break them.


## Deterministic simulation testing

This is the testing approach I'd point at first if someone asked what's actually rigorous about Tau. Deterministic simulation testing is having a moment, TigerBeetle and FoundationDB are the usual reference points, and it's worth being concrete about what it buys here.

The framework itself is generic, not tied to Tau at all, with a separate driver for Tau specifically. Wall-clock time and randomness are replaced by a seeded, controllable schedule, so an entire execution, including its "distributed-ish" interleaving, becomes a pure function of a seed. A weighted behaviour tree picks the next operation from that seeded source of randomness. A fault-injection layer introduces write-ahead-log faults: torn writes, truncation, crash-at-the-worst-possible-moment.

The driver runs the real executor against a reference oracle, a deliberately dumb, obviously-correct in-memory model of what Tau should do, sharing no code with the real engine. The same operation stream goes to both. The moment they disagree, that's a structured divergence report, and the seed that produced it is an exact, deterministic reproduction of the bug: rerun the same seed and you get the same failure every time. No flaky re-runs, no "couldn't reproduce."

When a seed fails, the operation sequence is automatically minimized by delta debugging, down to the smallest sequence that still reproduces the divergence. It's the same philosophy as property-based testing, generate broadly, then narrow to the smallest counterexample, but applied across an entire simulated run rather than a single function call.

The fault injection is what makes this more than a fancy fuzzer for the executor. Because layers are immutable and append-only, the correct behaviour after a torn write or a crash mid-compaction is actually definable: "replay everything that was durably written, and nothing that wasn't" is a precise statement, not a vibe. That definability is what makes the faults testable at all, and it's another place where the layer design pays for itself.

## Why immutability keeps paying off

Tally it up: never mutating, only appending, gives you a free audit log, as-of queries that are just "stop reading at layer N," replay that's just "re-append in order," fault behaviour that's precisely definable, a disk format that's naturally cache- and compression-friendly, and reads that barely need to lock.

That's one decision, the layer, propagating through compaction, storage, the log, concurrency, and testing. None of those are separate clever ideas; they're all the same idea, viewed from a different subsystem. That's usually the sign of a good architectural choice: not that it solves one problem cleverly, but that it makes several other problems stop being problems.

## What's unfinished, and where it goes next

### Compaction per database, not per server

Compaction currently triggers at a fixed layer count, server-wide. A hot database and a cold one have very different ideal cadences. Per-database policy is the obvious next step, and the open question is what the trigger should look like beyond a raw layer count: write volume, time since last compaction, or some mix.

### Network faults in simulation

The simulation currently injects storage and write-ahead-log faults. The deterministic scheduler that makes that possible doesn't care what it's scheduling, extending it to model the wire as another fault source (partition, reorder, delay, duplicate) is mostly a matter of giving it something to schedule, not a new framework.

### More reduction operators

`REDUCE` today covers the basics: min, max, avg, sum, count. Time-weighted aggregates are the natural fit for interval data, a value that held for 90% of a window should weight 90% of the average, and it's something point-sample TSDBs handle awkwardly because they don't have intervals to weight by in the first place. This feels like a genuine differentiator rather than a nice-to-have.

### Materialized, cached lenses

Derived lenses recompute on every query. The fix is materialization with layer-id-based invalidation: a derived lens is only stale if a layer below it in its dependency chain changed since it was last materialized. The immutable layer id is already a perfect cache key, it's sitting there unused.

## Summary

Tau isn't trying to beat InfluxDB on ingest throughput. The argument is narrower and, I think, more important: **the data model is a choice, and most time-series databases never made it consciously.** They inherited point-sample-as-column from general-purpose databases and then spent years building workarounds for corrections, restatements, and time travel on top of a model that doesn't have room for any of them.

Everything in Tau, the layers, the compaction, the bitemporal queries, the testing strategy, rhymes with one decision: `[start, end)`. A half-open interval, asserted true, replaced by appending rather than editing. It's the smallest possible decision in the system, and it's the one everything else is downstream of.

So: what's the atom in your system, and did you choose it, or did you inherit it?

---

**Why integers and not a real timestamp type?** Because the engine shouldn't have an opinion about your clock. Seconds, milliseconds, ticks since some epoch you made up, the engine just compares numbers and lets the caller decide what they mean. A timestamp type would mean carrying a timezone database and a calendar the engine doesn't need, for a guarantee ("this is the correct representation of time") it can't actually provide anyway.
