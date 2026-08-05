# DevOps Cursus

Репозиторий учебных материалов по DevOps для менторской программы.

## Структура

```
devops-cursus/
├── manuals/            # мануалы по темам (учебный контент)
├── templates/           # шаблон структуры мануала
├── glossary/            # общий глоссарий терминов
├── ROADMAP.MD            # план тем курса
└── .claude/
    ├── agents/           # devops-writer, tech-reviewer, quiz-builder, devops-researcher
    └── skills/           # manual-template, mermaid-diagrams, glossary-sync
```

Агенты разведены по стоимости модели: **devops-researcher** (haiku) —
дешёвый сбор фактов из веба; **devops-writer** и **tech-reviewer** (opus) —
дорогая модель для написания и ревью, где нужны рассуждения; **quiz-builder**
(sonnet) — среднее звено, синтез без веб-поиска. Писатель и ревьюер сами не
ходят в веб — они делегируют поиск фактов агенту `devops-researcher`.

## Как добавить новую тему

1. Посмотрите `ROADMAP.MD` и возьмите следующую тему по порядку.
2. Попросите написать черновик через агента **devops-writer** — он возьмёт
   структуру из `templates/manual-template.MD` и стиль из уже готовых
   мануалов.
3. Дайте агенту **glossary-sync** (или скиллу) обновить `glossary/GLOSSARY.MD`
   новыми терминами.
4. Прогоните мануал через агента **tech-reviewer** — проверка технической
   точности, структуры и синтаксиса Mermaid-диаграмм.
5. При необходимости сгенерируйте проверочные вопросы/практику через
   **quiz-builder**.
6. Отметьте тему как готовую (✅) в `ROADMAP.MD`.

## Мануалы

1. [CI/CD: непрерывная интеграция и доставка](manuals/01-cicd-manual.MD) ✅

Остальные темы — см. [ROADMAP.MD](ROADMAP.MD).
