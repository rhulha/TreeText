import { setSubCount } from "./todo.js";

let selectedTodoId = null;

function syncSubCount() {
  var $items = $("#subitemList .subitem");
  setSubCount(selectedTodoId, $items.filter(".completed").length, $items.length);
}

export function selectTodo(id, text) {
  selectedTodoId = id;
  $("#detailsTitle").text(text);
  $("#todoDetails").addClass("has-selection");
  $.getJSON("todo/" + id, function(todo) {
    if (selectedTodoId !== id) return;
    $("#todoNotes").val(todo && todo.notes ? todo.notes : "");
  });
  $.getJSON("todos/" + id, function(rows) {
    if (selectedTodoId !== id) return;
    var $list = $("#subitemList").empty();
    $.each(rows, function(key, node) {
      $list.append(renderSubitem(node));
    });
  });
}

export function setSelectedTitle(text) {
  $("#detailsTitle").text(text);
}

export function clearSelection() {
  selectedTodoId = null;
  $("#detailsTitle").text("No todo selected");
  $("#todoDetails").removeClass("has-selection");
  $("#subitemList").empty();
  $("#todoNotes").val("");
  $(".todo.selected").removeClass("selected");
}

export function isSelected(id) {
  return selectedTodoId === id;
}

function renderSubitem(node) {
  var $item = $("<div class='subitem'></div>").toggleClass("completed", !!node.completed);
  var $check = $("<input type='checkbox' class='subitem-check'>").prop("checked", !!node.completed);
  var $text = $("<span class='subitem-text'></span>").text(node.text);
  var $delete = $("<button type='button' class='subitem-delete' title='Delete'>&times;</button>");

  $check.click(function() {
    var completed = $check.prop("checked");
    $item.toggleClass("completed", completed);
    syncSubCount();
    $.ajax({ url: "todo/" + node.id + "/completed", type: "PUT", data: { completed: completed } });
  });

  $delete.click(function() {
    $.ajax({
      url: "todo/" + node.id,
      type: "DELETE",
      success: function() {
        $item.remove();
        syncSubCount();
      }
    });
  });

  return $item.append($check, $text, $delete);
}

$("#addSubitemForm").submit(function(event) {
  event.preventDefault();
  if (!selectedTodoId) return;
  var text = $("#addSubitemInput").val().trim();
  if (!text) return;
  var parent = selectedTodoId;
  $.post("todo", { parent: parent, text: text }).done(function(data) {
    if (selectedTodoId !== parent) return;
    $("#subitemList").append(renderSubitem({ id: data.id, text: text }));
    syncSubCount();
    $("#addSubitemInput").val("");
  });
});

$("#todoNotes").on("blur", function() {
  if (!selectedTodoId) return;
  $.ajax({
    url: "todo/" + selectedTodoId + "/notes",
    type: "PUT",
    data: { notes: $("#todoNotes").val() }
  });
});
