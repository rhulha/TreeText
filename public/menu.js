import { clearSelection } from "./details.js";

// jQuery is a global, but `$` is shadowed by the getElementById helper below, so the few
// jQuery calls in this module spell it out.
const $ = (id) => document.getElementById(id);
const ga = (el, n, cb) => $(el).addEventListener(n, cb);

ga("aboutButton", "click", () => $("aboutOverlay").classList.add("open"));
ga("aboutCloseButton", "click", () => $("aboutOverlay").classList.remove("open"));
ga("aboutOverlay", "click", (e) => {
  if (e.target === $("aboutOverlay")) $("aboutOverlay").classList.remove("open");
});

ga("deleteCompletedButton", "click", () => {
  if (!confirm("Delete all completed tasks in every folder?")) return;
  jQuery.ajax({
    url: "todos/completed",
    type: "DELETE",
    success: (counts) => {
      jQuery(".todo.completed").each(function() {
        jQuery(this).data("menu").remove();
        jQuery(this).remove();
      });
      clearSelection();
      $("menuStatus").textContent = "Deleted " + counts.deleted + " completed items.";
    },
    error: (xhr) => {
      $("menuStatus").textContent = "Delete failed: " + xhr.status + " " + xhr.statusText;
    }
  });
});
