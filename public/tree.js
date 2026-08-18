import { renderTodoItem } from "./todo.js";
import { clearSelection } from "./details.js";

function treeChangeCallback(operation, node, node_parent, node_position, more) {
  // operation can be 'create_node', 'rename_node', 'delete_node', 'move_node', 'copy_node' or 'edit'
  // in case of 'rename_node' node_position is filled with the new node name
  if (operation === 'edit' ) {
    console.log("edit node", node, node_parent, node_position, more);
  } else if (operation === 'delete_node' ) {
    console.log("delete_node", node, node_parent, node_position, more);
    $.ajax({
      url: "/folder/" + node.id,
      type: "DELETE",
      success: function(data) {
        console.log("Folder deleted successfully", data);
      },
      error: function(xhr, status, error) {
        console.error("Error deleting folder:", error);
      }
    });
  } else {
    console.log("treeChangeCallback", operation, node, node_parent, node_position, more);
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
        //console.log("jstree data callback", node);
        return { id: node.id == '#' ? '#' : node.original.id }; // This is called before the url is used to call the server. The result of this function seems to be the payload
        // Essentially this method makes the payload consist of only the id...
      }
    }
  },
  "plugins" : [
    "contextmenu", "dnd" // , "search" //, "state"
  ]
});

$("#jstree_div").on("loaded.jstree", function(e, data) {
  data.instance.open_node("1");
  setTimeout(function() { tree.jstree("select_node", "1"); }, 200);
  
});

$("#jstree_div").on("changed.jstree", function(e, data) {
  //console.log(data);
  //var id = data.selected[0];
  var id = data.node.id;
  window.selectedFolder = id;
  $("#editFolder input[name=folder_id]").val(data.node.id);
  $("#editFolder input[name=folder_text]").val(data.node.text);
  $("#editFolder input[name=folder_weight]").val(data.node.weight);
  clearSelection();
  $.getJSON("todos/" + data.node.id, function(data) {
    var $newList = $("<div/>", { id: "list", class: "split" });
    $.each(data, function(key, node) {
      $newList.append(renderTodoItem(node));
    });
    $("#list").replaceWith($newList);
  });

  //fetch("/board?id="+id).then(d => d.json()).then(rows => {
});

// The contextmenu "Create" action makes a client-side node with a temporary id and
// immediately opens the rename editor, so the folder is only persisted once we know its name.
$("#jstree_div").on("rename_node.jstree", function(e, data) {
  if (/^\d+$/.test(data.node.id)) { // already has a database id, so this is a rename of an existing folder
    $.ajax({ url: "/folder", type: "PUT", data: { folder: data.node.id, text: data.text } });
    return;
  }
  var parent = data.node.parent === "#" ? null : data.node.parent;
  $.post("/folder", { parent: parent, text: data.text }).done(function() {
    if (parent) {
      tree.jstree("refresh_node", parent);
    } else {
      tree.jstree("refresh");
    }
  });
});

$("#addNewFolderForm").submit(function(e) {
  e.preventDefault();
  var text = $("#addNewFolderInput").val().trim();
  if (!text) return;
  var parent = window.selectedFolder || null;
  $.post("/folder", { parent: parent, text: text }).done(function() {
    $("#addNewFolderInput").val("");
    if (parent) {
      tree.jstree("refresh_node", parent);
    } else {
      tree.jstree("refresh");
    }
  });
});


