---
title: "ass"
description: "Go lib for invariant assertions"
date: "Sep 23 2025"
demoURL: "https://pkg.go.dev/github.com/bxrne/ass"
repoURL: "https://github.com/bxrne/ass"
---


# Runtime Assertions

Go's simplicity (lack of features) is one of its strengths, naturally that comes with tradoffs.
Most languages provide an assert call, as does Go but it is scope for testing (requires test suite param), so we lose out on runtime assertions (ifs are not scalable here for DX), if your building a stateful system, a simulation or even distributed programs then this gap is worth closing.

This lib is inspired by the practices recommended by [TigerBeetle](https://tigerbeetle.com) in their doc [Tiger Style](https://tigerstyle.dev), which they follow to build their Zig based OLTP database and is known for its reliability (centuries of simulation testing) and its throughput.

## The Tiger Style Philosophy

1. **Safety** - Writing code that works in all situations and reduces the risk of errors
2. **Performance** - Using resources efficiently to deliver fast, responsive software
3. **Developer Experience** - Creating maintainable, readable code that's enjoyable to work with

Within the safety pillar, Tiger Style emphasizes a crucial practice: **use assertions to verify that conditions hold true at specific points in the code**. Assertions act as internal checks that increase robustness and simplify debugging. They're not just for development—they're sentinel guards that protect your system's integrity in production. At a zoomed in scale this means at the start of a function one should assert all assumptions about the params inputted.

The earlier you catch a bug, the cheaper it is to fix. An assertion that fails during development costs minutes. A subtle state corruption that surfaces weeks later in production costs days or weeks, or cash.

**Safety Through Assertions**: Following Tiger Style's directive to "use assertions to verify that conditions hold true," `ass` makes this practice first-class in Go.

**Explicit Over Implicit**: Rather than hoping tests catch issues, invariants explicitly declare what must be true and verify it continuously.

**Fail-Fast**: The `AutoInv` wrapper panics on violation by default, preventing corrupted state from propagating—a Tiger Style principle of "set fixed limits" and "predictable control flow."

**Developer Experience**: The fluent API (`NewInv().Check().Msg()`) is readable and self-documenting. Named invariants serve as live documentation of your system's contracts.

## Why Runtime Invariants Matter

An invariant is a condition that must always be true at a specific point in your program. Its a unit level contract scoped to a single type/instance. 

- A counter that should never go negative
- A balance that should equal the sum of all transactions
- A state machine that should only transition through valid states

Normally you would put your validation logic in a method on the struct of whichever you are creating and have it private and called on New, this is good but when things get big its gets hard to wrangle.

Example:

```go
if account.Balance < 0 {
    log.Printf("ERROR: Negative balance detected!")
    // Now what? Continue with corrupted state?
}
```

This is reactive, inconsistent, and easy to forget. Invariants are proactive and systematic.

## ass-ert

The `ass` library provides a fluent, type-safe API for defining and checking invariants in Go. It's deliberately minimal, focusing on doing one thing well: protecting your program's state, if you want more fork it.

It gives you automatic and manual checking so an object can use it on state change or you can be in charge of when they get checked (if you are worried about performance this is useful or you could use build tags).

### Core Features

**Named, Reusable Invariants**: Define invariants once, use them everywhere
```go
inv := ass.NewInv[Counter]("NonNegativeCounter").
    Check(func(c Counter) bool { return c.Value >= 0 }).
    Msg("Counter value cannot go below zero")
```

**Invariant Suites**: Group related invariants for batch validation
```go
suite := ass.InvSuite[Counter]{
    nonNegativeInv,
    reasonableBoundsInv,
    evenNumberInv,
}
```

**Automatic Checking**: Enforce invariants on every state update
```go
wrapped := ass.NewAutoInv(counter, suite)
wrapped.Set(Counter{Value: 5})  // ✅ passes
wrapped.Set(Counter{Value: -1}) // ⚠️ panics
```

## Practical Examples

### Example 1: Stateful 

Imagine you're building a distributed key-value store (stateful system). Your replica needs to maintain several invariants:

```go
type Replica struct {
    CommitIndex uint64
    AppliedIndex uint64
    LastLogIndex uint64
}

var replicaInvariants = ass.InvSuite[Replica]{
    ass.NewInv[Replica]("CommitNotAheadOfLog").
        Check(func(r Replica) bool {
            return r.CommitIndex <= r.LastLogIndex
        }).
        Msg("commit index cannot exceed last log index"),
    
    ass.NewInv[Replica]("AppliedNotAheadOfCommit").
        Check(func(r Replica) bool {
            return r.AppliedIndex <= r.CommitIndex
        }).
        Msg("applied index cannot exceed commit index"),
}

func (r *Replica) ApplyEntry(entry LogEntry) error {
    r.AppliedIndex++
    
    // Verify invariants still hold
    if errs := replicaInvariants.Check(*r); len(errs) > 0 {
        for _, err := range errs {
            log.Printf("INVARIANT VIOLATION: %v", err)
        }
        return fmt.Errorf("replica invariants violated")
    }
    
    return nil
}
```

Explicit checking means the replica never enters an inconsistent state. If your system is distributed, debugging is already hard enough and catching a corrupt state immediately helps a bunch.

### Example 2: Ledger

Financial systems demand correctness. A ledger implementation for a single user might look like:

```go
type Ledger struct {
    Accounts map[string]int64
    TotalBalance int64
}

var ledgerInvariants = ass.InvSuite[Ledger]{
    ass.NewInv[Ledger]("BalancesMatchTotal").
        Check(func(l Ledger) bool {
            var sum int64
            for _, balance := range l.Accounts {
                sum += balance
            }
            return sum == l.TotalBalance
        }).
        Msg("sum of account balances must equal total balance"),
}

func (l *Ledger) Transfer(from, to string, amount int64) error {
    // Perform transfer...
    l.Accounts[from] -= amount
    l.Accounts[to] += amount
    
    // Verify double-entry bookkeeping invariant
    if errs := ledgerInvariants.Check(*l); len(errs) > 0 {
        // Rollback and report
        return fmt.Errorf("ledger invariant violated: %v", errs)
    }
    
    return nil
}
```

The invariant suite catches any arithmetic error, race condition, or logic bug that would violate the fundamental accounting principle: debits must equal credits.

## When to Use 

Runtime invariants shine in specific scenarios:

- State machines with complex transition rules
- Systems with mathematical properties (conservation laws, ordering guarantees)
- Safety-critical code where corruption is unacceptable
- Long-running processes where state can drift over time
- Simulation and modeling code
- Complex concurrent systems

But, for these consider alternatives:

- Hot paths where performance is critical (though a well-placed invariant is often worth the cost)
- Simple, obvious validation (where a regular `if` statement is clearer)
- External input validation (use proper error handling instead or proper parsing libs)


## Performance Considerations

Runtime checking has a cost (which i have not benchmarked). The `ass` library is designed to be lightweight, but you should still be thoughtful about placement:

1. **Development vs. Production**: Use build tags to enable more expensive invariants in development (e.g. you may want them only for simulation testing)
2. **Strategic Placement**: Check invariants at state transition boundaries, not in tight loops

Example of conditional checking:

```go
//go:build debug

func (r *Replica) checkInvariants() {
    if errs := replicaInvariants.Check(*r); len(errs) > 0 {
        panic(fmt.Sprintf("invariants violated: %v", errs))
    }
}
```

```go
//go:build !debug

func (r *Replica) checkInvariants() {
    // No-op in production builds
}
```

## Getting Started

```bash
go get github.com/bxrne/ass
```

Start by identifying one critical invariant in your codebase—perhaps a state that should never be negative, or a relationship that must always hold between two fields. Define it explicitly:

```go
inv := ass.NewInv[YourType]("DescriptiveName").
    Check(func(s YourType) bool {
        // Return true if invariant holds
        return s.Field1 >= 0
    }).
    Msg("Clear error message for violations")
```

Then add checking at key points:

```go
if errs := ass.InvSuite[YourType]{inv}.Check(yourValue); len(errs) > 0 {
    // Handle violation
}
```

## Summary 

Runtime invariants are a powerful tool for building robust software. They transform implicit assumptions into explicit, enforced contracts. When combined with the disciplined approach of Tiger Style, they help create systems that are not just correct in testing, but correct in production.

The `ass` library brings this practice to Go in a lightweight, idiomatic way. It's not a silver bullet so good design, comprehensive testing and good invariants remain essential. But for stateful systems, simulations, and safety-critical code, runtime invariants provide an additional layer of protection that can catch bugs before they become incidents.

---

## Resources:
- [ass on pkg.go.dev](https://pkg.go.dev/github.com/bxrne/ass)
- [GitHub Repository](https://github.com/bxrne/ass)
- [Tiger Style Guide](https://tigerstyle.dev)
- [TigerBeetle Tiger Style Documentation](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md)
