/* ============================================================
   core.js — 数据引擎与公共工具
   嵌入式工程师面试题
   ============================================================ */
(function (window) {
  "use strict";

  var EIK = (window.EIK = window.EIK || {});

  /* ---------------- 数据容器 ---------------- */
  EIK.registry = []; // 模块元信息（顺序即展示顺序）
  EIK.modules = {}; // id -> { ...meta, chapters, questions }
  EIK.qIndex = {}; // 题号 -> { q, moduleId }
  EIK.qOrder = []; // 全部题号（按模块顺序）

  /* ---------------- 注册接口 ---------------- */
  EIK.meta = function (m) {
    EIK.registry.push(m);
    return m;
  };

  EIK.register = function (id, payload) {
    var meta = null;
    for (var i = 0; i < EIK.registry.length; i++) {
      if (EIK.registry[i].id === id) {
        meta = EIK.registry[i];
        break;
      }
    }
    if (!meta) {
      meta = { id: id, num: "00", name: id, en: id, desc: "", tags: [] };
      EIK.registry.push(meta);
    }
    var mod = Object.assign({}, meta, payload, { questions: payload.questions || [] });
    EIK.modules[id] = mod;

    mod.questions.forEach(function (q) {
      q.module = id;
      q.moduleName = mod.name;
      q.moduleNum = mod.num;
      EIK.qIndex[q.id] = { q: q, moduleId: id };
      EIK.qOrder.push(q.id);
    });
    return mod;
  };

  /* ---------------- 追加题目（补充题库，不覆盖已有数据） ---------------- */
  EIK.extend = function (id, payload) {
    var mod = EIK.modules[id];
    if (!mod) return null;
    payload = payload || {};

    (payload.chapters || []).forEach(function (c) {
      var exist = null;
      for (var i = 0; i < mod.chapters.length; i++) {
        if (mod.chapters[i].id === c.id) {
          exist = mod.chapters[i];
          break;
        }
      }
      if (!exist) {
        mod.chapters.push({ id: c.id, title: c.title, topics: c.topics || [] });
        return;
      }
      if (c.title) exist.title = c.title;
      (c.topics || []).forEach(function (t) {
        for (var j = 0; j < exist.topics.length; j++) {
          if (exist.topics[j].id === t.id) return;
        }
        exist.topics.push(t);
      });
    });

    (payload.questions || []).forEach(function (q) {
      if (EIK.qIndex[q.id]) return;
      q.module = id;
      q.moduleName = mod.name;
      q.moduleNum = mod.num;
      mod.questions.push(q);
      EIK.qIndex[q.id] = { q: q, moduleId: id };
      EIK.qOrder.push(q.id);
    });
    return mod;
  };

  EIK.getModule = function (id) {
    return EIK.modules[id] || null;
  };

  EIK.getQuestion = function (qid) {
    return EIK.qIndex[qid] || null;
  };

  EIK.allQuestions = function () {
    return EIK.qOrder.map(function (id) {
      return EIK.qIndex[id].q;
    });
  };

  /* ---------------- 路径 ---------------- */
  EIK.root = function () {
    var r = document.body ? document.body.getAttribute("data-root") : null;
    return r === null || r === "" ? "." : r;
  };

  EIK.url = {
    home: function () {
      return EIK.root() + "/index.html";
    },
    module: function (id) {
      return EIK.root() + "/pages/" + id + ".html";
    },
    question: function (id) {
      var rec = EIK.getQuestion(id);
      if (!rec) return EIK.url.home();
      return EIK.url.module(rec.moduleId) + "#/q/" + id;
    },
    highFreq: function () {
      return EIK.root() + "/pages/high-frequency.html";
    },
    search: function (kw) {
      return EIK.root() + "/pages/search.html" + (kw ? "?q=" + encodeURIComponent(kw) : "");
    }
  };

  /* ---------------- 文本工具 ---------------- */
  EIK.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  EIK.stripTags = function (html) {
    return String(html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  };

  /* ---------------- 图标 ---------------- */
  var P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
    arrowRight: '<path d="M5 12h13"/><path d="m12.5 5.5 6 6.5-6 6.5"/>',
    arrowLeft: '<path d="M19 12H6"/><path d="m11.5 5.5-6 6.5 6 6.5"/>',
    chevronRight: '<path d="m9 5 7 7-7 7"/>',
    chevronDown: '<path d="m5 9 7 7 7-7"/>',
    chevronLeft: '<path d="m15 5-7 7 7 7"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    close: '<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
    panelLeft: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9.5 4v16"/>',
    panelRight: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14.5 4v16"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6h.01"/>'
  };

  EIK.icon = function (name, cls) {
    var d = P[name] || P.chevronRight;
    return (
      '<svg class="ico ' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"
    );
  };

  /* ---------------- 题目元信息行 ---------------- */
  EIK.qmeta = function (q) {
    return (
      '<span class="meta">' +
      '<span>' + EIK.esc(q.diff) + "</span><i>·</i>" +
      '<span class="' + (q.freq === "高频" ? "meta__hot" : "") + '">' + EIK.esc(q.freq) + "</span><i>·</i>" +
      "<span>" + EIK.esc(q.type) + "</span>" +
      "</span>"
    );
  };

  /* ---------------- 关键词高亮（搜索结果） ---------------- */
  EIK.mark = function (text, kw) {
    var t = EIK.esc(text);
    if (!kw) return t;
    var words = kw.split(/\s+/).filter(Boolean).map(function (w) {
      return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    if (!words.length) return t;
    try {
      return t.replace(new RegExp("(" + words.join("|") + ")", "gi"), '<mark class="hit">$1</mark>');
    } catch (e) {
      return t;
    }
  };

  /* ---------------- 章节 / 知识点查找 ---------------- */
  EIK.findChapter = function (mod, cid) {
    if (!mod || !mod.chapters) return null;
    for (var i = 0; i < mod.chapters.length; i++) {
      if (mod.chapters[i].id === cid) return mod.chapters[i];
    }
    return null;
  };

  EIK.findTopic = function (mod, cid, tid) {
    var ch = EIK.findChapter(mod, cid);
    if (!ch) return null;
    for (var i = 0; i < ch.topics.length; i++) {
      if (ch.topics[i].id === tid) return ch.topics[i];
    }
    return null;
  };

  EIK.topicName = function (mod, cid, tid) {
    var t = EIK.findTopic(mod, cid, tid);
    return t ? t.title : "";
  };

  /* ---------------- 统计 ---------------- */
  EIK.stats = function () {
    var qs = EIK.allQuestions();
    return {
      modules: EIK.registry.length,
      questions: qs.length,
      high: qs.filter(function (q) {
        return q.freq === "高频";
      }).length
    };
  };
})(window);
