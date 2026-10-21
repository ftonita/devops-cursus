/* Cursus deck engine: scaling, steps, code highlight, presenter mode */
(function () {
  "use strict";
  var W = 1600, H = 900;
  var params = new URLSearchParams(location.search);
  var EMBED = params.has("embed"), PRESENTER = params.has("presenter");
  var body = document.body;
  if (EMBED) body.classList.add("embed");

  var deckEl = document.getElementById("deck");
  var S = [].slice.call(deckEl.children).filter(function (n) { return n.tagName === "SECTION"; });
  var N = S.length, cur = 0, step = 0, hoverKey = null;
  var BASE_TITLE = document.title;

  /* ---------------- code rendering & highlighting ---------------- */
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function dedent(t) {
    var L = t.replace(/\t/g, "  ").split("\n");
    while (L.length && !L[0].trim()) L.shift();
    while (L.length && !L[L.length - 1].trim()) L.pop();
    var min = Infinity;
    L.forEach(function (l) { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    return L.map(function (l) { return l.slice(min === Infinity ? 0 : min); });
  }
  function splitComment(l, mark) {
    var q = null;
    for (var i = 0; i < l.length; i++) {
      var c = l[i];
      if (q) { if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === mark && (i === 0 || /\s/.test(l[i - 1]))) return [l.slice(0, i), l.slice(i)];
    }
    return [l, ""];
  }
  function jin(s) { return s.replace(/\{\{.*?\}\}|\{%.*?%\}/g, function (m) { return '<span class="t-jin">' + m + "</span>"; }); }
  function val(v) {
    var e = esc(v);
    return e.replace(/("[^"]*"|'[^']*'|\{\{.*?\}\}|(?<![\w-])(?:true|false|yes|no|present|absent|started|stopped|reloaded|restarted|enabled|latest|allow|deny|running|directory)(?![\w-])|(?:^|(?<=[\s\[,:]))\d[\d.:\/]*\b)/g,
      function (m) {
        if (m[0] === '"' || m[0] === "'") return '<span class="t-str">' + jin(m) + "</span>";
        if (m.slice(0, 2) === "{{") return '<span class="t-jin">' + m + "</span>";
        return '<span class="t-lit">' + m + "</span>";
      }).replace(/([\[\]{},])/g, '<span class="t-p">$1</span>');
  }
  function hlYaml(l) {
    var p = splitComment(l, "#"), code = p[0], com = p[1], out;
    var m = code.match(/^(\s*)(-\s+)?([\w.\/-]+)(:)(\s.*|)$/);
    if (m) {
      var cls = m[3].split(".").length >= 3 ? "t-mod" : "t-key";
      out = m[1] + (m[2] ? '<span class="t-p">-</span>' + m[2].slice(1) : "") +
        '<span class="' + cls + '">' + esc(m[3]) + '</span><span class="t-p">:</span>' + val(m[5]);
    } else {
      var d = code.match(/^(\s*)(-\s+)?(.*)$/);
      out = d[1] + (d[2] ? '<span class="t-p">-</span>' + d[2].slice(1) : "") + val(d[3]);
    }
    return out + (com ? '<span class="t-com">' + esc(com) + "</span>" : "");
  }
  function hlBash(l) {
    var p = splitComment(l, "#"), code = esc(p[0]);
    code = code.replace(/("[^"]*"|'[^']*')/g, '<span class="t-str">$1</span>')
      .replace(/^(\s*)(\$ )?([\w.-]+)/, function (_, a, b, c) { return a + (b ? '<span class="t-p">$ </span>' : "") + '<span class="t-cmd">' + c + "</span>"; })
      .replace(/\b(if|then|fi|else|do|done|for|in)\b/g, '<span class="t-key">$1</span>')
      .replace(/(&amp;&amp;|\|\||&gt;&gt;|&gt;\/dev\/null)/g, '<span class="t-lit">$1</span>');
    return code + (p[1] ? '<span class="t-com">' + esc(p[1]) + "</span>" : "");
  }
  function hlConf(l) {
    var p = splitComment(l, "#"), code = esc(p[0]);
    code = code.replace(/^(\s*)([a-z_]+)/, '$1<span class="t-dir">$2</span>');
    return jin(code) + (p[1] ? '<span class="t-com">' + esc(p[1]) + "</span>" : "");
  }
  function hlTree(l) {
    var p = splitComment(l, "#"), code = esc(p[0]);
    code = code.replace(/([\w.-]+\/)/g, '<span class="t-key">$1</span>').replace(/([├└│─]+)/g, '<span class="t-p">$1</span>');
    return code + (p[1] ? '<span class="t-com">' + esc(p[1]) + "</span>" : "");
  }
  function hlDocker(l) {
    var p = splitComment(l, "#"), code = esc(p[0]);
    code = code.replace(/^(\s*)(FROM|RUN|CMD|COPY|ADD|WORKDIR|ENV|ARG|EXPOSE|USER|ENTRYPOINT|HEALTHCHECK|VOLUME|LABEL)\b/, '$1<span class="t-mod">$2</span>')
      .replace(/\bAS\b/, '<span class="t-mod">AS</span>')
      .replace(/("[^"]*")/g, '<span class="t-str">$1</span>');
    return code + (p[1] ? '<span class="t-com">' + esc(p[1]) + "</span>" : "");
  }
  function hlDiff(l) {
    var e = esc(l);
    if (/^\+/.test(l)) return '<span class="t-add">' + e + "</span>";
    if (/^-/.test(l)) return '<span class="t-del">' + e + "</span>";
    if (/^@@/.test(l)) return '<span class="t-key">' + e + "</span>";
    return e;
  }
  function hlIni(l) {
    var p = splitComment(l, "#"), code = esc(p[0]);
    code = code.replace(/^(\s*\[[^\]]+\])/, '<span class="t-mod">$1</span>')
      .replace(/^(\s*)([\w.-]+)(\s*=)/, '$1<span class="t-key">$2</span><span class="t-p">$3</span>');
    return code + (p[1] ? '<span class="t-com">' + esc(p[1]) + "</span>" : "");
  }
  var HL = { yaml: hlYaml, bash: hlBash, conf: hlConf, tree: hlTree, text: esc, docker: hlDocker, diff: hlDiff, ini: hlIni, git: hlBash };

  function renderCode(sc) {
    var lang = sc.dataset.lang || "yaml", hl = HL[lang] || esc;
    var lines = dedent(sc.textContent), blocks = [], b = { k: null, lines: [] };
    lines.forEach(function (l) {
      var m = l.match(/^\s*#@(\S+)\s*$/);
      if (m) { if (b.lines.length || b.k) blocks.push(b); b = { k: m[1], lines: [] }; }
      else b.lines.push(l);
    });
    blocks.push(b);
    var html = "";
    blocks.forEach(function (bl) {
      var gap = false;
      while (bl.lines.length && !bl.lines[bl.lines.length - 1].trim()) { bl.lines.pop(); gap = true; }
      if (!bl.lines.length) return;
      var lead = 0;
      while (lead < bl.lines.length && !bl.lines[lead].trim()) lead++;
      html += (lead ? '<span class="gap"></span>' : "") +
        '<span class="blk"' + (bl.k ? ' data-k="' + bl.k + '"' : "") + ">" +
        bl.lines.slice(lead).map(function (l) { var h = hl(l); return h === "" ? " " : h; }).join("\n") + "</span>" +
        (gap ? '<span class="gap"></span>' : "");
    });
    var box = document.createElement("div");
    box.className = "code " + (sc.dataset.cls || "");
    box.innerHTML = '<div class="ct"><i></i><i></i><i></i><span>' + esc(sc.dataset.title || "") + '</span><span class="lang">' +
      ({ yaml: "YAML", bash: "Bash", git: "Git", conf: "Jinja2", docker: "Dockerfile", diff: "Diff", ini: "INI", tree: "", text: "" }[lang] || "") + "</span></div><pre>" + html + "</pre>";
    if (sc.id) box.id = sc.id;
    if (sc.dataset.v) box.dataset.v = sc.dataset.v;
    sc.parentNode.replaceChild(box, sc);
  }
  [].slice.call(document.querySelectorAll('script[type="text/x-code"]')).forEach(renderCode);
  window.deckRenderCode = renderCode;

  /* ---------------- steps (focus on code block + entity) ---------------- */
  S.forEach(function (s, i) {
    var num = s.querySelector(".kicker .n");
    if (num) num.textContent = String(i + 1).padStart(2, "0");
    var keys = [];
    if (s.dataset.steps) keys = s.dataset.steps.split(",");
    else [].forEach.call(s.querySelectorAll(".blk[data-k]"), function (b) { if (keys.indexOf(b.dataset.k) < 0) keys.push(b.dataset.k); });
    s._keys = keys;
    function keyOf(t) {
      var el = t && t.closest ? t.closest("[data-k]") : null;
      while (el && s.contains(el)) {
        var ks = el.dataset.k.split(" ").filter(function (k) { return keys.indexOf(k) >= 0; });
        if (ks.length) return ks[0];
        el = el.parentElement && el.parentElement.closest("[data-k]");
      }
      return null;
    }
    if (keys.length) {
      s.addEventListener("mouseover", function (e) {
        if (body.classList.contains("flow")) return;
        var k = keyOf(e.target);
        if (k !== hoverKey) { hoverKey = k; applyFocus(); }
      });
      s.addEventListener("mouseleave", function () { hoverKey = null; applyFocus(); });
      s.addEventListener("click", function (e) {
        var k = keyOf(e.target);
        if (!k) return;
        var idx = keys.indexOf(k);
        step = step === idx + 1 ? 0 : idx + 1; hoverKey = null; render();
      });
    }
  });
  function applyFocus() {
    var s = S[cur], key = hoverKey || (step > 0 ? s._keys[step - 1] : null);
    s.classList.toggle("focusing", !!key);
    [].forEach.call(s.querySelectorAll("[data-k]"), function (el) {
      el.classList.toggle("hot", !!key && el.dataset.k.split(" ").indexOf(key) >= 0);
    });
  }

  /* ---------------- layout: scale vs flow ---------------- */
  function layout() {
    var vw = innerWidth, vh = innerHeight;
    var flow = !EMBED && !PRESENTER && (vw < 900 || vw / vh < 1.05);
    body.classList.toggle("flow", flow);
    if (!flow) {
      var pad = EMBED ? 1 : 0.985;
      deckEl.style.setProperty("--s", Math.min(vw / W, vh / H) * pad);
    }
  }
  addEventListener("resize", layout);

  /* ---------------- navigation ---------------- */
  var bar = document.querySelector(".progress i"), cnt = document.getElementById("cnt");
  var prevB = document.getElementById("prevB"), nextB = document.getElementById("nextB");
  var chan = null;
  try { chan = new BroadcastChannel("deck:" + location.pathname); } catch (e) {}
  var applyingRemote = false;

  function render(fromRemote) {
    S.forEach(function (s, k) {
      var on = k === cur;
      s.classList.toggle("on", on);
      s.setAttribute("aria-hidden", on ? "false" : "true");
      if ("inert" in s) s.inert = !on;
    });
    applyFocus();
    if (bar) bar.style.width = ((cur + 1) / N * 100) + "%";
    var ks = S[cur]._keys.length;
    if (cnt) cnt.textContent = (cur + 1) + " / " + N + (ks && step ? " · " + step + "/" + ks : "");
    if (prevB) prevB.disabled = cur === 0 && step === 0;
    if (nextB) nextB.disabled = cur === N - 1 && step >= ks;
    if (!EMBED) {
      try { history.replaceState(null, "", "#" + (cur + 1)); } catch (e) {}
      document.title = S[cur].dataset.title + " — " + BASE_TITLE;
    }
    renderMenu(); renderNotes();
    if (body.classList.contains("flow")) scrollTo(0, 0);
    if (chan && !EMBED && !fromRemote) chan.postMessage({ t: "nav", i: cur, s: step });
    if (PRESENTER) presenterUpdate();
    document.dispatchEvent(new CustomEvent("slide", { detail: { i: cur, el: S[cur] } }));
  }
  function go(i, s) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i !== cur) hoverKey = null;
    cur = i; step = Math.max(0, Math.min(s || 0, S[i]._keys.length));
    render();
  }
  function next() {
    hoverKey = null;
    if (step < S[cur]._keys.length) { step++; render(); }
    else if (cur < N - 1) go(cur + 1, 0);
  }
  function prev() {
    hoverKey = null;
    if (step > 0) { step--; render(); }
    else if (cur > 0) go(cur - 1, 0);
  }
  window.deckAPI = { go: go, next: next, prev: prev, count: N, get: function () { return { i: cur, s: step }; } };

  if (chan && !EMBED) chan.onmessage = function (e) {
    var d = e.data || {};
    if (d.t === "nav" && (d.i !== cur || d.s !== step)) {
      cur = d.i; step = d.s; render(true);
    }
  };

  document.addEventListener("keydown", function (e) {
    if (EMBED || e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    var k = e.key;
    if (k === "ArrowRight" || k === "PageDown" || k === "ArrowDown" || (k === " " && tag !== "button") || (k === "Enter" && tag !== "button")) { e.preventDefault(); next(); }
    else if (k === "ArrowLeft" || k === "PageUp" || k === "ArrowUp") { e.preventDefault(); prev(); }
    else if (k === "Home") go(0); else if (k === "End") go(N - 1);
    else if (k === "f" || k === "F" || k === "а" || k === "А") toggleFS();
    else if (k === "n" || k === "N" || k === "т" || k === "Т") toggleNotes();
    else if (k === "p" || k === "P" || k === "з" || k === "З") openPresenter();
    else if (k === "m" || k === "M" || k === "ь" || k === "Ь") toggleMenu();
    else if (k === "Escape") { closeMenu(); }
  });

  /* touch swipe (ignore swipes that start inside scrollable code) */
  var tx = null, ty = null;
  document.addEventListener("touchstart", function (e) {
    if (e.target.closest && e.target.closest("pre, .menu, .notes-panel")) { tx = null; return; }
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) { dx < 0 ? go(cur + 1) : go(cur - 1); }
    tx = null;
  });

  /* ---------------- chrome: controls, menu, notes, fullscreen ---------------- */
  if (prevB) prevB.onclick = prev;
  if (nextB) nextB.onclick = next;
  var menu = document.getElementById("menu"), notesP = document.getElementById("notesP");
  function toggleMenu() { menu.classList.toggle("open"); }
  function closeMenu() { menu.classList.remove("open"); }
  document.getElementById("menuB").onclick = function (e) { e.stopPropagation(); toggleMenu(); };
  document.addEventListener("click", function (e) { if (!menu.contains(e.target)) closeMenu(); });
  function renderMenu() {
    if (!menu._built) {
      menu._built = true;
      S.forEach(function (s, i) {
        var b = document.createElement("button");
        b.innerHTML = "<b>" + String(i + 1).padStart(2, "0") + "</b><span></span>";
        b.lastChild.textContent = s.dataset.title;
        b.onclick = function () { go(i); closeMenu(); };
        menu.appendChild(b);
      });
      var h = document.createElement("div");
      h.className = "mhelp";
      h.innerHTML = "<kbd>→</kbd> <kbd>Пробел</kbd> далее (по шагам) · <kbd>←</kbd> назад<br><kbd>F</kbd> полный экран · <kbd>N</kbd> заметки · <kbd>P</kbd> режим докладчика · <kbd>M</kbd> меню";
      menu.appendChild(h);
    }
    [].forEach.call(menu.querySelectorAll("button"), function (b, i) { b.setAttribute("aria-current", i === cur ? "true" : "false"); });
  }
  function notesHTML(i) {
    var n = S[i] && S[i].querySelector("aside.notes");
    return n ? n.innerHTML : "<p>—</p>";
  }
  function renderNotes() { if (notesP.classList.contains("open")) notesP.innerHTML = "<h4>Заметки лектора · слайд " + (cur + 1) + "</h4>" + notesHTML(cur); }
  function toggleNotes() { notesP.classList.toggle("open"); renderNotes(); }
  document.getElementById("notesB").onclick = toggleNotes;
  function toggleFS() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    } catch (e) {}
  }
  document.getElementById("fsB").onclick = toggleFS;
  function openPresenter() {
    var u = location.pathname + "?presenter#" + (cur + 1);
    window.open(u, "presenter" + location.pathname, "width=1280,height=760");
  }
  document.getElementById("presB").onclick = openPresenter;

  /* auto-hide controls when idle (projector) */
  var idleT;
  function wake() {
    body.classList.remove("idle"); clearTimeout(idleT);
    idleT = setTimeout(function () { if (!body.classList.contains("flow") && !menu.classList.contains("open")) body.classList.add("idle"); }, 2600);
  }
  ["mousemove", "mousedown", "keydown", "touchstart"].forEach(function (ev) { addEventListener(ev, wake, { passive: true }); });

  /* ---------------- presenter view ---------------- */
  var pv = null, t0 = Date.now();
  function presenterUpdate() {
    if (!pv) return;
    var f1 = pv.querySelector("#pvCur"), f2 = pv.querySelector("#pvNext");
    try { f1.contentWindow.postMessage({ t: "go", i: cur, s: step }, "*"); } catch (e) {}
    try { f2.contentWindow.postMessage({ t: "go", i: Math.min(cur + 1, N - 1), s: 0 }, "*"); } catch (e) {}
    pv.querySelector("#pvNotes").innerHTML = notesHTML(cur);
    pv.querySelector("#pvInfo").textContent = "Слайд " + (cur + 1) + " / " + N +
      (S[cur]._keys.length ? " · шаг " + step + "/" + S[cur]._keys.length : "");
    pv.querySelector("#pvTitle").textContent = S[cur].dataset.title;
    pv.querySelector("#pvNextT").textContent = cur < N - 1 ? "Далее: " + S[cur + 1].dataset.title : "Последний слайд";
  }
  function buildPresenter() {
    body.classList.add("presenter");
    pv = document.createElement("div");
    pv.className = "pv";
    var src = location.pathname + "?embed";
    pv.innerHTML =
      '<div class="pv-left"><div class="pv-top"><div class="pv-title" id="pvTitle"></div><div class="pv-info" id="pvInfo"></div></div>' +
      '<div class="pv-main"><iframe id="pvCur" title="Текущий слайд" src="' + src + '"></iframe></div>' +
      '<div class="pv-ctrl"><button class="btn ghost" id="pvPrev">← Назад</button><button class="btn acc" id="pvNextB">Далее →</button>' +
      '<button class="btn ghost" id="pvReset">⟲ Таймер</button></div></div>' +
      '<div class="pv-side"><div class="pv-top"><span class="pv-lbl" id="pvNextT"></span><span class="pv-timer" id="pvTimer">00:00</span></div>' +
      '<div class="pv-next"><iframe id="pvNext" title="Следующий слайд" src="' + src + '"></iframe></div>' +
      '<span class="pv-lbl">Заметки лектора</span><div class="pv-notes" id="pvNotes"></div></div>';
    body.appendChild(pv);
    pv.querySelector("#pvCur").onload = presenterUpdate;
    pv.querySelector("#pvNext").onload = presenterUpdate;
    pv.querySelector("#pvPrev").onclick = prev;
    pv.querySelector("#pvNextB").onclick = next;
    pv.querySelector("#pvReset").onclick = function () { t0 = Date.now(); };
    setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      pv.querySelector("#pvTimer").textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    }, 500);
  }

  if (EMBED) addEventListener("message", function (e) {
    var d = e.data || {};
    if (d.t === "go" && typeof d.i === "number") go(d.i, d.s || 0);
  });

  /* ---------------- start ---------------- */
  if (PRESENTER) buildPresenter();
  layout();
  var h0 = parseInt((location.hash || "").slice(1), 10);
  cur = isNaN(h0) ? 0 : Math.max(0, Math.min(N - 1, h0 - 1));
  render(true);
  wake();
  addEventListener("hashchange", function () {
    var h = parseInt(location.hash.slice(1), 10);
    if (!isNaN(h) && h - 1 !== cur) go(h - 1);
  });
})();
