import { selectTodo, setSelectedTitle, clearSelection, isSelected } from "./details.js";

export function renderTodoItem(node) {
  var $todo = $("<div class='todo'></div>").attr("id", "node-" + node.id);
  var $grip = $("<span class='todo-grip' draggable='true' title='Drag to a folder'>⠿</span>");
  var $check = $("<input type='checkbox' class='todo-check'>").prop("checked", !!node.completed);
  var $text = $("<span class='todo-text'></span>").text(node.text);
  var $star = $("<button type='button' class='todo-star' title='Star'></button>");
  var $menuBtn = $("<button type='button' class='todo-menu-btn'>&#8942;</button>");
  var $menu = $("<div class='todo-menu'></div>");
  var $rename = $("<div class='todo-menu-item'>Rename</div>");
  var $delete = $("<div class='todo-menu-item'>Delete</div>");

  $todo.toggleClass("completed", !!node.completed);
  setStar($star, !!node.starred);

  var $body = $("<div class='todo-body'></div>").append($text);
  if (node.sub_total) $body.append(subCountSpan(node.sub_done, node.sub_total));

  $menu.append($rename, $delete);
  $todo.append($grip, $check, $body, $star, $menuBtn);
  $todo.data("menu", $menu);
  $("body").append($menu);

  $grip.on("dragstart", function(e) {
    var ev = e.originalEvent;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", $todo.attr("id"));
    ev.dataTransfer.setDragImage($todo[0], 10, 20);
    $todo.addClass("todo-dragging");
  });

  $grip.on("dragend", function() {
    $todo.removeClass("todo-dragging");
  });

  $todo.click(function() {
    $(".todo.selected").removeClass("selected");
    $todo.addClass("selected");
    selectTodo($todo.attr("id").substring(5), $text.text());
  });

  $check.click(function(e) {
    e.stopPropagation();
    var completed = $check.prop("checked");
    $todo.toggleClass("completed", completed);
    $.ajax({ url: "todo/" + node.id + "/completed", type: "PUT", data: { completed: completed } });
  });

  $star.click(function(e) {
    e.stopPropagation();
    var starred = !$star.hasClass("starred");
    setStar($star, starred);
    $.ajax({ url: "todo/" + node.id + "/starred", type: "PUT", data: { starred: starred } });
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

function subCountSpan(done, total) {
  return $("<span class='todo-sub-count'></span>").text(done + " of " + total);
}

// The details pane adds, ticks off and deletes subitems, so the count under the todo in
// the middle list has to follow along without reloading the folder.
export function setSubCount(id, done, total) {
  var $body = $("#node-" + id + " .todo-body");
  if (!$body.length) return;
  var $count = $body.find(".todo-sub-count");
  if (!total) {
    $count.remove();
  } else if ($count.length) {
    $count.text(done + " of " + total);
  } else {
    $body.append(subCountSpan(done, total));
  }
}

function setStar($star, starred) {
  $star.toggleClass("starred", starred).html(starred ? "★" : "☆");
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
          if (isSelected($todo.attr("id").substring(5))) {
            setSelectedTitle(newText);
          }
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
      if (isSelected($todo.attr("id").substring(5))) {
        clearSelection();
      }
      $todo.remove();
      $menu.remove();
    }
  });
}

function moveTodoToFolder(todoId, folderId) {
  var $todo = $("#" + todoId);
  $.ajax({
    url: "todo",
    type: "PUT",
    data: { parent: folderId, id: todoId, text: $todo.find(".todo-text").text() },
    success: function() {
      if (isSelected(todoId.substring(5))) {
        clearSelection();
      }
      $todo.data("menu").remove();
      $todo.remove();
    }
  });
}

$("#jstree_div").on("dragover", ".jstree-anchor", function(e) {
  e.preventDefault();
  e.originalEvent.dataTransfer.dropEffect = "move";
  $("#jstree_div .todo-drop-target").not(this).removeClass("todo-drop-target");
  $(this).addClass("todo-drop-target");
});

$("#jstree_div").on("dragleave drop", function() {
  $("#jstree_div .todo-drop-target").removeClass("todo-drop-target");
});

$("#jstree_div").on("drop", ".jstree-anchor", function(e) {
  e.preventDefault();
  var todoId = e.originalEvent.dataTransfer.getData("text/plain");
  var folderId = $(this).closest("li").attr("id");
  if (todoId && folderId && folderId !== window.selectedFolder) {
    moveTodoToFolder(todoId, folderId);
  }
});

$(document).on("keydown", function(e) {
  if (e.keyCode !== 113) return; // F2
  if ($(e.target).is("input, textarea")) return;
  var $todo = $(".todo.selected");
  var $text = $todo.find(".todo-text");
  if (!$text.length) return; // nothing selected, or a rename is already open
  e.preventDefault();
  startRename($todo, $text);
});

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
