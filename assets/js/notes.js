/* Bilingual notes page */
(function () {
  "use strict";
  const D = window.DSH;
  let search = "";

  function title(en, zh) {
    return D.state.lang === "both" ? `${en} · ${zh}` : D.txt(en, zh);
  }
  function txtTitle(c) {
    return title(c.title_en, c.title_zh);
  }

  function render() {
    const { chapters, kps } = D.state.data.notes;
    const ui = D.ui;

    const sidebar = document.getElementById("sidebar");
    sidebar.innerHTML = `
      <input class="input side-search" id="note-search" type="search" placeholder="${ui("Search notes…", "搜索知识点…")}" value="${D.esc(search)}">
      <h4>${ui("Chapters", "章节")}</h4>
      <ul class="side-list">
        ${chapters.map((c) => `
          <li><a href="#ch-${c.id}" data-ch="${c.id}">
            <span>${D.inline(txtTitle(c))}</span><span class="count" data-count="${c.id}">${kps.filter((k) => k.chapter === c.id).length}</span>
          </a></li>`).join("")}
      </ul>
      <h4>${ui("How to read", "阅读方式")}</h4>
      <p class="small muted" style="margin:0">${ui(
        "Each card gives the definition, the key formula or recurrence, and an exam trap. The language switch is in the header.",
        "每张卡片给出定义、关键公式或递推，以及考试易错点。语言切换位于页首。"
      )}</p>`;

    const main = document.getElementById("notes-main");
    main.innerHTML = `
      <div class="notes-hero">
        <div class="eyebrow">${ui("Knowledge notes", "知识点解析")}</div>
        <h1 style="font-size:clamp(28px,3.4vw,40px);margin-bottom:8px">${ui("Weeks 7–12, explained twice", "第 7–12 周，双语讲解")}</h1>
        <p class="lead" style="font-size:16px">${ui(
          "Every card states the definition, the key formula or recurrence, and the exam trap. Search for a term such as “rotation”, “load factor” or “egg”.",
          "每张卡片给出定义、关键公式或递推，以及考试易错点。可搜索“旋转”“装载因子”“鸡蛋”等关键词。"
        )}</p>
        <p class="small muted" id="note-count"></p>
      </div>
      ${chapters.map((c) => {
        const all = kps.filter((k) => k.chapter === c.id);
        return `
          <section class="chapter-block" id="ch-${c.id}" data-chapter="${c.id}">
            <div class="ch-head">
              <div class="num">${ui("Chapter", "第")} ${c.num} ${ui("·", "章 ·")} ${c.week}</div>
              <h2>${D.inline(title(c.title_en, c.title_zh))}</h2>
              <p class="muted" style="margin:0;max-width:70ch">${D.inline(D.txt(c.desc_en, c.desc_zh))}</p>
            </div>
            ${all.map((k, i) => `
                <article class="kp" id="kp-${k.id}" data-chapter="${c.id}">
                  <div class="kp-head">
                    <span class="kp-num">${c.num}.${i + 1}</span>
                    <h3>${D.inline(title(k.title_en, k.title_zh))}</h3>
                  </div>
                  <div class="body">${D.bi(k.body_en, k.body_zh)}</div>
                  ${k.exam_en ? `<div class="callout gold"><span class="label">${ui("Exam tip", "考试提示")}</span>${D.bi(k.exam_en, k.exam_zh)}</div>` : ""}
                  <div class="kp-foot">
                    <span class="muted">${ui("Chapter", "章节")}: ${D.esc(txtTitle(c))}</span>
                    <span class="spacer"></span>
                    <a href="practice.html?ch=${c.id}" class="small">${ui("Practise this chapter", "练习本章")} →</a>
                    <button class="btn sm ghost" data-copy="kp-${k.id}">${ui("Copy link", "复制链接")}</button>
                  </div>
                </article>`).join("")}
          </section>`;
      }).join("")}
      <div class="empty" id="notes-empty" hidden><p>${ui("No notes match your search.", "没有匹配的知识点。")}</p>
        <button class="btn" id="clear-search">${ui("Clear search", "清除搜索")}</button></div>`;

    main.querySelectorAll("[data-copy]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = b.dataset.copy;
        const url = location.origin + location.pathname + "#" + id;
        try { await navigator.clipboard.writeText(url); } catch (e) { location.hash = id; }
        D.toast(D.ui("Link copied", "链接已复制"));
      });
    });
    document.getElementById("clear-search").addEventListener("click", () => {
      search = "";
      document.getElementById("note-search").value = "";
      applyFilter();
    });
    document.getElementById("note-search").addEventListener("input", (e) => {
      search = e.target.value;
      applyFilter();
    });

    applyFilter();
    observeChapters();
    if (location.hash && location.hash.startsWith("#kp-")) {
      const target = document.querySelector(location.hash);
      if (target) {
        target.style.transition = "box-shadow .4s";
        target.style.boxShadow = "0 0 0 3px var(--accent-soft)";
        setTimeout(() => { target.style.boxShadow = ""; }, 1600);
        target.scrollIntoView({ block: "start" });
      }
    }
  }

  function applyFilter() {
    const q = search.trim().toLowerCase();
    const cards = document.querySelectorAll("#notes-main .kp");
    const shown = {};
    cards.forEach((card) => {
      const ok = !q || card.textContent.toLowerCase().includes(q);
      card.hidden = !ok;
      if (ok) shown[card.dataset.chapter] = (shown[card.dataset.chapter] || 0) + 1;
    });
    document.querySelectorAll("#notes-main .chapter-block").forEach((sec) => {
      sec.hidden = !shown[sec.dataset.chapter];
    });
    document.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = shown[el.dataset.count] || 0;
    });
    const total = Object.values(shown).reduce((a, b) => a + b, 0);
    const countEl = document.getElementById("note-count");
    if (countEl) countEl.textContent = D.ui(`${total} notes shown`, `显示 ${total} 条笔记`);
    document.getElementById("notes-empty").hidden = total !== 0;
  }

  function observeChapters() {
    const links = document.querySelectorAll(".side-list a");
    if (!("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => l.classList.toggle("active", l.dataset.ch === en.target.dataset.chapter));
        }
      });
    }, { rootMargin: "-80px 0px -70% 0px" });
    document.querySelectorAll(".chapter-block").forEach((s) => obs.observe(s));
  }

  D.boot("notes").then(() => {
    render();
    D.onLang(() => {
      const y = window.scrollY;
      render();
      window.scrollTo(0, y);
    });
  });
})();
