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
  return client
    .query('SELECT id, parent, text, notes FROM todos where id = $1', [id])
    .then((res) => res.rows[0]);
}

function updateTodoNotes(id, notes) {
  return pool.query('update todos set notes = $2 where id = $1', [id, notes]);
}

function getTodos(parentId) {
  return client
    .query('SELECT id, weight, text FROM todos where parent = $1 and folder = false', [parentId])
    .then((res) => res.rows);
}

function createTodo(parent, text) {
  return client
    .query('insert into todos (parent, weight, text, folder) values ($1, $2, $3, false) returning id', [parent, 1, text])
    .then((res) => res.rows[0]);
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

function getJsTreeRoots() {
  const sql = `
    select id, text, exists (
      select 1 from todos as children where children.parent = todos.id and folder = true
    ) as children,
    'root' as type
    from todos
    where folder = true and parent is null
    order by weight
  `;
  return pool.query(sql).then((res) => res.rows);
}

function getJsTreeChildren(parentId) {
  const sql = `
    select id, text, exists (
      select 1 from todos as children where children.parent = todos.id and folder = true
    ) as children
    from todos
    where folder = true and parent = $1
    order by weight
  `;
  return pool.query(sql, [parentId]).then((res) => res.rows);
}

module.exports = {
  connect,
  getTodos,
  getTodo,
  updateTodoNotes,
  createTodo,
  updateTodo,
  deleteTodo,
  deleteFolder,
  getFolderTree,
  createFolder,
  updateFolder,
  moveFolder,
  getJsTreeRoots,
  getJsTreeChildren,
};
