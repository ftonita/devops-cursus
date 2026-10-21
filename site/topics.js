/* Источник правды для оглавления курса (site/index.html рисуется из этого списка).
   Новая тема = одна запись здесь. Поля:
   id — номер как в ROADMAP.MD, slug — часть имён файлов, theme — класс темы (cursus.css),
   status — "ready" | "soon", quiz: false — если у темы нет квиза. Пути строятся из id и slug.
   slides и minutes обновляет scripts/check-decks.py --update-topics. */
window.TOPICS = [
  { id: "00", slug: "git", theme: "theme-git", icon: "🌳", status: "ready",
    title: "Git: основы", level: "База",
    pitch: "Единственный инструмент, без которого не работает вся остальная цепочка. Три зоны, коммиты и ветки — без магии.",
    bullets: ["Рабочий каталог → индекс → репозиторий", "Ветки, merge и rebase без паники", "Как откатывать, не ломая историю"],
    slides: 15, minutes: 18 },
  { id: "02", slug: "cicd", theme: "theme-cicd", icon: "🔁", status: "ready",
    title: "CI/CD: от коммита до production", level: "База",
    pitch: "Как код сам собирается, проверяется и доезжает до пользователей — и почему релиз перестаёт быть событием.",
    bullets: ["Этапы пайплайна и quality gates", "Blue-green, canary, rolling", "Метрики DORA: как понять, что стало лучше"],
    slides: 15, minutes: 18 },
  { id: "03", slug: "docker", theme: "theme-docker", icon: "🐳", status: "ready",
    title: "Docker и контейнеризация", level: "База",
    pitch: "«У меня работает» перестаёт быть оправданием: приложение едет вместе со своим окружением.",
    bullets: ["Образ, контейнер, слои и кэш", "Dockerfile и multi-stage сборка", "Compose, сети, тома и безопасность"],
    slides: 16, minutes: 19 },
  { id: "04", slug: "kubernetes", theme: "theme-k8s", icon: "☸️", status: "soon",
    title: "Kubernetes: основы оркестрации", level: "Средний",
    pitch: "Контейнеры в масштабе: кто их запускает, перезапускает и раскладывает по серверам." },
  { id: "05", slug: "git-workflow", theme: "theme-flow", icon: "🔀", status: "ready",
    title: "Git-workflow для команд", level: "Средний",
    pitch: "Как команде работать в одном репозитории и не наступать друг другу на ноги: trunk-based, GitFlow, PR-процесс.",
    bullets: ["Стратегии ветвления: что и когда выбирать", "Pull Request, ревью и защита main", "Релизы, hotfix и метрики процесса"],
    slides: 15, minutes: 18 },
  { id: "06", slug: "iac", theme: "theme-iac", icon: "🏗️", status: "soon",
    title: "Infrastructure as Code: Terraform и Ansible", level: "Средний",
    pitch: "Серверы по чертежу, а не вручную. Практика по Ansible уже есть — смотрите бонус ниже." },
  { id: "07", slug: "monitoring", theme: "theme-obs", icon: "📈", status: "soon",
    title: "Мониторинг и observability", level: "Средний",
    pitch: "Prometheus, Grafana, логи и трейсы: как узнать о проблеме раньше пользователей." },
  { id: "08", slug: "linux-networking", theme: "theme-linux", icon: "🐧", status: "soon",
    title: "Linux и сети для DevOps", level: "База",
    pitch: "Процессы, права, systemd, DNS и порты — фундамент, на котором стоит всё остальное." },
  { id: "09", slug: "devsecops", theme: "theme-sec", icon: "🛡️", status: "soon",
    title: "DevSecOps: безопасность в пайплайне", level: "Продвинутый",
    pitch: "Сканеры, секреты и supply chain: как встроить безопасность в CI/CD, а не прикручивать в конце." },
  { id: "10", slug: "cloud-fundamentals", theme: "theme-cloud", icon: "☁️", status: "soon",
    title: "Облака: AWS / GCP / Yandex Cloud", level: "Продвинутый",
    pitch: "Вычисления, сети и хранилища как услуги — и как не потерять контроль над счётом." },
  { id: "11", slug: "sre", theme: "theme-sre", icon: "🚨", status: "soon",
    title: "SRE-практики: инциденты, SLO/SLI, on-call", level: "Продвинутый",
    pitch: "Надёжность как инженерная дисциплина: бюджеты ошибок, разбор инцидентов и дежурства." }
];

/* Внешние материалы курса (бонус) */
window.BONUS = [
  { icon: "🐧", theme: "theme-linux", title: "Linux + Ansible: практика",
    pitch: "Две интерактивные лекции: Ansible «кирпичиками» и безопасная настройка Linux-сервера за первые 15 минут.",
    href: "https://ftonita.github.io/ansible-linux-practice/", label: "Открыть курс →", tag: "Практика · 24 слайда" }
];
