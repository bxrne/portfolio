---
title: "augur"
description: "Claude-style terminal assistant in Zig. Simple agent loop with safe tool execution, context budgeting, and streaming."
date: 2026-03-24
repoURL: "https://github.com/bxrne/augur"
---

An agent loop is trivial. Seriously. Send a message, collect tool calls, execute them, append results, loop. The entire concept fits in 70 lines of code.

The complexity is elsewhere. It lives in how you parse what the model asks for, validate it, execute it safely, track context, and stream responses. But the core loop? Dead simple.

I built Augur, a Claude-style terminal assistant in Zig, starting from the CodeCrafters "Build Your Own Claude" course. This post walks through what I learned.

---

## The Loop

Here is the actual code from src/lib/harness.zig, slightly simplified:

```zig
pub fn send(self: *Harness, prompt: []const u8, options: SendOptions) ![]const u8 {
    try self.messages.append(a, .{
        .role = .user,
        .content = try a.dupe(u8, prompt),
    });

    var max_context_input: u64 = 0;
    const context_window = context_window_tokens_for_model(self.model);

    while (true) {
        if (usage_seen and max_context_input >= context_window) {
            return error.ContextWindowExhausted;
        }

        const api_response = try self.fetch_response(a, options);
        const response = api_response.message;
        try self.messages.append(a, response);

        if (api_response.usage.has_data()) {
            max_context_input = api_response.usage.input_tokens;
        }

        const tool_calls = response.tool_calls orelse {
            return response.content;
        };

        for (tool_calls) |tc| {
            const output = try toolset.call_tool(
                tc.function.name,
                tc.function.arguments,
                a,
            );
            try self.messages.append(a, .{
                .role = .tool,
                .content = output,
                .tool_call_id = tc.id,
            });
        }
    }
}
```

That is it.

The loop does one thing. It asks the model. If the model wants to call a tool, it calls it. It adds the result to history. It asks again. If the model stops calling tools, it returns the text. If the system is running out of context, it stops.

**Design notes:**

- All messages go into an arena allocator. When you load a new conversation, one arena.deinit() frees everything. No per-message bookkeeping.
- We track max_context_input (highest input tokens seen) not total tokens, because that is the real constraint.
- Tool execution does not happen in the harness. It is delegated to toolset.call_tool(). The harness just orchestrates.
- Streaming is decoupled via callbacks in SendOptions. The harness does not care if output goes to a terminal, file, or web socket.

That is the whole story for the core loop. Everything else is scaffolding.

---

## The Harness Struct

```zig
pub const Harness = struct {
    backing_allocator: std.mem.Allocator,
    arena: std.heap.ArenaAllocator,
    messages: std.ArrayList(types.Message),
    api_key: []const u8,
    base_url: []const u8,
    model: []const u8,
    mode: types.Mode,        // plan, build, pair
    system_text: []const u8,
    skills_text: []u8,       // Auto-loaded from SKILLS.md
    last_turn_usage: TurnUsage,
};
```

**Mode switching:**

- plan mode gives high-level steps with no code
- build mode implements directly
- pair mode is for learning, direction first, code when you have thought it through
- /plan, /build, /pair commands in the REPL update the system message automatically

**Context tracking:**

- skills_text holds repository-specific guidance. Augur looks for SKILLS.md and SKILLS/\*/SKILL.md files. If found, they get appended to the system prompt. This lets you inject repository guidance without prompt engineering.
- last_turn_usage holds token counts. Used to show the user context fill (4.0% ctx_used / 96.0% ctx_left).

---

## Pair Mode

Pair mode is the one I care about most, because it addresses something real about how LLMs fit into learning.

The system prompt is:

