var folder = new Object();

folder.update = function(event) {
  event.preventDefault();
  console.log("folder: " + window.folder);
  var folder_text = $("#editFolder input[name=folder_text]").val();
  var folder_weight = $("#editFolder input[name=folder_weight]").val();
  console.log({folder: window.folder, text: folder_text, weight: folder_weight});
  $.ajax({
      url: 'folder',
      type: 'PUT',
      //contentType: 'application/json',
      data: {folder: window.folder, text: folder_text, weight: folder_weight},
      success: function(result) {
        var sel = $('#tree').treeview(true).getSelected()[0];
        sel.text = folder_text;
        $('#tree').treeview(true).removeNode([]); // refresh hack
        //$('#tree').treeview(true)._render();
        //$('#tree').treeview(true).updateNode(sel);
        //$('#tree').treeview(true).checkNode(sel); // refresh hack
      }
  });
}

folder.addChild = function(event) {
  event.preventDefault();
  console.log("parent folder: " + window.folder);
  var folder_text = $("#addChildFolder input[name=folder_text]").val();
  console.log({folder: window.folder, text: folder_text});
  var posting = $.post("folder", {parent: window.folder, text: folder_text});
  posting.done(function(data) {
      var sel = $('#tree').treeview(true).getSelected()[0];
      $('#tree').treeview(true).addNode({text:folder_text}, sel);
      $('#tree').treeview(true).removeNode([]); // refresh hack

  });
}

export default folder;
