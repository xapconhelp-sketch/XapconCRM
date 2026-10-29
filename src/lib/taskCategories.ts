import type { TaskItem } from "../types";

/** Tasks with these categories are managed internally by Xapcon, not by contractors. */
const xapconTaskCategories = new Set<NonNullable<TaskItem["category"]>>([
  "prepare_supplement",
  "prepare_estimate",
  "pending_coc",
  "request_depreciation",
]);

export function isContractorTask(task: TaskItem) {
  return !task.category || !xapconTaskCategories.has(task.category);
}

export function getContractorPendingTasks(tasks: TaskItem[] = []) {
  return tasks.filter((task) => task.status === "pending" && isContractorTask(task));
}
