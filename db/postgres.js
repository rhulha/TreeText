const { Client } = require('pg');

const client = new Client();

function connect() {
  return client.connect();
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
  return client.query('update todos set parent=$2, weight=$3, text=$4 where id = $1', [id, parent, 1, text]);
}

function deleteTodo(id) {
  return client.query('delete from todos where id = $1 and folder = false', [id]);
}

function deleteFolder(id) {
  return client.query('delete from todos where id = $1 and folder = true', [id]);
}

function getFolderTree() {
  const sql =
    'WITH RECURSIVE rec AS ( SELECT id, parent, weight, array[weight, id] AS path, text FROM todos where parent is null UNION ' +
    'SELECT tt.id, tt.parent, tt.weight, r.path || tt.weight || tt.id, tt.text FROM todos tt ' +
    'INNER JOIN rec r ON r.id = tt.parent where folder = true) SELECT * FROM rec order by path;';
  return client.query(sql).then((res) => res.rows);
}

function createFolder(parent, text) {
  return client.query('insert into todos (parent, weight, text, folder) values ($1, $2, $3, true)', [parent, 1, text]);
}

function updateFolder(text, weight, id) {
  return client.query('update todos set text = $1, weight = $2 where id = $3', [text, weight, id]);
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
  return client.query(sql).then((res) => res.rows);
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
  return client.query(sql, [parentId]).then((res) => res.rows);
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
