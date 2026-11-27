/* ============================================================
   high-frequency.js — 高频面试题汇总页
   ============================================================ */
(function () {
  "use strict";

  var EIK = window.EIK;
  var doc = document.getElementById("doc");

  var GROUPS = [
    {
      id: "c",
      title: "C 语言与数据结构",
      mods: ["c-language", "data-structure", "computer-basic"]
    },
    {
      id: "mcu",
      title: "MCU 与单片机",
      mods: ["mcu-arm", "stm32-gd32", "peripheral-driver", "hardware-circuit", "motor-control", "usb-display-bus"]
    },
    {
      id: "comm",
      title: "通信与物联网",
      mods: ["communication"]
    },
    {
      id: "rtos",
      title: "RTOS 与系统",
      mods: ["rtos-freertos", "embedded-linux", "software-architecture", "memory-management", "debugging", "low-power", "storage-filesystem", "firmware-security", "linux-app"]
    },
    {
      id: "project",
      title: "项目实战",
      mods: ["project-practice"]
    }
  ];

  function qOf(modId) {
    var mod = EIK.getModule(modId);
    if (!mod) return [];
    return mod.questions.filter(function (q) {
      return q.freq === "高频";
    });
  }

  function card(q) {
    return (
      '<a class="qcard" href="' + EIK.url.question(q.id) + '">' +
      '<div class="qcard__top"><span class="qcard__id">' + q.id + "</span>" +
      EIK.qmeta(q) +
      '<span class="qcard__mod">' + q.moduleName + "</span></div>" +
      '<div class="qcard__title">' + q.title + "</div>" +
      "</a>"
    );
  }

  var html =
    '<nav class="crumbs"><a href="' + EIK.url.home() + '">首页</a>' +
    EIK.icon("chevronRight") + "<span>高频题</span></nav>" +
    '<div class="page-head">' +
    '<h1 class="page-head__title">高频面试题</h1>' +
    '<p class="page-head__desc">各模块里标注为「高频」的题目，按技术领域分组。</p>' +
    "</div>";

  GROUPS.forEach(function (g) {
    var qs = [];
    g.mods.forEach(function (m) {
      qs = qs.concat(qOf(m));
    });
    if (!qs.length) return;
    html +=
      '<section class="hf-group">' +
      '<h2 class="hf-group__title">' + g.title +
      '<span class="sec__n">' + qs.length + "</span></h2>" +
      '<div class="qlist">' + qs.map(card).join("") + "</div></section>";
  });

  doc.innerHTML = html;
  document.title = "高频面试题 · 嵌入式面试题";
})();
