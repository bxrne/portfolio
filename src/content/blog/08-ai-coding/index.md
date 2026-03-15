---
title: "Coding vs Learning with LLMs"
description: "The good, the bad and the you're absolutely right!"
date: "Mar 13 2026"
demoURL: "#"
repoURL: "#"
---

> The good, the bad and the value of trudging through uncertainty

Software has always been in a state of change. Sometimes new paradigms appear and change how we model programs. Sometimes hardware improves and expands what's possible.

_This time the shift is about **access**._

Large language models have changed how we interact with code itself. What started as a kind of next-generation search engine is now showing up everywhere: in IDEs, operating systems, documentation pages, and increasingly as agents that can act on our behalf.

But coding and learning are not the same problem, and this distinction is worth taking seriously.

## Coding

There are a few useful ways to frame how we use LLMs when writing code.

### I know what the code should do

This is the happy path.

For example: adding a `GET` route to a web server. You can already imagine the diff and easily verify the new behaviour and any regressions. LLMs perform very well here. The intent is clear, the scope is small, and the output is easy to check.

This is where models genuinely shine. You describe a well-understood change, the model produces it, and you move on. There is very little risk here because your understanding of the problem acts as a safety net.

### I am making a change but I don't know the answer

This one is more complicated. Sometimes it is helpful, sometimes it falls apart entirely.

The model might produce something that _looks_ correct, but verifying it requires understanding the problem anyway. If you lack the context to evaluate what was generated, you are essentially trusting the output on faith. That can work, but it can also introduce subtle bugs that are harder to catch precisely because you did not fully understand the domain.

The tricky part here is that the output still _feels_ productive. You get code, it compiles, maybe it even passes a few tests. But the gap between "it works" and "it is correct" can be wide, and LLMs are not always good at surfacing that distinction.

### No change. I am searching

This is my favourite case.

Being able to chat with a codebase is a genuinely lovely way to get straight to the important parts. It is a fast way to surface relevant files, understand flows, and explore unfamiliar projects. Rather than grepping through thousands of lines or trying to trace a call stack manually, you can ask a pointed question and get directed to the right place.

I find this particularly useful when onboarding onto a new project or reviewing a pull request that touches parts of the system I am less familiar with. The model does not need to write any code here. It just needs to help me find the right starting point.

## Learning

This is the hard part.

Writing code was rarely the real bottleneck. Learning, understanding the problem, the system, and the tools, has always been the slow part. Whether it is learning what clients actually need out of the software or how to put it together in a way that holds up, the learning is where the real work lives.

Does getting information faster improve learning? Not necessarily. In some cases it might actually make things worse.

### The value of trudging

When you learn a new programming language or pick up a new library, the process usually looks something like this:

- Read some documentation
- Examine example code
- Try something
- Get stuck
- Try again

There is usually a lot of slow, uncertain trudging along the way. Direction is unclear and the implementation gets messier the deeper you go. That friction is not accidental. It is where most of the learning actually happens. The small discoveries you make along the way, the edge cases you bump into, the moments where something finally clicks after an hour of confusion: these are what build a real mental model.

LLMs can bypass that entire process.

You can "learn" a new library, generate a tool for something you just read on Hacker News, or rewrite something in a different language, all without really understanding what is going on underneath.

It creates a kind of **gamified feeling of progress** without necessarily building the underlying skill.

### The Duolingo problem

I have heard the same criticism of Duolingo. You complete a bunch of lessons and feel productive, but when you try to hold a real conversation you quickly discover the gap between recognition and production. You can match words to pictures all day long, but forming a sentence under pressure is a completely different skill.

The tool is not bad. It is very useful. But it is not the whole learning process. You still need to put yourself in uncomfortable situations where you have to produce, not just recognise.

LLMs are similar. They are powerful tools, but you still need to take responsibility for how you use them. The convenience they offer can quietly erode the conditions that make learning stick.

### Where I have struggled

I have struggled to find a good workflow where LLMs help me learn while building something completely new, especially when I can only see a few steps ahead.

The issue is not hallucinations. I am not particularly worried about a model convincing me that my program does something it does not.

The problem is building the **mental model**. My brain usually needs some trial and error loops before things stick. Reading about a concept is one thing; wrestling with it in code and failing a few times is what makes it real. That reinforcement learning loop (try, fail, adjust) is essential for me, and it is the part most at risk when an LLM is doing the heavy lifting.

## An Example

I do not have numbers to back this up. It is anecdotal, and LLMs struggle with reproducibility by design (which is partly why they are good at what they do). But this example has adequate complexity to illustrate the point.

### The project

I have been learning Zig for fun. I already know C so the transition felt natural enough. Rust would probably have been a steeper learning curve, but Zig's build system and standard library interested me more at the time.

I decided to explore some Linux primitives in practice:

