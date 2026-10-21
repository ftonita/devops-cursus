#!/usr/bin/env bash
# Готовит исходники для MkDocs: копирует материалы курса в build/docs
# и меняет расширение .MD -> .md (в файлах и в ссылках между ними).
# Исходные файлы в репозитории не трогает.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT=build/docs
rm -rf "$OUT"
mkdir -p "$OUT"

cp -R pages/. "$OUT/"
cp ROADMAP.MD "$OUT/ROADMAP.MD"
for dir in manuals glossary; do
  mkdir -p "$OUT/$dir"
  cp "$dir"/*.MD "$OUT/$dir/"
done

# .MD -> .md: переименовать файлы и поправить ссылки вида (file.MD) и (file.MD#якорь)
find "$OUT" -name '*.MD' | while read -r f; do
  mv "$f" "${f%.MD}.md"
done
find "$OUT" -name '*.md' -exec sed -i.bak -E 's/\.MD([)#])/.md\1/g' {} +
# Шаблон мануала нужен авторам, а не ученикам: на сайт его не кладём,
# а ссылки на него ведут в репозиторий на GitHub
find "$OUT" -name '*.md' -exec sed -i.bak -E \
  's#\]\((\.\./)?templates/([^)]*)\.md\)#](https://github.com/ftonita/devops-cursus/blob/main/templates/\2.MD)#g' {} +
# Ссылка на презентацию темы: если есть site/slides/NN-*/, вставляем кнопку под H1 мануала.
# На сайте раздел лежит в /materials/, презентации — в /slides/, поэтому ../../../slides/ от страницы мануала.
for f in "$OUT"/manuals/*-manual.md; do
  num=$(basename "$f" | cut -c1-2)
  deck=$(ls -d site/slides/"$num"-*/ 2>/dev/null | head -1 || true)
  [ -n "$deck" ] || continue
  slug=$(basename "$deck")
  sed -i "1a\\
\\
<a class=\"deck-link\" href=\"../../../slides/$slug/\">🎞 Интерактивная презентация к теме</a>" "$f"
done
find "$OUT" -name '*.bak' -delete

echo "Prepared $(find "$OUT" -name '*.md' | wc -l | tr -d ' ') pages in $OUT"
