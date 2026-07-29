---
title: "Test the **** out of your containers"
description: "Real robustness via deterministic simulation. Write Lua scripts that enable surgical testing."
date: "Jul 29 2026"
demoURL: "#"
repoURL: "https://github.com/bxrne/dstest"
---

Your container died mid-request. The logs show a 502 Gateway Timeout, then nothing.
The container restarted, but you have no idea what happened. Was it a memory issue?
A network partition? Did the process hang before dying? The logs are incomplete
because the container died before flushing its buffers. You restart the service,
the problem disappears, and you move on.

Six months later, it happens again in production. Same symptoms, different
customer. You still do not know the root cause.

This scenario plays out daily. We deploy services that pass integration tests but
fail under conditions we never thought to test. The problem is not that we lack
tests. The problem is that we cannot enumerate every combination of failure modes.
Network stalls, disk throttling, memory exhaustion, and process death interact in
ways no test matrix can cover.

> **TLDR:** Unit tests guide development. DST reduces test footprint while
> increasing real coverage. You write fewer tests but they actually cover what
> happens in production.

## What Traditional Testing Misses

Consider a payment processing service. Integration tests verify correct
balance updates, proper error handling for insufficient funds, and idempotency
for duplicate requests. On the surface, you have good coverage.

What happens when the database connection pool exhausts during a transaction?
When the network partitions after the debit but before the credit? When disk I/O
throttles to 1 KB/s during a write burst? Your tests do not cover these conditions
because reproducing them requires precise control over timing and infrastructure
that traditional test frameworks do not provide.

You could write a separate integration test for each scenario: mock the database
pool, simulate network partitions, throttle disk in the test environment. This
approach has two problems. First, you have to think of every scenario in
advance. Second, when a test fails, reproducing the failure requires reconstructing the
exact test environment state, often impossible once the sandbox is torn down.

## Lessons from the Simulators

Two companies solved this by building simulators before building their core
functionality.

FoundationDB spent 18 months building a deterministic simulator before writing
any storage logic. The simulator runs tens of thousands of simulations every
night, each one exploring large numbers of component failures. When FoundationDB
code calls a timer, the simulator provides a virtual clock. When code reads from
disk, the simulator can delay, corrupt, or drop the operation. When code sends a
network packet, the simulator controls delivery timing and can partition,
duplicate, or reorder packets. When a bug is found, the seed that triggered it
reproduces the exact sequence: same thread scheduling, same packet timing, same
disk latency. Jepsen testing, known for finding subtle distributed systems bugs,
struggled to find issues FoundationDB's simulator had not already discovered.

TigerBeetle operates the VOPR, a continuous simulator that runs across thousands
of cores 24 hours a day. One minute of VOPR time equals days of real-world
testing. A day gives two years. By virtualizing time rather than relying on
wall-clock time, the VOPR simulates years of operation in minutes. A disk failure
that would occur once per year in production occurs thousands of times per day in
simulation. TigerBeetle enforces determinism at the language level: in Zig,
calls to `clock_gettime()` or unseeded random number generators are rejected by the
compiler. Every source of randomness flows through explicit, injectable
interfaces.

The pattern is clear: deterministic simulation finds bugs in state spaces that
would take decades to encounter in production. When a bug is found, the seed
reproduces it exactly.

## The Gap: Containerized Workloads

Modern applications run in containers. They depend on Docker, Kubernetes, service
meshes, managed databases, and cloud APIs. Most organizations deploy via
containers, so this problem must be solved at the container boundary rather than
at the process boundary.

What if we could apply deterministic simulation principles at the container level?
Containers expose a well-defined API surface through Docker. We can pause
processes, kill containers, throttle disk I/O, disconnect networks, and limit
memory. If we control the sequence of these operations deterministically, we gain
the same reproduction guarantees as process-level simulation.

The container becomes the simulation unit. We inject faults through Docker APIs,
not by intercepting syscalls. The application remains unchanged. We test its
actual behavior, not a model of its behavior.

## dstest: Deterministic Simulation for Containers

`dstest` brings these principles to containerized workloads. It performs a weighted
random walk through the space of container failures. A seeded PRNG determines
which fault to apply, which container receives it, and in what order. The same
seed produces the same sequence, forever.

As of **v0.1.10**, dstest combines three layers of fault injection on top of a
weighted random fault tree. The layers are proxied network impairments between
services and virtual disk faults, plus two harness-controlled primitives: virtual
clocks and seeded workload randomness. Together these let you reproduce not just
the failure, but the workload that led to it.

### How It Works

Three layers with clear separation:

The **substrate layer** interfaces with Docker via bollard. It launches
containers, injects faults, and performs cleanup. Each container is a subject
identified by its Docker ID. The substrate also owns the virtualised components
(clock, network, and storage controls) that the engine talks to through
abstract traits so it never depends on a concrete substrate.

The **fault tree** maintains the weighted random walk. Given a seed and
configuration, it produces a deterministic sequence of fault operations. The PRNG
decides everything: which fault type, which container, when to apply it. Weight
maps are sorted `BTreeMap`s, so schedule order never depends on hash-map
ordering.

The **script layer** is Lua. Scripts launch containers, step through faults,
verify behavior, and assert invariants. Lua provides full control flow:
conditionals, loops, and error handling. A script is the test; the seed is the
reproduction.

### A Minimal Script

The core workflow is three calls: register a config, set up a subject, step
through faults.

