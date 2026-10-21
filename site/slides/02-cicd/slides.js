/* Интерактив колоды «CI/CD». Табы, тест .mc и flip-карточки подключает cursus.js.
   Здесь три виджета: симулятор конвейера (слайд 05), стратегии деплоя (07), метрики DORA (09). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  /* ================= 05. Симулятор конвейера ================= */
  var SIM = [
    { id: "build", name: "Build", ok: "образ собран, тег = SHA коммита", idle: "ждёт" },
    { id: "test", name: "Test", ok: "unit и integration тесты зелёные", idle: "ждёт" },
    { id: "scan", name: "Scan", ok: "HIGH/CRITICAL уязвимостей не найдено", idle: "ждёт" },
    { id: "stage", name: "Deploy staging", ok: "smoke-тест ответил", idle: "ждёт" },
    { id: "prod", name: "Deploy prod", ok: "", idle: "за воротами" }
  ];
  var WHY = {
    build: "Сборка упала: образа нет, публиковать в registry нечего.",
    test: "Тесты упали: артефакт не публикуется и до staging не доходит.",
    scan: "Scan нашёл HIGH/CRITICAL (trivy --exit-code 1): образ дальше не уходит.",
    stage: "Smoke-тест в staging не прошёл: prod зависит от staging и не стартует."
  };
  var V_OLD = "v1.4.2", V_NEW = "v1.5.0";
  var broken = {}, timers = [], running = false, gateOn = false, mode = "del";
  var logEl = $("pipeLog");

  function node(id) { return document.querySelector('#stages [data-stg="' + id + '"]'); }
  function setNode(id, cls, txt) {
    var n = node(id);
    n.className = "sr" + (cls ? " " + cls : "");
    n.querySelector(".st").textContent = txt;
  }
  function log(html) { logEl.innerHTML += html + "\n"; }
  function setProd(ver, txt) { $("prodVer").textContent = ver; $("prodTxt").textContent = txt; }
  function lockBrk(on) { all("[data-brk]").forEach(function (b) { b.disabled = on; }); }
  function stopTimers() { timers.forEach(clearTimeout); timers = []; }

  /* очистка прогона; выбранные «поломки» и режим сохраняются */
  function clearRun() {
    stopTimers();
    running = false; gateOn = false;
    lockBrk(false);
    $("pipeGate").disabled = true;
    SIM.forEach(function (s) { setNode(s.id, "", s.idle); });
    logEl.innerHTML = '<span class="dim">Нажмите «▶ Запустить».</span>';
    setProd(V_OLD, "Прод работает на " + V_OLD + ". Это текущая версия.");
  }

  function fail(i) {
    var s = SIM[i];
    setNode(s.id, "bad", "упал");
    log('<span class="err">✗ ' + s.name + ' — упал, конвейер остановлен.</span>');
    for (var k = i + 1; k < SIM.length; k++) setNode(SIM[k].id, "skip", "не запущен");
    setProd(V_OLD, "На prod ничего не уехало, осталась " + V_OLD + ". " + WHY[s.id]);
    running = false; lockBrk(false);
  }

  function finishProd() {
    setNode("prod", "ok", "готово");
    log('<span class="ok">✓ Deploy prod — ' + V_NEW + ' выкачена</span>');
    setProd(V_NEW, "Прод на " + V_NEW + ". Это тот же образ, что прошёл staging: один артефакт по SHA.");
    running = false; lockBrk(false);
  }

  function askGate() {
    gateOn = true;
    setNode("prod", "gate", "ждёт approve");
    log('<span class="hi">⏸ Ворота production: деплой ждёт одобрения человека (Continuous Delivery).</span>');
    setProd(V_OLD, "Новая версия собрана и проверена, но в прод её пока не пускают.");
    $("pipeGate").disabled = false;
  }

  function step(i) {
    var s = SIM[i];
    if (s.id === "prod" && mode === "del") return askGate();
    setNode(s.id, "run", s.id === "prod" ? "выкат…" : "идёт…");
    timers.push(setTimeout(function () {
      if (broken[s.id]) return fail(i);
      if (s.id === "prod") return finishProd();
      setNode(s.id, "ok", "готово");
      log('<span class="ok">✓ ' + s.name + ' — ' + s.ok + '</span>');
      step(i + 1);
    }, 650));
  }

  function runPipeline() {
    clearRun();
    running = true; lockBrk(true);
    log('<span class="cmd">$ git push origin main</span>  <span class="dim"># триггер пайплайна</span>');
    step(0);
  }

  function approve() {
    if (!gateOn) return;
    gateOn = false;
    $("pipeGate").disabled = true;
    setNode("prod", "run", "выкат…");
    log('<span class="dim">человек нажал Approve</span>');
    timers.push(setTimeout(finishProd, 650));
  }

  all("[data-brk]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (running) return;
      var on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      broken[b.dataset.brk] = on;
    });
  });
  all("[data-mode]").forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.dataset.mode;
      all("[data-mode]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      clearRun();
    });
  });
  $("pipeRun").addEventListener("click", runPipeline);
  $("pipeGate").addEventListener("click", approve);
  $("pipeReset").addEventListener("click", function () {
    broken = {};
    all("[data-brk]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    clearRun();
  });
  clearRun();

  /* ================= 07. Стратегии деплоя ================= */
  /* p — доля трафика на v2 в процентах; одна ячейка = 5% */
  var ST = {
    roll: {
      name: "Rolling update",
      desc: "Инстансы обновляются поочерёдно, без простоя. Пока идёт выкат, работают обе версии одновременно.",
      price: "Цена: новая версия обязана быть совместимой со старой по API и схеме БД.",
      back: "Откат: тот же rolling, но с v1 обратно.",
      steps: [
        { p: 0, t: "Все инстансы на v1." },
        { p: 20, t: "Заменили 4 из 20 инстансов: обе версии обслуживают трафик." },
        { p: 40, t: "Заменили 8 из 20." },
        { p: 60, t: "Заменили 12 из 20." },
        { p: 80, t: "Заменили 16 из 20." },
        { p: 100, t: "Все 20 инстансов на v2. Старой версии больше нет." }
      ]
    },
    bg: {
      name: "Blue-Green",
      desc: "Полностью новое окружение (Green) поднимается рядом со старым (Blue). Проверяем его, затем переключаем весь трафик разом.",
      price: "Цена: два полных окружения. Зато откат — мгновенное переключение обратно.",
      back: "Откат: балансировщик снова на Blue (v1). Green остаётся нетронутым.",
      steps: [
        { p: 0, t: "Green (v2) поднят и проверяется. Трафик по-прежнему на Blue (v1)." },
        { p: 100, t: "Балансировщик переключён разом: 100% трафика на Green (v2)." }
      ]
    },
    canary: {
      name: "Canary",
      desc: "Малая доля трафика получает новую версию. Если метрики в норме, доля растёт до 100%.",
      price: "Цена: нужны метрики ошибок и задержки по канарейке. Без них ошибку не заметить.",
      back: "Откат: метрики плохие, доля v2 обнуляется до 0%.",
      steps: [
        { p: 0, t: "Весь трафик на стабильной v1." },
        { p: 5, t: "5% трафика на canary (v2). Смотрим 5xx и p99." },
        { p: 25, t: "Метрики в норме: 25% на v2." },
        { p: 50, t: "Половина трафика на v2." },
        { p: 100, t: "Canary стала стабильной: 100% на v2." }
      ]
    }
  };
  var cur = "roll", stTimers = [];
  var cellsEl = $("stCells");
  for (var c = 0; c < 20; c++) cellsEl.appendChild(document.createElement("i"));
  var cells = all("i", cellsEl);

  function show(p, text) {
    cells.forEach(function (el, k) { el.classList.toggle("v2", k < p / 5); });
    $("stBarI").style.width = p + "%";
    $("stPct").textContent = "v2: " + p + "%";
    $("stTxt").textContent = text;
  }
  function stopSt() { stTimers.forEach(clearTimeout); stTimers = []; }
  function pick(id) {
    cur = id; stopSt();
    all("[data-st]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.st === id ? "true" : "false"); });
    $("stName").textContent = ST[id].name;
    $("stDesc").textContent = ST[id].desc;
    $("stPrice").textContent = ST[id].price;
    show(0, ST[id].steps[0].t);
  }
  function play() {
    stopSt();
    ST[cur].steps.forEach(function (s, k) {
      stTimers.push(setTimeout(function () { show(s.p, s.t); }, k * 800));
    });
  }
  function rollback() { stopSt(); show(0, ST[cur].back); }

  all("[data-st]").forEach(function (b) {
    b.addEventListener("click", function () { pick(b.dataset.st); });
  });
  $("stGo").addEventListener("click", play);
  $("stBack").addEventListener("click", rollback);
  pick("roll");

  /* ================= 09. DORA: ползунки ================= */
  var BASE = { freq: 4, lead: 120, cfr: 15, rest: 6 };
  var IN = { freq: $("dFreq"), lead: $("dLead"), cfr: $("dCfr"), rest: $("dRest") };
  var OUT = { freq: $("oFreq"), lead: $("oLead"), cfr: $("oCfr"), rest: $("oRest") };
  var FMT = {
    freq: function (v) { return v + " в неделю"; },
    lead: function (v) { return v + " ч"; },
    cfr: function (v) { return v + " %"; },
    rest: function (v) { return v + " ч"; }
  };
  var VERDICT = {
    neutral: "Ползунки стоят в точке отсчёта. Двигайте их и смотрите, что меняется вместе.",
    fastBad: "Скорость выросла, а стабильность просела. Это не улучшение, а долг: лечите тесты и откат, а не темп.",
    fastOk: "Скорость растёт, стабильность держится. Именно такой тренд и нужен.",
    slowBad: "Стабильность просела без выигрыша в скорости. Сначала разберите причины сбоев.",
    slowDown: "Скорость ниже точки отсчёта, стабильность не изменилась. Ищите, что тормозит выкат: ручные ворота, долгий пайплайн, очередь раннеров.",
    stabBetter: "Стабильность лучше, скорость на месте. Хороший задел: теперь можно выкатывать чаще."
  };
  function dora() {
    var v = {};
    Object.keys(IN).forEach(function (k) {
      v[k] = parseFloat(IN[k].value);
      OUT[k].textContent = FMT[k](v[k]);
    });
    var speedUp = v.freq > BASE.freq || v.lead < BASE.lead;
    var speedDown = v.freq < BASE.freq || v.lead > BASE.lead;
    var stabWorse = v.cfr > BASE.cfr || v.rest > BASE.rest;
    var key;
    if (speedUp && stabWorse) key = "fastBad";
    else if (speedUp) key = "fastOk";
    else if (stabWorse) key = "slowBad";
    else if (speedDown) key = "slowDown";
    else if (v.cfr < BASE.cfr || v.rest < BASE.rest) key = "stabBetter";
    else key = "neutral";
    $("dVerdict").textContent = VERDICT[key];
  }
  Object.keys(IN).forEach(function (k) {
    IN[k].value = BASE[k];
    IN[k].addEventListener("input", dora);
  });
  dora();
})();