```
You are in PAIR mode. Act as a senior pair programmer who protects the user's learning.
Your job is to reduce friction without removing the struggle.
Core principle: the user builds the mental model, you reduce context-switching.
Never write code the user hasn't reasoned through first.
When the user knows what the code should do, help them move fast.
When they don't, slow down: ask what they think should happen.
Point them to the right documentation or man page, and let them wrestle with it.
Solve the problem together. Discuss tradeoffs. Don't just implement.
Help the human think through the problem first.
```

The idea is borrowed from pair programming, but inverted. Instead of the LLM driving, the human drives. The model asks clarifying questions, suggests approaches, and points to relevant documentation or concepts. It reduces friction without removing struggle.

The "protects the user's learning" part is key. A good pair programmer does not hand over the wheel when things get hard. They slow down, ask questions, maybe work through a toy example together. They make sure the person they are working with actually understands what is happening.

"Reduce friction without removing the struggle" is the whole philosophy. Friction is exhausting. A 10-minute search for the right man page is friction. Context switching between three terminals is friction. Having to repeat yourself because the tool forgot context is friction. But struggle, the actual wrestling with a problem, is where learning lives.

"The user builds the mental model, you reduce context-switching" clarifies the boundary. The pair programmer is not there to have all the answers. It is there to make the human's exploration faster. That means gathering relevant docs, pointing to examples, answering clarifying questions, all without jumping straight to solutions. It means keeping information organized so the human does not have to re-ask things. It means you stay in one conversation, in one mental space, rather than bouncing between terminals and search results.

"Never write code the user hasn't reasoned through first" is the hard line. This prevents the tool from doing what it is tempted to do: dump a complete implementation when asked for help. Instead it forces the conversation to happen. The user has to articulate the problem. Walk through their thinking. Then the pair programmer can say: here is a way to implement that, or here is why that approach won't work, or have you considered this angle? The code comes only after the reasoning is laid out.

"When the user knows what the code should do, help them move fast" is the flip side. Once the decision is made, the reasoning is laid out, and the user is confident about the direction, pair mode should not slow you down. This is not about hand-holding forever. The point is to make sure the reasoning is there, then get out of the way. If the user can say "I need a function that does X, here is my rough sketch," pair mode should help make that happen quickly. The friction is gone, the reasoning is done, so move.

"When they don't, slow down: ask what they think should happen" is the compass. This is the check. If the user's request is vague, or if they seem to be guessing, pair mode should not fill in the blanks. Instead it asks: what are you actually trying to achieve here? What behavior are you expecting? This is the moment where the pair programmer earns its keep. Not by being helpful in a hurry, but by being patient enough to let the user think out loud.

"Point them to the right documentation or man page, and let them wrestle with it" is the practice. This is where the rubber meets the road. A good pair programmer does not answer the question. It directs you to where the answer lives and lets you find it. This is the difference between learning and being handed a solution. You read the man page. You try the flag. It does not work. You read more carefully. Something clicks. That moment of discovery, that is where the learning sticks. The pair programmer's job is to make sure you get there, not to skip the line and hand you the answer.

