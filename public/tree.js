import { renderTodoItem } from "./todo.js";
import { clearSelection } from "./details.js";
import { msTodoToNodes } from "./import.js";

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

// The dnd plugin only moves the node client side, so without this the folder would snap
// back to its old place on the next load. jstree orders siblings by weight, so the whole
// sibling order of the target folder goes along with the new parent.
$("#jstree_div").on("move_node.jstree", function(e, data) {
  var parent = data.parent === "#" ? null : data.parent;
  var siblings = tree.jstree(true).get_node(data.parent).children;
  $.ajax({
    url: "/folder/" + data.node.id + "/move",
    type: "PUT",
    data: { parent: parent, siblings: siblings },
    error: function(xhr, status, error) {
      console.error("Error moving folder:", error);
    }
  });
});

function setImportStatus(text) {
  $("#menuStatus").text(text);
}

$("#importButton").click(function() {
  $("#importFile").click();
});

$("#importFile").change(function() {
  var file = this.files[0];
  this.value = ""; // otherwise picking the same file again fires no change event
  if (!file) return;

  var folder = window.selectedFolder;
  if (!folder) {
    setImportStatus("Select a folder to import into first.");
    return;
  }

  var reader = new FileReader();
  reader.onload = function() {
    var nodes;
    try {
      nodes = msTodoToNodes(JSON.parse(reader.result));
    } catch (err) {
      setImportStatus("Could not read that file: " + err.message);
      return;
    }
    setImportStatus("Importing " + nodes.length + " lists...");
    $.ajax({
      url: "/import/" + folder,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ nodes: nodes }),
      success: function(counts) {
        setImportStatus("Imported " + counts.folders + " lists and " + counts.todos + " items.");
        // refresh_node reloads the children asynchronously, so the imported lists can only
        // be shown once it reports back.
        $("#jstree_div").one("refresh_node.jstree", function() {
          tree.jstree("open_node", folder);
        });
        tree.jstree("refresh_node", folder);
      },
      error: function(xhr) {
        setImportStatus("Import failed: " + xhr.status + " " + xhr.statusText);
      }
    });
  };
  reader.readAsText(file);
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


