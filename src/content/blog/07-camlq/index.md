---
title: "json via the camel, RFC 8259"
description: "Parsing and querying JSON with OCaml"
date: "Oct 25 2025"
demoURL:  "https://github.com/bxrne/camlq"
repoURL: "https://github.com/bxrne/camlq"
--- 

# why

A useful way to learn a new language is to implement a project in it, something where you only need lib docs and syntax references.
Here I'm looking to learn OCaml, a functional language with strong types and some OOP features. Have previously attempted Haskell but it was very inergonomic.

OCaml is a good fit here as we are building a parser and a lightweight query engine for JSON blobs. Ocaml's pattern matching and recursion will make it a nice way to write modules of functions that are side effect free. Side effects are essentially anything that modifies state outside of the function scope, like writing to a file or printing to console (we can constrain this to the main function - here thats stdin -> parser -> query engine -> stdout).

RFCs are a good project source as they are well defined and have test cases. JSON is a widely used data format for web APIs and config files, so its a good one to start with. We can also benchmark against existing JSON libraries in OCaml to see how we fare, or simply just against `jq`.


# rfc 8259

The JSON spec is defined in [RFC 8259](https://datatracker.ietf.org/doc/html/rfc8259) and is fairly straightforward. 

The main types are:
- object: unordered set of name/value pairs
- array: ordered collection of values
- value: string, number, object, array, true, false, null
- string: sequence of Unicode characters
- number: integer or floating point
Whitespace is allowed between any pair of tokens.
The grammar is defined in the RFC, and we can use that to build our parser.

OCaml has ADTs (algebraic data types) which are perfect for representing the JSON types. We can define a type for each JSON type and then use pattern matching to parse and query the JSON data. 


# parsing etc

While this is mainly a parser project, it will be packaged like a tool such as `jq` or `yq` where you can pass in a JSON file and a query string to extract data. So we definitely need a lexer to tokenize the input string, a parser to turn an array of tokens into a AST (abstract syntax tree), and a query engine to traverse the AST and extract data based on the query string, which can be regex based or dot notation based (we could do another lexer/parser for this but given the low complexity of the potential QL we can do it with simple string functions).


