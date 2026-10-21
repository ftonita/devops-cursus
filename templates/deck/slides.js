/* Интерактив, специфичный для этой темы. Общие компоненты (.flip, .mc, табы) уже подключены cursus.js */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }

  /* --- слайд 05: пошаговый симулятор вывода в «терминал» --- */
  var LINES = [
    '<span class="cmd">$ git status</span>',
    'On branch main',
    '<span class="ok">nothing to commit, working tree clean</span>'
  ];
  var timers = [];
  function reset() {
    timers.forEach(clearTimeout); timers = [];
    $("simOut").innerHTML = '<span class="dim">Нажмите «Запустить».</span>';
  }
  $("simRun").onclick = function () {
    reset();
    $("simOut").innerHTML = "";
    LINES.forEach(function (l, i) {
      timers.push(setTimeout(function () { $("simOut").innerHTML += l + "\n"; }, i * 450));
    });
  };
  $("simReset").onclick = reset;
})();
