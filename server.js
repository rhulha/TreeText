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

app.get('/todos/:id', function (request, response) {
  var id = request.params.id;
  client.query('SELECT id, weight, text FROM todos where parent = $1', [id], (err, res) => {
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
  console.log(request.body);
  client.query('insert into todos (parent, weight, text) values ($1, $2, $3) returning id', [request.body.parent, 1, request.body.text], (err, res) => {
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

app.delete('/todo', function (request, response) {
  console.log(request.body);
  client.query('delete from todos where id = $1', [request.body.id.substring(5)], (err, res) => {
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
  console.log(request.url);
  var parent = request.query.id;
  var sql = "select id, text, true as children from todos where parent = $1"
  if (parent == "#") {
    sql = "select id, text, true as children from todos where parent is null"
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
