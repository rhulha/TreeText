const { Pool } = require('pg');

const pool = new Pool();

// A bare Client never reconnects, so a single dropped connection would take the app down
// until it was restarted. The pool replaces broken connections on its own, but it emits
// errors on idle clients, which would be an uncaught exception if left unhandled.
pool.on('error', (err) => console.error('unexpected postgres client error', err));

function connect() {
  return pool.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS notes TEXT');
}

function getTodo(id) {
  return pool
    .query('SELECT id, parent, text, notes FROM todos where id = $1', [id])
    .then((res) => res.rows[0]);
}

function updateTodoNotes(id, notes) {
  return pool.query('update todos set notes = $2 where id = $1', [id, notes]);
}

// sub_done/sub_total drive the "1 of 3" line under a todo, the way Microsoft To Do
// counts the subitems of a task.
function getTodos(parentId) {
  const sql = `
    SELECT id, weight, text, starred, completed,
      (select count(*) from todos sub where sub.parent = todos.id and sub.folder = false) as sub_total,
      (select count(*) from todos sub where sub.parent = todos.id and sub.folder = false
        and sub.completed is not null) as sub_done
    FROM todos where parent = $1 and folder = false
  `;
  return pool.query(sql, [parentId]).then((res) => res.rows);
}

// completed keeps the moment it was ticked rather than a flag, which is what the column
// was designed for.
function setTodoCompleted(id, completed) {
  return pool.query('update todos set completed = $2 where id = $1', [id, completed ? new Date() : null]);
}

function setTodoStarred(id, starred) {
  return pool.query('update todos set starred = $2 where id = $1', [id, !!starred]);
}

function createTodo(parent, text) {
  return pool
    .query('insert into todos (parent, weight, text, folder) values ($1, $2, $3, false) returning id', [parent, 1, text])
    .then((res) => res.rows[0]);
}

// One transaction for the whole tree: a half inserted import would have to be untangled
// by hand, and children are useless without the parent that carries their id.
async function importNodes(parentId, nodes) {
  const sql =
    'insert into todos (parent, weight, text, folder, notes, starred, completed) ' +
    'values ($1, $2, $3, $4, $5, $6, $7) returning id';
  const counts = { folders: 0, todos: 0 };
  const c = await pool.connect();

  async function insertNode(parent, node, weight) {
    const folder = !!node.folder;
    const res = await c.query(sql, [parent, weight, node.text || '', folder, node.notes || null,
      !!node.starred, node.completed || null]);
    counts[folder ? 'folders' : 'todos'] += 1;
    const children = node.children || [];
    for (let i = 0; i < children.length; i += 1) {
      await insertNode(res.rows[0].id, children[i], i);
    }
  }

  try {
    await c.query('begin');
    for (let i = 0; i < nodes.length; i += 1) {
      await insertNode(parentId, nodes[i], i);
    }
    await c.query('commit');
  } catch (err) {
    await c.query('rollback');
    throw err;
  } finally {
    c.release();
  }

  return counts;
}

// The whole table in one go: the export builds the tree in the server, the same way the
// jstree and todo list endpoints do.
function getAllTodos() {
  return pool
    .query('SELECT id, parent, folder, weight, text, notes, starred, completed FROM todos')
    .then((res) => res.rows);
}

function updateTodo(id, parent, text) {
  return pool.query('update todos set parent=$2, weight=$3, text=$4 where id = $1', [id, parent, 1, text]);
}

// Deleting a row without its descendants would leave them pointing at a parent that no
// longer exists, which hides them from the UI forever, so delete the whole subtree.
function deleteSubtree(id, folder) {
  const sql = `
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM todos WHERE id = $1 AND folder = $2
      UNION ALL
      SELECT t.id FROM todos t INNER JOIN descendants d ON t.parent = d.id
    )
    DELETE FROM todos WHERE id IN (SELECT id FROM descendants)
  `;
  return pool.query(sql, [id, folder]);
}

function deleteTodo(id) {
  return deleteSubtree(id, false);
}

function deleteFolder(id) {
  return deleteSubtree(id, true);
}

// Same reasoning as deleteSubtree: a ticked off todo takes its subitems with it.
function deleteCompletedTodos() {
  const sql = `
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM todos WHERE folder = false AND completed IS NOT NULL
      UNION ALL
      SELECT t.id FROM todos t INNER JOIN descendants d ON t.parent = d.id
    )
    DELETE FROM todos WHERE id IN (SELECT id FROM descendants)
  `;
  return pool.query(sql).then((res) => ({ deleted: res.rowCount }));
}

function getFolderTree() {
  const sql =
    'WITH RECURSIVE rec AS ( SELECT id, parent, weight, array[weight, id] AS path, text FROM todos where parent is null UNION ' +
    'SELECT tt.id, tt.parent, tt.weight, r.path || tt.weight || tt.id, tt.text FROM todos tt ' +
    'INNER JOIN rec r ON r.id = tt.parent where folder = true) SELECT * FROM rec order by path;';
  return pool.query(sql).then((res) => res.rows);
}

function createFolder(parent, text) {
  return pool.query('insert into todos (parent, weight, text, folder) values ($1, $2, $3, true)', [parent, 1, text]);
}

// jstree orders siblings by weight, so persisting a move means storing the new parent
// plus the new ordering of every sibling in the target folder.
async function moveFolder(id, parent, siblings) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query('update todos set parent = $2 where id = $1 and folder = true', [id, parent]);
    for (let i = 0; i < siblings.length; i++) {
      await c.query('update todos set weight = $2 where id = $1', [siblings[i], i]);
    }
    await c.query('commit');
  } catch (err) {
    await c.query('rollback');
    throw err;
  } finally {
    c.release();
  }
}

function updateFolder(text, weight, id) {
  if (weight === undefined || weight === null || weight === '') {
    return pool.query('update todos set text = $1 where id = $2', [text, id]);
  }
  return pool.query('update todos set text = $1, weight = $2 where id = $3', [text, weight, id]);
}

// The open todo count rides along as a data attribute on the anchor, which style.css
// draws at the right hand edge; keeping it out of text leaves renaming untouched.
// postgres returns count(*) as a string, hence the Number().
function toJsTreeNode(row) {
  const open = Number(row.open_todos) || 0;
  return {
    id: row.id,
    text: row.text,
    type: row.type,
    children: !!row.children,
    a_attr: open ? { "data-count": open } : {}
  };
}

function getJsTreeRoots() {
  const sql = `
    select id, text, exists (
      select 1 from todos as children where children.parent = todos.id and folder = true
    ) as children,
    (select count(*) from todos as open where open.parent = todos.id and open.folder = false
      and open.completed is null) as open_todos,
    'root' as type
    from todos
    where folder = true and parent is null
    order by weight
  `;
  return pool.query(sql).then((res) => res.rows.map(toJsTreeNode));
}

function getJsTreeChildren(parentId) {
  const sql = `
    select id, text, exists (
      select 1 from todos as children where children.parent = todos.id and folder = true
    ) as children,
    (select count(*) from todos as open where open.parent = todos.id and open.folder = false
      and open.completed is null) as open_todos
    from todos
    where folder = true and parent = $1
    order by weight
  `;
  return pool.query(sql, [parentId]).then((res) => res.rows.map(toJsTreeNode));
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
