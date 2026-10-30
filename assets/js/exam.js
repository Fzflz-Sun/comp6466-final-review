/* Timed mock papers */
(function () {
  "use strict";
  const D = window.DSH;
  const state = {
    paperId: "a",
    started: false,
    finished: false,
    remaining: 0,
    timer: null,
    startedAt: 0,
  };

  function papers() { return D.state.data.exams.papers; }
  function paper() { return papers().find((p) => p.id === state.paperId) || papers()[0]; }
  function byId(id) { return D.state.data.questions.find((q) => q.id === id); }
  function markKey(p) { return "c6466.exam." + p.id; }
  function loadMarks(p) {
    try { return JSON.parse(localStorage.getItem(markKey(p)) || "{}"); } catch (e) { return {}; }
  }
  function saveMarks(p, m) { localStorage.setItem(markKey(p), JSON.stringify(m)); }

  function fmtTime(sec) {
    sec = Math.max(0, sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function totalEntries(p) { return p.sections.reduce((a, s) => a + s.entries.length, 0); }

  function score(p) {
    const m = loadMarks(p);
    let got = 0, answered = 0;
    p.sections.forEach((s) => s.entries.forEach((e) => {
      if (m[e.qid] !== undefined) answered++;
      if (m[e.qid] === "got") got += e.marks;
    }));
    return { got, answered, marks: m };
  }

  function renderTabs() {
    const host = document.getElementById("paper-tabs");
    host.innerHTML = papers().map((p) => `
      <button type="button" data-paper="${p.id}" class="${p.id === state.paperId ? "on" : ""}">
        ${D.esc(D.txt(p.title_en, p.title_zh))}
        <small>${p.total} ${D.ui("marks", "分")} · ${p.duration} min</small>
      </button>`).join("");
    host.querySelectorAll("[data-paper]").forEach((b) => {
      b.addEventListener("click", () => {
        if (b.dataset.paper === state.paperId) return;
        stopTimer();
        state.paperId = b.dataset.paper;
        state.started = false;
        state.finished = false;
        state.remaining = paper().duration * 60;
        renderTabs();
        renderPaper();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function renderPaper() {
    const p = paper();
    if (!state.remaining) state.remaining = p.duration * 60;
    const host = document.getElementById("exam-root");
    host.innerHTML = `
      <div class="panel" style="margin-bottom:16px">
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;justify-content:space-between">
          <div style="max-width:70ch">
            <div class="eyebrow">${D.esc(D.txt(p.title_en, p.title_zh))}</div>
            <p style="margin:0 0 6px">${D.inline(D.txt(p.desc_en, p.desc_zh))}</p>
            <p class="small muted" style="margin:0">${D.ui(
              "Answers are hidden by default. Write your answer first, reveal the model answer, then mark the question as “got it” or “review”. The score is self-assessed.",
              "答案默认隐藏。先独立作答，再显示参考答案，然后把题目标记为“已掌握”或“待复习”。分数由自评得出。"
            )}</p>
          </div>
          <div class="btn-row">
            <button class="btn primary" id="start-btn" type="button">${state.started ? D.ui("Restart timer", "重新计时") : D.ui("Start timer", "开始计时")}</button>
            <button class="btn" id="finish-btn" type="button">${D.ui("Finish & score", "交卷并计分")}</button>
            <button class="btn ghost" id="reset-paper" type="button">${D.ui("Reset paper", "重置试卷")}</button>
          </div>
        </div>
      </div>
      <div class="exam-bar">
        <span class="timer" id="exam-timer">${fmtTime(state.remaining)}</span>
        <span class="small muted">${D.ui("remaining", "剩余")}</span>
        <span class="spacer"></span>
        <span class="small" id="exam-answered"></span>
        <span class="small" id="exam-score"></span>
        <span class="progress-track" style="width:160px"><span id="exam-progress" style="width:0%"></span></span>
      </div>
      <div id="exam-summary"></div>
      ${p.sections.map((s, si) => `
        <section class="exam-section" data-sec="${si}">
          <h2>${D.esc(D.txt(s.title_en, s.title_zh))}</h2>
          <div class="sec-meta">${s.marks} ${D.ui("marks", "分")} · ${s.entries.length} ${D.ui("question(s)", "小题")}</div>
          ${s.entries.map((e) => {
            const q = byId(e.qid);
            if (!q) return "";
            return `<div class="exam-entry" data-qid="${e.qid}" data-marks="${e.marks}" data-sec="${si}">
              ${e.label ? `<div class="small muted" style="margin:0 0 4px;font-family:var(--mono)">(${e.label}) ${e.marks} ${D.ui("marks", "分")}</div>` : ""}
              <div class="exam-card-host"></div>
            </div>`;
          }).join("")}
        </section>`).join("")}`;

    // insert cards
    p.sections.forEach((s, si) => {
      s.entries.forEach((e) => {
        const q = byId(e.qid);
        const holder = host.querySelector(`.exam-entry[data-qid="${e.qid}"][data-sec="${si}"] .exam-card-host`);
        if (!holder || !q) return;
        holder.appendChild(D.questionCard(q, { exam: true, marks: e.marks }));
        const row = D.el("div", "qactions");
        row.style.marginTop = "-4px";
        const mark = D.el("div", "selfmark");
        const got = D.el("button", "", `${D.ui("Got it", "已掌握")} +${e.marks}`);
        got.type = "button";
        const rev = D.el("button", "", `${D.ui("Review", "待复习")} 0`);
        rev.type = "button";
        mark.appendChild(got); mark.appendChild(rev);
        row.appendChild(mark);
        row.appendChild(D.el("span", "spacer"));
        row.appendChild(D.el("span", "small muted", D.ui(`worth ${e.marks} marks`, `本题 ${e.marks} 分`)));
        holder.appendChild(row);

        const paint = () => {
          const m = loadMarks(paper());
          const v = m[e.qid];
          got.classList.toggle("on-got", v === "got");
          rev.classList.toggle("on-review", v === "review");
          const card = holder.querySelector(".qcard");
          if (card) {
            card.classList.toggle("status-got", v === "got");
            card.classList.toggle("status-review", v === "review");
          }
        };
        const set = (val) => {
          const p2 = paper();
          const m = loadMarks(p2);
          if (m[e.qid] === val) delete m[e.qid]; else m[e.qid] = val;
          saveMarks(p2, m);
          paint();
          updateBar();
        };
        got.addEventListener("click", () => set("got"));
        rev.addEventListener("click", () => set("review"));
        paint();
      });
    });

    document.getElementById("start-btn").addEventListener("click", startTimer);
    document.getElementById("finish-btn").addEventListener("click", () => finish(true));
    document.getElementById("reset-paper").addEventListener("click", resetPaper);
    updateBar();
  }

  function updateBar() {
    const p = paper();
    const sc = score(p);
    const total = totalEntries(p);
    const elA = document.getElementById("exam-answered");
    const elS = document.getElementById("exam-score");
    const elP = document.getElementById("exam-progress");
    const elT = document.getElementById("exam-timer");
    if (!elA) return;
    elA.textContent = D.ui(`${sc.answered}/${total} marked`, `已标记 ${sc.answered}/${total}`);
    elS.textContent = "· " + D.ui(`${sc.got} / ${p.total} marks`, `${sc.got} / ${p.total} 分`);
    elP.style.width = (total ? (sc.answered / total) * 100 : 0).toFixed(1) + "%";
    elT.textContent = fmtTime(state.remaining);
    elT.style.color = state.remaining < 300 ? "var(--bad)" : "var(--accent)";
  }

  function startTimer() {
    const p = paper();
    if (state.started) {
      if (!confirm(D.ui("Restart the timer from the full duration?", "要从完整时长重新计时吗？"))) return;
    }
    stopTimer();
    state.started = true;
    state.finished = false;
    state.remaining = p.duration * 60;
    state.startedAt = Date.now();
    document.getElementById("exam-summary").innerHTML = "";
    tick();
    state.timer = setInterval(tick, 1000);
    document.getElementById("start-btn").textContent = D.ui("Restart timer", "重新计时");
  }

  function tick() {
    if (!state.started) return;
    const elapsed = Math.round((Date.now() - state.startedAt) / 1000);
    state.remaining = Math.max(0, paper().duration * 60 - elapsed);
    updateBar();
    if (state.remaining === 0) {
      stopTimer();
      finish(false);
    }
  }
  function stopTimer() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    state.started = false;
  }

  function finish(confirmFirst) {
    const p = paper();
    if (confirmFirst && !confirm(D.ui("Finish this paper and score it?", "交卷并计分吗？"))) return;
    stopTimer();
    state.finished = true;
    const sc = score(p);
    const total = totalEntries(p);
    const rows = p.sections.map((s) => {
      const entryMarks = s.entries.reduce((a, e) => a + e.marks, 0);
      const got = s.entries.filter((e) => sc.marks[e.qid] === "got").reduce((a, e) => a + e.marks, 0);
      return `<tr><td>${D.esc(D.txt(s.title_en, s.title_zh))}</td><td>${got}</td><td>${entryMarks}</td></tr>`;
    }).join("");
    document.getElementById("exam-summary").innerHTML = `
      <div class="panel" style="border-left:3px solid var(--accent);margin-bottom:10px">
        <div class="eyebrow">${D.ui("Result", "成绩")}</div>
        <div class="scorebox">
          <div class="stat"><div class="num">${sc.got}</div><div class="lbl">${D.ui("marks (self-assessed)", "分（自评）")}</div></div>
          <div class="stat"><div class="num">${p.total}</div><div class="lbl">${D.ui("total marks", "总分")}</div></div>
          <div class="stat"><div class="num">${sc.answered}</div><div class="lbl">${D.ui(`of ${total} marked`, `已标记 / ${total}`)}</div></div>
          <div class="stat"><div class="num">${fmtTime(p.duration * 60 - state.remaining)}</div><div class="lbl">${D.ui("time used", "用时")}</div></div>
        </div>
        <table><thead><tr><th>${D.ui("Section", "部分")}</th><th>${D.ui("Got", "得分")}</th><th>${D.ui("Out of", "满分")}</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="small muted" style="margin:0">${sc.answered < total
          ? D.ui("You have not marked every question yet; unmarked questions score zero.", "还有题目未标记；未标记的题目按 0 分计。")
          : D.ui("All questions marked. Review the “review” items before the exam.", "所有题目均已标记。考前重点复习“待复习”的题目。")}</p>
      </div>`;
    document.getElementById("exam-summary").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetPaper() {
    if (!confirm(D.ui("Clear the timer and all self-marks for this paper?", "要清除本卷的计时与所有自评标记吗？"))) return;
    stopTimer();
    localStorage.removeItem(markKey(paper()));
    state.remaining = paper().duration * 60;
    state.started = false;
    state.finished = false;
    document.getElementById("exam-summary").innerHTML = "";
    renderPaper();
  }

  function renderStatics() {
    document.getElementById("exam-eyebrow").textContent = D.ui("Mock papers", "模拟卷");
    document.getElementById("exam-title").textContent = D.ui("Mock exam", "模拟考试");
    document.getElementById("exam-lead").textContent = D.ui(
      "Three papers in the formats of the past finals. Start the timer, work on paper, then reveal the model answers and mark yourself.",
      "三套按历年期末格式组装的模拟卷。开始计时、在纸上作答，然后显示参考答案并自评。"
    );
  }

  D.boot("exam").then(() => {
    const qp = new URLSearchParams(location.search);
    if (qp.get("paper")) state.paperId = qp.get("paper");
    state.remaining = paper().duration * 60;
    renderStatics();
    renderTabs();
    renderPaper();
    D.onLang(() => {
      renderStatics();
      renderTabs();
      renderPaper();
    });
  });
})();
