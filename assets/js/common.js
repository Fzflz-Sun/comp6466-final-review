/* Shared runtime: data loading, bilingual rendering, markdown, figures, question cards. */
(function () {
  "use strict";

  const LS_LANG = "c6466.lang";
  const LS_THEME = "c6466.theme";
  const LS_PROGRESS = "c6466.progress";

  const state = {
    lang: localStorage.getItem(LS_LANG) || "en",
    theme: localStorage.getItem(LS_THEME) || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    data: {},
    langListeners: [],
  };

  const CH_LABEL = {
    bst: ["Binary search trees", "二叉搜索树"],
    avl: ["AVL trees", "AVL 树"],
    heap: ["Heaps", "堆"],
    hash: ["Hash tables", "哈希表"],
    graph: ["Graph algorithms", "图算法"],
    greedy: ["Greedy algorithms", "贪心算法"],
    dp: ["Dynamic programming", "动态规划"],
  };

  /* ---------------- utils ---------------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function txt(en, zh) {
    if (state.lang === "zh") return zh || en;
    if (state.lang === "both") return en + (zh && zh !== en ? " · " + zh : "");
    return en || zh;
  }
  function ui(en, zh) {
    if (state.lang === "zh") return zh;
    if (state.lang === "both") return en + " / " + zh;
    return en;
  }

  /* ---------------- markdown ---------------- */
  function renderTex(tex, display) {
    if (window.katex) {
      try {
        return window.katex.renderToString(tex, {
          displayMode: !!display,
          throwOnError: false,
          strict: "ignore",
          trust: false,
        });
      } catch (e) {
        if (window.console) console.warn("KaTeX error:", tex, e);
      }
    }
    return `<code class="tex-src">${esc(tex)}</code>`;
  }

  function inline(s) {
    const maths = [];
    s = String(s == null ? "" : s).replace(/\\\((.+?)\\\)/g, (m, t) => {
      maths.push(t);
      return `\u0002${maths.length - 1}\u0002`;
    });
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (m, c) => {
      codes.push(c);
      return `\u0000${codes.length - 1}\u0000`;
    });
    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
    s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${esc(codes[+i])}</code>`);
    s = s.replace(/\u0002(\d+)\u0002/g, (m, i) => renderTex(maths[+i], false));
    return s;
  }

  function md(text) {
    if (!text) return "";
    const lines = String(text).replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let i = 0;
    const isSpecial = (l) => /^\s*$/.test(l) || /^```/.test(l) || /^\$\$/.test(l) ||
      /^(#{1,4})\s+/.test(l) || /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l) ||
      /^\s*>\s?/.test(l) || /^\s*\|/.test(l);

    while (i < lines.length) {
      let line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }

      if (/^```/.test(line)) {
        i++;
        const buf = [];
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
        continue;
      }
      if (/^\s*\\\[/.test(line)) {
        let first = line.replace(/^\s*\\\[/, "");
        const buf = [];
        i++;
        if (/\\\]\s*$/.test(first)) {
          buf.push(first.replace(/\\\]\s*$/, ""));
        } else {
          buf.push(first);
          while (i < lines.length && !/\\\]/.test(lines[i])) buf.push(lines[i++]);
          if (i < lines.length) { buf.push(lines[i].replace(/\\\]/, "")); i++; }
        }
        out.push(`<div class="math-display">${renderTex(buf.join("\n"), true)}</div>`);
        continue;
      }
      if (/^\$\$/.test(line)) {
        i++;
        const buf = [];
        while (i < lines.length && !/\$\$/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<div class="math-display">${renderTex(buf.join(" "), true)}</div>`);
        continue;
      }
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        const lv = Math.min(4, h[1].length + 1);
        out.push(`<h${lv}>${inline(h[2])}</h${lv}>`);
        i++;
        continue;
      }
      if (/^\s*>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        out.push(`<blockquote>${md(buf.join("\n"))}</blockquote>`);
        continue;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*[-*]\s+/, ""));
          i++;
        }
        out.push("<ul>" + buf.map((x) => `<li>${inline(x)}</li>`).join("") + "</ul>");
        continue;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
          i++;
        }
        out.push("<ol>" + buf.map((x) => `<li>${inline(x)}</li>`).join("") + "</ol>");
        continue;
      }
      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/.test(lines[i + 1])) {
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        const cells = (r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        const head = cells(rows[0]);
        const body = rows.slice(2).map(cells);
        out.push("<table><thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") +
          "</tr></thead><tbody>" +
          body.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") +
          "</tbody></table>");
        continue;
      }
      const buf = [line];
      i++;
      while (i < lines.length && !isSpecial(lines[i])) buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join(" "))}</p>`);
    }
    return out.join("\n");
  }

  function bi(en, zh, cls) {
    const c = cls ? " " + cls : "";
    if (state.lang === "zh") return `<div class="bi${c}"><div class="lang lang-zh">${md(zh)}</div></div>`;
    if (state.lang === "en") return `<div class="bi${c}"><div class="lang lang-en">${md(en)}</div></div>`;
    return `<div class="bi${c}"><div class="lang lang-en">${md(en)}</div><div class="lang lang-zh">${md(zh)}</div></div>`;
  }

  function plain(s) {
    return String(s == null ? "" : s)
      .replace(/\\\[([\s\S]*?)\\\]/g, " $1 ")
      .replace(/\\\((.+?)\\\)/g, " $1 ")
      .replace(/\\[a-zA-Z]+/g, " ")
      .replace(/[{}]/g, " ");
  }

  function shortText(s, n) {
    const plain = String(s || "").replace(/```[\s\S]*?```/g, " ").replace(/[#*`>|]/g, " ")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/\s+/g, " ").trim();
    return plain.length > n ? plain.slice(0, n - 1) + "…" : plain;
  }

  /* ---------------- data ---------------- */
  async function loadData() {
    const files = {
      meta: "assets/data/meta.json?v=2",
      questions: "assets/data/questions.json?v=2",
      notes: "assets/data/notes.json?v=2",
      exams: "assets/data/exams.json?v=2",
    };
    const entries = Object.entries(files);
    const res = await Promise.all(entries.map(([k, url]) => fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    })));
    entries.forEach(([k], idx) => { state.data[k] = res[idx]; });
    state.notesById = new Map(state.data.notes.kps.map((k) => [k.id, k]));
    return state.data;
  }

  /* ---------------- progress ---------------- */
  function readProgress() {
    try { return JSON.parse(localStorage.getItem(LS_PROGRESS) || "{}"); } catch (e) { return {}; }
  }
  function setProgress(qid, status) {
    const p = readProgress();
    if (status) p[qid] = status; else delete p[qid];
    localStorage.setItem(LS_PROGRESS, JSON.stringify(p));
    return p;
  }
  function getProgress(qid) { return readProgress()[qid]; }

  /* ---------------- chrome ---------------- */
  let chromeHooked = false;
  function syncHeaderHeight() {
    const h = document.querySelector(".topbar");
    if (h) document.documentElement.style.setProperty("--topbar-h", h.offsetHeight + "px");
  }

  function mountChrome(active) {
    state.active = active;
    document.documentElement.dataset.lang = state.lang;
    document.documentElement.dataset.theme = state.theme;
    const header = document.getElementById("site-header");
    if (header) {
      header.className = "topbar";
      header.innerHTML = `
        <div class="topbar-inner">
          <a class="brand" href="index.html">
            <span class="brand-mark">A</span>
            <span class="brand-text">
              <span class="brand-title">COMP3600 / 6466 · Algorithms</span>
              <span class="brand-sub">Final review · W7–W12</span>
            </span>
          </a>
          <nav class="nav" aria-label="Primary">
            <a href="index.html" data-nav="index">${ui("Overview", "总览")}</a>
            <a href="notes.html" data-nav="notes">${ui("Notes", "知识点")}</a>
            <a href="practice.html" data-nav="practice">${ui("Practice", "练习")}</a>
            <a href="exam.html" data-nav="exam">${ui("Mock exam", "模拟卷")}</a>
          </nav>
          <div class="tools">
            <div class="lang-switch" role="group" aria-label="Language">
              <button data-lang="en" class="${state.lang === "en" ? "on" : ""}">EN</button>
              <button data-lang="zh" class="${state.lang === "zh" ? "on" : ""}">中文</button>
              <button data-lang="both" class="${state.lang === "both" ? "on" : ""}">双语</button>
            </div>
            <button class="icon-btn" id="theme-btn" aria-label="Toggle theme" title="${ui("Toggle theme", "切换主题")}">${state.theme === "dark" ? "☀" : "☾"}</button>
          </div>
        </div>`;
      header.querySelectorAll("[data-lang]").forEach((b) => {
        b.addEventListener("click", () => setLang(b.dataset.lang));
      });
      header.querySelector("#theme-btn").addEventListener("click", toggleTheme);
      const link = header.querySelector(`[data-nav="${active}"]`);
      if (link) link.classList.add("active");
    }
    const footer = document.getElementById("site-footer");
    syncHeaderHeight();
    if (!chromeHooked) {
      chromeHooked = true;
      window.addEventListener("resize", syncHeaderHeight);
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(syncHeaderHeight);
        const h = document.querySelector(".topbar");
        if (h) ro.observe(h);
      }
    }
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = `<div class="wrap">
        <span>${ui("Revision site for COMP3600/6466 Algorithms · Weeks 7–12", "COMP3600/6466 算法 · 第 7–12 周复习站")}</span>
        <span>${ui("Built from the W7–W12 lecture slides and the 2023–2025 final papers. Answers are hidden until you click.", "内容依据第 7–12 周课件与 2023–2025 年期末试卷整理；答案默认隐藏，点击后显示。")}</span>
      </div>`;
    }
  }

  function setLang(l) {
    if (!["en", "zh", "both"].includes(l)) l = "en";
    state.lang = l;
    localStorage.setItem(LS_LANG, l);
    document.documentElement.dataset.lang = l;
    document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
    document.querySelectorAll(".lang-switch [data-lang]").forEach((b) => {
      b.classList.toggle("on", b.dataset.lang === l);
    });
    if (state.active) mountChrome(state.active);
    state.langListeners.forEach((fn) => fn(l));
  }
  function onLang(fn) { state.langListeners.push(fn); }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(LS_THEME, state.theme);
    document.documentElement.dataset.theme = state.theme;
    const b = document.getElementById("theme-btn");
    if (b) b.textContent = state.theme === "dark" ? "☀" : "☾";
  }

  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = el("div", "toast"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------------- figures ---------------- */
  let figUid = 0;

  function treeSVG(fig) {
    const nodes = [];
    let xi = 0, maxD = 0;
    (function walk(n, d) {
      if (!n) return;
      walk(n.l, d + 1);
      n._x = xi++; n._d = d; maxD = Math.max(maxD, d); nodes.push(n);
      walk(n.r, d + 1);
    })(fig.root, 0);
    const gapX = 52, gapY = 62, padX = 30, padY = 34;
    const w = Math.max(280, padX * 2 + Math.max(1, xi) * gapX);
    const h = padY * 2 + (maxD + 1) * gapY;
    const X = (n) => padX + n._x * gapX;
    const Y = (n) => padY + n._d * gapY;
    const hl = new Set(fig.hl || []);
    const parts = [];
    for (const n of nodes) {
      for (const c of [n.l, n.r]) {
        if (c) parts.push(`<line x1="${X(n)}" y1="${Y(n) + 16}" x2="${X(c)}" y2="${Y(c) - 16}" stroke="var(--line-strong)" stroke-width="1.4"/>`);
      }
    }
    for (const n of nodes) {
      const on = hl.has(n.k);
      const r = 17;
      parts.push(`<circle cx="${X(n)}" cy="${Y(n)}" r="${r}" fill="${on ? "var(--accent-soft)" : "var(--surface)"}" stroke="${on ? "var(--accent)" : "var(--line-strong)"}" stroke-width="${on ? 2.2 : 1.3}"/>`);
      const label = String(n.k);
      parts.push(`<text x="${X(n)}" y="${Y(n) + 4}" text-anchor="middle" font-family="var(--mono)" font-size="${label.length > 2 ? 10.5 : 12.5}" fill="${on ? "var(--accent)" : "var(--ink)"}">${esc(label)}</text>`);
      if (fig.showBF && n.b !== undefined) {
        parts.push(`<rect x="${X(n) - 11}" y="${Y(n) - 30}" width="22" height="14" rx="4" fill="var(--gold-soft)" stroke="var(--line)" stroke-width=".8"/>`);
        parts.push(`<text x="${X(n)}" y="${Y(n) - 19.5}" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--gold)">${esc(n.b > 0 ? "+" + n.b : n.b)}</text>`);
      }
    }
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Binary tree">${parts.join("")}</svg>`;
  }

  function graphSVG(fig) {
    const W = 720, H = 412, pad = 48;
    const ids = fig.nodes;
    const pos = Object.assign({}, fig.pos || {});
    const missing = ids.filter((n) => !pos[n]);
    if (missing.length) {
      const cx = W / 2, cy = H / 2, rad = Math.min(W, H) / 2 - pad;
      missing.forEach((n, i) => {
        const ang = -Math.PI / 2 + (2 * Math.PI * i) / missing.length;
        pos[n] = [50 + 42 * Math.cos(ang), 50 + 42 * Math.sin(ang)];
      });
    }
    const P = (n) => [pad + (pos[n][0] / 100) * (W - 2 * pad), pad + (pos[n][1] / 100) * (H - 2 * pad)];
    const uid = "arw" + (++figUid);
    const hl = new Set(fig.hl || []);
    const parts = [];
    if (fig.directed) {
      parts.push(`<defs><marker id="${uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-2)"/></marker></defs>`);
    }
    const r = 21;
    for (const e of fig.edges) {
      const [x1, y1] = P(e.u), [x2, y2] = P(e.v);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const sx = x1 + ux * r, sy = y1 + uy * r;
      const ex = x2 - ux * (r + (fig.directed ? 5 : 0)), ey = y2 - uy * (r + (fig.directed ? 5 : 0));
      parts.push(`<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="var(--ink-2)" stroke-width="1.35" ${fig.directed ? `marker-end="url(#${uid})"` : ""}/>`);
      if (fig.weighted !== false) {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const t = String(e.w);
        const bw = 8 + 7 * t.length;
        parts.push(`<rect x="${mx - bw / 2}" y="${my - 10}" width="${bw}" height="17" rx="4" fill="var(--surface)" stroke="var(--line)" stroke-width=".7"/>`);
        parts.push(`<text x="${mx}" y="${my + 2.5}" text-anchor="middle" font-family="var(--mono)" font-size="11" fill="var(--warm)">${esc(t)}</text>`);
      }
    }
    for (const n of ids) {
      const [x, y] = P(n);
      const on = hl.has(n);
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${on ? "var(--accent-soft)" : "var(--surface)"}" stroke="${on ? "var(--accent)" : "var(--line-strong)"}" stroke-width="${on ? 2.2 : 1.3}"/>`);
      parts.push(`<text x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}" text-anchor="middle" font-family="var(--mono)" font-size="${n.length > 1 ? 11.5 : 13}" fill="${on ? "var(--accent)" : "var(--ink)"}">${esc(n)}</text>`);
    }
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graph">${parts.join("")}</svg>`;
  }

  function hashHTML(fig) {
    const m = fig.m;
    const cols = `grid-template-columns: repeat(${m}, minmax(40px, 1fr));`;
    const idx = [];
    const cells = [];
    for (let i = 0; i < m; i++) {
      idx.push(`<div class="ht-cell idx">${i}</div>`);
      const v = fig.slots[i];
      let inner = "–";
      let cls = "ht-cell";
      if (Array.isArray(v) && v.length) {
        inner = v.map((k) => `<span class="ck">${esc(k)}</span>`).join("");
        cls += " chain filled";
      } else if (v !== null && v !== undefined && v !== "–" && v !== "") {
        inner = esc(v);
        cls += " filled";
      }
      cells.push(`<div class="${cls}">${inner}</div>`);
    }
    return `<div class="scrollx"><div class="hashtable"><div class="ht-row" style="${cols}">${idx.join("")}</div><div class="ht-row" style="${cols}">${cells.join("")}</div></div></div>` +
      (fig.caption ? `<div class="ht-cap">${inline(fig.caption)}</div>` : "");
  }

  function arrayHTML(fig) {
    const cells = fig.values.map((v) => `<div class="acell">${esc(v)}</div>`).join("");
    const idx = fig.values.map((_, i) => `<div class="ht-cell idx">${i}</div>`).join("");
    return `<div class="scrollx"><div class="arrayfig">${cells}</div><div class="arrayfig" style="margin-top:2px">${idx}</div></div>`;
  }

  function figureHTML(fig) {
    if (!fig) return "";
    let inner = "";
    if (fig.kind === "tree") inner = treeSVG(fig);
    else if (fig.kind === "graph") inner = graphSVG(fig);
    else if (fig.kind === "hashtable") return `<div class="figure-wrap"><div style="padding:12px">${hashHTML(fig)}</div>${fig.caption ? `<div class="figcap">${esc(fig.caption)}</div>` : ""}</div>`;
    else if (fig.kind === "array") inner = arrayHTML(fig);
    else return "";
    const cap = fig.caption ? `<div class="figcap">${inline(fig.caption)}</div>` : "";
    return `<div class="figure-wrap"><div class="scrollx">${inner}</div>${cap}</div>`;
  }

  /* ---------------- question cards ---------------- */
  function optionText(o) {
    if (o.en === o.zh) return `<span>${inline(o.en)}</span>`;
    if (state.lang === "zh") return `<span>${inline(o.zh)}</span>`;
    if (state.lang === "both") return `<span>${inline(o.en)}</span><span class="zh">${inline(o.zh)}</span>`;
    return `<span>${inline(o.en)}</span>`;
  }

  function questionCard(q, opts) {
    opts = opts || {};
    const exam = !!opts.exam;
    const marks = opts.marks != null ? opts.marks : q.marks;
    const card = el("article", "qcard");
    card.id = "q-" + q.id;
    card.dataset.qid = q.id;

    const chName = CH_LABEL[q.chapter] ? txt(CH_LABEL[q.chapter][0], CH_LABEL[q.chapter][1]) : q.chapter;
    const typeName = q.type === "single" ? ui("single answer", "单选")
      : q.type === "multi" ? ui("select all", "多选") : ui("problem solving", "解答题");
    const diffName = [ui("warm-up", "基础"), ui("exam level", "考试难度"), ui("challenge", "挑战")][q.difficulty - 1] || "";
    const head = el("div", "qhead");
    head.innerHTML = `
      <span class="qid">${q.id.toUpperCase()}</span>
      <span class="badge ch">${esc(chName)}</span>
      <span class="badge type">${esc(typeName)}</span>
      ${exam ? "" : `<span class="badge diff${q.difficulty}">${esc(diffName)}</span>`}
      <span class="badge marks">${marks} ${ui("marks", "分")}</span>`;
    card.appendChild(head);

    const stem = el("div", "qstem");
    stem.innerHTML = bi(q.stem_en, q.stem_zh);
    card.appendChild(stem);

    if (q.figure) {
      const fw = el("div");
      fw.innerHTML = figureHTML(q.figure);
      if (fw.firstElementChild) card.appendChild(fw.firstElementChild);
    }

    let sel = new Set();
    const optionEls = [];
    if (q.options && q.options.length) {
      const box = el("div", "options");
      q.options.forEach((o) => {
        const b = el("button", "option");
        b.type = "button";
        b.dataset.key = o.key;
        b.innerHTML = `<span class="key">${o.key}</span><span class="otext">${optionText(o)}</span>`;
        b.addEventListener("click", () => {
          if (q.type === "single") sel = new Set([o.key]);
          else {
            if (sel.has(o.key)) sel.delete(o.key); else sel.add(o.key);
          }
          optionEls.forEach((x) => x.classList.toggle("sel", sel.has(x.dataset.key)));
          if (card.dataset.revealed === "1") paintOptions();
        });
        optionEls.push(b);
        box.appendChild(b);
      });
      card.appendChild(box);
    }

    function paintOptions() {
      optionEls.forEach((x) => {
        const k = x.dataset.key;
        x.classList.toggle("correct", q.answer.includes(k));
        x.classList.toggle("wrong", sel.has(k) && !q.answer.includes(k));
      });
    }

    // answer panel
    let ansHTML = "";
    if (q.options) {
      ansHTML += `<p class="ans-line"><strong>${ui("Correct answer", "参考答案")}:</strong> <b>${q.answer.join(", ")}</b></p>`;
    }
    ansHTML += bi(q.answer_en, q.answer_zh, "body");
    if (q.answer_figures && q.answer_figures.length) {
      ansHTML += `<div class="answer-figs">` + q.answer_figures.map((af) => {
        const cap = af.caption_en || af.caption_zh
          ? `<div class="figcap">${inline(txt(af.caption_en, af.caption_zh))}</div>` : "";
        return figureHTML(af.fig).replace(/<\/div>$/, cap + "</div>");
      }).join("") + `</div>`;
    }
    if (q.steps_en && q.steps_en.length) {
      const steps = q.steps_en.map((s, i) => {
        const zhRaw = q.steps_zh && q.steps_zh[i] ? q.steps_zh[i] : "";
        const zh = zhRaw ? `<span class="zh">${inline(zhRaw)}</span>` : "";
        if (state.lang === "zh" && zh) return `<li>${inline(zhRaw)}</li>`;
        return `<li>${inline(s)}${state.lang === "both" ? zh : ""}</li>`;
      }).join("");
      ansHTML += `<ol class="steps">${steps}</ol>`;
    }
    const ansPanel = el("div", "answer-panel");
    ansPanel.hidden = true;
    ansPanel.innerHTML = ansHTML;
    card.appendChild(ansPanel);

    // knowledge points
    const kpPanel = el("div", "kp-panel");
    kpPanel.hidden = true;
    const kps = (q.kp || []).map((id) => state.notesById && state.notesById.get(id)).filter(Boolean);
    kpPanel.innerHTML = `<div class="lang-tag">${ui("Knowledge point index", "知识点索引")}</div><ul class="kp-list">` +
      (kps.length ? kps.map((k) => {
        const ch = state.data.meta && state.data.meta.chapters.find((c) => c.id === k.chapter);
        const title = txt(k.title_en, k.title_zh);
        const tip = txt(k.exam_en, k.exam_zh) || txt(shortText(k.body_en, 150), shortText(k.body_zh, 90));
        return `<li><div class="kpt"><span>${inline(title)}</span>${ch ? `<span class="tag">${esc(txt(ch.title_en, ch.title_zh))}</span>` : ""}</div>
          <div class="kpx">${inline(tip)}</div>
          <a class="kplink" href="notes.html#kp-${k.id}">${ui("Open the note", "查看知识点")} →</a></li>`;
      }).join("") : `<li>${ui("No linked note.", "暂无关联知识点。")}</li>`) + `</ul>`;
    card.appendChild(kpPanel);

    // actions
    const acts = el("div", "qactions");
    const ansBtn = el("button", "btn sm", ui("Show answer", "显示参考答案"));
    ansBtn.type = "button";
    ansBtn.setAttribute("aria-expanded", "false");
    ansBtn.setAttribute("aria-controls", "");
    ansBtn.addEventListener("click", () => {
      const show = ansPanel.hidden;
      ansPanel.hidden = !show;
      ansBtn.textContent = show ? ui("Hide answer", "隐藏参考答案") : ui("Show answer", "显示参考答案");
      ansBtn.setAttribute("aria-expanded", String(show));
      if (show) {
        card.dataset.revealed = "1";
        paintOptions();
        card.dataset.seen = "1";
      }
    });
    acts.appendChild(ansBtn);

    const kpBtn = el("button", "btn sm", ui("Knowledge points", "知识点索引"));
    kpBtn.type = "button";
    kpBtn.setAttribute("aria-expanded", "false");
    kpBtn.addEventListener("click", () => {
      const show = kpPanel.hidden;
      kpPanel.hidden = !show;
      kpBtn.textContent = show ? ui("Hide knowledge points", "隐藏知识点") : ui("Knowledge points", "知识点索引");
      kpBtn.setAttribute("aria-expanded", String(show));
    });
    acts.appendChild(kpBtn);

    acts.appendChild(el("span", "spacer"));

    if (!exam) {
      const mark = el("div", "selfmark");
      const gotBtn = el("button", "", ui("Got it", "已掌握"));
      gotBtn.type = "button";
      const revBtn = el("button", "", ui("Review", "待复习"));
      revBtn.type = "button";
      const paint = () => {
        const p = getProgress(q.id);
        gotBtn.classList.toggle("on-got", p === "got");
        revBtn.classList.toggle("on-review", p === "review");
        card.classList.toggle("status-got", p === "got");
        card.classList.toggle("status-review", p === "review");
      };
      gotBtn.addEventListener("click", () => {
        const p = getProgress(q.id);
        setProgress(q.id, p === "got" ? null : "got");
        paint();
        toast(p === "got" ? ui("Marked as unseen", "已取消掌握标记") : ui("Saved: got it", "已标记：掌握"));
        document.dispatchEvent(new CustomEvent("progress-change", { detail: { qid: q.id } }));
      });
      revBtn.addEventListener("click", () => {
        const p = getProgress(q.id);
        setProgress(q.id, p === "review" ? null : "review");
        paint();
        toast(p === "review" ? ui("Marked as unseen", "已取消复习标记") : ui("Saved: review later", "已标记：待复习"));
        document.dispatchEvent(new CustomEvent("progress-change", { detail: { qid: q.id } }));
      });
      mark.appendChild(gotBtn);
      mark.appendChild(revBtn);
      acts.appendChild(mark);
      paint();
    }
    card.appendChild(acts);

    return card;
  }

  /* ---------------- boot ---------------- */
  async function boot(active) {
    mountChrome(active);
    try {
      await loadData();
    } catch (e) {
      document.body.insertAdjacentHTML("afterbegin",
        `<div class="wrap" style="padding:40px 0"><div class="panel"><h3>Could not load the question bank</h3>
         <p>${esc(e.message)}</p><p class="small muted">Serve the folder over HTTP, e.g. <code>python3 -m http.server</code>, then open <code>http://localhost:8000</code>.</p></div></div>`);
      throw e;
    }
    return state.data;
  }

  window.DSH = {
    state, boot, setLang, onLang, ui, txt, esc, el, md, bi, inline, plain, shortText,
    figureHTML, questionCard, mountChrome, toast,
    getProgress, setProgress, readProgress,
    CH_LABEL,
  };
})();