```lua
local cfg = dstest.config({
    substrate = "docker",
    seed = 0xDEADBEEF,
    weights = {pause = 0.5, kill = 0.3, ["deprive:network"] = 0.2},
})

local subject = dstest.setup(cfg, {
    image = "nginx",
    ports = { 80 },
})

while true do
    local result = dstest.dst.step(cfg)
    if not result.more then break end

    local ok, resp = pcall(dstest.net.http, subject, "GET", "/")
    if not ok or resp.status ~= 200 then
        dstest.error(string.format("Failed after %s: %s", result.fault, tostring(resp)))
    end
end
```

The script is the test. The seed is the reproduction. Anyone with the script and
seed observes the same behavior.

### Fault Types and Accumulation

Each fault maps to a Docker API operation:

| Fault | Effect | Production Analog |
|-------|--------|-------------------|
| `pause` | `SIGSTOP` on the container process | CPU starvation, hypervisor freeze |
| `kill` | `SIGKILL` on the container process | OOM death, segfault, hard crash |
| `deprive:disk` | blkio cgroup throttle to 1 MB/s | Storage contention, failing drive |
| `deprive:network` | Bridge network disconnect | Network partition, firewall misconfig |
| `deprive:memory` | Memory cgroup halved (min 64 MB) | Memory leak, traffic spike |
| `deprive:cpu` | CPU quota at 20% | Noisy-neighbor CPU contention |

Faults come in two modes. **Single** mode clears the previous fault before
applying the next, isolating the impact of each failure mode. **Accumulate** mode
stacks faults so a container can have paused processes, throttled disk,
disconnected network, and limited memory simultaneously.

Production incidents rarely involve isolated failures. A disk fills up, causing
latency spikes, triggering timeout cascades, exhausting memory, resulting in OOM
kills. Accumulation mode is how you model these compound failures.

### Beyond the Core Fault Tree

Three capabilities introduced since v0.1.7 let you reach deeper than container-
level faults alone.

**Proxied network impairments.** `deprive:network` disconnects a container from
the bridge entirely. This is an all-or-nothing failure. For finer control over
inter-service communication, `dstest.net.link(a, b, port)` establishes a
controllable link between two subjects and applies per-direction impairments:
latency, jitter, packet loss, and partitions. All impairment randomness derives
from the experiment seed. This is how you test that your retry logic handles a
slow dependency before it times out, or that your circuit breaker trips on a
flaky link.

**Virtual disk faults.** `dstest.storage.*` injects disk-level faults onto a
`dm-flakey` virtual disk. Opt in at subject creation (requires root on the host),
then toggle I/O errors (EIO), drop writes silently, flip deterministic bytes to
simulate silent corruption, and snapshot/restore for repeatable experiments.
This is how you verify that your database survives a disk that returns success
codes while silently losing data. That is the failure mode that corrupts your
backups without your ever noticing.

**Virtual clocks.** `dstest.clock.virtual(subject)` returns a harness-controlled
clock handle. Subjects opt in at creation via `clock = { virtual = true,
start_epoch = <secs> }`. The clock is frozen until you advance it. This lets you
test timeouts, leases, and TTL-based logic deterministically, advancing hours
or days in a single call instead of waiting.

### Seeded Workload Generation and Dependencies

Determinism only helps if your workload is also deterministic. `dstest.random.*`
provides a separate seeded RNG stream (independent of the fault tree's RNG) for
generating varied but reproducible workloads: random ports, request methods, item
selections, and array orderings. Lua's own `math.random` is also seeded from the
experiment seed. The result is that a failing test reproduces not just the fault
sequence, but the exact workload that triggered the failure.

For multi-service setups, `dstest.setup` accepts a `depends` field: an array of
subject IDs. Before creating the dependent container, dstest polls each
dependency's exposed port until it accepts TCP connections. This lets scripts
declare realistic startup ordering. For example: database first, then app, then
gateway. Each subject waits for its upstream to be ready before starting.

### Exit Codes and Oracle Verification

The oracle mechanism provides automated verification of system properties during
fault injection. Predicates check health after each fault; invariants check
continuously. Oracle failures exit the process with code `2` (script errors are
1`, infrastructure errors are `3`, success is `0`). A failing invariant fails
CI without the script needing to call `error()` explicitly.

## Where This Matters

In regulated environments such as financial services and healthcare, you need
reproducible evidence that your services behave correctly under failure. A
reviewer does not want to hear "we couldn't reproduce the bug." They want a seed.
The seed becomes validation evidence. Reviewers reproduce the exact sequence on
demand.

For transaction integrity, disk contention plus network partitions plus memory
pressure is the norm in production, not the exception. dstest walks through these
combinations systematically, finding bugs before incidents do. This is the same
way FoundationDB and TigerBeetle found theirs: in simulation, long before
production.

## Getting Started

dstest is published on crates.io:

```bash
cargo install dstest
```

Run an example end-to-end fault-injection experiment with an oracle:

```bash
cargo install dstest
dstest < examples/oracle.lua
cargo doc --open          # full Lua API reference
```

The examples double as integration tests: `oracle.lua` demonstrates fault
injection with predicates and invariants, `httpbin.lua` exercises HTTP analysis
and recovery, `pg.lua` shows PostgreSQL lifecycle under faults, and `clock.lua`
verifies virtual clock semantics.

## Summary

Same seed, same sequence, same result. Every time. When dstest finds a bug, the
seed encodes the exact reproduction. No log archaeology, no unreproducible
failures.

Services that pass integration tests still fail in production because production
combines failures you never tested. Disk contention plus network partitions plus
memory pressure. dstest walks through these combinations systematically, finding
bugs before incidents do.
