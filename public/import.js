// Converts a Microsoft To Do export (see MSTodoClient/faircom_export.py) into the generic
// node tree that POST /import inserts: list -> folder, task -> todo, checklist item -> subitem.

// Graph returns timestamps either as a plain string or as a {dateTime, timeZone} pair.
function stamp(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.dateTime || null;
}

function itemToNode(item) {
  return {
    text: item.displayName || "",
    completed: item.isChecked ? stamp(item.checkedDateTime) || stamp(item.createdDateTime) : null
  };
}

function taskToNode(task) {
  return {
    text: task.title || "",
    notes: ((task.body || {}).content || "").trim() || null,
    starred: task.importance === "high",
    completed: task.status === "completed" ? stamp(task.completedDateTime) || stamp(task.lastModifiedDateTime) : null,
    children: (task.checklistItems || []).map(itemToNode)
  };
}

export function msTodoToNodes(lists) {
  if (!Array.isArray(lists) || !lists.length || !lists[0].displayName) {
    throw new Error("expected an array of Microsoft To Do lists");
  }
  return lists.map(function(list) {
    return {
      folder: true,
      text: list.displayName,
      children: (list.tasks || []).map(taskToNode)
    };
  });
}
