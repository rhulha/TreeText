require('dotenv').config()

const { Client } = require('pg')
const client = new Client()
client.connect();

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
  client.query('SELECT id, weight, text FROM todos where parent = $1 and folder = false', [parent_id], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      var node = { nodes: [] };
      res.rows.i = 0;
      addNode(node, res.rows);
      response.json(node.nodes);
      //console.log(node.nodes);
    }
  });
});

app.post('/todo', function (request, response) {
  console.log('create todo');
  console.log(request.body);
  let parent = request.body.parent;
  let text = request.body.text;

  client.query('insert into todos (parent, weight, text, folder) values ($1, $2, $3, false) returning id', [parent, 1, text], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      console.log(res.rows);
      response.json(res.rows[0]);
    }
  });
});

app.put('/todo', function (request, response) {
  console.log(request.body);
  client.query('update todos set parent=$2, weight=$3, text=$4 where id = $1', [request.body.id.substring(5), request.body.parent, 1, request.body.text], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      response.send("ok");
    }
  });
});

app.delete('/todo/:id', function (request, response) {
  console.log('delete todo for id: ' + request.params.id);
  var id = request.params.id;
  client.query('delete from todos where id = $1 and folder = false', [id], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      response.send("ok");
    }
  });
});

app.delete('/folder/:id', function (request, response) {
  console.log('delete folder for id: ' + request.params.id);
  var id = request.params.id;
  // TODO: think about deleteing all children as well
  client.query('delete from todos where id = $1 and folder = true', [id], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      response.send("ok");
    }
  });
});

app.get('/folder', function (request, response) {
  client.query('WITH RECURSIVE rec AS ( SELECT id, parent, weight, array[weight, id] AS path, text FROM todos where parent is null UNION ' +
    'SELECT tt.id, tt.parent, tt.weight, r.path || tt.weight || tt.id, tt.text FROM todos tt ' +
    'INNER JOIN rec r ON r.id = tt.parent where folder = true) SELECT * FROM rec order by path;', (err, res) => {
      if (err) {
        console.log(err);
      } else {
        var node = { nodes: [] };
        res.rows.i = 0;
        addNode(node, res.rows);
        response.json(node.nodes);
      }
    });
});

app.post('/folder', function (request, response) {
  console.log(request.body);
  client.query('insert into todos (parent, weight, text) values ($1, $2, $3)', [request.body.parent, 1, request.body.text], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      response.send("ok");
    }
  });
});

app.put('/folder', function (request, response) {
  console.log("put folder");
  console.log(request.body);
  client.query('update todos set text = $1, weight = $2 where id = $3', [request.body.text, request.body.weight, request.body.folder], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      response.send("ok");
    }
  });
});

app.get("/jstree", (request, response) => {
  console.log("get ", request.url);
  var parent = request.query.id;
  //console.log("parent is: " + parent);
  var sql = `
    select id, text, exists (
      select 1 from todos as children where children.parent = todos.id and folder = true
    ) as children 
    from todos 
    where folder = true and parent = $1
    order by weight
  `;
  if (parent == "#") {
    sql = `
      select id, text, exists (
        select 1 from todos as children where children.parent = todos.id and folder = true
      ) as children,
      'root' as type
      from todos 
      where folder = true and parent is null
      order by weight
    `;
  }

  client.query(sql, parent == "#" ? [] : [parent], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      response.json(res.rows);
    }
  });
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
