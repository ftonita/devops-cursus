# Docker: шпаргалка

Сводка по мануалу [03-docker-manual](03-docker-manual.MD) и презентации `site/slides/03-docker`.
Подробности, диаграммы и полные примеры — в мануале.

---

## 1. Главная мысль

**Контейнер — не лёгкая ВМ, а обычный процесс хоста с границами.** Образ собирается один раз и без изменений идёт через CI, staging и production (Immutable Artifact). Docker решает *упаковку и запуск на одной машине*; много узлов, self-healing и автомасштабирование — задача оркестратора (Kubernetes, Nomad, ECS).

---

## 2. Три кирпича ядра Linux

| Механизм | Что делает |
|---|---|
| **Namespaces** | Изолируют то, что процесс *видит*: `pid`, `net`, `mnt`, users |
| **cgroups** | Ограничивают то, что процесс *потребляет*: CPU, память, I/O |
| **OverlayFS / Copy-on-Write** | Файловая система из read-only слоёв + тонкий writable-слой |

## 3. Контейнер vs ВМ

| | ВМ | Контейнер |
|---|---|---|
| Изолирует | Всё «железо» | Процесс и окружение |
| Ядро | Своё у каждой | Общее с хостом |
| Размер | ГБ | десятки–сотни МБ |
| Старт | десятки секунд–минуты | мс–секунды |
| Плотность | единицы–десятки | сотни |
| Граница | Жёсткая, аппаратная | Мягкая, на уровне ядра |

Прод-схема: **контейнеры внутри ВМ** (ВМ — граница между тенантами, контейнеры — упаковка и плотность).

---

## 4. Словарь терминов

### Основные сущности
| Термин | Определение | Аналогия |
|---|---|---|
| **Dockerfile** | Текстовый рецепт сборки образа | Исходный код |
| **Image (образ)** | Неизменяемый набор слоёв + метаданные запуска | Бинарник |
| **Container** | Запущенный экземпляр образа + writable-слой | Процесс |
| **Registry** | Хранилище образов с версиями и правами (Docker Hub, ECR, GAR, GitLab Registry, Harbor, Nexus) | Артефакторий |
| **Layer (слой)** | Результат инструкции, меняющей ФС (`RUN`, `COPY`, `ADD`); неизменяем, кэшируется, переиспользуется между образами | |
| **Writable-слой** | Верхний слой контейнера (CoW); исчезает вместе с `docker rm` | |
| **Build context** | Каталог, отправляемый в сборку; урезается `.dockerignore` | |

### Архитектура
| Термин | Роль |
|---|---|
| **docker CLI** | Тонкий клиент; шлёт REST-запросы через `/var/run/docker.sock` |
| **dockerd** | Демон, владелец образов/контейнеров/сетей/томов. **Работает от root** → доступ к сокету = root на хосте |
| **BuildKit** | Движок сборки (по умолчанию с Engine 23.0): параллельные стадии, cache mounts, секреты |
| **containerd** | Жизненный цикл контейнеров и образов; проект CNCF, Kubernetes использует его напрямую |
| **runc** | Эталонная реализация OCI Runtime Spec: поднимает namespaces/cgroups, запускает процесс |
| **OCI** | Стандарты формата образа, runtime и протокола реестра → образ переносим между Docker, containerd, CRI-O, Podman |
| **dockershim** | Прослойка Kubernetes↔Docker; удалена в K8s 1.24 (май 2022), образы работают по-прежнему |

