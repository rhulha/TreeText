var todo = new Object();

todo.create = function(event) {
  event.preventDefault();
  console.log("folder", window.folder);
  var posting = $.post("todo", {parent: window.folder, text: $('#newTodo').val()});
  posting.done(function(data) {
    console.log(data);
    var newTodo = $("<div class='todo' id='node-" + data.id + "'>" + $('#newTodo').val() + "</div>");
    var p = $("#list").prepend(newTodo);
    newTodo.click((e)=>{
     $("#todoId").val(e.currentTarget.id);
     $("#todoText").val(e.currentTarget.innerText);
    });
  });
}

todo.update = function(event) {
  console.log("folder", window.folder);
  event.preventDefault();
  $.ajax({
      url: 'todo',
      type: 'PUT',
      //contentType: 'application/json',
      data: {parent: window.folder, id: $('#todoId').val(), text: $('#todoText').val() },
      success: function(result) {
        $('#' + $('#todoId').val() ).text($('#todoText').val());
      }
  });
}

todo.delete = function(event) {
  event.preventDefault();
  $.ajax({
      url: 'todo',
      type: 'DELETE',
      data: {id: $('#todoId').val() },
      success: function(result) {
        $('#' + $('#todoId').val() ).remove();
      }
  });
}


export default todo;
