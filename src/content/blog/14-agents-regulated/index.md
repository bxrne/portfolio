---
title: "When the spec writes itself: agents in regulated enterprise software"
description: "Why front-loaded SDLCs in regulated enterprise are a near-ideal substrate for agent-driven development, and what that means for Low-Code"
date: "May 09 2026"
---

> **TL;DR** In a front-loaded environment like regulated enterprise software, the requirements, validation procedures and design are thorough, leaving implementation much less ambiguous. Agents can take it from here, when set up with the right tools and guardrails.

For my final college residency I spent six months in a regulated enterprise software environment, and I used the slot to write my thesis on whether agents could be a real alternative to Low-Code platforms for building products. Given the necessity of up-front work on test cases, data modeling and validation procedures and regulatory conditions, it is a great setup for agents.

Agents are only getting better, as are the models and their context windows, tool usage, subagents and compaction make them much more robust on long running tasks and large codebase handling.

Building an orchestrator to handle a deliverable from documentation sources i.e JIRA tasks and Confluence documentation, allows you to take advantage of model improvements and agent harness improvements.

## Environment

The thing that makes regulated enterprise different from a startup or an open source project is how much of the work has already happened by the time anyone writes code. Requirements live in Jira or Polarion, traced back to a regulation or a customer commitment. Design lives in Confluence with reviewers and approvers attached. Validation lives in a test management tool with signed evidence per build. The implementation step, which is where most agent demos focus, is the smallest and least ambiguous slice of the SDLC. Of course using a tool like this on some projects would not be successful, but there are many straightforward everyday needs that can be solved, CRUD style services, tooling.

The asymmetry is exactly what makes it a good fit for agents. The blast radius of a bad implementation in this environment is bounded, because the design that constrains it has been reviewed, the tests that gate it are predefined, and the evidence pipeline that audits it is non-negotiable. An agent that can read the design, write code that conforms to it, and produce the evidence the validation suite expects is doing the job a graduate engineer does, just faster and without the inbox.

For environments where you need to self-host, run a central service across platforms (on-prem, cloud, hybrid), or have meaningful control over your data, agents are also a more honest fit than Low-Code. A Low-Code platform tends to be a SaaS with a runtime you do not own; an agent harness is just a process you point at a model endpoint, and the model endpoint can sit in your tenant.

Most firms of this size embrace a full productivity suite, whether that is M365 + Copilot, Atlassian, GitHub Enterprise or Azure DevOps. Agile is forced under large headcount to become more prescriptive and upfront planning heavy (LeSS, SAFE, DA) to ensure scale meets strategy, and all of that prescription gets written down in the tools above. That writing-down step is the gift; it means an agent given read access to the right corners of the suite has most of the spec it needs before the first prompt.

Skills and MCP integrations are what connect the dots here. Many clouds are now offering hosted MCP proxies, and there are several open source options as well. The pattern that worked for me was a remote MCP server per system of record (issue tracker, design doc tool, repo, build system, evidence store), each one inheriting the user's existing SSO and access. The agent never sees a credential it shouldn't, and the audit log on each system still sees a real user identity, not a service account that bypasses everything and becomes another part of the system to manage.

## Agents and orchestrators

An agent is a loop. It calls a HTTP API with a prompt, a model choice, sampling parameters and a list of tool definitions. It parses the streamed response, surfaces the content to the user's UI, dispatches any tool calls the model emits, and feeds the tool results back into the same conversation array on the next turn. The model can choose to terminate the loop with a final message, or it can keep going until a budget (tokens, wall time, tool calls, money) is exhausted. Every message stays in the array; that array is the entire state of the agent.

That is genuinely all an agent is. A few hundred lines of code in any reasonable language. The interesting parts are everywhere else: which tools you offer, how you describe them, how you sandbox their side effects, how you stream results, how you compact the conversation when it gets long, and how you decide when the loop should stop on its own versus stop on a hard limit.

Orchestrators are a higher-level system that manages multiple agents, potentially with different roles, tools and access. They coordinate workflows that need more than one agent because the work splits cleanly along role lines (planner, implementer, reviewer) or along context boundaries (frontend repo, backend repo, infra repo). The orchestrator is the thing that owns the worktree, the message bus and the budget, and that decides which agent gets the next turn.

In practice, you reach for an orchestrator three ways:

- **Shell out to a CLI.** Every serious agent ships a CLI you can spawn as a subprocess. Stdin is the prompt, stdout is the streamed answer, and exit code is the success signal. Crude, but it works in any language and integrates with any CI system that already knows how to run a command.
- **Embed via SDK.** Most also ship an SDK that gives you the loop as a function call, with hooks for tool calls and streaming. This is what you want when the agent is part of a larger long-running process.
- **Speak ACP.** Some have implemented the Agent Client Protocol, which lets an IDE or another agent run any compliant tool with a uniform interface. ACP is the most interesting of the three, because it removes the per-vendor integration code and turns "which agent" into a runtime decision.

A note on teams. I used multi-agent teams in some of my experiments, which is not a new idea, and it did prove useful, but it required worktrees to be solid. I built a small plugin system to give each team member an isolated worktree and a system prompt that contained the regulatory rules and house style. That separation of concerns matters more than the raw model choice, because environmental context is as important as the test cases themselves: an agent that knows it is writing code under ANSI/ISA 95 will reach for different patterns than one that is not told.

