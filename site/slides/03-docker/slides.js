/* Docker: конструктор Dockerfile со слоями и кэшем.
   Остальной интерактив (табы, тест, flip, переключатели по группам) уже делает cursus.js. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }

  /* Слой: t — инструкция, needs — от каких входов зависит (src — код, pkg — манифесты),
     slow — дорогой шаг. Слой пересобирается, если изменился его вход ИЛИ любой слой выше. */
  var GOOD = [
    { t: "FROM node:24-bookworm-slim", needs: [] },
    { t: "WORKDIR /app", needs: [] },
    { t: "COPY package*.json ./", needs: ["pkg"] },
    { t: "RUN npm ci", needs: [], slow: true },
    { t: "COPY . .", needs: ["src", "pkg"] },
    { t: "RUN npm run build", needs: [] }
  ];
  var BAD = [
    { t: "FROM node:24-bookworm-slim", needs: [] },
    { t: "WORKDIR /app", needs: [] },
    { t: "COPY . .", needs: ["src", "pkg"] },
    { t: "RUN npm ci", needs: [], slow: true },
    { t: "RUN npm run build", needs: [] }
  ];

  var changed = { src: false, pkg: false };
  var badOrder = false;

  var box = $("lyrs"), cnt = $("ctorCount"), note = $("ctorNote");
  var edSrc = $("edSrc"), edPkg = $("edPkg"), ordSw = $("ordSw"), resetB = $("rsB");

  function calc(arr) {
    var prev = false;
    return arr.map(function (l) {
      var own = l.needs.some(function (n) { return changed[n]; });
      var miss = own || prev;
      prev = miss;
      return { t: l.t, slow: !!l.slow, miss: miss };
    });
  }

  function render() {
    var rows = calc(badOrder ? BAD : GOOD);
    box.innerHTML = rows.map(function (r, i) {
      return '<div class="lyr ' + (r.miss ? "miss" : "hit") + '">' +
        '<span class="ix">' + (i + 1) + '</span>' +
        '<code>' + r.t + '</code>' +
        (r.slow ? '<span class="tg">долго</span>' : '<span></span>') +
        '<span class="st">' + (r.miss ? "пересобран" : "из кэша") + '</span></div>';
    }).join("");

    var rebuilt = rows.filter(function (r) { return r.miss; }).length;
    cnt.textContent = "Пересобрано слоёв: " + rebuilt + " из " + rows.length;

    var slow = rows.filter(function (r) { return r.slow; })[0];
    if (!changed.src && !changed.pkg) {
      note.textContent = "Ничего не менялось: весь образ берётся из кэша.";
    } else if (slow && slow.miss) {
      note.textContent = "npm ci пересобран: по мануалу это минуты, а не секунды.";
    } else {
      note.textContent = "npm ci взят из кэша: пересобрались только слои ниже правки.";
    }

    edSrc.setAttribute("aria-pressed", changed.src ? "true" : "false");
    edPkg.setAttribute("aria-pressed", changed.pkg ? "true" : "false");
    ordSw.setAttribute("aria-pressed", badOrder ? "true" : "false");
  }

  edSrc.onclick = function () { changed.src = !changed.src; render(); };
  edPkg.onclick = function () { changed.pkg = !changed.pkg; render(); };
  ordSw.onclick = function () { badOrder = !badOrder; render(); };
  resetB.onclick = function () { changed.src = false; changed.pkg = false; badOrder = false; render(); };

  render();
})();
