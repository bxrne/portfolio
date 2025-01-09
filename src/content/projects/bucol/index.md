---
title: "BUCOL"
description: "Write a parser and accompanying lexical analysis tool for a syntactically limited language (BUCOL) "
date: "May 10 2024"
demoURL: "https://github.com/bxrne/BUCOL"
repoURL: "https://github.com/bxrne/BUCOL"
---


## Objective

Write a parser and accompanying lexical analysis tool for a syntactically limited language (BUCOL) using the tools provided by the course e.g. flex and bison. The tool should be able to parse a file written in BUCOL and output whether the program is correctly formed w.r.t. its structure. I have implemented Cuckoo hashing for the symbol table which gives constant time worst case lookups and insertions (amortized) which helps with collision resolution.

## Instructions

```bash
git clone https://github.com/theadambyrne/BUCOL.git
cd BUCOL

# build the project
./build.sh

# run the parser
./dist/parser < examples/good.bucol

# run parser in REPL mode
./dist/parser
```

## Language description

- Programs are monolithic using `BEGINNING.` and `END.` as delimiters.
- Statements are composed of declarations, assignments, inputs and outputs.
- Declarations are contained below the `BEGINNING.`, supporting only integers (null value = 0).
  - First define the capacity eith a string of Xs to represent number of digits.
  - Then the identifier which is any permutation of letters, hyphens and digits (must start with a character and not a contiguous series of Xs).
- Next is the `BODY.`
  - Assignments are of the form `MOVE <identifier> TO <identifier>.`
  - Addition is of the form `ADD <identifier> TO <identifier>.`
  - Input is of the form `INPUT <identifier1> <identifier2> <identifier3>.`
  - Output is of the form `PRINT "text to be printed"; <identifier>.`

**Note**: The language is case-insensitive and whitespace is ignored.


## Project structure

```yaml
├── build.sh # Compilation and linking script
├── examples # Example BUCOL programs from the assignment
│   ├── bad.bucol
│   ├── bigMoveLiteral.bucol
│   ├── bigMoveVar.bucol
│   └── good.bucol
├── out # Output directory for the build script
│   ├── lex.yy.c
│   ├── parser # Executable
│   ├── parser.tab.c
│   └── parser.tab.h
└── src
    ├── lexer.l # Lexical analysis
    ├── main.c # Operations and error handling
    ├── main.h
    ├── parser.y # Syntax analysis
    ├── cuckoo.c # Symbol table
    ├── cuckoo.h
```
