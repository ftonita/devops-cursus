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
find "$OUT" -name '*.bak' -delete

echo "Prepared $(find "$OUT" -name '*.md' | wc -l | tr -d ' ') pages in $OUT"
