---
title: "charta: state charts as the next IR for code-generating agents"
description: "From LLMs that write code, to agents that run tools, to formally verified state charts you can codegen from"
date: "Apr 27 2026"
demoURL: "#"
repoURL: "https://github.com/bxrne/charta"
---

> The argument behind this project is short. Phase one of LLMs in software was generating code from prose. Phase two is agents that can run tools and write code semi-autonomously. The honest phase three is generating from a formally verifiable intermediate representation, not from prose. SCXML state charts are a serious candidate for that IR, and `charta` is a small MCP server that lets an agent treat them that way.

## Where we are

The first useful thing LLMs did with code was finish it for you. Autocomplete with taste. The second useful thing was generate it from a description: "write me a function that does X". Both are bounded by the same problem. The model produces a string of tokens that look like code, the runtime decides whether it actually compiles, and the user has to read it line by line to find out whether it does what they asked.

Agents have moved that line. An agent can write code, run a build, read the failure, write more code, run a test, read the result. Coupled with a strong test suite this closes the verification loop in a real way. It is a meaningful step. It is not the end.

The thing that makes the loop work, when it works, is that the agent has a verifier in the runtime. Tests pass or fail. The compiler accepts or rejects. The type system catches the bad cast. None of those verifiers know what the program is supposed to do. They know the program is internally consistent and that a particular set of examples behaves as the test author wrote them down.

The next move, and the bet I am making with this project, is to push the verifier earlier. Specifically: have the agent generate not the implementation but a formal model of the implementation, verify the model, and then generate the implementation from the verified model. The implementation step becomes mechanical translation. The semantic question, "does this program have the right behaviour?", is answered against the model, not the code.

For that to be useful, the IR has to satisfy three things. It has to be expressive enough to describe the kinds of behaviour real systems care about. It has to be amenable to mechanical verification, because the whole point is to put a verifier in front of the agent. And it has to compile cleanly into multiple target languages, because the value of working at the IR layer collapses if you can only emit one back end.

