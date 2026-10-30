/* Home page */
(function () {
  "use strict";
  const D = window.DSH;

  function render() {
    const { meta, questions } = D.state.data;
    const ui = D.ui, txt = D.txt;
    const byType = meta.types || {};
    const workouts = byType.workout || 0;
    const chapters = meta.chapters || [];
    const counts = meta.counts || {};
    const kpByChapter = {};
    (D.state.data.notes.kps || []).forEach((k) => { kpByChapter[k.chapter] = (kpByChapter[k.chapter] || 0) + 1; });
    const diff = [1, 2, 3].map((d) => questions.filter((q) => q.difficulty === d).length);
    const maxDiff = Math.max(...diff, 1);

    const main = document.getElementById("app");
    main.innerHTML = `
      <section class="hero wrap">
        <div class="hero-grid">
          <div>
            <div class="eyebrow">${ui("COMP3600 / COMP6466 · ANU · Final exam", "COMP3600 / COMP6466 · ANU · 期末考试")}</div>
            <h1>${ui("Everything from <span class='accent'>Weeks 7–12</span>,<br>on one revision desk.", "第 7–12 周的<span class='accent'>全部考点</span>，<br>都在这一张复习桌上。")}</h1>
            <p class="lead">${ui(
              `Bilingual knowledge notes, ${meta.total} questions in the exact formats used by the 2023–2025 finals, and full model answers. Answers and knowledge-point indexes stay hidden until you click.`,
              `中英双语知识点、${meta.total} 道严格遵循 2023–2025 期末题型的练习，以及完整参考答案。答案与知识点索引默认隐藏，点击后才显示。`
            )}</p>
            <div class="hero-actions">
              <a class="btn primary" href="practice.html">${ui("Start practising", "开始练习")} →</a>
              <a class="btn" href="notes.html">${ui("Read the notes", "阅读知识点")}</a>
              <a class="btn ghost" href="exam.html">${ui("Take a mock paper", "做一套模拟卷")}</a>
            </div>
          </div>
          <aside class="hero-card">
            <div class="eyebrow" style="margin-bottom:8px">${ui("2025 final format", "2025 年期末结构")}</div>
            <ul class="exam-spec">
              <li><span>${ui("Multiple choice · 10 × 4", "单项选择 · 10 × 4")}</span><b>40</b></li>
              <li><span>${ui("Binary search trees", "二叉搜索树")}</span><b>10</b></li>
              <li><span>${ui("Hash tables", "哈希表")}</span><b>10</b></li>
              <li><span>${ui("Graph algorithms", "图算法")}</span><b>18</b></li>
              <li><span>${ui("Dynamic programming", "动态规划")}</span><b>22</b></li>
            </ul>
            <p class="small muted" style="margin:12px 0 0">${ui("100 marks · 180 minutes · one A4 cheat sheet (both sides)", "100 分 · 180 分钟 · 一张 A4 双面小抄")}</p>
          </aside>
        </div>
        <div class="stats">
          <div class="stat"><div class="num">${meta.total}</div><div class="lbl">${ui("practice questions", "道练习")}</div></div>
          <div class="stat"><div class="num">${meta.kp_count}</div><div class="lbl">${ui("bilingual notes", "个双语知识点")}</div></div>
          <div class="stat"><div class="num">${chapters.length}</div><div class="lbl">${ui("chapters · W7–W12", "章 · 第 7–12 周")}</div></div>
          <div class="stat"><div class="num">${workouts}</div><div class="lbl">${ui("long-answer questions", "道解答题")}</div></div>
        </div>
      </section>

      <section class="wrap">
        <div class="section-head">
          <div>
            <div class="eyebrow">${ui("Coverage", "覆盖范围")}</div>
            <h2>${ui("Seven chapters, one exam", "七章内容，一场考试")}</h2>
          </div>
          <span class="small muted">${ui("Lecture slides W7–W12 · finals 2023, 2024, 2025", "W7–W12 课件 · 2023、2024、2025 期末")}</span>
        </div>
        <div class="chapter-grid">
          ${chapters.map((c) => `
            <article class="chapter-card">
              <span class="chapter-badge">${c.num}</span>
              <div class="week">${c.week}</div>
              <h3>${D.esc(txt(c.title_en, c.title_zh))}</h3>
              <p>${D.esc(txt(c.desc_en, c.desc_zh))}</p>
              <div class="meta">
                <span><b>${counts[c.id] || 0}</b> ${ui("questions", "题")}</span>
                <span><b>${kpByChapter[c.id] || 0}</b> ${ui("notes", "知识点")}</span>
              </div>
              <div class="chapter-links">
                <a href="notes.html#ch-${c.id}">${ui("Notes", "知识点")} →</a>
                <a href="practice.html?ch=${c.id}">${ui("Practise", "练习")} →</a>
              </div>
            </article>`).join("")}
        </div>
      </section>

      <section class="wrap">
        <div class="section-head">
          <div>
            <div class="eyebrow">${ui("Question mix", "题型分布")}</div>
            <h2>${ui("Built to feel like the real paper", "贴近真实试卷的练习结构")}</h2>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
          <div class="panel">
            <h3 style="margin-bottom:12px">${ui("By question type", "按题型")}</h3>
            <ul class="exam-spec">
              <li><span>${ui("Single-answer MCQ", "单项选择")}</span><b>${byType.single || 0}</b></li>
              <li><span>${ui("Select-all MCQ", "多项选择")}</span><b>${byType.multi || 0}</b></li>
              <li><span>${ui("Problem solving / long answer", "解答题 / 长答")}</span><b>${byType.workout || 0}</b></li>
            </ul>
          </div>
          <div class="panel">
            <h3 style="margin-bottom:12px">${ui("By difficulty", "按难度")}</h3>
            ${[1, 2, 3].map((d, i) => `
              <div style="display:flex;align-items:center;gap:10px;margin:8px 0;font-size:13px">
                <span style="width:92px;color:var(--muted)">${[ui("Warm-up", "基础"), ui("Exam level", "考试难度"), ui("Challenge", "挑战")][i]}</span>
                <div class="progress-track" style="flex:1;width:auto"><span style="width:${(diff[i] / maxDiff * 100).toFixed(1)}%"></span></div>
                <b style="font-family:var(--mono);font-size:12px;width:30px;text-align:right">${diff[i]}</b>
              </div>`).join("")}
            <p class="small muted" style="margin:12px 0 0">${ui("Difficulty follows the finals: application of a known algorithm, then novel DP or proof questions.", "难度对标期末：先考已知算法的应用，再考新的动态规划设计或证明题。")}</p>
          </div>
          <div class="panel">
            <h3 style="margin-bottom:12px">${ui("How to use this site", "使用建议")}</h3>
            <ol style="margin:0;padding-left:18px;font-size:13.5px">
              <li>${ui("Read one chapter's notes, then filter practice by that chapter.", "先读一章知识点，再按该章筛选练习。")}</li>
              <li>${ui("Write your answer before revealing the model answer.", "先自己作答，再点开参考答案。")}</li>
              <li>${ui("Use “Knowledge points” to jump back to the exact note.", "用“知识点索引”跳回对应笔记。")}</li>
              <li>${ui("Finish with a timed mock paper.", "最后限时完成一套模拟卷。")}</li>
            </ol>
          </div>
        </div>
      </section>

      <section class="wrap">
        <div class="panel" style="border-left:3px solid var(--gold)">
          <div class="eyebrow" style="color:var(--gold)">${ui("Scope note", "范围说明")}</div>
          <p style="margin-bottom:6px">${ui(
            "This site covers Weeks 7–12: binary search trees, AVL trees, heaps, hashing, graph algorithms, greedy algorithms and dynamic programming. The 2023 and 2024 papers also contained red-black tree questions from earlier material; they are outside this review's scope and are not included in the question bank.",
            "本站覆盖第 7–12 周：二叉搜索树、AVL 树、堆、哈希、图算法、贪心算法与动态规划。2023 与 2024 年试卷还包含更早章节的红黑树题；这不属于本次复习范围，题库中未收录。"
          )}</p>
          <p class="small muted" style="margin:0">${ui(
            "All questions are newly written in the style of the past papers; they are not copies of exam questions. Every numeric answer was generated and cross-checked by code.",
            "所有题目均按历年试卷风格新编，并非原题照搬。所有数值答案均由程序生成并交叉验证。"
          )}</p>
        </div>
      </section>`;
  }

  D.boot("index").then(() => {
    render();
    D.onLang(render);
  });
})();
