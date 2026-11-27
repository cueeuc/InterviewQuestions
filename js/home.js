/* ============================================================
   home.js — 首页：模块分类 + 高频题
   ============================================================ */
(function () {
  "use strict";

  var EIK = window.EIK;

  /* ---------------- 技术模块 ---------------- */
  var box = document.getElementById("mods");
  if (box) {
    box.innerHTML = EIK.registry
      .map(function (m) {
        var mod = EIK.getModule(m.id);
        var n = mod ? mod.questions.length : 0;
        return (
          '<a class="mod" href="' + EIK.url.module(m.id) + '">' +
          '<span class="mod__num">' + m.num + "</span>" +
          '<span class="mod__body">' +
          '<span class="mod__name">' + m.name + "</span>" +
          '<span class="mod__desc">' + m.desc + "</span>" +
          "</span>" +
          '<span class="mod__n">' + n + " 题</span>" +
          "</a>"
        );
      })
      .join("");
  }

  /* ---------------- 首页高频题（前 8 道） ---------------- */
  var hf = document.getElementById("hf");
  if (hf) {
    var picks = [];
    EIK.registry.forEach(function (m) {
      var mod = EIK.getModule(m.id);
      if (!mod) return;
      mod.questions.forEach(function (q) {
        if (q.freq === "高频") picks.push(q);
      });
    });

    var seen = {};
    hf.innerHTML = picks
      .slice(0, 8)
      .map(function (q) {
        seen[q.module] = 1;
        return (
          '<a class="qcard" href="' + EIK.url.question(q.id) + '">' +
          '<div class="qcard__top"><span class="qcard__id">' + q.id + "</span>" +
          EIK.qmeta(q) +
          '<span class="qcard__mod">' + q.moduleName + "</span></div>" +
          '<div class="qcard__title">' + q.title + "</div>" +
          "</a>"
        );
      })
      .join("");
  }
})();