[SCXML](https://www.w3.org/TR/scxml/) is a credible candidate. It is the W3C standardisation of statecharts (the Harel kind: hierarchical states, parallel regions, history nodes, transitions guarded by conditions, entry and exit actions). It has formal semantics. There are model checkers and exhaustive simulators that consume it. And the [scxml-core-engine](https://github.com/newmassrael/scxml-core-engine) project ships a code generator that emits idiomatic source for several languages from a chart.

[charta](https://github.com/bxrne/charta) is the bit that lets an agent use that pipeline through MCP. Three tools, ~420 lines of Rust, no panics by design.

## What it does

charta exposes three [MCP](https://modelcontextprotocol.io/) tools to any client that can speak the protocol. Claude Desktop, Amp, anything that wires up an MCP stdio server.

`validate_state_chart` takes an SCXML XML string, parses it through the [`scxml`](https://crates.io/crates/scxml) crate, and returns either OK or a typed `invalid_params` JSON-RPC error. The agent gets a structured failure with the parser's diagnostic, not a string buried in a 200-status payload that it has to grep for the word "error".

`visualise_state_chart` validates the chart and renders it as a [Mermaid](https://mermaid.js.org/) state diagram. This is the smallest useful thing for the agent loop: it produces something the human can look at without reading XML, and the rendering is deterministic. If the agent claims it built a state machine that does X, the picture either shows that or it does not.

`codegen_state_chart` validates the chart, then shells out to `sce-codegen generate` with one of five backends:

- **Rust**, with a `StatePolicy` trait per chart and concrete state types.
- **Go** (1.22+), with generics for the state union.
- **C++**, using CRTP plus clang-format for layout, emitting a `.h` and a `.inl`.
- **Kotlin**, with sealed interfaces and coroutines for the action callbacks.
- **C11**, for embedded targets, emitting a `.h` and a `.c`.

The codegen tool writes the SCXML to a `tempfile::tempdir`, spawns the subprocess, collects all generated files, and returns them as labelled text content blocks (`// === chart_sm.rs ===`, sorted for deterministic order). Multi-file backends like C++ and C11 come back as separate blocks so the client can split them trivially.

The full pipeline an agent walks is: produce SCXML, call `validate`, call `visualise` to confirm intent, call `codegen` for the target language, drop the generated files into the project, and write the small bit of glue (event sources, action implementations) by hand or with the agent. The state machine itself is no longer a thing the agent wrote in prose; it is a thing emitted from a verified model.

## Why MCP

The tool is small enough that there is no real reason for it to be a server at all, except that MCP is the protocol that has consolidated this kind of thing into something portable. Once the tool is an MCP server, any agent host can use it without bespoke integration. Claude Desktop, Amp, the half-dozen IDE integrations, the local CLI tools, all of them can advertise charta's tools to the model and let the model decide when to use them.

The implementation uses the [`rmcp`](https://crates.io/crates/rmcp) crate. The interesting part is the proc-macro pair `#[tool_router]` on the impl block and `#[tool]` on each method, which auto-generates the dispatch table and the JSON schema the server advertises. The server implementation collapses to:

```rust
#[tool_router]
impl Charta {
    #[tool(description = "Validate an SCXML state chart...")]
    async fn validate_state_chart(&self, ...) -> Result<CallToolResult, ToolError> { ... }

    #[tool(description = "Render an SCXML state chart as Mermaid...")]
    async fn visualise_state_chart(&self, ...) -> Result<CallToolResult, ToolError> { ... }

    #[tool(description = "Generate source code from an SCXML state chart...")]
    async fn codegen_state_chart(&self, ...) -> Result<CallToolResult, ToolError> { ... }
}
```

The schemas the agent sees are derived from the request structs in `tools.rs`, which means renaming a field in the source updates the protocol advertisement automatically. There is no JSON file to keep in sync.

## Why typed errors matter for agents

A common failure mode of LLM tool integrations is the success-payload-with-an-error-string anti-pattern. The HTTP returns 200 OK. The JSON has a field called `result` that contains the string `"Error: validation failed: bad XML at line 12"`. The agent receives this as a successful tool call and tries to use the result.

charta refuses to do that. Bad SCXML maps to `invalid_params`. Missing `sce-codegen` binary maps to `internal_error`. Subprocess failure maps to `internal_error` with the captured stderr. The MCP layer presents these as JSON-RPC errors with structured codes, and the agent host can handle them as errors rather than as content the model has to interpret.

This sounds like a small thing. It is not. The agent loop only converges if the agent can tell the difference between "the tool succeeded and gave me a result" and "the tool failed and I need to back up and try something else". Putting that distinction in the protocol layer, where the host already handles it, is the right place for it.

## Validate before spawn

All three tools validate the SCXML before doing anything else. `visualise` will not render an invalid chart, and `codegen` will not invoke `sce-codegen` on bad input. The reasoning is the same in both cases: the parser is fast, the visualiser and the subprocess are slower, and the diagnostic from the in-process parser is cleaner than the diagnostic from a tool that received malformed XML and decided what that means.

This ordering also defends the codegen path. `sce-codegen` is a subprocess with its own error semantics, its own stderr conventions, and its own definition of what counts as malformed input. Validating in-process means the only way the subprocess sees bad XML is if our parser accepted it and the subprocess did not, which is a real bug worth surfacing rather than a routine failure.

## Configurable binary path

The path to `sce-codegen` can be overridden through the `SCE_CODEGEN_BIN` environment variable. The default is a `PATH` lookup. This matters for sandboxed MCP hosts: Claude Desktop runs MCP servers as subprocesses with a controlled environment, and "find this binary on the user's PATH" is sometimes "fail because PATH does not contain Homebrew". Letting the host explicitly configure the path is the difference between charta working out of the box and charta working after a half-hour of debugging.

## The open questions

The interesting subquestions sit on either side of the chart. Pure model checking on SCXML is solid; the engines exist and work. The harder question is verifying that the spec the agent was given matches the chart the agent produced. That is a translation problem, and it is open. Downstream, the question is whether the implementation generated from the chart faithfully executes the chart's semantics in the chosen target language. That is a codegen-correctness question, and it is the kind of thing you build a property test suite for and then never feel completely sure about.

Generation from a verified IR is not a new idea. It has been the dream of formal methods for decades. What is new is having a generator (the agent) that can be made cheap enough and patient enough to iterate on the chart until the verifier is happy, instead of needing a human in that loop. That is the gap LLMs close. Not "write me the implementation", but "write me the model, fix it until the verifier is happy, and translate it to the implementation".

charta is a small piece of that workflow: the bit that lets the agent treat the chart as a tool input and the codegen output as a tool output, with proper validation and proper errors. Whether the larger pipeline holds up in practice is the experiment.
