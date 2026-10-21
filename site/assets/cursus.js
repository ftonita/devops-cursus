/* Cursus: декларативные интерактивные компоненты для презентаций.
   Подключается после deck.js. Разметка описана в .claude/skills/deck-authoring */
(function () {
  "use strict";
  function all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  /* --- .flip: карточка «вопрос → ответ» --- */
  all(".flip").forEach(function (f) {
    f.addEventListener("click", function () {
      f.setAttribute("aria-expanded", f.getAttribute("aria-expanded") === "true" ? "false" : "true");
    });
  });

  /* --- .mc: тест с одним ответом. <div class="mc" data-correct="1"> (индекс с 0) --- */
  all(".mc").forEach(function (mc) {
    var right = parseInt(mc.dataset.correct, 10), btns = all(".opts button", mc);
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () {
        if (mc.classList.contains("done")) return;
        mc.classList.add("done");
        btns.forEach(function (x, j) { x.disabled = true; if (j === right) x.classList.add("right"); });
        if (i !== right) b.classList.add("wrong");
        var sc = mc.querySelector(".score");
        if (sc) sc.textContent = i === right ? "✓ верно" : "✗ почти — разбор ниже";
      });
    });
    var rs = mc.querySelector(".reset");
    if (rs) rs.addEventListener("click", function () {
      mc.classList.remove("done");
      btns.forEach(function (x) { x.disabled = false; x.classList.remove("right", "wrong"); });
    });
  });

  /* --- табы: <div class="tabs" data-group="g"><button data-tab="a">…</button></div>
         панели: <div data-pane="a" data-group="g">…</div>
         также работает на кнопках .sr[data-tab] (steps-row) --- */
  var groups = {};
  all("[data-tab]").forEach(function (b) {
    var holder = b.closest("[data-group]");
    var g = b.dataset.group || (holder && holder.dataset.group) || "default";
    (groups[g] = groups[g] || []).push(b);
  });
  Object.keys(groups).forEach(function (g) {
    var btns = groups[g];
    var panes = all("[data-pane]").filter(function (p) { return (p.dataset.group || "default") === g; });
    function show(id) {
      btns.forEach(function (b) {
        var on = b.dataset.tab === id;
        if (b.hasAttribute("role") || b.parentElement.classList.contains("tabs")) b.setAttribute("aria-selected", on ? "true" : "false");
        else b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      panes.forEach(function (p) { p.hidden = p.dataset.pane !== id; });
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.tab); }); });
    show((btns.filter(function (b) { return b.dataset.default !== undefined; })[0] || btns[0]).dataset.tab);
  });

  /* --- [data-toggle]: переключает класс .on у цели. <button data-toggle="#id"> --- */
  all("[data-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = document.querySelector(b.dataset.toggle);
      if (!t) return;
      var on = t.classList.toggle("on");
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
})();
