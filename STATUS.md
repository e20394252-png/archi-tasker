# Archi Tasker — Текущее состояние

## Архитектура

### Фронтенд (index.html)
- Ванильный JavaScript, `fetch` → `/api/*`
- Drag-and-drop (десктоп), ▲▼ (мобильные), модалка редактирования

### Бэкенд (server.js)
- Node.js + Express, порт 8000
- Данные: `data/data.json` (в Docker: volume `/app/data`)
- API публичный для UI (без Bearer); `API_TOKEN` зарезервирован для будущей защиты агентов

### Деплой
- Docker на VDS, Caddy: https://tasker-v2.164-215-97-87.sslip.io
- Репозиторий: https://github.com/e20394252-png/archi-tasker

## Исправлено (2026-03-14)

**Кнопки UI не работали** (и на мобильных, и на десктопе): после `GET /api/state` стоял `app.use('/api', requireToken)` — все POST/PATCH/DELETE возвращали 401, фронт не шлёт токен.

- Убран глобальный `requireToken` с `/api`
- Удаление категории без `confirm()` (как у задач)

## Проверка после деплоя

```bash
curl -s http://127.0.0.1:8000/api/state | head -c 100
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/api/categories \
  -H "Content-Type: application/json" -d '{"name":"__ping__"}'
# ожидается 201
```

## URL

https://tasker-v2.164-215-97-87.sslip.io