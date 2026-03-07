# Bonjourr Development Guide

Bonjourr is a minimalist and customizable "new tab" browser extension built using Deno.

1. Use **Deno** as its runtime and task runner. Never user `npm` or others. If deno fails at something, stop and ask for help.
2. Do not try to add dependencies, find a native solution.
3. Repeat yourself instead of writing difficult or unreadable code.
4. Run `deno task format` and `deno task types` after finishing changes. No need in-between edits.