### Образы и безопасность
| Термин | Определение |
|---|---|
| **Tag** | Изменяемая ссылка (`myapp:1.4.2`) — можно перевесить |
| **Digest** | Неизменяемый адрес по содержимому (`myapp@sha256:…`) |
| **Multi-stage build** | Несколько `FROM`; в финальный образ копируется только результат (`COPY --from=build`) |
| **Multi-arch образ** | Один тег на несколько архитектур (`linux/amd64`, `linux/arm64`) через manifest list |
| **Distroless** | Образ без shell и пакетного менеджера — минимум поверхности атаки |
| **CVE** | Публичный идентификатор известной уязвимости |
| **SBOM** | Машиночитаемый перечень компонентов образа |
| **Provenance** | Запись о том, как и из чего собран образ (формат — SLSA); сама по себе не подписана |
| **cosign / Sigstore** | Подпись образов; keyless — через OIDC-токен раннера (`id-token: write`) |
| **Rootless** | Демон и процесс без root-привилегий |
| **PID 1** | Главный процесс контейнера; получает `SIGTERM` от `docker stop` |
| **exec-форма / shell-форма** | `CMD ["node","main.js"]` (процесс = PID 1) vs `CMD node main.js` (PID 1 = `/bin/sh`, сигналы не пробрасывает) |

---

## 5. Жизненный цикл

```
Dockerfile + context → build → образ → tag → push → Registry → pull → run → контейнер
контейнер: run → running → stop → exited → start (обратно) / rm (удалён)
```

`docker stop`: `SIGTERM` → ждёт `-t` (по умолчанию **10 с**) → `SIGKILL`.

---

## 6. Dockerfile: инструкции

| Инструкция | Создаёт слой? | Назначение |
|---|---|---|
| `FROM` | — (база) | Базовый образ; `AS name` — имя стадии |
| `WORKDIR` | нет | Рабочий каталог |
| `COPY` / `ADD` | да | Копирование файлов (`--from=stage`, `--chown`) |
| `RUN` | да | Команда сборки (`--mount=type=cache` / `type=secret`) |
| `ENV` / `ARG` | нет | Переменные (**секреты в них не класть**) |
| `USER` | нет | Пользователь процесса (не root) |
| `EXPOSE` | нет | Документирует порт (сам не публикует) |
| `HEALTHCHECK` | нет | Проверка здоровья (`--interval --timeout --start-period --retries`) |
| `CMD` / `ENTRYPOINT` | нет | Что запускать (в exec-форме) |
| `LABEL`, `VOLUME` | нет | Метаданные, точка монтирования |

### Кэш: золотое правило
Кэш рвётся с **первого изменившегося слоя и тянет все нижележащие**. Порядок: *редко меняющееся → часто меняющееся*.

```dockerfile
COPY package*.json ./     # манифесты отдельно
RUN npm ci                # тяжёлый шаг — в кэше (~2–3 мин vs ~10 с)
COPY . .                  # код — позже
```

`RUN --mount=type=cache,target=/root/.npm npm ci` — кэш пакетного менеджера живёт между сборками и не попадает в образ.

### Секреты при сборке
```dockerfile
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
```
```bash
docker build --secret id=npmrc,src=$HOME/.npmrc -t myapp .
```

### `.dockerignore` (обязателен)
`.git`, `node_modules`, `dist`, `.env`, `.env.*`, `*.log`, `Dockerfile`, `compose.yaml`, `README.md`.

---

## 7. Базовые образы

| База | Размер | Заметка |
|---|---|---|
| `ubuntu`/`debian` | 70–120 МБ | Много утилит и CVE |
| `debian:*-slim` | ~30 МБ | **Разумный дефолт** (glibc) |
| `alpine` | ~5 МБ | musl → ловушка для Python/Node/Java |
| `distroless` | 2–20 МБ | Нет shell, отладка сложнее |
| Chainguard / Wolfi | 5–30 МБ | glibc, почти 0 CVE, часть платная |
| Ubuntu chiseled | 5–15 МБ | Distroless-подход на базе Ubuntu |

Go-сервис с multi-stage: **~800 МБ → ~15 МБ**.

---

## 8. CLI

```bash
# сборка
docker build -t myapp:1.4.2 .
docker images
docker history myapp:1.4.2            # слои и размеры

# запуск
docker run -d --name myapp -p 8080:3000 --env-file .env \
  --memory=512m --cpus=0.5 --restart=unless-stopped myapp:1.4.2

# наблюдение / отладка
docker ps -a
docker logs -f --tail=100 myapp
docker exec -it myapp sh
docker stats myapp
docker inspect myapp

# публикация
docker tag myapp:1.4.2 registry.example.com/team/myapp:1.4.2
docker login registry.example.com
docker push registry.example.com/team/myapp:1.4.2

# уборка
docker system df
docker system prune -af               # без --volumes: тома не трогаем
docker builder prune --filter until=168h
```

