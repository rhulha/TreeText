
$("#addNewTodoForm").submit(function(event) {
  event.preventDefault();
  console.log("add new todo, selected folder: ", window.selectedFolder);
  var posting = $.post("todo", {parent: window.selectedFolder, text: $('#addNewTodoInput').val()});
  posting.done(function(data) {
    console.log("after add new todo, data: ", data);
    var newTodo = $("<div class='todo' id='node-" + data.id + "'>" + $('#addNewTodoInput').val() + "</div>");
    var p = $("#list").prepend(newTodo);
    newTodo.click((e)=>{
     $("#todoId").val(e.currentTarget.id);
     $("#todoText").val(e.currentTarget.innerText);
    });
  });
});

$("#todoDelete").click(function(event) {
  event.preventDefault();
  $.ajax({
      url: 'todo',
      type: 'DELETE',
      data: {id: $('#todoId').val() },
      success: function(result) {
        $('#' + $('#todoId').val() ).remove();
      }
  });
});

let todoUpdate = function(event) {
  console.log("folder", window.selectedFolder);
  event.preventDefault();
  $.ajax({
      url: 'todo',
      type: 'PUT',
      //contentType: 'application/json',
      data: {parent: window.selectedFolder, id: $('#todoId').val(), text: $('#todoText').val() },
      success: function(result) {
        $('#' + $('#todoId').val() ).text($('#todoText').val());
      }
  });
}

$("#editTodo").submit(todoUpdate);

$("#editTodo").on('keydown', function(e) {
  if(e.keyCode == 13) {
    todoUpdate(e);
  }
});

