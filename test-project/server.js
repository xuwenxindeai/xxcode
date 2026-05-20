const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件：解析 JSON 请求体
app.use(express.json());

// 内存存储
let todos = [];
let nextId = 1;

// ========================
// POST /todos — 创建 TODO
// ========================
app.post('/todos', (req, res) => {
  const { title, completed = false } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title 是必填字段（字符串）' });
  }

  const todo = {
    id: nextId++,
    title: title.trim(),
    completed,
    createdAt: new Date().toISOString(),
  };

  todos.push(todo);
  res.status(201).json(todo);
});

// ========================
// GET /todos — 获取所有 TODO
// ========================
app.get('/todos', (req, res) => {
  res.json(todos);
});

// ========================
// GET /todos/:id — 获取单个 TODO
// ========================
app.get('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const todo = todos.find((t) => t.id === id);

  if (!todo) {
    return res.status(404).json({ error: '未找到该 TODO' });
  }

  res.json(todo);
});

// ========================
// PUT /todos/:id — 更新 TODO
// ========================
app.put('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '未找到该 TODO' });
  }

  const { title, completed } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title 必须是非空字符串' });
    }
    todos[index].title = title.trim();
  }

  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed 必须是布尔值' });
    }
    todos[index].completed = completed;
  }

  todos[index].updatedAt = new Date().toISOString();

  res.json(todos[index]);
});

// ========================
// DELETE /todos/:id — 删除 TODO
// ========================
app.delete('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '未找到该 TODO' });
  }

  const deleted = todos.splice(index, 1)[0];
  res.json({ message: '删除成功', todo: deleted });
});

// ========================
// 启动服务器
// ========================
app.listen(PORT, () => {
  console.log(`✅ TODO API 运行在 http://localhost:${PORT}`);
  console.log('可用路由:');
  console.log('  POST   /todos        — 创建 TODO');
  console.log('  GET    /todos        — 获取所有 TODO');
  console.log('  GET    /todos/:id    — 获取单个 TODO');
  console.log('  PUT    /todos/:id    — 更新 TODO');
  console.log('  DELETE /todos/:id    — 删除 TODO');
});