---

## 9. Сети

| Драйвер | Когда |
|---|---|
| `bridge` (по умолчанию) | Одиночные контейнеры; **имён не резолвит** |
| **user-defined bridge** | Группа сервисов; **DNS по имени** (`postgres://db:5432`) |
| `host` | Сеть хоста, нет изоляции |
| `none` | Без сети |

- `-p 8080:3000` = порт **хоста** 8080 → порт **контейнера** 3000.
- `-p 127.0.0.1:8080:3000` — только на localhost (без префикса порт открыт наружу).
- Compose сам создаёт общую сеть.

## 10. Данные

| Тип | Где | Применение |
|---|---|---|
| **Named volume** | Управляет Docker (`/var/lib/docker/volumes`) | БД, загрузки — прод |
| **Bind mount** | Путь на хосте | Исходники в dev, конфиги; в проде опасен |
| **tmpfs** | Только RAM | Секреты, временные файлы |

`--mount` предпочтительнее `-v`: явный синтаксис, опечатка не создаёт пустой каталог молча.

```bash
docker run -d \
  --mount type=volume,src=pgdata,dst=/var/lib/postgresql/data \
  --mount type=bind,src="$PWD/postgresql.conf",dst=/etc/postgresql.conf,ro \
  postgres:17
```

---

## 11. Docker Compose

