---
title: "JSON via the camel, towards RFC 8259"
description: "Parsing and querying JSON with OCaml"
date: "Oct 25 2025"
repoURL: "https://github.com/bxrne/camlq"
---

A jq-inspired JSON parser and query tool built in pure OCaml. No external dependencies, just functional programming and stdin.

## Why OCaml?

Most JSON tools reach for Node.js or Python. As a learning exercise I tried out OCaml's pattern matching and type system while building something practical. The result is a lightweight CLI tool that reads from stdin and supports jq-like queries.

## What it does

At its core, camlq parses JSON from stdin and outputs the result. The interesting part is the query layer - you can extract data using familiar jq syntax without needing jq itself.

```bash
# Basic parsing
echo '{"name": "Alice", "age": 25}' | camlq

# Property access
cat data.json | camlq .address.city

# Array operations
cat data.json | camlq .users[0].name
cat data.json | camlq .courses[]
```

## Implementation notes

The parser is built from scratch - no external JSON libraries. It handles:

- Object and array nesting
- Type handling (strings, numbers, booleans, null)
- Error recovery with clear messages
- Property chaining and array indexing

Query evaluation uses pattern matching to traverse the parsed AST. The syntax is intentionally limited to common operations rather than trying to replicate jq's full feature set.

## Trade-offs

**Pros:**

- Zero dependencies for JSON parsing
- Clean functional implementation
- Easy integration via pipes
- OCaml's type safety catches edge cases at compile time

**Cons:**

- Not yet benchmarked against RFC 8259
- Needs fuzzing for production use
- Query syntax is simplified compared to jq
- Performance not optimized

## Use cases

- Quick JSON inspection in pipelines
- API response debugging
- Data extraction without installing jq
- Learning OCaml through a practical project

## Parser internals

### Type system

The JSON AST uses OCaml's variant types - each JSON value maps cleanly to a constructor:

```ocaml
type json =
  | Null
  | Bool of bool
  | Number of float
  | String of string
  | Array of json list
  | Object of (string * json) list
```

This representation makes pattern matching natural. Object key-value pairs are association lists, which trades some lookup performance for simplicity. Arrays are native OCaml lists.

### Lexical analysis

The lexer consumes characters and produces tokens. State is tracked through function parameters, avoiding mutable references:

```ocaml
let rec skip_whitespace input pos =
  if pos >= String.length input then pos
  else match input.[pos] with
  | ' ' | '\t' | '\n' | '\r' -> skip_whitespace input (pos + 1)
  | _ -> pos
```

String parsing handles escape sequences with a small state machine. The key insight: accumulate the result in an accumulator parameter and return it at the end. No string concatenation in loops.

### Tail recursion

JSON arrays and objects can nest arbitrarily deep. Stack overflow is a real concern. Every recursive parsing function is tail-recursive:

```ocaml
let rec parse_array_elements acc input pos =
  let pos = skip_whitespace input pos in
  if input.[pos] = ']' then (List.rev acc, pos + 1)
  else
    let value, pos = parse_value input pos in
    let pos = skip_whitespace input pos in
    match input.[pos] with
    | ',' -> parse_array_elements (value :: acc) input (pos + 1)
    | ']' -> (List.rev (value :: acc), pos + 1)
    | _ -> failwith "Expected comma or closing bracket"
```

The accumulator pattern: build the list in reverse (`value :: acc`), then reverse once at the end with `List.rev`. This keeps each recursive call in tail position.

### Parser structure

Parsing follows a recursive descent pattern. Each JSON type has a dedicated function:

- `parse_value` - entry point, dispatches based on first character
- `parse_object` - handles `{...}` with key-value pairs
- `parse_array` - handles `[...]` with comma-separated values
- `parse_string` - handles `"..."` with escape sequences
- `parse_number` - handles numeric literals

Position tracking is explicit - every function takes a position and returns an updated position. This makes backtracking possible (though not currently used) and keeps the parser pure.

### Error handling

OCaml's exception system provides clean error propagation. Parse errors include context:

```ocaml
exception ParseError of string

let parse_error pos msg =
  raise (ParseError (Printf.sprintf "Position %d: %s" pos msg))
```

The top-level parser catches exceptions and formats them for the user. No partial results are exposed - parsing either succeeds completely or fails with a message.

### Query evaluation

The query engine is a separate pass over the parsed AST. It uses pattern matching on both the query structure and JSON structure:

```ocaml
let rec eval_query query json =
  match query with
  | Identity -> json
  | Property key ->
      (match json with
       | Object pairs -> List.assoc key pairs
       | _ -> raise NotFound)
  | Index n ->
      (match json with
       | Array items -> List.nth items n
       | _ -> raise NotFound)
  | Chain (q1, q2) ->
      let intermediate = eval_query q1 json in
      eval_query q2 intermediate
```

Query parsing is simpler than JSON parsing - it's just splitting on `.` and `[]` characters and building a query AST. The real work happens in evaluation.

## Performance considerations

### Space complexity

The parser builds the entire AST in memory before query evaluation. For large JSON files, this can be expensive. A streaming approach would be more memory-efficient but complicates the query interface.

Association lists for object keys are O(n) lookup time. For objects with many keys, a Map would be faster. The trade-off: simplicity vs performance.

### Tail call optimization

OCaml guarantees tail call optimization. Without it, deeply nested JSON would overflow the stack. The accumulator pattern is crucial here - it lets us express recursive algorithms that the compiler can optimize to loops.

### String building

String concatenation in OCaml allocates new strings. The parser uses Buffer for accumulating string contents, which amortizes allocations.

## Module structure

The codebase separates concerns:

- `Lexer` - character-level tokenization
- `Parser` - token-to-AST conversion
- `Query` - query parsing and evaluation
- `Printer` - AST-to-string formatting
- `Main` - CLI interface and stdin handling

Each module exposes a minimal interface. The parser doesn't know about queries. The printer doesn't know about parsing. This makes testing easier and keeps dependencies clear.

## Next steps

The TODO list includes:

- RFC 8259 compliance testing
- Fuzz testing for edge cases
- Performance benchmarks
- Extended query operations (filtering, mapping)
- Streaming parser for large files
- Better error messages with line/column numbers

## Try it

```bash
git clone https://github.com/bxrne/camlq.git
cd camlq
dune build
cat sample.json | camlq .name
```

Built with OCaml 5.0+ and the Dune build system. Licensed under MIT.

---

[GitHub Repository](https://github.com/bxrne/camlq)
