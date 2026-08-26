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
      notes TEXT,
      starred INTEGER DEFAULT 0,
      due TIMESTAMP,
      remindme TIMESTAMP,
      completed TIMESTAMP,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const columns = db.prepare('PRAGMA table_info(todos)').all();
  if (!columns.some((c) => c.name === 'notes')) {
    db.exec('ALTER TABLE todos ADD COLUMN notes TEXT');
  }
  return Promise.resolve();
}

function getTodo(id) {
  const row = db.prepare('SELECT id, parent, text, notes FROM todos where id = ?').get(id);
  return Promise.resolve(row);
}

function updateTodoNotes(id, notes) {
  db.prepare('update todos set notes = ? where id = ?').run(notes, id);
  return Promise.resolve();
}

// sub_done/sub_total drive the "1 of 3" line under a todo, the way Microsoft To Do
// counts the subitems of a task.
function getTodos(parentId) {
  const sql = `
    SELECT id, weight, text, starred, completed,
      (select count(*) from todos sub where sub.parent = todos.id and sub.folder = 0) as sub_total,
      (select count(*) from todos sub where sub.parent = todos.id and sub.folder = 0
        and sub.completed is not null) as sub_done
    FROM todos where parent = ? and folder = 0
  `;
  const rows = db.prepare(sql).all(parentId);
  return Promise.resolve(rows);
}

// sqlite has no boolean type, so starred is stored as 0/1, and completed keeps the
// moment it was ticked rather than a flag, which is what the column was designed for.
function setTodoCompleted(id, completed) {
  db.prepare('update todos set completed = ? where id = ?').run(completed ? new Date().toISOString() : null, id);
  return Promise.resolve();
}

function setTodoStarred(id, starred) {
  db.prepare('update todos set starred = ? where id = ?').run(starred ? 1 : 0, id);
  return Promise.resolve();
}

function createTodo(parent, text) {
  const info = db.prepare('insert into todos (parent, weight, text, folder) values (?, ?, ?, 0)').run(parent, 1, text);
  return Promise.resolve({ id: info.lastInsertRowid });
}

// One transaction for the whole tree: a half inserted import would have to be untangled
// by hand, and children are useless without the parent that carries their id.
function importNodes(parentId, nodes) {
  const insert = db.prepare(
    'insert into todos (parent, weight, text, folder, notes, starred, completed) values (?, ?, ?, ?, ?, ?, ?)'
  );
  const counts = { folders: 0, todos: 0 };

  function insertNode(parent, node, weight) {
    const folder = node.folder ? 1 : 0;
    const info = insert.run(parent, weight, node.text || '', folder, node.notes || null,
      node.starred ? 1 : 0, node.completed || null);
    counts[folder ? 'folders' : 'todos'] += 1;
    (node.children || []).forEach((child, i) => insertNode(info.lastInsertRowid, child, i));
  }

  db.transaction(() => nodes.forEach((node, i) => insertNode(parentId, node, i)))();
  return Promise.resolve(counts);
}

// The whole table in one go: the export builds the tree in the server, the same way the
// jstree and todo list endpoints do.
function getAllTodos() {
  const rows = db.prepare(
    'SELECT id, parent, folder, weight, text, notes, starred, completed FROM todos'
  ).all();
  return Promise.resolve(rows);
}

function updateTodo(id, parent, text) {
  db.prepare('update todos set parent=?, weight=?, text=? where id = ?').run(parent, 1, text, id);
  return Promise.resolve();
}

// Deleting a row without its descendants would leave them pointing at a parent that no
// longer exists, which hides them from the UI forever, so delete the whole subtree.
function deleteSubtree(id, folder) {
  const sql = `
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM todos WHERE id = ? AND folder = ?
      UNION ALL
      SELECT t.id FROM todos t INNER JOIN descendants d ON t.parent = d.id
    )
    DELETE FROM todos WHERE id IN (SELECT id FROM descendants)
  `;
  db.prepare(sql).run(id, folder);
  return Promise.resolve();
}

function deleteTodo(id) {
  return deleteSubtree(id, 0);
}

function deleteFolder(id) {
  return deleteSubtree(id, 1);
}

// Same reasoning as deleteSubtree: a ticked off todo takes its subitems with it.
function deleteCompletedTodos() {
  const sql = `
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM todos WHERE folder = 0 AND completed IS NOT NULL
      UNION ALL
      SELECT t.id FROM todos t INNER JOIN descendants d ON t.parent = d.id
    )
    DELETE FROM todos WHERE id IN (SELECT id FROM descendants)
  `;
  const info = db.prepare(sql).run();
  return Promise.resolve({ deleted: info.changes });
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

// jstree orders siblings by weight, so persisting a move means storing the new parent
// plus the new ordering of every sibling in the target folder.
function moveFolder(id, parent, siblings) {
  const move = db.prepare('update todos set parent = ? where id = ? and folder = 1');
  const reweigh = db.prepare('update todos set weight = ? where id = ?');
  db.transaction(() => {
    move.run(parent, id);
    siblings.forEach((siblingId, i) => reweigh.run(i, siblingId));
  })();
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

// sqlite has no boolean type, so `exists(...)` comes back as 0/1. jstree only draws the
// open/close arrow for a lazily loaded node when children is strictly === true.
// The open todo count rides along as a data attribute on the anchor, which style.css
// draws at the right hand edge; keeping it out of text leaves renaming untouched.
function toJsTreeNode(row) {
  return {
    id: row.id,
    text: row.text,
    type: row.type,
    children: !!row.children,
    a_attr: row.open_todos ? { "data-count": row.open_todos } : {}
  };
}

function getJsTreeRoots() {
  const sql = `
    select id, text, exists (
      select 1 from todos as children where children.parent = todos.id and folder = 1
    ) as children,
    (select count(*) from todos as open where open.parent = todos.id and open.folder = 0
      and open.completed is null) as open_todos,
    'root' as type
    from todos
    where folder = 1 and parent is null
    order by weight
  `;
  const rows = db.prepare(sql).all();
  return Promise.resolve(rows.map(toJsTreeNode));
}

function getJsTreeChildren(parentId) {
  const sql = `
    select id, text, exists (
      select 1 from todos as children where children.parent = todos.id and folder = 1
    ) as children,
    (select count(*) from todos as open where open.parent = todos.id and open.folder = 0
      and open.completed is null) as open_todos
    from todos
    where folder = 1 and parent = ?
    order by weight
  `;
  const rows = db.prepare(sql).all(parentId);
  return Promise.resolve(rows.map(toJsTreeNode));
}

module.exports = {
  connect,
  getTodos,
  getTodo,
  updateTodoNotes,
  setTodoCompleted,
  setTodoStarred,
  createTodo,
  importNodes,
  getAllTodos,
  updateTodo,
  deleteTodo,
  deleteFolder,
  deleteCompletedTodos,
  getFolderTree,
  createFolder,
  updateFolder,
  moveFolder,
  getJsTreeRoots,
  getJsTreeChildren,
};