- Команда: **`docker compose`** (v2); старый `docker-compose` — устарел.
- Ключ `version:` **устарел и игнорируется** — не писать.
- Имя файла: **`compose.yaml`**.
- `depends_on: {db: {condition: service_healthy}}` — реальное ожидание готовности, не просто порядок.
- Тома переживают `down`; удаляются только с `-v`.
- Порт БД наружу не публикуем — `api` ходит по имени `db`.

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api
docker compose exec api sh
docker compose down            # -v — снести и тома
```

---

## 12. Теги и деплой

| Тег | Назначение |
|---|---|
| `app:sha-9b2c1f4` | Уникальный, неизменяемый — **на него опирается прод** |
| `app:1.4.2` | SemVer для людей |
| `app:main` / `latest` | Плавающий — только dev/staging/песочницы |

**Тег — для людей, digest — для деплоя.** В реестре включить: retention-политику, immutable tags, сканирование при push.

## 13. Паттерны

- **Один процесс — один контейнер**, логи в stdout/stderr.
- **Один образ, конфигурация снаружи** (env, тома, секрет-менеджер). `Dockerfile.dev`/`.prod` — симптом проблемы.
- **Секреты** — только BuildKit-секреты, не `ARG`/`ENV`.
- **Лестница масштаба:** `docker run` → `docker compose` → оркестратор (когда нужны N узлов, self-healing, автомасштабирование).

---

## 14. Best practices (чек-лист)

- [ ] `.dockerignore` рядом с `Dockerfile`
- [ ] Порядок инструкций: редкое → частое
- [ ] Multi-stage build
- [ ] `USER` не root
- [ ] Зафиксированные версии базы (`node:24-bookworm-slim`, не `latest`); критичное — по digest
- [ ] Минимальная база, но без жертв glibc ради 20 МБ
- [ ] Сканер в CI (Trivy / Docker Scout / Grype), блок на HIGH/CRITICAL, **по digest**
- [ ] `CMD`/`ENTRYPOINT` в exec-форме
- [ ] Логи в stdout/stderr
- [ ] Данные только в томах
- [ ] Лимиты `--memory` / `--cpus`
- [ ] Подпись (cosign) + SBOM + provenance; Docker Content Trust выводится — стандарт Sigstore

## 15. Антипаттерны → решение

| Антипаттерн | Решение |
|---|---|
| `FROM ubuntu:latest` | Фиксировать тег / digest |
| `COPY . .` до установки зависимостей | Сначала манифесты |
| Нет `.dockerignore` | Добавить (иначе `.git`/`.env` в образе) |
| Секрет в `ARG`/`ENV` | `--mount=type=secret` |
| Процесс от root | `USER appuser` |
| Несколько сервисов в контейнере (supervisord) | Один процесс — один контейнер |
| Данные в writable-слое | Named volume |
| `latest` в проде | SHA-тег или digest |
| `--privileged` «чтобы заработало» | Точечные `--cap-add` |
| Проброс `docker.sock` | Rootless, buildx, Buildah (Kaniko архивирован, живёт форк Chainguard) |
| `Dockerfile.dev` ≠ `Dockerfile.prod` | Один Dockerfile + `--target` |
| `curl`/`vim` в образе «для отладки» | `docker debug` (платные тарифы Docker Desktop), sidecar, `:debug`-образ |
| Образы не пересобираются после релиза | Плановая пересборка баз |
| `CMD node main.js` (shell-форма) | `CMD ["node","main.js"]` |

---

## 16. Инструменты

| Категория | Инструменты |
|---|---|
| Runtime | Docker Engine, containerd, runc, CRI-O, gVisor, Kata |
| Альтернативные CLI | Podman (rootless), nerdctl, Rancher Desktop, Colima |
| Сборка | BuildKit/buildx, Buildah, Kaniko, ko, Jib, Cloud Native Buildpacks |
| Сканирование | Docker Scout, Trivy, Grype, Snyk Container, Clair |
| Линт/анализ | hadolint, dive, docker-slim |
| Цепочка поставок | cosign/Sigstore, syft (SBOM), buildx-аттестации |
| Локальная композиция | Compose v2, Podman Compose, Tilt, Skaffold |
| Оркестрация | Kubernetes, Nomad, Docker Swarm, ECS |

## 17. CI-пайплайн сборки (GitHub Actions)

`checkout` → `setup-qemu` → `setup-buildx` → `login` → `metadata-action` (теги) → `build-push-action` (`platforms: linux/amd64,linux/arm64`, `cache-from/to: type=gha`, `provenance: true`, `sbom: true`) → `cosign sign` по digest → `trivy` (`severity: HIGH,CRITICAL`, `exit-code: 1`).
Права: `contents: read`, `packages: write`, `id-token: write`.

## 18. Метрики

| Группа | Метрики (ориентир) |
|---|---|
| Скорость | Build time тёплый < 2 мин, холодный < 10 мин; cache hit rate > 80%; image pull time — секунды |
| Размер | Размер образа p50/p90; доля переиспользуемых слоёв; время до readiness |
| Безопасность | Число HIGH/CRITICAL CVE; mean time to patch; доля non-root; доля образов с SBOM и подписью; возраст базового образа |

Питают DORA: build time/cache → Lead Time; CVE/MTTP/digest → Change Failure Rate; размер/pull → Lead Time и Time to Restore.

---

## 19. Вопросы для самопроверки (из презентации)

1. **Чем контейнер отличается от ВМ?** Процесс на общем ядре с namespaces и cgroups: быстрее и плотнее, граница мягче.
2. **Почему зависимости ставят раньше кода?** Кэш рвётся с первого изменённого слоя; манифесты отдельно — правка кода не трогает `npm ci`.
3. **Что деплоим в прод?** Digest или тег с SHA коммита; `latest` — только песочницы.
4. **Почему Go-образ худеет с ~800 до ~15 МБ?** Multi-stage: компилятор остаётся в стадии build, в distroless копируется только бинарник.
5. **Почему `api` не находит `db` по имени?** Они в дефолтном `bridge`; DNS есть только в user-defined сети (Compose создаёт её сам).
6. **Где кончается Docker?** Один хост — Docker/Compose; много узлов, self-healing, rolling update — оркестратор.
7. **Что будет при `docker stop` с `CMD node main.js`?** `SIGTERM` не дойдёт (PID 1 — `/bin/sh`), через 10 с придёт `SIGKILL`.
8. **Где хранить данные Postgres?** В named volume.
