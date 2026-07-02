require('dotenv').config()

const db = require('./db');
db.connect();

var express = require('express');
var app = express();
app.use(express.urlencoded({ extended: true }));

app.use(express.static('lib'));
app.use(express.static('public'));

function addNode(parent, rows) {
  while (rows.i < rows.length && parent.id == rows[rows.i].parent) {
    var node = {};
    node.id = rows[rows.i].id;
    node.text = rows[rows.i].text;
    node.weight = rows[rows.i].weight;
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
  }).catch((err) => console.log(err));
});

app.post('/todo', function (request, response) {
  console.log('create todo');
  console.log(request.body);
  let parent = request.body.parent;
  let text = request.body.text;

  db.createTodo(parent, text).then((row) => {
    console.log(row);
    response.json(row);
  }).catch((err) => console.log(err));
});

app.put('/todo', function (request, response) {
  console.log(request.body);
  db.updateTodo(request.body.id.substring(5), request.body.parent, request.body.text).then(() => {
    response.send("ok");
  }).catch((err) => console.log(err));
});

app.delete('/todo/:id', function (request, response) {
  console.log('delete todo for id: ' + request.params.id);
  var id = request.params.id;
  db.deleteTodo(id).then(() => {
    response.send("ok");
  }).catch((err) => console.log(err));
});

app.delete('/folder/:id', function (request, response) {
  console.log('delete folder for id: ' + request.params.id);
  var id = request.params.id;
  // TODO: think about deleteing all children as well
  db.deleteFolder(id).then(() => {
    response.send("ok");
  }).catch((err) => console.log(err));
});

app.get('/folder', function (request, response) {
  db.getFolderTree().then((rows) => {
    var node = { nodes: [] };
    rows.i = 0;
    addNode(node, rows);
    response.json(node.nodes);
  }).catch((err) => console.log(err));
});

app.post('/folder', function (request, response) {
  console.log(request.body);
  db.createFolder(request.body.parent, request.body.text).then(() => {
    response.send("ok");
  }).catch((err) => console.log(err));
});

app.put('/folder', function (request, response) {
  console.log("put folder");
  console.log(request.body);
  db.updateFolder(request.body.text, request.body.weight, request.body.folder).then(() => {
    response.send("ok");
  }).catch((err) => console.log(err));
});

app.get("/jstree", (request, response) => {
  console.log("get ", request.url);
  var parent = request.query.id;
  var promise = parent == "#" ? db.getJsTreeRoots() : db.getJsTreeChildren(parent);
  promise.then((rows) => {
    response.json(rows);
  }).catch((err) => console.log(err));
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
