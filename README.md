# COMP3600/6466 Algorithms — Final Review (Weeks 7–12)

**Live site:** https://fzflz-sun.github.io/comp6466-final-review/

A static, bilingual revision site for the ANU course **COMP3600/6466 Algorithms**, covering the
Weeks 7–12 material that the final exam examines:

- binary search trees (traversal, predecessor/successor, insertion, deletion, divide and conquer)
- AVL trees (balance factors, LL/RR/LR/RL rotations, insertion and deletion)
- binary heaps and Fibonacci heaps
- hashing (chaining, universal hashing, perfect hashing, linear/quadratic/double probing)
- graph algorithms (BFS, DFS, topological sort, Dijkstra, Kruskal, Prim, Bellman-Ford)
- greedy algorithms (activity selection, exchange arguments, MST, greedy counterexamples)
- dynamic programming (rod cutting, LIS, LCS, jump game, games, egg dropping, coin change,
  subset sum, knapsack)

## What is inside

| Section | Contents |
|---|---|
| **Notes** | 68 bilingual knowledge cards. Each card has the definition, the key formula or recurrence, and an exam tip. Switch between **EN / 中文 / 双语** in the header. |
| **Practice** | 337 questions: 297 single-answer MCQs, 9 select-all MCQs, 31 long-answer / problem-solving questions. Filter by chapter, type, difficulty or progress; search; shuffle; paginate. |
| **Mock exam** | Three papers: a 100-mark 2025-format paper, a 60-mark 2024-style problem set, and a 40-question MCQ sprint. Timers, section marks, self-marking and a score summary. |

**Answers and knowledge-point indexes are hidden by default.** Each question has a
*Show answer* button and a separate *Knowledge points* button; both must be clicked. Progress
(*Got it* / *Review*) is stored in the browser's `localStorage`.

## Run locally

The site is plain HTML/CSS/JS with JSON data — no build step and no dependencies.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly with `file://` will not work because the browser blocks the
`fetch()` calls that load `assets/data/*.json`.

## Structure

```
index.html              overview, chapter cards, exam format
notes.html              bilingual knowledge notes
practice.html           filtered question bank
exam.html               timed mock papers
assets/css/style.css    visual system (light and dark themes)
assets/js/common.js     data loading, markdown, figures, question cards
assets/js/*.js          page controllers
assets/data/            questions.json, notes.json, exams.json, meta.json
```

## Scope and sources

The notes summarise the COMP3600/6466 lecture slides for Weeks 7–12 and the tutorial patterns.
The question formats follow the final papers from 2023, 2024 and 2025 (MCQ sections, BST/AVL
operations, hashing traces, Dijkstra/Kruskal/Prim tables, greedy counterexamples, DP design
questions). All questions are **newly written** in those formats; they are not reproductions of
past exam questions.

Two topics that appear in older papers are outside the W7–W12 slides and are therefore not in
the bank: red-black trees (2023/2024 papers, earlier material) and the P/NP/EXPTIME questions
(2023 paper, Weeks 1–6). They are called out on the overview page so the scope is explicit.

This is an unofficial study resource. Lecture content and past papers belong to the course
convenors and the Australian National University.

## Correctness

Numeric answers in the generated bank are computed by code and cross-checked against independent
brute-force implementations (subset enumeration for rod cutting, LIS/LCS, knapsack, subset sum,
coin change and MST counting; Bellman-Ford for Dijkstra distances; recursive minimax for the
two-player games; exhaustive search for the egg-dropping and jump-game tables). If you spot an
error, please open an issue.
