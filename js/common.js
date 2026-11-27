/* ============================================================
   common.js — 顶部导航、页脚、搜索跳转、移动端菜单
   ============================================================ */
(function () {
  "use strict";

  var EIK = window.EIK;
  var body = document.body;
  var page = body.getAttribute("data-page") || "home";
  var modId = body.getAttribute("data-module");

  /* ============================================================
     顶部导航
     ============================================================ */
  function renderHeader() {
    var host = document.getElementById("site-header");
    if (!host) return;

    var nav = [
      { href: EIK.url.home(), label: "首页", on: page === "home" },
      { href: EIK.url.home() + "#modules", label: "全部模块", on: page === "module" },
      { href: EIK.url.highFreq(), label: "高频题", on: page === "high-frequency" }
    ];

    host.outerHTML =
      '<header class="site-header"><div class="site-header__inner">' +
      '<a class="brand" href="' + EIK.url.home() + '">' +
      '<span class="brand__mark">' + EIK.icon("menu") + "</span>" +
      '<span class="brand__name">嵌入式面试题</span></a>' +
      '<nav class="nav">' +
      nav
        .map(function (n) {
          return '<a class="nav__link' + (n.on ? " is-active" : "") + '" href="' + n.href + '">' + n.label + "</a>";
        })
        .join("") +
      "</nav>" +
      '<form class="hsearch" action="' + EIK.root() + '/pages/search.html" method="get">' +
      EIK.icon("search") +
      '<input class="hsearch__input" type="text" name="q" placeholder="搜索题目" autocomplete="off">' +
      "</form>" +
      '<button class="nav-toggle" type="button" data-nav-toggle aria-label="菜单">' +
      EIK.icon("menu") + "</button>" +
      "</div></header>";

    renderMobileNav();
  }

  function renderMobileNav() {
    var panel = document.createElement("div");
    panel.className = "mobilenav";
    panel.id = "mobilenav";

    var links = [[EIK.url.home(), "首页"], [EIK.url.highFreq(), "高频题"]];
    var html =
      '<div class="mobilenav__links">' +
      links
        .map(function (l) {
          return '<a href="' + l[0] + '">' + l[1] + "</a>";
        })
        .join("") +
      "</div>" +
      '<div class="mobilenav__label">技术模块</div>' +
      '<div class="mobilenav__mods">' +
      EIK.registry
        .map(function (m) {
          return '<a href="' + EIK.url.module(m.id) + '"' + (m.id === modId ? ' class="is-active"' : "") + ">" +
            '<span class="n">' + m.num + "</span>" + m.name + "</a>";
        })
        .join("") +
      "</div>";
    panel.innerHTML = html;
    body.appendChild(panel);
  }

  /* ============================================================
     页脚
     ============================================================ */
  function renderFooter() {
    var host = document.getElementById("site-footer");
    if (!host) return;
    host.outerHTML =
      '<footer class="site-footer"><div class="site-footer__inner">' +
      "<span>嵌入式工程师面试题 · " + EIK.stats().questions + " 道题 / " + EIK.registry.length + " 个模块</span>" +
      '<span><a href="' + EIK.url.highFreq() + '">高频题</a>' +
      '<a href="' + EIK.url.search() + '">搜索</a></span>' +
      "</div></footer>";
  }

  /* ============================================================
     全局事件
     ============================================================ */
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-nav-toggle]")) {
      body.classList.toggle("is-nav-open");
      return;
    }
    if (body.classList.contains("is-nav-open") && !e.target.closest("#mobilenav") && !e.target.closest("[data-nav-toggle]")) {
      body.classList.remove("is-nav-open");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") body.classList.remove("is-nav-open");
  });

  renderHeader();
  renderFooter();
})();
