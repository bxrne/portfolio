---
title: "8 bit character encoding"
description: "IBM's encoding for data on mainframes"
date: "Nov 12 2025"
demoURL:  "#"
repoURL: "#"
--- 

## EBCDIC

EBCDIC (Extended Binary Coded Decimal Interchange Code) is an 8-bit character encoding used primarily on IBM mainframe and midrange computer systems. It was developed by IBM in the early 1960s as an extension of the earlier BCD (Binary-Coded Decimal) encoding. EBCDIC was designed to facilitate data interchange between IBM systems and to support the representation of both alphanumeric characters and control characters.

### Form 
EBCDIC uses 8 bits to represent each character, allowing for a total of 256 possible characters. The encoding includes uppercase and lowercase letters, digits, punctuation marks, special symbols, and control characters. However, the arrangement of characters in EBCDIC is different from the more widely used ASCII (American Standard Code for Information Interchange) encoding.

### Usage
EBCDIC was widely used in IBM mainframe environments for data storage, processing, and communication. It was particularly prevalent in industries such as banking, insurance, and government, where IBM mainframes were commonly employed. EBCDIC was used for text files, databases, and communication protocols within IBM systems.

You may see this encoding in financial systems, and any legacy system that has been running on IBM mainframes for a long time and now downstream exporters/providers need to deal with it.

It was run mainly on mainframes like the IBM System/360 and its successors, as well as IBM midrange systems like the AS/400 (now known as IBM i). Over time, EBCDIC has been largely supplanted by ASCII and Unicode in many applications, but it remains in use in certain legacy systems and environments.

DB2 databases running on z/OS, for example, often use EBCDIC encoding for character data. When transferring data between EBCDIC and ASCII systems, conversion is typically required to ensure proper representation of characters.

These machines likely are not going anywhere soon, so knowledge of EBCDIC is still relevant for maintaining and interacting with legacy systems as they are usually the core of the data processing in verticals: medical, finance, government.

### Differences from ASCII
One of the key differences between EBCDIC and ASCII is the arrangement of characters. For example
- In EBCDIC, the uppercase letters 'A' to 'Z' are represented by the hexadecimal values 0xC1 to 0xE9, while in ASCII, they are represented by 0x41 to 0x5A.
- The lowercase letters 'a' to 'z' in EBCDIC are represented by 0x81 to 0xA9, while in ASCII, they are represented by 0x61 to 0x7A.
- The digits '0' to '9 ' in EBCDIC are represented by 0xF0 to 0xF9, while in ASCII, they are represented by 0x30 to 0x39.
- Control characters also differ between the two encodings.

## How did i run into it?

Trying to parse some legacy data files to benchmark a parser I'm writing in OCaml; to then map to a domain model which could be persisted anywhere.
The files had a few different types, some were in ASCII and some encoded as EBCDIC. I used a pretty straightforward table mapping to convert the bytes to characters.

```ocaml 

let ebcdic_to_ascii_table = [|
  (* 0x00 - 0x0F *)
  '\000'; '\001'; '\002'; '\003'; '\004'; '\005'; '\006'; '\007';
  '\010'; '\011'; '\012'; '\013'; '\014'; '\015'; '\016'; '\017';
  (* 0x10 - 0x1F *)
  '\020'; '\021'; '\022'; '\023'; '\024'; '\025'; '\026'; '\027';
  '\028'; '\029'; '\030'; '\031'; '\032'; '\033'; '\034'; '\035';
  (* ... fill in the rest of the table ... *)
|]

let ebcdic_to_ascii (ebcdic_byte: char) : char =
  let index = Char.code ebcdic_byte in
  ebcdic_to_ascii_table.(index)
```

This function takes an EBCDIC-encoded byte (as a character) and returns the corresponding ASCII character by looking it up in the `ebcdic_to_ascii_table`. You would need to fill in the complete mapping table for all 256 possible byte values to make this function fully functional.

