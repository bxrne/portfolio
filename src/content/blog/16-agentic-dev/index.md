---
title: "How to Train Your Agent"
description: "Teaching an LLM to use my editor instead of talking at me from a sidebar. Chat interfaces are not the future of AI assisted coding, your editor's existing primitives are."
date: "Jul 15 2026"
demoURL: "#"
repoURL: "https://github.com/bxrne/clank.nvim"
---

**[repo](https://github.com/bxrne/clank.nvim)**

> Not a chat window bolted onto an editor, but the editor's own primitives put in the agent's hands.

With so much noise, it is hard to tell whether the way you are holding these new tools is the wrong way, and whether you are missing out because of it. There are so many AI IDEs, agent harnesses, and orchestrators in constant release (like JS frameworks before them) that it is hard to know what is actually optimal, or to sit with one long enough for it to become optimal for you.

It helps to remember _who_ is talking. When someone tells you to run more loops, or more agents, or more context, check whether they also sell tokens. Often enough they do, and it is worth knowing that before you take the advice.

Loops are not a metric. Neither is tokens burned or agents spawned. The only thing worth measuring is **value shipped**, and I will admit that is hard to measure, which is exactly how this always goes. We have been here with lines of code, with commit counts, with story points. The countable thing wins because it is countable, and then **the metric quietly becomes the message**. Tokens are just the current version of that, with the small difference that this time the metric is also the invoice.

When I use LLMs, it is through an agent harness in the terminal, or occasionally Claude Code from my phone. They are an efficient way of handing off work in the background. The promise from AI focused IDEs is that they will improve or drive your workflow with AI. That is impressive when it works, but a chat interface is not that. A chat window is a place you go to ask for help. It is not wired into the muscle memory you already have for navigating and changing code.

I built my workflow around my editor because its plugin system was a good fit for what I wanted. But working this way pointed me toward what I think is a better direction for writing software with LLMs in general.

## Staying in the editor

To be clear, none of what follows is novel because it avoids the browser. VSCode has done full GitHub review for years and does it well: check out the PR, read the diff, reply to comments, approve, all without leaving the window.

The difference is that none of those surfaces know about each other. The agent sits in a sidebar, the PR sits in a panel, your code sits in the editor. The agent can read your repo perfectly well, but it has no idea a reviewer asked anything, so you are the one carrying the comment over to it and carrying the answer back. **Three panes, one integration layer, and the integration layer is you.** That is still a context switch. It just happens to fit on a single monitor.

What I wanted instead was one surface, the one I already live in, with the agent reaching into it rather than sitting beside it. That turns out to depend less on the model than on what your editor hands it to hold onto.

## Currently

There are roughly three shapes on offer, and it is worth being fair to all of them, because each is good at something.

**The AI IDEs.** Cursor, Copilot, and the rest put a chat panel beside your code and a completion model inside it. Inline completion is genuinely great and I use it every day. The agent modes are not toys either: they call tools, run commands, edit across files, read diagnostics back. Anyone still describing them as autocomplete with a chat box has not opened one in a year.

What they do with the result is the part I care about. It goes into a transcript. The agent does real work and then reports it to a panel, and the panel is where you have to go to meet it: read the prose, scan the diff cards, click accept. The work happened in your repo, but the account of it lives somewhere your editor cannot navigate.

**The terminal harnesses.** Claude Code, Codex, Aider. Full repo, real tool access, able to go a long way on their own, which is why I use them for handoffs. But they are headless with respect to your editor. They do not know where your cursor is, which buffer you are in, or what you were halfway through. You hand off, you come back to a diff. The session you were sitting in is not part of the conversation.

**The orchestrators.** The conductor style tools that fan several agents out across worktrees and collect the results. This is the token pitch made concrete: more agents, more branches in flight, more output to review. They optimise the throughput of work you are not watching, which is a genuinely useful thing to want on the right day, and it is also the furthest you can stand from your code while still technically writing it.

What none of them do is reach into the editor session you are actually in. The IDEs sit beside it, the harnesses run underneath it, the orchestrators hover above it. **The middle is empty, and the middle is where I spend my day.**

## Why Neovim

It is my daily driver, and it already has a quickfix list, an addressable memory store built into the editor. That is a great mechanism for an agent to act through. The list can hold line numbers, comments, findings, whatever you point it at, and because every entry is addressable, an agent can drive your editor with it instead of just talking at you from a side panel.

### The list can carry commands

The part that makes it more than a list is that entries can carry commands, not just locations. Vim already ships with this idea: `:cdo` runs a command over every entry in the list, which is how people have been doing project wide substitutions for decades. Once an agent can write the list, it inherits that. It can put twelve call sites in front of you and attach the edit to run across them, or stage a sequence of checks you step through one at a time. You still press the key. The agent just did the work of figuring out what the list should contain, which is usually the tedious part.

This is the shape of the whole thing: the model is best pointed at gathering, locating, and drafting, while the decisions stay on your side of the keyboard. Not because the model cannot make them, but because that is where your attention is actually worth something.

### If you do not use Neovim

Which is a fair thing to be thinking by now. Why would any of this matter to you if you are never going to install a Vim plugin?

Because the argument is not really about Neovim. It is that your editor is already full of structures an agent could be writing into, and mostly it is not allowed to. VSCode has a problems panel, a diagnostics API, tasks, its own quickfix. Emacs has compilation buffers. JetBrains has inspections and scopes. Every one of those is a list of addressable places wired to keys your hands already know, and every one of them is a better delivery mechanism for a model's output than a chat bubble you copy out of.

> The model does not need a new home in your window. It needs write access to the ones you already navigate.

Neovim got there first for me because the plugin system made it a weekend rather than a project, and because it is what I know. The keymaps are already in my hands. That is not a technical argument and I am not going to dress it up as one. It just means the wiring was cheap for me, and it is probably cheap somewhere in whatever you already use.

## What clank.nvim does

Let me be precise about what is different here, because it is not autonomy and it is not tool calling. Every command below starts with me pressing a key, and I want it that way. Nor is the agent doing anything Cursor cannot: running commands, searching, reading diagnostics, editing across files. That argument is settled and the IDEs are fine at it.

The difference is **where the output lands**. Elsewhere the agent's work comes back as a transcript you read. Here it comes back as quickfix entries, which is to say it arrives in the same structure my compiler errors and grep hits have always arrived in, addressable, and walkable with keys my hands already know. Same tools, same trigger, different delivery.

So I wrote [clank.nvim](https://github.com/bxrne/clank.nvim), which lets you do things like this:

- **`:ClankFill`** on a selection. The selection gets replaced with the agent's solution. This is a great way of staying in the loop for tasks that are either fiddly enough to need real code, or where I want to guide the result closely.
- **`:ClankDo`** with an open ended prompt, for anything I know I can review quickly without babysitting it while it works.
- **`:ClankReview`** against a diff, either uncommitted changes or any past commit. The findings come back as quickfix entries, so you jump through them with `]q` and `[q` and fix each one in place instead of reading a wall of review comments.

Those are all things I ask for, and none of them are novel on their own. What I notice using them is that the answer never arrives as something to read. `:ClankReview` gives me twelve places to be, not twelve paragraphs about places to be.

Where this stops being a nicer autocomplete is GitHub. Checking out a pull request, pulling its review comments in, and putting them in front of me as things I can walk is a job I never wanted to do by hand, and it is worth walking through properly.

## Walking through a real pull request

Say a teammate opens PR #128, _"Add rate limiting to the ingest worker."_ Two reviewers have already left comments on it:

- One flags a **missing nil check** on line 42 of the worker file.
- Another questions whether the **retry backoff** resets correctly after a burst of failures.

Normally this means opening the browser, reading through the diff tab, clicking into each comment, then coming back to the editor to actually do anything about it. If you have used GitHub for a large PR you will know this is no fun.

### Pulling it in

Instead, from inside Neovim, I run:

```vim
:ClankPR 128
```

Under the hood this checks out the PR into its own git worktree, a sibling directory next to the repo, on a local branch, so my main working tree stays untouched. It also pulls every existing review comment straight into the quickfix list. So I am now looking at exactly what the two reviewers flagged, as two addressable entries I can jump between with `]q` and `[q`. No browser tab required.

### The missing nil check

I land on the line, select the surrounding block, and run:

```vim
:ClankFill
```

The agent writes the guard clause properly. I review it in a few seconds, it looks right, I move on. This is the happy path I described in [Coding vs Learning with LLMs](/blog/08-ai-coding): I already knew what the code should do, I could picture the diff before it arrived, and verifying it was trivial. That is exactly where models are worth reaching for.

### The retry backoff question

This one needs more thought than a quick fill. So I read the function myself, convince myself the logic is fine as written, and want to explain why in a reply. Cursor on the line, I run:

```vim
:ClankPRComment
```

A small floating window opens right there. I type a short reply explaining that the backoff resets on the next successful call, not on a timer, and press Enter to queue it. Nothing has gone to GitHub yet. I could keep drafting replies against other lines in the same pass if there were more to answer.

I read this one myself because it was small enough to hold in my head. On a bigger function I would have reached for `:ClankReview` first and let it fill the quickfix list with every place the backoff gets touched, then walked the entries and made the call myself. That is the same tool doing legwork rather than judgement, and it is worth reaching for whenever the legwork is the expensive part. Here it was not, so I skipped it.

### Submitting the review

With both issues handled, one fixed in the buffer and one answered inline, I run:

```vim
:ClankPRSubmit
```

A popup asks for a verdict: Approve, Request changes, or Comment. I pick approve. It asks for an optional summary, I add a one line note, and the whole thing goes up as a single GitHub review: my queued reply attached to its line, plus the approval, sent in one request. The fix itself still needs a normal commit and push from the worktree, but the conversation and the verdict never left the editor.

## Summary

That whole loop happened on one surface, the one I already live in. The PR arrived as quickfix entries, the same way compiler errors and grep results always have, so I walked it with keys my hands already knew. The agent fetched the branch, built the list, wrote the guard clause, and would have mapped the backoff call sites had the function been big enough to need it. That is most of the labour, and I never went anywhere to ask for it. What it did not do was decide whether the code was right.

Two things fall out of that.

**Nothing pulled me out of where I was.** The worktree got checked out beside the repo, the comments landed in a list I was already going to be using, and the review went back up from the same buffer. No tab, no panel, no pasting a function into a box to ask about it. The cost of a PR dropped to roughly the cost of a compiler error, and it dropped because the work came to me rather than the other way round.

**Each command picks a different distance.** `:ClankFill` keeps me on the line, reading every token as it lands. `:ClankDo` lets me stop watching for a bit. `:ClankReview` does the looking and leaves the deciding. Those are not degrees of trust in the model, they are degrees of how much attention the task is worth, and I get to choose per task instead of per tool. That is the part a chat window cannot really give you: it is always the same distance, and it is always slightly too far away.

However you feel about AI writing code, it is not going away, so the question worth arguing about is not how much to let it do but where to put it. Same place I landed [last time](/blog/08-ai-coding), from a different direction.
