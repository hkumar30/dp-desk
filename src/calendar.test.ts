import assert from "node:assert/strict";
import { adherence, consecutive, studyDate, weekday } from "./calendar.ts";

const beforeRollover = new Date("2026-11-17T22:00:00.000Z");
assert.equal(studyDate(beforeRollover), "2026-11-17");

const afterRollover = new Date("2026-11-17T23:00:00.000Z");
assert.equal(studyDate(afterRollover), "2026-11-18");

assert.equal(weekday("2026-11-15"), "Sunday");

assert.equal(consecutive(["2026-11-14", "2026-11-16"], "2026-11-16"), 2);
assert.equal(consecutive(["2026-11-16"], "2026-11-18"), 0);
assert.equal(consecutive(["2026-11-18"], "2026-11-18"), 1);

const ratio = adherence(["2026-11-14", "2026-11-16"], "2026-11-16");
assert.equal(ratio.closed, 2);
assert.equal(ratio.scheduled, 2);

console.log("calendar ok");
