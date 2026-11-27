/* ============================================================
   question.js — 模块页：题目列表 + 单题详情
   页面只保留三块：面试问题 / 参考答案 / 延伸追问
   ============================================================ */
(function () {
  "use strict";

  var EIK = window.EIK;
  var body = document.body;
  var modId = body.getAttribute("data-module");
  var mod = EIK.getModule(modId);

  var sidebarEl = document.getElementById("sidebar");
  var docEl = document.getElementById("doc");

  if (!mod) {
    if (docEl) {
      docEl.innerHTML =
        '<div class="empty"><div class="empty__title">未找到该技术模块</div>' +
        '<p class="empty__desc">请从首页重新进入。</p>' +
        '<a class="empty__btn" href="' + EIK.url.home() + '">返回首页</a></div>';
    }
    return;
  }

  /* 当前浏览范围：null 表示整个模块 */
  var state = { chapter: null, topic: null };

  /* 侧边栏内的章节树：默认全部展开 */
  var openChapters = {};
  mod.chapters.forEach(function (ch) {
    openChapters[ch.id] = true;
  });

  /* ============================================================
     侧边栏收起 / 展开（每次进入页面默认展开）
     ============================================================ */
  function applyCollapsed(v) {
    body.classList.toggle("is-sidebar-collapsed", !!v);
    var btn = sidebarEl.querySelector("[data-sidebar-toggle]");
    if (btn) {
      btn.innerHTML = EIK.icon(v ? "panelRight" : "panelLeft");
      btn.setAttribute("aria-label", v ? "展开目录" : "收起目录");
      btn.setAttribute("title", v ? "展开目录" : "收起目录");
    }
  }

  function toggleCollapsed() {
    applyCollapsed(!body.classList.contains("is-sidebar-collapsed"));
  }

  function chapterTitle(cid) {
    var c = EIK.findChapter(mod, cid);
    return c ? c.title : "";
  }

  function topicCount(tid) {
    return mod.questions.filter(function (q) {
      return q.topic === tid;
    }).length;
  }

  function chapterCount(cid) {
    return mod.questions.filter(function (q) {
      return q.chapter === cid;
    }).length;
  }

  /* ============================================================
     左侧：章节 / 知识点目录
     ============================================================ */
  function renderSidebar() {
    var html =
      '<div class="sidebar__bar">' +
      '<a class="sidebar__switch" href="' + EIK.url.home() + '#modules">' +
      '<span class="sidebar__switch-num">' + mod.num + "</span>" +
      '<span class="sidebar__switch-body">' +
      '<span class="sidebar__switch-name">' + mod.name + "</span>" +
      '<span class="sidebar__switch-hint">切换模块</span></span>' +
      EIK.icon("menu") + "</a>" +
      '<button class="sidebar__collapse" type="button" data-sidebar-toggle ' +
      'aria-label="收起目录" title="收起目录">' + EIK.icon("panelLeft") + "</button>" +
      "</div>" +
      '<div class="sidebar__label">' +
      '<a href="#/">全部题目<span class="sidebar__label-n">' + mod.questions.length + "</span></a>" +
      "</div>";

    mod.chapters.forEach(function (ch) {
      var open = !!openChapters[ch.id];
      html +=
        '<div class="chapter' + (open ? " is-open" : "") + '" data-chapter="' + ch.id + '">' +
        '<button class="chapter__head" type="button" data-chapter-toggle>' +
        EIK.icon("chevronRight", "chapter__caret") +
        "<span>" + ch.title + "</span>" +
        '<span class="chapter__count">' + chapterCount(ch.id) + "</span></button>" +
        '<div class="topic-list">' +
        ch.topics
          .map(function (t) {
            return (
              '<button class="topic-link" type="button" data-chapter="' + ch.id +
              '" data-topic="' + t.id + '">' + t.title +
              '<span class="topic-link__n">' + topicCount(t.id) + "</span></button>"
            );
          })
          .join("") +
        "</div></div>";
    });

    sidebarEl.innerHTML = html;

    sidebarEl.addEventListener("click", function (e) {
      var head = e.target.closest("[data-chapter-toggle]");
      if (head) {
        var wrap = head.parentElement;
        var cid = wrap.getAttribute("data-chapter");
        openChapters[cid] = !openChapters[cid];
        wrap.classList.toggle("is-open", !!openChapters[cid]);
        return;
      }
      var topic = e.target.closest("[data-topic]");
      if (topic) {
        location.hash = "#/t/" + topic.getAttribute("data-chapter") + "/" + topic.getAttribute("data-topic");
      }
    });
  }

  function syncSidebarActive() {
    Array.prototype.forEach.call(sidebarEl.querySelectorAll(".topic-link"), function (el) {
      var on = el.getAttribute("data-topic") === state.topic;
      el.classList.toggle("is-active", on);
      if (on) {
        var wrap = el.closest(".chapter");
        if (wrap && !wrap.classList.contains("is-open")) {
          wrap.classList.add("is-open");
          openChapters[wrap.getAttribute("data-chapter")] = true;
        }
      }
    });
  }

  /* ============================================================
     列表视图
     ============================================================ */
  function filtered() {
    return mod.questions.filter(function (q) {
      if (state.chapter && q.chapter !== state.chapter) return false;
      if (state.topic && q.topic !== state.topic) return false;
      return true;
    });
  }

  function cardHTML(q) {
    return (
      '<a class="qcard" href="#/q/' + q.id + '">' +
      '<div class="qcard__top">' +
      '<span class="qcard__id">' + q.id + "</span>" +
      EIK.qmeta(q) +
      "</div>" +
      '<div class="qcard__title">' + q.title + "</div>" +
      '<div class="qcard__foot">' +
      "<span>" + chapterTitle(q.chapter) + "</span>" +
      '<i>·</i><span>' + EIK.topicName(mod, q.chapter, q.topic) + "</span>" +
      '<span class="qcard__go">' + EIK.icon("arrowRight") + "</span>" +
      "</div></a>"
    );
  }

  function renderList() {
    var list = filtered();
    var scopeTitle = state.topic
      ? EIK.topicName(mod, state.chapter, state.topic)
      : state.chapter
      ? chapterTitle(state.chapter)
      : "";

    var html =
      '<nav class="crumbs"><a href="' + EIK.url.home() + '">首页</a>' +
      EIK.icon("chevronRight") + "<span>" + mod.name + "</span>" +
      (scopeTitle ? EIK.icon("chevronRight") + "<span>" + scopeTitle + "</span>" : "") +
      "</nav>" +
      '<div class="page-head">' +
      '<h1 class="page-head__title">' + mod.name + "</h1>" +
      '<p class="page-head__desc">' + mod.desc + "</p>" +
      '<div class="page-head__stats"><span><b>' + mod.questions.length + "</b> 道题</span>" +
      "<span><b>" + mod.chapters.length + "</b> 个章节</span></div>" +
      "</div>";

    if (scopeTitle) {
      html +=
        '<div class="notice">' + EIK.icon("info") +
        "<span>正在看 <b>" + scopeTitle + "</b>，共 " + list.length + " 题" +
        '<a href="#/">查看全部</a></span></div>';
    }

    html += '<div class="qlist">' + list.map(cardHTML).join("") + "</div>";

    docEl.innerHTML = html;
    document.title = mod.name + " · 嵌入式面试题";
    syncSidebarActive();
  }

  /* ============================================================
     详情视图：面试问题 / 参考答案 / 延伸追问
     ============================================================ */
  function renderDetail(q) {
    var idx = mod.questions.indexOf(q);
    var prev = mod.questions[idx - 1];
    var next = mod.questions[idx + 1];

    var html =
      '<nav class="crumbs"><a href="' + EIK.url.home() + '">首页</a>' + EIK.icon("chevronRight") +
      '<a href="#/">' + mod.name + "</a>" + EIK.icon("chevronRight") +
      '<a href="#/c/' + q.chapter + '">' + chapterTitle(q.chapter) + "</a>" + EIK.icon("chevronRight") +
      "<span>" + EIK.topicName(mod, q.chapter, q.topic) + "</span></nav>" +

      '<article class="q-detail">' +
      '<header class="q-head">' +
      '<div class="q-head__meta"><span class="qcard__id">' + q.id + "</span>" + EIK.qmeta(q) + "</div>" +
      '<h1 class="q-head__title">' + q.title + "</h1>" +
      "</header>" +

      /* 01 面试问题 */
      '<section class="q-section">' +
      '<h2 class="q-section__title">面试问题</h2>' +
      '<div class="prose">' + q.q + "</div>" +
      "</section>" +

      /* 02 参考答案：默认只给核心答案，完整解析可展开 */
      '<section class="q-section">' +
      '<h2 class="q-section__title">参考答案<span class="q-section__tag">核心</span></h2>' +
      '<div class="prose q-core">' + (q.core || q.answer) + "</div>" +
      (q.core && q.answer
        ? '<details class="q-more"><summary>展开完整解析</summary>' +
          '<div class="prose q-full">' + q.answer + "</div></details>"
        : "") +
      "</section>";

    /* 03 延伸追问 */
    if (q.follow && q.follow.length) {
      html +=
        '<section class="q-section">' +
        '<h2 class="q-section__title">延伸追问<span class="q-section__n">' + q.follow.length + "</span></h2>" +
        '<div class="follow">' +
        q.follow
          .map(function (f) {
            return (
              '<details class="follow__item">' +
              '<summary class="follow__q"><span class="follow__q-text">' + f[0] + "</span></summary>" +
              '<div class="follow__a prose">' + f[1] + "</div></details>"
            );
          })
          .join("") +
        "</div></section>";
    }

    /* 上一题 / 下一题 */
    html +=
      '<div class="qnav">' +
      (prev
        ? '<a class="qnav__item" href="#/q/' + prev.id + '">' +
          '<span class="qnav__label">' + EIK.icon("arrowLeft") + "上一题</span>" +
          '<span class="qnav__t">' + prev.id + " " + prev.title + "</span></a>"
        : "<span></span>") +
      (next
        ? '<a class="qnav__item qnav__item--next" href="#/q/' + next.id + '">' +
          '<span class="qnav__label">下一题' + EIK.icon("arrowRight") + "</span>" +
          '<span class="qnav__t">' + next.id + " " + next.title + "</span></a>"
        : "<span></span>") +
      "</div></article>";

    docEl.innerHTML = html;
    document.title = q.id + " " + q.title + " · " + mod.name;
    state.chapter = q.chapter;
    state.topic = q.topic;
    syncSidebarActive();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ============================================================
     路由
     ============================================================ */
  function route() {
    var h = location.hash.replace(/^#/, "");

    if (h.indexOf("/q/") === 0) {
      var qid = h.slice(3);
      var rec = EIK.getQuestion(qid);
      if (rec && rec.moduleId === mod.id) {
        renderDetail(rec.q);
        return;
      }
      docEl.innerHTML =
        '<div class="empty"><div class="empty__title">题目不存在</div>' +
        '<p class="empty__desc">题号 ' + EIK.esc(qid) + " 不属于本模块。</p>" +
        '<a class="empty__btn" href="#/">返回题目列表</a></div>';
      return;
    }

    state.chapter = null;
    state.topic = null;

    if (h.indexOf("/t/") === 0) {
      var parts = h.slice(3).split("/");
      state.chapter = parts[0];
      state.topic = parts[1];
    } else if (h.indexOf("/c/") === 0) {
      state.chapter = h.slice(3);
    }

    renderList();
  }

  function mountSidebarControls() {
    var reopen = document.createElement("button");
    reopen.className = "sidebar__reopen";
    reopen.type = "button";
    reopen.setAttribute("data-sidebar-toggle", "");
    reopen.setAttribute("aria-label", "展开目录");
    reopen.setAttribute("title", "展开目录");
    reopen.innerHTML = EIK.icon("panelRight");
    body.appendChild(reopen);

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-sidebar-toggle]")) {
        toggleCollapsed();
      }
    });
  }

  renderSidebar();
  mountSidebarControls();
  applyCollapsed(false);
  route();
  window.addEventListener("hashchange", route);
})();
