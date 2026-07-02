export function renderTodoItem(node) {
  var $todo = $("<div class='todo'></div>").attr("id", "node-" + node.id);
  var $text = $("<span class='todo-text'></span>").text(node.text);
  var $menuBtn = $("<button type='button' class='todo-menu-btn'>&#8942;</button>");
  var $menu = $("<div class='todo-menu'></div>");
  var $rename = $("<div class='todo-menu-item'>Rename</div>");
  var $delete = $("<div class='todo-menu-item'>Delete</div>");

  $menu.append($rename, $delete);
  $todo.append($text, $menuBtn);
  $("body").append($menu);

  $todo.click(function() {
    $("#todoId").val($todo.attr("id"));
    $("#todoText").val($text.text());
  });

  $menuBtn.click(function(e) {
    e.stopPropagation();
    var isOpen = $menu.hasClass("open");
    closeAllMenus();
    if (!isOpen) {
      var rect = $menuBtn[0].getBoundingClientRect();
      $menu.css({
        top: rect.bottom + 4 + "px",
        right: (window.innerWidth - rect.right) + "px"
      });
      $menu.addClass("open");
    }
  });

  $rename.click(function(e) {
    e.stopPropagation();
    $menu.removeClass("open");
    startRename($todo, $text);
  });

  $delete.click(function(e) {
    e.stopPropagation();
    $menu.removeClass("open");
    deleteTodoItem($todo, $menu);
  });

  return $todo;
}

function closeAllMenus() {
  $(".todo-menu").removeClass("open");
}

function startRename($todo, $text) {
  var currentText = $text.text();
  var $input = $("<input type='text' class='todo-rename-input'>").val(currentText);
  $text.replaceWith($input);
  $input.focus().select();

  function commit() {
    var newText = $input.val().trim();
    $input.replaceWith($text);
    if (newText && newText !== currentText) {
      $.ajax({
        url: "todo",
        type: "PUT",
        data: { parent: window.selectedFolder, id: $todo.attr("id"), text: newText },
        success: function() {
          $text.text(newText);
        }
      });
    }
  }

  $input.click(function(e) {
    e.stopPropagation();
  });

  $input.on("blur", commit);
  $input.on("keydown", function(e) {
    if (e.keyCode === 13) {
      e.preventDefault();
      commit();
    } else if (e.keyCode === 27) {
      $input.off("blur");
      $input.replaceWith($text);
    }
  });
}

function deleteTodoItem($todo, $menu) {
  $.ajax({
    url: "todo/" + $todo.attr("id").substring(5),
    type: "DELETE",
    success: function() {
      $todo.remove();
      $menu.remove();
    }
  });
}

$(document).click(closeAllMenus);
$(window).on("resize", closeAllMenus);
document.addEventListener("scroll", closeAllMenus, true); // capture: scroll doesn't bubble, and #list is re-created dynamically

$("#addNewTodoForm").submit(function(event) {
  event.preventDefault();
  console.log("add new todo, selected folder: ", window.selectedFolder);
  var text = $('#addNewTodoInput').val();
  var posting = $.post("todo", {parent: window.selectedFolder, text: text});
  posting.done(function(data) {
    console.log("after add new todo, data: ", data);
    var newTodo = renderTodoItem({ id: data.id, text: text });
    $("#list").prepend(newTodo);
    $('#addNewTodoInput').val("");
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
        $('#' + $('#todoId').val() ).find('.todo-text').text($('#todoText').val());
      }
  });
}

$("#editTodo").submit(todoUpdate);

$("#editTodo").on('keydown', function(e) {
  if(e.keyCode == 13) {
    todoUpdate(e);
  }
});
