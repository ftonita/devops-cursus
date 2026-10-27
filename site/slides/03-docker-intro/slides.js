/* Docker простыми словами: тренажёр «одна команда — один сервис».
   Табы, тест, flip и переключатели уже делает cursus.js. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }

  var out = $("simOut"), box = $("boxSt");
  var st = { image: false, exists: false, running: false };

  function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function show(lines) { out.innerHTML = lines.join("\n"); }
  function cmd(c) { return '<span class="cmd">$ ' + esc(c) + "</span>"; }

  function paint() {
    var t = $("boxTitle"), x = $("boxText"), note = $("simNote");
    box.className = "boxst " + (st.running ? "" : st.exists ? "stop" : "off");
    if (st.running) {
      t.textContent = "Коробка mysite работает";
      x.textContent = "Сайт доступен на порту 8080.";
    } else if (st.exists) {
      t.textContent = "Коробка остановлена";
      x.textContent = "Контейнер создан, но не запущен. Его можно удалить.";
    } else {
      t.textContent = "Коробки нет";
      x.textContent = st.image ? "Образ nginx уже скачан — следующий запуск будет мгновенным." : "Образ nginx на компьютере не скачан.";
    }
    note.textContent = st.image ? "Образ nginx лежит на компьютере: повторный запуск не качает его заново." : "Первый запуск скачивает образ со склада. Повторный — уже из локальной копии.";
  }

  function reset() {
    st = { image: false, exists: false, running: false };
    show(['<span class="dim">Нажмите первую кнопку справа.</span>']);
    paint();
  }

  $("bRun").onclick = function () {
    var c = "docker run -d --name mysite -p 8080:80 nginx";
    if (st.exists) {
      show([cmd(c), '<span class="err">Ошибка: имя «mysite» уже занято. Сначала удалите старый контейнер (docker rm).</span>']);
      return;
    }
    var lines = [cmd(c)];
    if (!st.image) {
      lines.push("Unable to find image 'nginx:latest' locally");
      lines.push("latest: Pulling from library/nginx");
      lines.push('<span class="dim">… скачивание слоёв …</span>');
      lines.push("Status: Downloaded newer image for nginx:latest");
    }
    lines.push('<span class="ok">3f9c1a7b2d4e</span>  <span class="dim"># номер запущенного контейнера</span>');
    st.image = true; st.exists = true; st.running = true;
    show(lines); paint();
  };

  $("bPs").onclick = function () {
    function row(a) { return [a[0].padEnd(14), a[1].padEnd(7), a[2].padEnd(11), a[3].padEnd(15), a[4]].join(""); }
    var lines = [cmd("docker ps"), '<span class="hi">' + row(["CONTAINER ID", "IMAGE", "STATUS", "PORTS", "NAMES"]) + "</span>"];
    if (st.running) lines.push(esc(row(["3f9c1a7b2d4e", "nginx", "Up 5 sec", "8080->80/tcp", "mysite"])));
    else lines.push('<span class="dim">(пусто — запущенных контейнеров нет)</span>');
    show(lines);
  };

  $("bCurl").onclick = function () {
    var lines = [cmd("curl http://localhost:8080")];
    if (st.running) {
      lines.push("&lt;!DOCTYPE html&gt;");
      lines.push("&lt;title&gt;Welcome to nginx!&lt;/title&gt;");
      lines.push('<span class="ok">&lt;h1&gt;Welcome to nginx!&lt;/h1&gt;</span>');
    } else {
      lines.push('<span class="err">curl: (7) Failed to connect to localhost port 8080: Connection refused</span>');
      lines.push('<span class="dim"># сайта нет, потому что контейнер не запущен</span>');
    }
    show(lines);
  };

  $("bStop").onclick = function () {
    var lines = [cmd("docker stop mysite")];
    if (st.running) { lines.push('<span class="ok">mysite</span>'); st.running = false; }
    else lines.push('<span class="err">Нечего останавливать: контейнер mysite не запущен.</span>');
    show(lines); paint();
  };

  $("bRm").onclick = function () {
    var lines = [cmd("docker rm mysite")];
    if (st.running) lines.push('<span class="err">Ошибка: контейнер ещё работает. Сначала остановите его (docker stop).</span>');
    else if (st.exists) { lines.push('<span class="ok">mysite</span>'); st.exists = false; }
    else lines.push('<span class="err">Такого контейнера нет.</span>');
    show(lines); paint();
  };

  $("bReset").onclick = reset;

  /* Compose-слайд: подпись статуса меняется вместе с переключателем */
  var stack = $("stackv");
  if (stack) {
    var labels = [].slice.call(stack.querySelectorAll(".stt"));
    var btn = document.querySelector('[data-toggle="#stackv"]');
    if (btn) btn.addEventListener("click", function () {
      var on = stack.classList.contains("on");
      labels.forEach(function (l) { l.textContent = on ? "работает" : "не запущен"; });
    });
  }
  reset();
})();
