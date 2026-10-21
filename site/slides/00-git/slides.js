/* Интерактив темы 00 (Git): симулятор трёх зон и чек-лист. Табы, .mc и .flip — в cursus.js. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var FILES = ["app.py", "utils.py", "README.md"];

  /* --- слайд 04: симулятор рабочего каталога, индекса и репозитория ---
     Версии — целые числа: v1 — начальный коммит. Разница версий = «изменено» между зонами. */
  var st, active, msgs;

  function fresh() {
    st = { wd: {}, idx: {}, repo: {}, n: 0, hist: ["#0 initial commit: все файлы"] };
    FILES.forEach(function (f) { st.wd[f] = st.idx[f] = st.repo[f] = 1; });
    active = FILES[0];
    msgs = [["Все три зоны совпадают. Выберите файл и нажмите «✏️ Правка файла».", "dim"]];
  }
  function say(text, cls) { msgs.push([text, cls || ""]); if (msgs.length > 6) msgs.shift(); }

  var ACT = {
    edit: function () {
      st.wd[active]++;
      say("✏️ " + active + ": правка в рабочем каталоге (v" + st.wd[active] + ")");
    },
    add: function () {
      var f = active;
      if (st.wd[f] === st.idx[f]) return say("git add " + f + ": нечего добавлять, индекс уже такой", "dim");
      st.idx[f] = st.wd[f];
      say("git add " + f + " → индекс: v" + st.idx[f], "ok");
    },
    commit: function () {
      var ch = FILES.filter(function (f) { return st.idx[f] !== st.repo[f]; });
      if (!ch.length) return say("git commit: в индексе пусто, коммитить нечего", "dim");
      ch.forEach(function (f) { st.repo[f] = st.idx[f]; });
      st.n++;
      st.hist.unshift("#" + st.n + " " + ch.join(", "));
      say("git commit → коммит #" + st.n + ": " + ch.join(", "), "ok");
    },
    restore: function () {
      var f = active;
      if (st.wd[f] === st.idx[f]) return say("git restore " + f + ": рабочий каталог уже как в индексе", "dim");
      st.wd[f] = st.idx[f];
      say("git restore " + f + ": правки на диске отброшены, индекс цел", "warn");
    },
    unstage: function () {
      var f = active;
      if (st.idx[f] === st.repo[f]) return say("git restore --staged " + f + ": в индексе уже как в репозитории", "dim");
      st.idx[f] = st.repo[f];
      say("git restore --staged " + f + ": убрано из индекса, правки на диске целы", "warn");
    },
    reset: function () {
      var lost = FILES.filter(function (f) { return st.wd[f] !== st.repo[f] || st.idx[f] !== st.repo[f]; });
      FILES.forEach(function (f) { st.wd[f] = st.idx[f] = st.repo[f]; });
      if (lost.length) say("⚠ git reset --hard: несохранённое в " + lost.join(", ") + " потеряно безвозвратно", "err");
      else say("git reset --hard: терять нечего, все зоны совпадали", "dim");
    }
  };

  function row(parent, f, v, badge, cls) {
    var r = document.createElement("div");
    r.className = "frow" + (cls ? " " + cls : "") + (f === active ? " cur" : "");
    var a = document.createElement("span");
    a.textContent = f;
    var b = document.createElement("span");
    b.className = "v";
    b.textContent = "v" + v + " · " + badge;
    r.appendChild(a);
    r.appendChild(b);
    parent.appendChild(r);
  }

  function render() {
    var wd = $("zWd"), idx = $("zIdx"), repo = $("zRepo");
    wd.innerHTML = ""; idx.innerHTML = ""; repo.innerHTML = "";
    var unstaged = 0, staged = 0;
    FILES.forEach(function (f) {
      var u = st.wd[f] !== st.idx[f], s = st.idx[f] !== st.repo[f];
      if (u) unstaged++;
      if (s) staged++;
      row(wd, f, st.wd[f], u ? "изменён" : "чисто", u ? "hot" : "");
      row(idx, f, st.idx[f], s ? "к коммиту" : "= репо", s ? "staged" : "");
      row(repo, f, st.repo[f], "в истории", "");
    });
    st.hist.slice(0, 4).forEach(function (h) {
      var d = document.createElement("div");
      d.className = "hl";
      d.textContent = h;
      repo.appendChild(d);
    });
    $("simStatus").textContent = "git status → к коммиту: " + staged + " · изменено, но не в индексе: " + unstaged;

    var pre = $("simLog");
    pre.innerHTML = "";
    msgs.forEach(function (m) {
      var s = document.createElement("span");
      s.className = m[1];
      s.textContent = m[0];
      pre.appendChild(s);
      pre.appendChild(document.createTextNode("\n"));
    });
  }

  function syncChips() {
    [].slice.call(document.querySelectorAll("[data-file]")).forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.file === active ? "true" : "false");
    });
  }

  [].slice.call(document.querySelectorAll("[data-act]")).forEach(function (b) {
    b.addEventListener("click", function () { ACT[b.dataset.act](); render(); });
  });
  [].slice.call(document.querySelectorAll("[data-file]")).forEach(function (b) {
    b.addEventListener("click", function () { active = b.dataset.file; syncChips(); render(); });
  });
  $("simReset").addEventListener("click", function () { fresh(); syncChips(); render(); });

  fresh();
  syncChips();
  render();

  /* --- слайд 12: чек-лист перед коммитом --- */
  var chks = [].slice.call(document.querySelectorAll(".chk"));
  function updChk() {
    var n = chks.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; }).length;
    $("chkMeter").style.width = (n / chks.length * 100) + "%";
    $("chkMsg").textContent = n === chks.length
      ? "Все проверки пройдены — можно коммитить и отправлять."
      : "Пройдено " + n + " из " + chks.length;
  }
  chks.forEach(function (b) {
    b.addEventListener("click", function () {
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
      updChk();
    });
  });
  $("chkReset").addEventListener("click", function () {
    chks.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    updChk();
  });
  updChk();
})();
