const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db;

function connect() {
  const file = process.env.SQLITE_FILE || path.join(__dirname, '..', 'instance', 'treetext.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent INTEGER,
      folder INTEGER DEFAULT 0,
      weight INTEGER,
      text TEXT,
      starred INTEGER DEFAULT 0,
      due TIMESTAMP,
      remindme TIMESTAMP,
      completed TIMESTAMP,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return Promise.resolve();
}

function getTodos(parentId) {
  const rows = db.prepare('SELECT id, weight, text FROM todos where parent = ? and folder = 0').all(parentId);
  return Promise.resolve(rows);
}

function createTodo(parent, text) {
  const info = db.prepare('insert into todos (parent, weight, text, folder) values (?, ?, ?, 0)').run(parent, 1, text);
  return Promise.resolve({ id: info.lastInsertRowid });
}

function updateTodo(id, parent, text) {
  db.prepare('update todos set parent=?, weight=?, text=? where id = ?').run(parent, 1, text, id);
  return Promise.resolve();
}

function deleteTodo(id) {
  db.prepare('delete from todos where id = ? and folder = 0').run(id);
  return Promise.resolve();
}

function deleteFolder(id) {
  db.prepare('delete from todos where id = ? and folder = 1').run(id);
  return Promise.resolve();
}

function getFolderTree() {
  const sql = `
    WITH RECURSIVE rec AS (
      SELECT id, parent, weight, printf('%010d-%010d', weight, id) AS path, text FROM todos where parent is null
      UNION ALL
      SELECT tt.id, tt.parent, tt.weight, r.path || '.' || printf('%010d-%010d', tt.weight, tt.id), tt.text FROM todos tt
      INNER JOIN rec r ON r.id = tt.parent where folder = 1
    ) SELECT * FROM rec order by path;
  `;
  const rows = db.prepare(sql).all();
  return Promise.resolve(rows);
}

function createFolder(parent, text) {
  db.prepare('insert into todos (parent, weight, text, folder) values (?, ?, ?, 1)').run(parent, 1, text);
  return Promise.resolve();
}

function updateFolder(text, weight, id) {
  if (weight === undefined || weight === null || weight === '') {
    db.prepare('update todos set text = ? where id = ?').run(text, id);
  } else {
    db.prepare('update todos set text = ?, weight = ? where id = ?').run(text, weight, id);
  }
  return Promise.resolve();
}

function getJsTreeRoots() {
  const sql = `
    select id, text, exists (
      select 1 from todos as children where children.parent = todos.id and folder = 1
    ) as children,
    'root' as type
    from todos
    where folder = 1 and parent is null
    order by weight
  `;
  const rows = db.prepare(sql).all();
  return Promise.resolve(rows);
}

function getJsTreeChildren(parentId) {
  const sql = `
    select id, text, exists (
      select 1 from todos as children where children.parent = todos.id and folder = 1
    ) as children
    from todos
    where folder = 1 and parent = ?
    order by weight
  `;
  const rows = db.prepare(sql).all(parentId);
  return Promise.resolve(rows);
}

module.exports = {
  connect,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  deleteFolder,
  getFolderTree,
  createFolder,
  updateFolder,
  getJsTreeRoots,
  getJsTreeChildren,
};