This matters because [as I wrote before](https://www.bxrne.com/blog/08-ai-coding), LLMs are dangerous not when they hallucinate, but when they make thinking feel unnecessary. The friction, the uncertainty, the slow accumulation of knowledge: these are not obstacles. They are the process itself.

When you use an LLM in build mode (just implement it), you get code fast. But you miss the chance to understand _why_ that approach works. When you use pair mode, you stay in the loop. The model helps you gather information, clarifies concepts, maybe suggests a path forward, but you are doing the navigating.

The mechanics are straightforward. You ask a question. Pair mode does not immediately spit out code. Instead it asks back: what are the constraints? what does the system need to do? what have you already tried? These conversations often lead to better solutions because the problem gets clearer through discussion.

It also helps catch the moments where you are about to make a wrong assumption. If the model is in pair mode, it is more likely to say "are you sure about that?" rather than generate code based on a flawed premise.

**Workflow:**

- Start in pair mode when learning something new.
- Ask a question. The model responds with questions back, not solutions.
- Use /plan mode to explore ideas without committing to code.
- Once you understand the approach and can articulate it, switch to /build mode.
- Build mode gets out of your way and just implements.
- If you get stuck or confused, switch back to /pair to think it through.

This flow makes it explicit: learning is deliberate. Building is fast. Confusion is a signal to slow down.

**Pair mode conversation flow:**

(1) Clarify intent — confirm you understand what the user is trying to learn or build.

Without this first step, the pair programmer and the user can be solving completely different problems. A question that sounds straightforward might hide a misunderstanding. "I want to read a file" could mean "I want to understand how file handles work" or "I want to parse this specific format" or "I want a quick way to load config." None of these are the same problem. The pair programmer's job is to ask: what are you actually trying to do here? Once that is clear, everything else is easier.

(2) Assess what they already know — surface gaps without being patronizing.

This is not about quizzing them. It is about understanding the landscape. Do they know what a syscall is? Have they used this library before? Do they understand why we need this pattern at all? These questions shape the whole conversation. A good pair programmer meets people where they are, not where they think they should be.

(3) Point to the relevant material — docs, examples, key concepts.

This is where the tools shine. Find the right man page. Pull the relevant section from documentation. Show them an example that is close to what they are trying to do. Do not explain it for them. Just point to it and ask what they make of it.

(4) Let them struggle — do not fill silences.

This is the hard part. When someone is stuck or confused, the instinct is to help immediately. Do not. Wait. Let them re-read. Let them try. Let them ask follow-up questions. The struggle is where the learning happens. A good pair programmer is comfortable with silence.

(5) Push back on wrong assumptions — but gently.

If they are heading toward a dead end, say so. But phrase it as a question: "What do you think will happen if you...?" or "Have you considered...?" This lets them correct course without feeling stupid. It preserves their agency in the problem.

(6) Once they decide on a direction, move fast.

The moment they say "I understand the tradeoff and I want to do it this way," pair mode should stop questioning and start supporting. Get the code written. Test it. Iterate quickly. The reasoning is done, so accelerate.

---

## The Hard Part: Tools

The loop is trivial. Making tools safe is real work. Or at least, it will be.

**Each tool in src/lib/toolset.zig does five things:**

1. Parses JSON arguments from the model
2. Validates inputs (rejects / at start, .. anywhere)
3. Executes a command
4. Caps output at 200KB
5. Returns exit code plus stdout plus stderr

The read tool, simplified:

```zig
fn tool_read(args: []const u8, a: std.mem.Allocator) ![]const u8 {
    var parsed = try json_parse_read_args(args, a);
    defer parsed.deinit(a);

    if (std.mem.startsWith(u8, parsed.file_path, "/")) {
        return error.AbsolutePathNotAllowed;
    }
    if (std.mem.containsAtLeast(u8, parsed.file_path, 1, "..")) {
        return error.TraversalNotAllowed;
    }

    const file = try std.fs.cwd().openFile(parsed.file_path, .{});
    defer file.close();

    const content = try file.readToEndAlloc(a, max_file_size);
    return content;
}
```

Path validation helps, but this is not real sandboxing. The model still runs arbitrary bash commands. There is no allowlist. No syscall filtering. If the model asks to rm -rf or exfil data, it will happen. The path checks just prevent the most obvious directory traversal mistakes.

The five tools I added later (find, grep, tree, diff, git) wrap bash commands:

```zig
fn tool_find(args: []const u8, a: std.mem.Allocator) ![]const u8 {
    var parsed = try json_parse_find_args(args, a);
    defer parsed.deinit(a);

    validate_path(parsed.path);

    var cmd = std.ArrayList([]const u8).empty;
    defer cmd.deinit(a);

    try cmd.appendSlice(a, &[_][]const u8{
        "find",
        parsed.path,
        "-name",
        parsed.pattern,
    });

    if (std.mem.eql(u8, parsed.type, "file")) {
        try cmd.appendSlice(a, &[_][]const u8{ "-type", "f" });
    }

    const result = try std.process.Child.run(.{
        .allocator = a,
        .argv = cmd.items,
    });

    return result.stdout;
}
```

**Why bash wrapping?**

- It is on every Unix system
- No need to reimplement directory traversal or diff algorithms in Zig
- It is simpler to reason about than deep stdlib calls
- The overhead is invisible for interactive use

Each tool is also schemed for OpenAI/OpenRouter so the model knows exactly what parameters it accepts. But again, the schema does not prevent the model from requesting destructive operations. It just documents what the tool can accept.

---

## Dogfooding

I used Augur to implement Augur itself. Here is how it worked:

I asked in plan mode: what other tools would be useful?

Augur analyzed the codebase and suggested find, grep, tree, diff, git.

I switched to build mode and said: implement 1-5.

Augur then read existing tool patterns, grepped the codebase to understand Zig version quirks, wrote all five tools to toolset.zig, ran zig build, hit errors (ArrayList API differences), fixed them, and tested each tool.

The entire iteration happened in one context window. Implement, compile, fix, test.

The core lesson here: once the harness is simple and the tool interface is clear, an LLM can reason about code and validate it immediately. No guessing. The feedback loop is tight.

---

## Context Budgeting

One thing that is easy to get wrong: knowing when to stop.

```zig
while (true) {
    if (usage_seen and max_context_input >= context_window) {
        return error.ContextWindowExhausted;
    }
    // ...
}
```

We track the max input tokens across all API rounds. When it hits the context window, we stop. We use max_context_input (not total) because the model cannot output beyond the window. Input is the constraint.

Model windows are hardcoded per family:

```zig
fn context_window_tokens_for_model(model: []const u8) u64 {
    if (std.mem.startsWith(u8, model, "anthropic/")) return 200_000;
    if (std.mem.startsWith(u8, model, "openai/gpt-4.1")) return 1_047_576;
    if (std.mem.startsWith(u8, model, "openai/")) return 128_000;
    if (std.mem.startsWith(u8, model, "google/")) return 1_000_000;
    return 200_000;
}
```

**Trade-offs:**

- This is brittle. OpenRouter does not expose context windows in responses, so we hardcode.
- Not ideal, but it works.
- When new models ship, this list goes stale.

---

## Streaming Without Blocking

Streaming is critical. If the user waits 3 seconds for the first token, the tool feels dead.

```zig
pub const SendOptions = struct {
    stream_output: ?std.fs.File = null,
    on_first_stream_delta: ?*const fn (*anyopaque) void = null,
    on_first_content: ?*const fn (*anyopaque) void = null,
    on_first_content_ctx: ?*anyopaque = null,
};
```

**How callbacks work:**

- The harness does not handle streaming. It accepts callbacks.
- When the first delta arrives (tool call or content), we fire on_first_stream_delta so the CLI can hide its spinner.
- When the first visible token arrives, we fire on_first_content so it can write the model prefix.
- This keeps streaming UI-agnostic. The harness sends deltas to a file, callbacks fire, the rest is up to the caller.

---

## Conversation Persistence

Conversations save to ./augur/conversations.json:

```json
{
  "conversations": [
    {
      "name": "explore-rust-lifetimes",
      "mode": "pair",
      "model": "anthropic/claude-3.5-sonnet",
      "messages": [
        {
          "role": "system",
          "content": "..."
        },
        {
          "role": "user",
          "content": "explain lifetimes"
        },
        {
          "role": "assistant",
          "content": "..."
        }
      ]
    }
  ]
}
```

Load with /switch explore-rust-lifetimes. The harness resets its arena and copies messages in.

**Why JSON, not SQLite?**

- For conversations under 100KB, JSON is fine
- It is readable
- It has no dependencies
- Search and reload is fast enough
- The REPL is interactive, not a server

---

## Skills Auto-Discovery

The harness looks for SKILLS.md and SKILLS/\*/SKILL.md files:

```zig
pub fn load_system_suffix(allocator: std.mem.Allocator) ![]u8 {
    // Look for SKILLS.md, SKILLS/*/SKILL.md, .skills/*/SKILL.md
    // Concatenate them, append to system prompt
}
```

If your repo has specific constraints, write them in a skill file. The harness will pick them up and inject them into every conversation automatically.

Example: this project has SKILLS/zig-doc/SKILL.md:

```markdown
# Zig Doc Skill

Use this skill when the user asks about Zig APIs, stdlib behavior, or requests language-level reference details.

## Instructions

- Prefer `zig doc` over guessing API signatures.
- Generate docs locally when needed: `zig doc <path-to-zig-file>`
```

Now when you ask about Zig APIs, the system prompt includes this guidance automatically.

---

## What Actually Matters

**Safe execution.**

- Right now this is mostly just path validation
- No real sandboxing or command filtering is in place
- The model can still call any tool with any arguments (the schema documents what it should do, but does not enforce it)
- This needs proper allowlisting and syscall restrictions before production use

**Context budgeting.**

- Knowing when to stop
- Most agents fail here and blow their API budget or hit context limits mid-response

**Responsive streaming.**

- If the user does not see results immediately, they lose confidence
- Callbacks decouple the harness from UI so streaming works everywhere

**Tight feedback loops.**

- If you can implement, compile, and test in seconds, iteration is fast
- This is where dogfooding pays off

**Repository context.**

- Skills files let you inject guidance without prompt engineering
- A few lines of markdown in the right place beats a 500-word system prompt

---

## Lessons from CodeCrafters

The course scaffolds you through building a basic agent, then challenges you to extend it. Here is what clicked:

**Streaming is easier than batching.**

- Just handle events as they arrive

**Tool calls are structured JSON.**

- Once you parse them, execution is straightforward

**The loop is simple. Edge cases are hard.**

- Context budgeting, error recovery, streaming backpressure
- That is where time goes

**Zig's arena allocator is genuinely useful here.**

- Allocate everything into one arena, reset it all at once
- No per-message bookkeeping

---

## What Worked, What Didn't

**Worked:**

- Arena allocation kept memory simple
- Callbacks for streaming decoupled harness from UI
- Tool schema generation ensured OpenAI compatibility
- Skills auto-discovery let us add repo context organically
- Using Augur to build Augur caught bugs and proved the design
- Pair mode preserves the learning process while reducing friction

**Didn't:**

- No real sandboxing yet
- Context window heuristics are brittle (hardcoded per model)
- No scoped skill loading (cannot do per-directory guidance yet)
- Tool output capped at 200KB (works, but crude)
- No subagents or parallel tool execution

---

## The Takeaway

An agent loop is trivial. Send, collect tools, execute, loop.

The hard parts are orthogonal. Parsing safely, validating paths, budgeting context, streaming responsively. These are all solvable with straightforward code.

If you want to build one, start there. Implement the loop first. Get it working end-to-end. Then add one tool. Stream the response. Track context.

The real insight from dogfooding: once the harness is simple enough, an LLM can reason about it and extend it. That tight loop of asking, implementing, testing, refining reveals what is missing and makes the tool better. When feedback is immediate, the barrier between idea and implementation disappears.

And if you are using it to learn something new, pair mode keeps you in the driver's seat. Reduce friction without removing the struggle. The friction, the struggle, the slow accumulation of knowledge: these are still essential. They are not obstacles. They are the process itself.

---

## References

- [CodeCrafters "Build Your Own Claude"](https://app.codecrafters.io/courses/claude-code/overview)
- [Augur repository](https://github.com/bxrne/augur)
- [Coding vs Learning with LLMs](https://www.bxrne.com/blog/08-ai-coding) (on the mechanics of LLM-assisted development)
