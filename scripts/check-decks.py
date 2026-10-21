#!/usr/bin/env python3
"""Проверка презентаций сайта: переполнение слайдов, ошибки JS, мобильная вёрстка.

  python3 scripts/check-decks.py                    # все колоды + хаб
  python3 scripts/check-decks.py 00-git             # одна колода (префикс папки)
  python3 scripts/check-decks.py --shots out/       # + скриншоты каждого слайда
  python3 scripts/check-decks.py --update-topics    # записать slides/minutes в site/topics.js

Нужен playwright (pip install playwright; chromium уже может стоять в системе).
Код возврата 1, если нашлись проблемы — скрипт годится и для CI.
"""
import argparse
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

# JS в странице: найти элементы, вылезающие за границы слайда
OVERFLOW_JS = """
() => {
  const s = document.querySelector('.deck > section.on');
  const sr = s.getBoundingClientRect();
  const bad = [];
  const pad = 6;
  if (s.scrollHeight > s.clientHeight + 2) bad.push('section scrollHeight ' + s.scrollHeight + ' > ' + s.clientHeight);
  s.querySelectorAll('*').forEach(e => {
    if (e.closest('aside.notes') || e.closest('.hint')) return;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || e.hidden || e.closest('[hidden]')) return;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.bottom > sr.bottom - 4 + pad || r.right > sr.right + pad || r.left < sr.left - pad) {
      const t = (e.className && e.className.toString().slice(0, 40)) || e.tagName;
      bad.push(e.tagName.toLowerCase() + '.' + t + ' bottom=' + Math.round(r.bottom - sr.bottom) + ' right=' + Math.round(r.right - sr.right));
    }
  });
  // внутренний скролл в блоках с текстом (кроме code pre) — признак, что контент не влез
  s.querySelectorAll('*').forEach(e => {
    if (e.tagName === 'PRE' || e.closest('aside.notes')) return;
    const cs = getComputedStyle(e);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 2)
      bad.push('inner-scroll ' + e.tagName.toLowerCase() + '.' + (e.className || '').toString().slice(0, 30));
  });
  return bad.slice(0, 8);
}
"""


def check_deck(page, url, shots_dir, name, report):
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and "fonts.g" not in m.text and "ERR_" not in m.text and errors.append(f"console: {m.text}"))
    page.set_viewport_size({"width": 1600, "height": 900})
    page.goto(url)
    page.wait_for_function("window.deckAPI")
    n = page.evaluate("deckAPI.count")
    problems = []
    for i in range(n):
        page.evaluate(f"deckAPI.go({i}, 0)")
        page.wait_for_timeout(450)
        bad = page.evaluate(OVERFLOW_JS)
        title = page.evaluate("document.querySelector('.deck > section.on').dataset.title")
        if bad:
            problems.append(f"  слайд {i + 1} «{title}»: " + "; ".join(bad))
        if shots_dir:
            out = Path(shots_dir) / name
            out.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(out / f"{i + 1:02d}.png"))
        # пошаговая подсветка не должна ломать страницу
        steps = page.evaluate("document.querySelector('.deck > section.on')._keys.length")
        for s in range(1, steps + 1):
            page.evaluate(f"deckAPI.go({i}, {s})")
    # мобильная вёрстка: нет горизонтального скролла
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(url)
    page.wait_for_function("window.deckAPI")
    for i in range(n):
        page.evaluate(f"deckAPI.go({i}, 0)")
        page.wait_for_timeout(120)
        w = page.evaluate("[document.documentElement.scrollWidth, innerWidth]")
        if w[0] > w[1] + 2:
            problems.append(f"  мобильная: слайд {i + 1} шире экрана ({w[0]} > {w[1]})")
        if shots_dir and i in (0, n // 2):
            page.screenshot(path=str(Path(shots_dir) / name / f"m{i + 1:02d}.png"), full_page=True)
    if errors:
        problems.append("  JS: " + " | ".join(sorted(set(errors))[:4]))
    report.append((name, n, problems))
    return n


def check_hub(page, report):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_viewport_size({"width": 1280, "height": 900})
    page.goto((SITE / "index.html").as_uri())
    page.wait_for_selector(".tcard")
    probs = []
    if page.evaluate("document.querySelectorAll('.tcard').length") < 3:
        probs.append("  в оглавлении мало карточек")
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto((SITE / "index.html").as_uri())
    if page.evaluate("document.documentElement.scrollWidth > innerWidth + 2"):
        probs.append("  хаб: горизонтальный скролл на мобильном")
    if errors:
        probs.append("  JS: " + " | ".join(errors[:3]))
    report.append(("hub", 0, probs))


def update_topics(counts):
    p = SITE / "topics.js"
    s = p.read_text(encoding="utf-8")
    for prefix, n in counts.items():
        tid, slug = prefix.split("-", 1)
        pat = re.compile(r'(id: "%s", slug: "%s".*?slides: )\d+(, minutes: )\d+' % (re.escape(tid), re.escape(slug)), re.S)
        s = pat.sub(lambda m: f"{m.group(1)}{n}{m.group(2)}{max(5, round(n * 1.2))}", s, count=1)
    p.write_text(s, encoding="utf-8")


def launch_opts():
    """Если версия playwright не совпала с предустановленным chromium — берём его по пути."""
    import glob
    found = sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome"))
    return {"executable_path": found[-1], "args": ["--no-sandbox"]} if found else {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("only", nargs="?", help="префикс папки колоды, например 00-git")
    ap.add_argument("--shots", help="папка для скриншотов")
    ap.add_argument("--update-topics", action="store_true")
    ap.add_argument("--no-hub", action="store_true")
    a = ap.parse_args()

    decks = sorted(d for d in (SITE / "slides").glob("*/index.html") if not a.only or d.parent.name.startswith(a.only))
    report, counts = [], {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(**launch_opts())
        for d in decks:
            page = b.new_page()
            counts[d.parent.name] = check_deck(page, d.as_uri(), a.shots, d.parent.name, report)
            page.close()
        if not a.only and not a.no_hub:
            page = b.new_page()
            check_hub(page, report)
            page.close()
        b.close()

    bad = 0
    for name, n, probs in report:
        print(f"{'✗' if probs else '✓'} {name}" + (f" — {n} слайдов" if n else ""))
        for p in probs:
            print(p)
            bad += 1
    if a.update_topics:
        update_topics(counts)
        print("topics.js обновлён")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
