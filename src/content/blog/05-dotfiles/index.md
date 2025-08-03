---
title: "dev setup"
description: "My collective configuration for dev on a Mac"
date: "Aug 3 2025"
demoURL:  "https://github.com/bxrne/dotfiles"
repoURL: "https://github.com/bxrne/dotfiles"
---

I had been using these tools for a while, but recently consolidated them into a single `dotfiles` repo. This lets me clone it onto a new machine and be ready in a minute or two (plugin install wait). My course has 5 residencies/internships and among other placements I have had, I have had many coldstarts so this setup is well tested.


```bash
git clone https://github.com/bxrne/dotfiles.git ~/dotfiles

ln -s ~/dotfiles/.zshrc ~/.zshrc
ln -s ~/dotfiles/.config/nvim ~/.config/nvim 
ln -s ~/dotfiles/.config/zellij ~/.config/zellij 
ln -s ~/dotfiles/.config/ghostty ~/.config/ghostty 
ln -s ~/dotfiles/.hammerspoon ~/.hammerspoon 
``` 



## Tools

### Hammerspoon

I use [Hammerspoon](https://www.hammerspoon.org/) to manage my window layout and keyboard shortcuts. It is a powerful tool that allows you to write Lua scripts to control your Mac. I have a few scripts for window management, launching applications, and other automation tasks.

I added modes to my Menu bar `NOR`, `APP` amd `WIN`.

`NOR` is normal mode, everything behaves unconfigured.

![menu-hammerspoon](./menu-hammerspoon.png)


`APP` allows me to hit `t` to open a terminal, `c` to open chrome etc for the top 5 apps I use.

```lua 
local apps = {
	c = "Google Chrome",
	t = "Ghostty",
	w = "Windows App",
	d = "Docker Desktop",
	f = "Finder",
	o = "Obsidian",
	s = "System Preferences",
}
for key, appName in pairs(apps) do
	appMode:bind({}, key, function()
		hs.application.launchOrFocus(appName)
	end)
end
```

`WIN` allows me to maximise, centre, and move windows to diagonal and horizontal halves of the screen.

```lua 
local snaps = {
	h = { 0, 0, 0.5, 1.0 }, -- left half
	l = { 0.5, 0, 0.5, 1.0 }, -- right half
	k = { 0, 0, 1.0, 0.5 }, -- top half
	j = { 0, 0.5, 1.0, 0.5 }, -- bottom half
	y = { 0, 0, 0.5, 0.5 }, -- top-left
	u = { 0.5, 0, 0.5, 0.5 }, -- top-right
	b = { 0, 0.5, 0.5, 0.5 }, -- bottom-left
	n = { 0.5, 0.5, 0.5, 0.5 }, -- bottom-right
}
```


### Ghostty 

Have been using the [Ghostty](https://ghostty.org) terminal for a while, its nice and minimal with a focus on speed, it also handles transparency well.

#### Z-Shell

I use Z-Shell as my shell for the completions and [omz](https://ohmyz.sh/) for the plugins and theming (rose-pine).
I have tried fish but I prefer the bash-ness of Z-Shell for scripting and the compatibility with other tools.
Usually you could install `nerdfetch`, `neofetch` or `nerdfetch` for a nice terminal prompt but installing something in place of what is a small script is not worth the second wait for it to run, so i wrote a small one that gives a nice simple prompt:

![fetch prompt preview](./fetch.png)

#### Editor 

Have gone back and forth on this one since day one. Started with Notepad++ then Sublime Text. Spent most time in VSCode but a few years ago I put in the effort to learn the Vim motions in VSCode and then switched to using [Neovim](https://neovim.io/) as my main editor. Mainly use harpoon here for file navigation with oil and fugitive for git integration.

**But AI?**

Yea. Cursor is great, so is Windsurf but Github Copilot serves it purpose on the auto-complete side and to be honest my LSP is often good enough.
I have found the AI tools better in the agent format where they can use bash tools (grep, sed, etc) without the bloat of a electron IDE and usually throw them in a different `git worktree` so they can work in parallel to my work without affecting it (can spin up a few virtual interns for easy JIRAs). My favourite so far is [sst/opencode](https:/github.com/sst/opencode) via the Github Copilot backend (free for students 🙌), though interested to see how Charm's crush evolves.

#### Terminal Multiplexer 

For work (VMs) and for personal I always have a few layouts/sessions to keep open (or running) so after using tmux for a while I switched to [Zellij](https://zellij.dev/) as it worked for me better without config (tmux had too many collisions for me and felt unintuitive in comparison). Easy navigation between sessions, panes, tabs and windows.

![dev setup](./dev.png)

If you're thinking, "wow, could've done proper work instead" - yea your right, but there is value in learning how your shell, editor and your machine works and you can write off the EffortEx for the DevEx long term ;).
