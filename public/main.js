import todo from './todo.js'
import folder from './folder.js'

$("#jstree_div").jstree({
  core: {
    themes: { dots: false },
    animation: 0,
    data: {
      url: "/jstree",
      data: function(node) {
        return { id: node.id }; // This is called before the url is used to call the server. The result of this function seems to be the payload
        // Essentially this method makes the payload consist of only the id...
      }
    }
  }
});

$("#jstree_div").on("changed.jstree", function(e, data) {
  console.log(data);
  var id = data.selected[0];
  window.folder = id;
  $("#editFolder input[name=folder_id]").val(data.node.id);
  $("#editFolder input[name=folder_text]").val(data.node.text);
  $("#editFolder input[name=folder_weight]").val(data.node.weight);
  $.getJSON("todos/" + data.node.id, function(data) {
    var items = [];
    $.each(data, function(key, node) {
      items.push(
        "<div class='todo' id='node-" + node.id + "'>" + node.text + "</div>"
      );
    });
    $("#list").replaceWith(
      $("<div/>", { id: "list", class: "split", html: items.join("") })
    );
    $(".todo").click(e => {
      $("#todoId").val(e.currentTarget.id);
      $("#todoText").val(e.currentTarget.innerText);
    });
  });

  //fetch("/board?id="+id).then(d => d.json()).then(rows => {
});

$("#addNewTodo").submit(todo.create);
$("#todoDelete").click(todo.delete);

$("#editTodo").submit(todo.update);

$("#editTodo").on('keydown', function(e) {
  if(e.keyCode == 13) {
    todo.update(e);
  }
});

$("#addChildFolder").submit(folder.addChild);

$("#editFolder").submit(folder.update);

$("#editFolder").on('keydown', function(e) {
  if(e.keyCode == 13) {
    folder.update(e);
  }
});

