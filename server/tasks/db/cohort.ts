import { defineTask } from "nitropack/runtime";

export default defineTask({
  meta: {
    name: "db:cohort",
    description: "Fetch and store a new cohort snapshot",
  },
  run() {
    return $fetch("/api/getCohort");
  },
});
