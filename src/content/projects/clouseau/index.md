---
title: "Clouseau"
description: "Inspector Clouseau Document Search Engine on Project Gutenberg directory"
date: "Dec 20 2024"
demoURL: "https://pkg.go.dev/github.com/Darragh-Grealish/clouseau"
repoURL: "https://github.com/Darragh-Grealish/clouseau"
---


Document repository search engine written in C++.
Using CMake, ctest, C++17 and Project Gutenberg.

## Document repository retrieval

Using the Project Gutenberg library you can use `download_gutenberg.py` to download (web scrape) the top 100 books from Project Gutenberg and store them in a subdirectory of the project root `archive` as plain text files.

## Description 

We needed a text source that was copyright and piracy-free, so we decided to use the Project Gutenberg library. The library contains a vast collection of books that are in the public domain. We implemented a 'download_gutenberg.py' script, located at the project root, that automates the retrieval of the top 100 books from Project Gutenberg. The script is compatible with pip for easy environment setup using the requirements.txt file. The downloaded books are stored in the `archive` subdirectory as plain text files, making them accessible for indexing.

The indexing process is managed by the index command, which scans all documents in the archive directory which is serialised to `clouseau.idx` in the archive directory. The indexer calculates the TF-IDF score for each word in the document, which is then stored in the index. The index is a CSV file with rows of word, total count, file1, count1, file2, count2, ..., fileN, countN. The word is the first column, followed by the total count of the word in all files, and the subsequent columns are the file name and the count of the word in that file.

In terms of testing and data structures, several important design choices were made:

- ArrayList: Instead of using the standard std::vector, we developed a custom ArrayList, which resizes by doubling the array size when full. This gave us more control over memory management.
- HashMap: Our custom HashMap was built using open addressing with double hashing for collision resolution, along with lazy deletion. The array automatically rehashes and doubles in size when the load factor exceeds 0.75, improving performance during high-volume operations.
- Set: To handle collections of unique elements effectively, we built a custom Set structure. This ensures no duplicates and provides critical features like intersections, insertions, and existence checks, optimizing operations that involve handling unique data sets.
- Trie: For Keyword AutoComplete we built a Trie, allowing us to traverse the tree spelling words using the given prefix. Nodes are a HashMap with a Character & pointer to next node. Nodes can be marked "isEndOfWord". Some nodes are both "isEndOfWord" and have children nodes. Complete with insert(word) & search(prefix) functions.

We incorporated the GoogleTest framework for streamlined and efficient management of unit tests which are orchestrated on GitHub Actions. The tests cover the ArrayList, HashMap, and Trie data structures, ensuring the reliability and robustness of our codebase (alongside CLI and Indexer tests).

## Project Analysis

1. Indexer Class:

- File Reading (file_word_count): O(N) per file (N = characters in the file).

- Indexing Directory (index_directory): O(F * N) overall (F = number of files), with concurrency reducing runtime based on available threads.

- Frequency Calculation: Insertion into the index is O(M) per unique word, leading to O(F * M) for all files.

2. Search Functionality:

- Processing queries has a complexity of O(T * L) (T = number of tokens, L = token length).

- The indexing phase runs at O(F * N), while search operations are approximately O(T * L). 

3. AutoComplete Functionality:

- Deserializing & Inserting into Trie O(W * L) (W = Number of words, L = Length of the word).

- Searching the prefix O(L * N) per prefix (L = length of prefix, N = number of nodes in subtree).

4. Trie:

- Insert Operation: O(L) per word (L = length of the word).

- Search Operation: O(L * N * 1) per prefix (L = length of prefix, N = number of nodes in subtree 1 = (amortized) HashMap look up of nodes).

5. ArrayList: Using dynamic allocation, the ArrayList has a complexity of O(1) for insertion and deletion, and O(N) for resizing (doubles). Inserts are worst case O(N) when resizing but amortized O(1) overall. Copy move and assignment operations are O(N).

6. Set: 

- Insert Operation: O(N) (N = number of elements in the set).

- Contains Operation: O(N) (N = number of elements in the set).

- Erase Operation: O(N) (N = number of elements in the set).

- Intersect Operation: O(N * M) (N = number of elements in the current set, M = number of elements in the other set).

- Resize Operation: O(N) (N = number of elements in the set).

7. HashMap:

Used bucket chaining for collision resolution, with lazy deletion and rehashing when the load factor exceeds 0.7.
Used [djb2](http://www.cse.yorku.ca/~oz/hash.html) for the primary hash function.

- Insert Operation: O(1) (average case), O(N) (worst case)  - Quadratic Probing

- Search Operation: O(1) (average case), O(N) (worst case) - Quadratic Probing

- Erase Operation: O(1) (average case), O(N) (worst case) - Quadratic Probing

- Resize Operation: O(N) (N = number of elements in the map).

- Rehash Operation: O(N) (N = number of elements in the map).


