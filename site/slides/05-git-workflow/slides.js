/* Интерактив темы 05: симулятор мержа в main (правила защиты x состояние PR).
   Табы, шаги, сегменты, flip, тесты и код работают декларативно (cursus.js, deck.js). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function all(sel) { return [].slice.call(document.querySelectorAll(sel)); }

  var DEFAULT_RULES = { ci: true, appr: true, stale: true, latest: true, conv: true, linear: true };
  var DEFAULT_FACTS = { ci: true, appr: true, newc: false, open: false, merge: false };

  function read(attr) {
    var o = {};
    all("[" + attr + "]").forEach(function (b) {
      o[b.getAttribute(attr)] = b.getAttribute("aria-pressed") === "true";
    });
    return o;
  }

  function setAll(attr, values) {
    all("[" + attr + "]").forEach(function (b) {
      b.setAttribute("aria-pressed", values[b.getAttribute(attr)] ? "true" : "false");
    });
  }

  /* Причины блокировки мержа. Пустой список = мерж пройдёт. */
  function evaluate(R, F) {
    var reasons = [];
    if (R.ci && !F.ci) reasons.push("required check не прошёл: CI красный");
    if (R.appr) {
      if (!F.appr) reasons.push("нет одобрения: нужен минимум 1 approval");
      else if (R.stale && F.newc) reasons.push("approve сброшен: после одобрения пришли новые коммиты");
    }
    var latestOk = F.appr && !F.newc;
    if (R.latest && !latestOk && !(R.appr && !F.appr)) {
      reasons.push("последний push не одобрен (Require approval of most recent push)");
    }
    if (R.conv && F.open) reasons.push("есть незакрытые замечания review");
    if (R.linear && F.merge) reasons.push("merge-коммит запрещён правилом linear history");
    return reasons;
  }

  function render() {
    var R = read("data-rule"), F = read("data-fact");
    var reasons = evaluate(R, F);
    var box = $("prBox");
    box.classList.toggle("ok", reasons.length === 0);
    box.classList.toggle("bad", reasons.length > 0);
    $("prVerdict").textContent = reasons.length ? "✗ Мерж заблокирован" : "✓ Мерж пройдёт";
    var items = reasons.length ? reasons : ["все включённые правила выполнены"];
    $("prReasons").innerHTML = items.map(function (r) { return "<li>" + r + "</li>"; }).join("");
  }

  all("[data-rule], [data-fact]").forEach(function (b) {
    b.addEventListener("click", function () {
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
      render();
    });
  });

  $("prReset").onclick = function () {
    setAll("data-rule", DEFAULT_RULES);
    setAll("data-fact", DEFAULT_FACTS);
    render();
  };

  /* Сценарий из квиза: два коммита пришли после approve */
  $("prPreset").onclick = function () {
    setAll("data-rule", DEFAULT_RULES);
    setAll("data-fact", { ci: true, appr: true, newc: true, open: false, merge: false });
    render();
  };

  render();
})();
