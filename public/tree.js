
function treeChangeCallback(operation, node, node_parent, node_position, more) {
  // operation can be 'create_node', 'rename_node', 'delete_node', 'move_node', 'copy_node' or 'edit'
  // in case of 'rename_node' node_position is filled with the new node name
  console.log("treeChangeCallback", operation, node, node_parent, node_position, more);
  if (operation === 'edit' ) {
    console.log("edit node", node, node_parent, node_position, more);
  }

  return true;

}

let tree = $("#jstree_div").jstree({
  core: {
    themes: { dots: false },
    animation: 0,
    check_callback: treeChangeCallback, // If left as false all operations like create, rename, delete, move or copy are prevented.
    data: {
      url: "/jstree",
      data: function(node) {
        console.log("jstree data callback", node);
        return { id: node.id == '#' ? '#' : node.original.id }; // This is called before the url is used to call the server. The result of this function seems to be the payload
        // Essentially this method makes the payload consist of only the id...
      }
    }
  },
  "plugins" : [
    "contextmenu", "dnd", "search" //, "state"
  ]
});

setTimeout(function() {  tree.jstree("select_node", "1");}, 1000);


$("#jstree_div").on("changed.jstree", function(e, data) {
  console.log(data);
  //var id = data.selected[0];
  var id = data.node.id;
  window.selectedFolder = id;
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




