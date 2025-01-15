---
title: "was.nvim"
description: "Neovim plugin to solve 'What was I doing here' when moving between dirs"
date: "Jan 15 2025"
demoURL: "https://github.com/bxrne/was.nvim"
repoURL: "https://github.com/bxrne/was.nvim"
---


I have been using [Neovim](https://neovim.io/) alone for maybe 2 years, have used a few starter configs and learned some Lua.
I don't use a terminal multiplexer, my terminal ([Ghostty](https://ghostty.org/)) is fast enough with the tabs feature that I can get by without it.
For editor based tabs I actually use splits and buffers with some keymaps and its been working well for me.

Anyway the issue I had was with multiple sessions I couldn't remember what I was doing in a particular directory.
I use [ThePrimeagen/harpoon](https://github.com/ThePrimeagen/harpoon) which is really nice for small project / key files navigation and it is directory persistent. 
So taking the directory persistence idea I made a plugin that stores your intention in a directory and you can recall it later.
Usage: `:Was Implementing user authentication system` and then `:Was` to recall it.
Neovim plugin to solve "What was I doing here" when moving between dirs

Its small, all in Lua and is painfully simple.

## Features

- Store intentions per workspace (Git root or current directory)
- Persistent storage between Neovim sessions
- Minimal and fast
- Written in pure Lua

## Installation

### Prerequisites

- Neovim >= 0.8.0
- [nvim-lua/plenary.nvim](https://github.com/nvim-lua/plenary.nvim)
- [rcarriga/nvim-notify](https://github.com/rcarriga/nvim-notify) 

Using [lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  "bxrne/was.nvim",
  dependencies = {
	"rcarriga/nvim-notify", -- for notifications
    "nvim-lua/plenary.nvim", -- for path handling
  },
  config = true, -- calls require('was').setup()
},
```

Using [packer.nvim](https://github.com/wbthomason/packer.nvim):

```lua
use {
  "bxrne/was.nvim",
  requires = {
    "rcarriga/nvim-notify", -- for notifications
    "nvim-lua/plenary.nvim", -- for path handling
  },
  config = function()
    require('was').setup()
  end,
}
```

## Usage

Store your current intention:
```vim
:Was Implementing user authentication system
```

View your last stored intention:
```vim
:Was
```

The plugin automatically detects your workspace based on:
1. Git root directory (if in a Git repository)
2. Current working directory (if not in a Git repository)

Intentions are stored persistently in `~/.local/share/nvim/was/intentions.json`.

## Testing

```bash
nvim --headless -c "PlenaryBustedDirectory tests/ { minimal_init = './tests/minimal_init.lua' }"
```

