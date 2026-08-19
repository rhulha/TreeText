require('dotenv').config()

const db = require('./db');
db.connect().catch((err) => {
  console.error('could not initialise the database', err);
  process.exit(1);
});

var express = require('express');
var app = express();
app.use(express.urlencoded({ extended: true }));

app.use(express.static('lib'));
app.use(express.static('public'));

// Without this every rejected promise below would leave the request hanging until the
// client timed out, because the handler returned without ever writing a response.
function fail(response) {
  return (err) => {
    console.error(err);
    if (!response.headersSent) {
      response.status(500).json({ error: 'internal server error' });
    }
  };
}

function addNode(parent, rows) {
  while (rows.i < rows.length && parent.id == rows[rows.i].parent) {
    var node = {};
    node.id = rows[rows.i].id;
    node.text = rows[rows.i].text;
    node.weight = rows[rows.i].weight;
    node.starred = rows[rows.i].starred;
    node.completed = rows[rows.i].completed;
    node.nodes = [];
    parent.nodes.push(node);
    rows.i++;
    if (rows.i < rows.length && node.id == rows[rows.i].parent)
      addNode(node, rows);
  }
}

app.get('/todos/:parent_id', function (request, response) {
  console.log('get todos for parent_id: ' + request.params.parent_id);
  var parent_id = request.params.parent_id;
  db.getTodos(parent_id).then((rows) => {
    var node = { nodes: [] };
    rows.i = 0;
    addNode(node, rows);
    response.json(node.nodes);
  }).catch(fail(response));
});

app.get('/todo/:id', function (request, response) {
  db.getTodo(request.params.id).then((row) => {
    response.json(row);
  }).catch(fail(response));
});

app.put('/todo/:id/notes', function (request, response) {
  db.updateTodoNotes(request.params.id, request.body.notes).then(() => {
    response.send("ok");
  }).catch(fail(response));
});

app.put('/todo/:id/completed', function (request, response) {
  db.setTodoCompleted(request.params.id, request.body.completed === 'true').then(() => {
    response.send("ok");
  }).catch(fail(response));
});

app.put('/todo/:id/starred', function (request, response) {
  db.setTodoStarred(request.params.id, request.body.starred === 'true').then(() => {
    response.send("ok");
  }).catch(fail(response));
});

app.post('/todo', function (request, response) {
  console.log('create todo');
  console.log(request.body);
  let parent = request.body.parent;
  let text = request.body.text;

  db.createTodo(parent, text).then((row) => {
    console.log(row);
    response.json(row);
  }).catch(fail(response));
});

app.put('/todo', function (request, response) {
  console.log(request.body);
  db.updateTodo(request.body.id.substring(5), request.body.parent, request.body.text).then(() => {
    response.send("ok");
  }).catch(fail(response));
});

app.delete('/todo/:id', function (request, response) {
  console.log('delete todo for id: ' + request.params.id);
  var id = request.params.id;
  db.deleteTodo(id).then(() => {
    response.send("ok");
  }).catch(fail(response));
});

app.delete('/folder/:id', function (request, response) {
  console.log('delete folder for id: ' + request.params.id);
  var id = request.params.id;
  // TODO: think about deleteing all children as well
  db.deleteFolder(id).then(() => {
    response.send("ok");
  }).catch(fail(response));
});

app.get('/folder', function (request, response) {
  db.getFolderTree().then((rows) => {
    var node = { nodes: [] };
    rows.i = 0;
    addNode(node, rows);
    response.json(node.nodes);
  }).catch(fail(response));
});

app.post('/folder', function (request, response) {
  console.log(request.body);
  db.createFolder(request.body.parent || null, request.body.text).then(() => {
    response.send("ok");
  }).catch(fail(response));
});

app.put('/folder', function (request, response) {
  console.log("put folder");
  console.log(request.body);
  db.updateFolder(request.body.text, request.body.weight, request.body.folder).then(() => {
    response.send("ok");
  }).catch(fail(response));
});

app.put('/folder/:id/move', function (request, response) {
  var siblings = [].concat(request.body.siblings || []).filter((id) => /^\d+$/.test(id));
  db.moveFolder(request.params.id, request.body.parent || null, siblings).then(() => {
    response.send("ok");
  }).catch(fail(response));
});

app.get("/jstree", (request, response) => {
  console.log("get ", request.url);
  var parent = request.query.id;
  var promise = parent == "#" ? db.getJsTreeRoots() : db.getJsTreeChildren(parent);
  promise.then((rows) => {
    response.json(rows);
  }).catch(fail(response));
});

var listener = app.listen(process.env.PORT||8000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