- **Namespaces** for process isolation
- **eBPF** for syscall filtering (a very deep rabbit hole)
- **Filesystem isolation** for sandboxing
- **Process management** and UID/GID mapping

This ended up turning into a small sandboxing project that is now moderately complete. It handles network isolation, filesystem isolation, PID namespaces, root mapping, and syscall filtering. Eventually I would like to make it OCI-compatible and add cgroups for resource control.

### How I used the LLM

Instead of asking an LLM to write the code, I used it for something simpler: **direction and research**.

I iterated on a small TODO list of implementation steps:

- Clone the process into a new namespace
- Map UIDs and GIDs
- Create a minimal filesystem
- Configure a loopback interface
- Register BPF bytecode with the kernel
- Run the target binary (I used BusyBox for testing, as it wraps many of the tools I needed to verify things like network isolation)

Then I had the model gather relevant documentation: man pages, kernel docs, and Zig stdlib references. The Zig docs did a lot of the heavy lifting as it is fairly straightforward to search through the POSIX and Linux modules' signatures and work out how to use them.

### What I got out of it

The result was a roughly 50-line markdown file that I kept open beside my editor.

It reduced context switching while still forcing me to do the real work myself. Most of my time was spent reading the man pages and following references between them. Each man page would lead me to another, and slowly the picture filled in.

This was particularly useful because the concepts involved are not strictly linear. Sometimes you need to understand step **x + 3** before step **x** makes sense. The document kept the research organised without taking away the learning process itself.

It sounds like a small thing, but it is not.

It preserved the benefits of LLM assistance while keeping the steering wheel firmly in my hands. The model did not write the code. It acted more like a research assistant, someone I could clarify meaning or concepts with when the documentation alone was not enough.

Learning with the LLM as a **copilot** is absolutely possible. But humans are lazy, and it is very easy to hand over too much control without realising it.

## The Good and the Bad

### The good

I am a big fan of using LLMs while coding. There are many situations where they are extremely effective.

One of my favourite use cases is **TailwindCSS**. At this point I am convinced that writing Tailwind manually is no longer a human task. Let the model handle it.

They are also great for summarising long changelogs for upstream dependencies, which is useful given the creative interpretations of semantic versioning that sometimes appear in the wild. Keeping up with breaking changes across a dependency tree is tedious work, and models handle it well.

A lot of frontend work, at least on the client side, is already heavily assisted by models. The patterns are well-established, the frameworks are well-documented, and the scope of most changes is small enough that verification is straightforward.

### The bad

But the deeper layers of software engineering are still very human.

You cannot just clone Slack.

Once you are dealing with millions of concurrent users, persistent connections, WebSockets, regional replication, and fault tolerance, things get complicated quickly. At that point good system design matters far more than code generation. The architecture decisions, the tradeoffs around consistency and availability, the operational reality of running something at scale: these are problems that require deep understanding, not just code output.

Models also struggle with **soft constraints**. They do not understand things like development timelines, operational risk, or realistic load expectations. I have had sessions where the agent plans a four-week implementation before I tell it we are doing this in four minutes. It also tends to be poor at the kind of rough napkin maths engineers use to estimate system capacity.

You could theoretically solve this by giving the agent a simulation environment with metrics so it can test assumptions, but then you run into the classic problem: replicating production hardware and network conditions is non-trivial. Anyone who has optimised PostgreSQL locally only to see different behaviour in production will recognise this immediately.

### The tradeoff

The good news is that LLMs remove a lot of grunt work. They let me focus more attention on the parts of programming that are actually interesting.

I am not in the "please take my job" camp. I like writing code. It is fun. But I also appreciate having a kind of virtual intern available for repetitive tasks. When delivery speed matters, particularly on the job, you can decide which parts of a change are load-bearing and where your attention is most valuable, and then deliver faster.

The bad news is that we cannot always let it rip.

If we outsource too much of the difficult thinking, we risk losing the opportunity to build the mental models that actually make us better engineers. The skills that matter most, reasoning through systems, navigating ambiguity, making sound tradeoffs, are precisely the ones that require struggle to develop.

There is also the problem of **sycophancy**. Models tend to agree with you, even when you are objectively wrong. Sometimes they only change position after you correct them, and occasionally they will pivot even on a false correction. It is manageable, but the solution is the same as always: know the system yourself. You cannot catch a model agreeing with you incorrectly if you do not have your own understanding to compare against.

## TL;DR

LLMs make coding faster and often more enjoyable. But speed is not the same as understanding.

If we outsource the difficult parts of learning, we risk weakening the skills that actually make engineers valuable: building mental models, reasoning through systems, and navigating uncertainty.

The friction, the uncertainty, the slow accumulation of knowledge: those are still essential. They are not obstacles to be optimised away. They are the process itself.

Used well, LLMs can accelerate exploration without replacing it. The trick is simple but difficult in practice:

**Let them reduce friction, but not remove the struggle entirely.**