I used a small message bus accessible over MCP for inter-agent communication. It worked, but it needed more prompt engineering than I expected to make it natural; each model has a different standard of RLHF, so the calls land if they are the right shape and silently do not if they are not. I treated the bus as opportunistic rather than enforced. The shape that worked best was a leader plus N workers plus a polisher: the leader plans and breaks up the work, the workers do focused implementation in their own worktrees, and the polisher merges the worktrees, cleans up artefacts, runs the test suite, and gives you a clean branch to review. The polisher is not really a coding step; it is a janitor with taste.

The advantage of that shape is that it gives you a clean intervention point. If the leader has not broken the work down well, you catch it before any worker has touched a file. If a worker has gone off the rails, you only lose that worktree. The polisher means the diff you eventually look at is one diff, not five overlapping ones, which makes review tractable.

## Communication

From watching frontier agent harnesses improve over the last year or so, it is no longer obvious that explicit inter-agent communication is the right shape. Models have gotten very good at following long, structured threads of prompts. You can chain calls with different personas and steps inside a single conversation and get most of the benefits a multi-agent system promises, with none of the orchestration overhead. Tool use has improved enough that a single capable agent with the right tools often outperforms a team of specialised agents that have to coordinate.

Sub agents are usually just used for delegation but Amp's implementation has worked very well for me.

The Librarian: a sub-agent dedicated to research and codebase indexing, much more effective at tool calls than a generalist. From my experience the Librarian produces tighter diffs and fewer hallucinations on codebase-research tasks than the main agent, judged crudely by lines changed and quality of the resulting code. That suggests the right division is not "many peers" but "one driver, several specialists", where each specialist exists because its tooling and prompt are too narrow to live in the main agent's context.

The Oracle: a sub-agent designed for architectural reasoning and logical verification, operating as the "sanity check" to the Librarian's "discovery." While the Librarian finds the relevant files, the Oracle maps the ripple effects, identifying deep-seated state conflicts and dependency regressions that a generalist might overlook in a single-file context. By isolating high-reasoning models (like o3) within this specialized role, it avoids the "context drift" of the main driver.

If you do want communication, the ideal shape is a pub/sub system with inboxes and topics, so agents can broadcast without knowing who is listening. For writing code that is probably overkill, because tasks get split up by a planner anyway, but for analysis, large code review or bug discovery it could let agents collaborate without sharing a thread of execution. They post observations to the bus and let other agents decide if it is relevant, instead of you prompt-engineering the hand-off.

## Providers

OK, great, but where is the LLM coming from?

Your options are the big clouds (Azure, AWS, GCP), aggregators (GitHub Models, OpenRouter), and the labs themselves (Google, Anthropic, OpenAI, xAI). For a regulated enterprise the issue is mostly about data residency, contractual no-train guarantees, and which model versions you are allowed to pin. Pinning matters more than people admit; a silent model update can change your validation evidence overnight, and disrupt your evals with quality, latency or reasoning rate limits.

The practical answer was to route through a cloud the firm already has a contract with, even if that meant a slightly older model. The marginal capability was almost never worth the procurement loop.

## Harnesses

These are the harnesses I have tried:

- Copilot CLI (what I used for experiments)
- OpenCode
- Amp
- Codex
- Claude Code
- Gemini CLI
- Pi

There are more, but those are the ones I have real hours in. They all provide a headless, terminal-driven interface you can use to kick off a task from a script or a CI step. I would opt for ACP-compliant ones where possible, so you only have to maintain one integration and discovery becomes a matter of looking at the user's PATH (or a registry, of which there are now a few). Vendor lock at the harness layer is unnecessary.

You will almost certainly need to edit the config of these agents to allow specific read/write paths, network egress, or tool sets. Defaults are conservative for good reason, but conservative defaults are wrong for a CI runner that is supposed to land a PR.

Building your own harness is straightforward. A working one is an evening of work. A good one is months, because the non-trivial parts are streaming, context management, tool sandboxing, retry semantics, and graceful degradation when a model returns malformed tool calls. If you build your own you own all of that forever. Use someone else's harness unless you have a specific reason not to, many have plugin systems and SDKs which let you mess around if needed.

## What this means for Low-Code

The honest comparison is not "agents replace Low-Code"; it is "agents and Low-Code solve adjacent problems and the overlap is shrinking from the agent side". Low-Code wins when the artefact is a form, a workflow, or a dashboard, and the user is non-technical. Agents win when the artefact is code, the requirements are documented, and the validation is automatable. The middle, which is most internal tooling in a regulated firm, used to belong to Low-Code by default but for product lines that demand this up front work agents can contest.

The thesis I ended up writing was less "agents are better" and more "agents change which problems are worth solving with code at all". A team that previously would have stood up a Low-Code app to avoid the cost of a full backend will now consider a small service generated and maintained by an agent, because the cost line moved. That is a more interesting result than a benchmark, though a cost improvement is absolutely possible in the front loaded scenario, and was achieved.
