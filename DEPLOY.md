# Archi Tasker — инструкции для Hermes деплоя

## Структура на VDS
```
/opt/archi-tasker/
├── src/              # исходники (index.html, server.js, package.json, Dockerfile)
└── data/             # volume для data.json (создаётся один раз)
```

## Команды для Hermes

### 1. Подготовка (первый раз)
```bash
mkdir -p /opt/archi-tasker/src /opt/archi-tasker/data
```

### 2. Деплой (выполняет Hermes)
```bash
cd /opt/archi-tasker

# Бэкап data.json
cp data/data.json data/data.json.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Сохранить старый образ как rollback
docker tag archi-tasker:latest archi-tasker:rollback 2>/dev/null || true

# Сборка
docker build -t archi-tasker:latest ./src

# Остановить старый контейнер
docker stop archi-tasker 2>/dev/null || true
docker rm archi-tasker 2>/dev/null || true

# Запустить новый
docker run -d \
  --name archi-tasker \
  --restart unless-stopped \
  -p 127.0.0.1:8000:8000 \
  -v /opt/archi-tasker/data:/app/data \
  -e API_TOKEN="СМЕНИ_МЕНЯ_НА_СЕКРЕТ" \
  archi-tasker:latest
```

### 3. Проверка (Hermes проверяет)
```bash
# Локальный порт
curl http://127.0.0.1:8000/api/state

# Если нужен HTTPS через Caddy — добавить в Caddyfile:
# archi-tasker.твой-домен.ком {
#     reverse_proxy 127.0.0.1:8000
# }
```

## Rollback (если что-то пошло не так)
```bash
cd /opt/archi-tasker
docker stop archi-tasker
docker rm archi-tasker
docker run -d \
  --name archi-tasker \
  --restart unless-stopped \
  -p 127.0.0.1:8000:8000 \
  -v /opt/archi-tasker/data:/app/data \
  -e API_TOKEN="СМЕНИ_МЕНЯ_НА_СЕКРЕТ" \
  archi-tasker:rollback
```

## API для Grok агентов
```bash
# Добавить задачу с описанием
curl -X POST https://archi-tasker.твой-домен.ком/api/tasks \
  -H "Authorization: Bearer СМЕНИ_МЕНЯ_НА_СЕКРЕТ" \
  -H "Content-Type: application/json" \
  -d '{"category": "Ремонт", "name": "Купить краску", "description": "Белая матовая, 5 литров"}'
```
