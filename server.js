const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const API_TOKEN = process.env.API_TOKEN || 'change-me';
const VERSION = 'v2'; // изменить при деплое для сброса кэша

const app = express();
app.use(express.json());

// Отключить кэш для index.html
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  next();
});
app.use(express.static(__dirname));

// Создать папку для данных если нет
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (data.categories && data.categories.length > 0) return data;
  } catch {}
  // Инициализация тестовыми данными
  return {
    categories: [
      {
        id: uid(),
        name: 'Ремонт',
        tasks: [
          { id: uid(), name: 'Купить краску', status: 'todo', description: 'Белая матовая, 5 литров' },
          { id: uid(), name: 'Покрасить стены', status: 'done', description: 'Гостиная и спальня' },
        ],
      },
      {
        id: uid(),
        name: 'Работа',
        tasks: [
          { id: uid(), name: 'Подготовить отчёт', status: 'todo', description: 'За ноябрь' },
          { id: uid(), name: 'Встреча с клиентом', status: 'todo', description: 'Понедельник в 14:00' },
        ],
      },
    ],
  };
}

function save(state) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function uid() {
  return Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
}

// ---------- Public API (browser UI; agents use same routes, optional Bearer later) ----------
app.get('/api/state', (req, res) => {
  res.json(load());
});

app.post('/api/categories', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  const state = load();
  const cat = { id: uid(), name, tasks: [] };
  state.categories.push(cat);
  save(state);
  res.status(201).json(cat);
});

app.patch('/api/categories/:id', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  const state = load();
  const cat = state.categories.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'category not found' });
  cat.name = name;
  save(state);
  res.json(cat);
});

app.delete('/api/categories/:id', (req, res) => {
  const state = load();
  state.categories = state.categories.filter(c => c.id !== req.params.id);
  save(state);
  res.json({ ok: true });
});

app.post('/api/tasks', (req, res) => {
  const { category, name, status, description } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
  const state = load();
  let cat = state.categories.find(c => c.id === category || c.name === category);
  if (!cat) {
    cat = { id: uid(), name: String(category || 'Без категории'), tasks: [] };
    state.categories.push(cat);
  }
  const task = {
    id: uid(),
    name: String(name).trim(),
    status: status === 'done' ? 'done' : 'todo',
    description: description && String(description).trim() ? String(description).trim() : undefined,
  };
  cat.tasks.push(task);
  save(state);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const state = load();
  for (const c of state.categories) {
    const t = c.tasks.find(x => x.id === req.params.id);
    if (t) {
      if (req.body.status) t.status = req.body.status === 'done' ? 'done' : 'todo';
      if (req.body.name) t.name = String(req.body.name).trim();
      if (req.body.description !== undefined) {
        t.description = req.body.description && String(req.body.description).trim() ? String(req.body.description).trim() : undefined;
      }
      save(state);
      return res.json(t);
    }
  }
  res.status(404).json({ error: 'task not found' });
});

app.delete('/api/tasks/:id', (req, res) => {
  const state = load();
  for (const c of state.categories) {
    const i = c.tasks.findIndex(x => x.id === req.params.id);
    if (i >= 0) {
      c.tasks.splice(i, 1);
      save(state);
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ error: 'task not found' });
});

// Reorder: body = { category: id, order: [taskId, ...] }
app.post('/api/reorder', (req, res) => {
  const state = load();
  const cat = state.categories.find(c => c.id === req.body.category);
  if (!cat || !Array.isArray(req.body.order)) return res.status(400).json({ error: 'bad request' });
  const byId = new Map(cat.tasks.map(t => [t.id, t]));
  cat.tasks = req.body.order.map(id => byId.get(id)).filter(Boolean);
  save(state);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Archi Tasker running at http://localhost:${PORT}`);
});
