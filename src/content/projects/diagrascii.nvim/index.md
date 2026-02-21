---
title: "diagrascii.nvim"
description: "Neovim plugin for creating and editing ASCII diagrams with ease"
date: "Oct 16 2025"
repoURL: "https://github.com/bxrne/diagrascii.nvim"
---

Diagrascii helps you draw/move boxes and arrows as ASCII diagrams directly in text buffers. Perfect for quick sketches, documentation, or when you need visual diagrams without leaving your editor.

## Features

- Create ASCII blocks with custom text
- Move blocks in any direction with precision
- Insert arrows to connect elements
- Auto-align and clean up diagram spacing
- Fully customizable characters for borders and arrows

## Installation

Using [lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  "bxrne/diagrascii.nvim",
  config = function()
    require("diagrascii").setup({
      border_char = "+",
      horizontal_char = "-",
      vertical_char = "|",
      arrow_char = "->",
    })
  end,
}
```

## Configuration

- `border_char`: Border corner character (default "+")
- `horizontal_char`: Horizontal line character (default "-")
- `vertical_char`: Vertical line character (default "|")
- `arrow_char`: Arrow character (default "->")

## Usage

- `:DiagCreateBlock [text]` - Create a block at cursor (default "Block")
- `:DiagMoveBlock <direction> [amount]` - Move block (up/down/left/right, default 1)
- `:DiagAddArrow` - Insert arrow at cursor
- `:DiagAutoFix` - Align all blocks to left edge

## Examples

Create a block:

```
:DiagCreateBlock Hello
```

Results in:

```
+------+
| Hello |
+------+
```

Move right by 2:

```
:DiagMoveBlock right 2
```

Results in:

```
  +------+
  | Hello |
  +------+
```

Add arrow and auto-fix:

```
:DiagAddArrow
:DiagAutoFix
```

Inserts `->` and cleans spacing.

