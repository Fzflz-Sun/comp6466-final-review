/* Practice page with filters, pagination and hidden answers */
(function () {
  "use strict";
  const D = window.DSH;
  const PER = 10;

  const S = {
    ch: "all", kp: "all", type: "all", diff: "all", status: "all", q: "",
    page: 1, order: null, randomIds: null,
  };

  function chapterName(id) {
    const c = (D.state.data.meta.chapters || []).find((x) => x.id === id);
    return c ? D.txt(c.title_en, c.title_zh) : id;
  }

  function kpName(id) {
    const k = (D.state.data.notes.kps || []).find((x) => x.id === id);
    return k ? D.txt(k.title_en, k.title_zh) : id;
  }

  function allQuestions() { return D.state.data.questions; }

  function filtered() {
    const q = S.q.trim().toLowerCase();
    let list = allQuestions().filter((x) => {
      if (S.ch !== "all" && x.chapter !== S.ch) return false;
      if (S.kp !== "all" && !(x.kp || []).includes(S.kp)) return false;
      if (S.type !== "all" && x.type !== S.type) return false;
      if (S.diff !== "all" && String(x.difficulty) !== S.diff) return false;
      const p = D.getProgress(x.id);
      if (S.status === "got" && p !== "got") return false;
      if (S.status === "review" && p !== "review") return false;
      if (S.status === "unseen" && p) return false;
      if (q) {
        const hay = [x.id, x.topic_en, x.topic_zh, D.plain(x.stem_en), D.plain(x.stem_zh), ...(x.options || []).map((o) => D.plain(o.en) + " " + D.plain(o.zh))]
          .join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (S.randomIds) {
      const rank = new Map(S.randomIds.map((id, i) => [id, i]));
      list = list.filter((x) => rank.has(x.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
    } else if (S.order) {
      const rank = new Map(S.order.map((id, i) => [id, i]));
      list = list.filter((x) => rank.has(x.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
    }
    return list;
  }

  function syncURL() {
    const p = new URLSearchParams();
    if (S.ch !== "all") p.set("ch", S.ch);
    if (S.kp !== "all") p.set("kp", S.kp);
    if (S.type !== "all") p.set("type", S.type);
    if (S.diff !== "all") p.set("diff", S.diff);
    if (S.status !== "all") p.set("status", S.status);
    if (S.q) p.set("q", S.q);
    const qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }

  function progressLine(total) {
    const all = allQuestions();
    const got = all.filter((x) => D.getProgress(x.id) === "got").length;
    const rev = all.filter((x) => D.getProgress(x.id) === "review").length;
    document.getElementById("progress-text").textContent =
      D.ui(`${got} got · ${rev} to review`, `已掌握 ${got} · 待复习 ${rev}`);
    document.getElementById("progress-fill").style.width = (all.length ? (got / all.length) * 100 : 0).toFixed(1) + "%";
    document.getElementById("result-count").textContent =
      D.ui(`${total} question${total === 1 ? "" : "s"} match`, `共 ${total} 道题符合条件`);
  }

  function filterSummary(list) {
    const out = document.getElementById("filter-summary");
    if (!out) return;
    const bits = [S.ch === "all" ? D.ui("All chapters", "全部章节") : D.plain(chapterName(S.ch))];
    if (S.kp !== "all") bits.push(D.plain(kpName(S.kp)));
    if (S.type !== "all") bits.push(S.type === "multi" ? D.ui("Multiple select", "不定项选择") : D.ui("Problem solving", "解答题"));
    if (S.diff !== "all") bits.push([D.ui("Warm-up", "基础"), D.ui("Exam level", "考试难度"), D.ui("Challenge", "挑战")][Number(S.diff) - 1] || "");
    if (S.status !== "all") bits.push(S.status === "got" ? D.ui("Got it", "已掌握") : S.status === "review" ? D.ui("Review", "待复习") : D.ui("Not marked", "未标记"));
    if (S.q) bits.push(`“${S.q}”`);
    out.textContent = `${bits.join(" · ")} · ${D.ui(`${list.length} question${list.length === 1 ? "" : "s"}`, `${list.length} 道题`)}`;
  }

  function pageButtons(totalPages, current) {
    const pager = document.getElementById("pager");
    pager.innerHTML = "";
    if (totalPages <= 1) return;
    const add = (label, page, disabled, on) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (disabled) b.disabled = true;
      if (on) b.classList.add("on");
      b.addEventListener("click", () => { S.page = page; renderList(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      pager.appendChild(b);
    };
    add("‹", Math.max(1, current - 1), current === 1, false);
    const pages = new Set([1, totalPages, current, current - 1, current + 1, current - 2, current + 2]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    let last = 0;
    sorted.forEach((p) => {
      if (p - last > 1) {
        const s = document.createElement("span");
        s.textContent = "…";
        pager.appendChild(s);
      }
      add(String(p), p, false, p === current);
      last = p;
    });
    add("›", Math.min(totalPages, current + 1), current === totalPages, false);
  }

  function renderList() {
    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length / PER));
    if (S.page > totalPages) S.page = totalPages;
    const start = (S.page - 1) * PER;
    const pageItems = list.slice(start, start + PER);
    const host = document.getElementById("list");
    host.innerHTML = "";
    if (!pageItems.length) {
      host.innerHTML = `<div class="empty"><p>${D.ui("No questions match these filters.", "没有符合筛选条件的题目。")}</p>
        <button class="btn" id="empty-reset">${D.ui("Clear filters", "清除筛选")}</button></div>`;
      const b = document.getElementById("empty-reset");
      if (b) b.addEventListener("click", reset);
    } else {
      pageItems.forEach((q) => host.appendChild(D.questionCard(q, { exam: false })));
    }
    progressLine(list.length);
    pageButtons(totalPages, S.page);
    document.getElementById("result-count").textContent = list.length
      ? D.ui(
        `${list.length} question${list.length === 1 ? "" : "s"} · showing ${start + 1}–${Math.min(start + PER, list.length)}`,
        `共 ${list.length} 道题 · 显示第 ${start + 1}–${Math.min(start + PER, list.length)} 道`
      )
      : D.ui("No questions match these filters.", "没有符合筛选条件的题目。");
    filterSummary(list);
  }

  function reset() {
    S.ch = "all"; S.kp = "all"; S.type = "all"; S.diff = "all"; S.status = "all"; S.q = ""; S.page = 1;
    S.order = null; S.randomIds = null;
    document.getElementById("f-ch").value = "all";
    buildKpSelect();
    document.getElementById("f-kp").value = "all";
    document.getElementById("f-type").value = "all";
    document.getElementById("f-diff").value = "all";
    document.getElementById("f-status").value = "all";
    document.getElementById("f-q").value = "";
    syncURL();
    renderList();
  }

  function readURL() {
    const p = new URLSearchParams(location.search);
    S.ch = p.get("ch") || "all";
    S.kp = p.get("kp") || "all";
    S.type = p.get("type") || "all";
    if (S.type === "single") S.type = "multi";
    S.diff = p.get("diff") || "all";
    S.status = p.get("status") || "all";
    S.q = p.get("q") || "";
    if (p.get("random")) {
      const n = Math.max(1, Math.min(50, parseInt(p.get("random"), 10) || 10));
      S.randomIds = [...allQuestions()].sort(() => Math.random() - 0.5).slice(0, n).map((x) => x.id);
    }
  }

  function buildChapterSelect() {
    const sel = document.getElementById("f-ch");
    sel.innerHTML = `<option value="all">${D.ui("All chapters", "全部章节")}</option>` +
      D.state.data.meta.chapters.map((c) =>
        `<option value="${c.id}">${D.esc(D.txt(c.title_en, c.title_zh))}</option>`).join("");
    sel.value = S.ch;
  }

  function buildKpSelect() {
    const sel = document.getElementById("f-kp");
    if (!sel) return;
    const notes = D.state.data.notes;
    const counts = {};
    allQuestions().forEach((q) => (q.kp || []).forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
    const kps = (notes.kps || []).filter((k) => S.ch === "all" || k.chapter === S.ch);
    if (S.kp !== "all" && !kps.some((k) => k.id === S.kp && counts[k.id])) S.kp = "all";
    const opt = (k) => `<option value="${k.id}"${counts[k.id] ? "" : " disabled"}>${D.esc(D.plain(D.txt(k.title_en, k.title_zh)))} (${counts[k.id] || 0})</option>`;
    let html = `<option value="all">${D.ui("All knowledge points", "全部知识点")}</option>`;
    if (S.ch === "all") {
      (notes.chapters || []).forEach((c) => {
        const group = kps.filter((k) => k.chapter === c.id);
        if (!group.length) return;
        html += `<optgroup label="${D.esc(D.plain(D.txt(c.title_en, c.title_zh)))}">` + group.map(opt).join("") + `</optgroup>`;
      });
    } else {
      html += kps.map(opt).join("");
    }
    sel.innerHTML = html;
    sel.value = S.kp;
  }

  function renderStaticTexts() {
    document.getElementById("practice-eyebrow").textContent = D.ui("Question bank", "题库");
    document.getElementById("practice-title").textContent = D.ui("Practice", "练习");
    document.getElementById("practice-lead").innerHTML = D.ui(
      `All MCQs are multiple-select. Correct option +M/k; incorrect option −M/(n−k); minimum 0 per question. Example: 1 mark, 3 correct + 2 wrong → +1/3 and −1/2. Answers and knowledge-point indexes are hidden by default.`,
      `所有选择题均为不定项。正确选项 +M/k，错误选项 −M/(n−k)，每题最低 0 分。例：1 分题有 3 个正确、2 个错误选项 → 正确 +1/3、错误 −1/2。参考答案与知识点索引默认隐藏。`
    );
    document.querySelector("#f-type option[value=all]").textContent = D.ui("All types", "全部题型");
    document.querySelector("#f-type option[value=multi]").textContent = D.ui("Multiple select", "不定项选择");
    document.querySelector("#f-type option[value=workout]").textContent = D.ui("Problem solving", "解答题");
    document.querySelector("#f-diff option[value=all]").textContent = D.ui("All levels", "全部难度");
    document.querySelector("#f-diff option[value='1']").textContent = D.ui("Warm-up", "基础");
    document.querySelector("#f-diff option[value='2']").textContent = D.ui("Exam level", "考试难度");
    document.querySelector("#f-diff option[value='3']").textContent = D.ui("Challenge", "挑战");
    document.querySelector("#f-status option[value=all]").textContent = D.ui("All", "全部");
    document.querySelector("#f-status option[value=got]").textContent = D.ui("Got it", "已掌握");
    document.querySelector("#f-status option[value=review]").textContent = D.ui("Review", "待复习");
    document.querySelector("#f-status option[value=unseen]").textContent = D.ui("Not marked", "未标记");
    document.getElementById("btn-shuffle").textContent = D.ui("Shuffle", "随机打乱");
    document.getElementById("btn-reset").textContent = D.ui("Reset", "重置");
    document.getElementById("f-q").placeholder = D.ui("Search a stem, topic or id…", "搜索题干、考点或题号…");
    document.getElementById("lbl-ch").textContent = D.ui("Chapter", "章节");
    document.getElementById("lbl-kp").textContent = D.ui("Knowledge point", "知识点");
    document.getElementById("filter-toggle-label").textContent = D.ui("Filters", "筛选");
    document.getElementById("lbl-type").textContent = D.ui("Type", "题型");
    document.getElementById("lbl-diff").textContent = D.ui("Difficulty", "难度");
    document.getElementById("lbl-status").textContent = D.ui("Progress", "进度");
    document.getElementById("lbl-q").textContent = D.ui("Search", "搜索");
  }

  function bind() {
    const refresh = () => { S.page = 1; S.order = null; S.randomIds = null; syncURL(); renderList(); };
    document.getElementById("f-ch").addEventListener("change", (e) => { S.ch = e.target.value; S.kp = "all"; buildKpSelect(); refresh(); });
    document.getElementById("f-kp").addEventListener("change", (e) => { S.kp = e.target.value; refresh(); });
    document.getElementById("f-type").addEventListener("change", (e) => { S.type = e.target.value; refresh(); });
    document.getElementById("f-diff").addEventListener("change", (e) => { S.diff = e.target.value; refresh(); });
    document.getElementById("f-status").addEventListener("change", (e) => { S.status = e.target.value; refresh(); });
    let timer;
    document.getElementById("f-q").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { S.q = e.target.value; refresh(); }, 250);
    });
    document.getElementById("btn-shuffle").addEventListener("click", () => {
      S.randomIds = filtered().sort(() => Math.random() - 0.5).map((x) => x.id);
      S.page = 1;
      renderList();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.getElementById("btn-reset").addEventListener("click", reset);
    document.addEventListener("progress-change", () => progressLine(filtered().length));
  }

  let lastY = window.scrollY;
  let collapseLock = 0;
  function setCollapsed(v, manual) {
    const bar = document.getElementById("filter-toolbar");
    if (!bar) return;
    const changed = bar.classList.contains("collapsed") !== v;
    bar.classList.toggle("collapsed", v);
    const btn = document.getElementById("btn-filter-toggle");
    if (btn) {
      btn.setAttribute("aria-expanded", String(!v));
      btn.title = v ? D.ui("Show filters", "展开筛选") : D.ui("Hide filters", "收起筛选");
    }
    const row = document.getElementById("filter-fields");
    if (row) {
      row.setAttribute("aria-hidden", String(v));
      row.inert = v;
    }
    if (changed) {
      collapseLock = Date.now() + (manual ? 2000 : 450);
      setTimeout(() => { lastY = window.scrollY; }, 300);
    }
    if (manual) collapseLock = Date.now() + 2000;
  }

  function initCollapse() {
    const bar = document.getElementById("filter-toolbar");
    const btn = document.getElementById("btn-filter-toggle");
    if (!bar || !btn) return;
    btn.addEventListener("click", () => setCollapsed(!bar.classList.contains("collapsed"), true));
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (Date.now() < collapseLock) { lastY = y; return; }
      if (y < 40) setCollapsed(false);
      else if (y > lastY + 30) setCollapsed(true);
      else if (y < lastY - 30) setCollapsed(false);
      lastY = y;
    }, { passive: true });
  }

  D.boot("practice").then(() => {
    readURL();
    buildChapterSelect();
    buildKpSelect();
    renderStaticTexts();
    document.getElementById("f-kp").value = S.kp;
    document.getElementById("f-type").value = S.type;
    document.getElementById("f-diff").value = S.diff;
    document.getElementById("f-status").value = S.status;
    document.getElementById("f-q").value = S.q;
    bind();
    initCollapse();

    if (location.hash.startsWith("#q-")) {
      const id = location.hash.slice(3);
      const q = allQuestions().find((x) => x.id === id);
      if (q) {
        S.ch = "all"; S.kp = "all"; S.type = "all"; S.diff = "all"; S.status = "all"; S.q = "";
        ["f-ch", "f-type", "f-diff", "f-status"].forEach((f) => { document.getElementById(f).value = "all"; });
        buildKpSelect();
        document.getElementById("f-kp").value = "all";
        document.getElementById("f-q").value = "";
        const list = filtered();
        const idx = list.findIndex((x) => x.id === id);
        S.page = Math.floor(idx / PER) + 1;
        renderList();
        const card = document.getElementById("q-" + id);
        if (card) {
          card.scrollIntoView({ block: "start" });
          card.style.boxShadow = "0 0 0 3px var(--accent-soft)";
          setTimeout(() => { card.style.boxShadow = ""; }, 1800);
        }
      } else {
        renderList();
      }
    } else {
      renderList();
    }

    D.onLang(() => {
      buildChapterSelect();
      buildKpSelect();
      renderStaticTexts();
      document.getElementById("f-ch").value = S.ch;
      document.getElementById("f-kp").value = S.kp;
      document.getElementById("f-type").value = S.type;
      document.getElementById("f-diff").value = S.diff;
      document.getElementById("f-status").value = S.status;
      document.getElementById("f-q").value = S.q;
      setCollapsed(document.getElementById("filter-toolbar").classList.contains("collapsed"));
      renderList();
    });
  });
})();
