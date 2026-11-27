/* ============================================================
   search-page.js — 全站搜索结果页
   ============================================================ */
(function () {
  "use strict";

  var EIK = window.EIK;
  var doc = document.getElementById("doc");

  var params = new URLSearchParams(location.search);
  var kw = (params.get("q") || "").trim();

  function buildIndex() {
    return EIK.allQuestions().map(function (q) {
      return {
        q: q,
        topic: EIK.topicName(EIK.getModule(q.module), q.chapter, q.topic),
        hay: (q.title + " " + q.point + " " + q.moduleName + " " + EIK.stripTags(q.q) + " " +
          EIK.stripTags(q.core || "") + " " + EIK.stripTags(q.answer)).toLowerCase(),
        title: q.title.toLowerCase()
      };
    });
  }

  function search(kw) {
    var words = kw.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    var out = [];
    buildIndex().forEach(function (it) {
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        if (it.hay.indexOf(words[i]) < 0) return;
        score += 1;
        if (it.title.indexOf(words[i]) >= 0) score += 6;
      }
      out.push({ it: it, score: score });
    });
    out.sort(function (a, b) {
      return b.score - a.score;
    });
    return out.map(function (x) {
      return x.it;
    });
  }

  var list = kw ? search(kw) : [];
  var byMod = {};
  list.forEach(function (it) {
    var id = it.q.module;
    (byMod[id] = byMod[id] || []).push(it);
  });

  var html =
    '<nav class="crumbs"><a href="' + EIK.url.home() + '">首页</a>' +
    EIK.icon("chevronRight") + "<span>搜索</span></nav>" +
    '<div class="page-head">' +
    '<h1 class="page-head__title">搜索</h1>' +
    '<form class="intro__search intro__search--solo" action="" method="get">' +
    EIK.icon("search") +
    '<input type="text" name="q" value="' + EIK.esc(kw) + '" placeholder="搜索题目、关键字" autocomplete="off">' +
    '<button type="submit">搜索</button></form></div>';

  if (!kw) {
    html += '<div class="empty"><div class="empty__title">输入关键字开始搜索</div>' +
      '<p class="empty__desc">可以搜题目标题、考点和答案正文，多个关键字用空格分隔。</p></div>';
  } else if (!list.length) {
    html += '<div class="empty"><div class="empty__title">没有找到「' + EIK.esc(kw) + "」相关的内容</div>" +
      '<p class="empty__desc">试试更短的关键词。</p>' +
      '<a class="empty__btn" href="' + EIK.url.home() + '">返回首页</a></div>';
  } else {
    html += '<p class="result-n">找到 <b>' + list.length + "</b> 条结果</p>";
    Object.keys(byMod).forEach(function (mid) {
      var mod = EIK.getModule(mid);
      if (!mod) return;
      html +=
        '<section class="hf-group">' +
        '<h2 class="hf-group__title">' + mod.num + " · " + mod.name +
        '<span class="sec__n">' + byMod[mid].length + "</span></h2>" +
        '<div class="qlist">' +
        byMod[mid]
          .map(function (it) {
            var q = it.q;
            return (
              '<a class="qcard" href="' + EIK.url.question(q.id) + '">' +
              '<div class="qcard__top"><span class="qcard__id">' + q.id + "</span>" +
              EIK.qmeta(q) + "</div>" +
              '<div class="qcard__title">' + EIK.mark(q.title, kw) + "</div>" +
              "</a>"
            );
          })
          .join("") +
        "</div></section>";
    });
  }

  doc.innerHTML = html;
  document.title = (kw ? kw + " 的搜索结果" : "搜索") + " · 嵌入式面试题";
})();
