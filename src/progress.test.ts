import assert from "node:assert/strict";
import {
  buildDays,
  cardSettled,
  checkScore,
  currentPlace,
  failedCheck,
  sentenceMinutes,
  tagLine,
  visibleCardIds,
} from "./progress.ts";
import type { Card, LogEvent, Schedule, StudyDay } from "./types.ts";

function card(id: string, alternateId: string | null = null): Card {
  return {
    id,
    stateId: id,
    family: 1,
    title: id,
    statement: "",
    constraints: "",
    tiny: "",
    answerLabel: "",
    midLabel: "",
    leetcode: null,
    alternateId,
    negative: false,
    variant: false,
    decoy: false,
  };
}

function study(id: string, family: number, blocks: StudyDay["blocks"], last = false): StudyDay {
  return {
    id,
    family,
    index: 1,
    title: id,
    firstOfFamily: false,
    lastOfFamily: last,
    blocks,
  };
}

const cards = {
  a: card("a", "alt"),
  alt: card("alt"),
  b: card("b"),
  c: card("c"),
  d: card("d"),
};

const checkDay = study("f1d4", 1, [
  { kind: "check", minutes: 48, cardIds: ["a", "b", "c", "d"] },
  { kind: "rule", minutes: 15 },
], true);

assert.equal(visibleCardIds({ kind: "cards", minutes: 36, cardIds: ["a", "b", "c"] }, true)?.length, 2);
assert.equal(visibleCardIds({ kind: "check", minutes: 48, cardIds: ["a", "b", "c", "d"] }, true)?.length, 4);
assert.equal(sentenceMinutes({ kind: "cards", minutes: 15, cardIds: ["a", "b", "c"], diagnostic: true }, 3), 15);
assert.equal(sentenceMinutes({ kind: "cold", minutes: 40 }, 1), 15);

const two = checkScore([
  { type: "commit", dayId: "f1d4", cardId: "a", graded: true },
  { type: "commit", dayId: "f1d4", cardId: "b", graded: true },
  { type: "hint", dayId: "f1d4", cardId: "c", hintLevel: 4 },
  { type: "commit", dayId: "f1d4", cardId: "c", graded: true },
], "f1d4", 0, ["a", "b", "c", "d"], cards);
assert.equal(two.passes, 2);
assert.equal(two.held, false);

const swapped = checkScore([
  { type: "swap", dayId: "f1d4", blockIndex: 0, cardId: "a" },
  { type: "commit", dayId: "f1d4", cardId: "alt", graded: true },
  { type: "commit", dayId: "f1d4", cardId: "b", graded: true },
  { type: "commit", dayId: "f1d4", cardId: "c", graded: true },
], "f1d4", 0, ["a", "b", "c", "d"], cards);
assert.equal(swapped.passes, 3);
assert.equal(swapped.held, true);

assert.equal(cardSettled([{ type: "commit", dayId: "f1d4", cardId: "a", graded: true }], "f1d4", 0, "a", cards), false);
assert.equal(cardSettled([
  { type: "commit", dayId: "f1d4", cardId: "a", graded: true },
  { type: "cells", dayId: "f1d4", cardId: "a", answerOk: true, midOk: true },
], "f1d4", 0, "a", cards), true);
assert.equal(cardSettled([{ type: "redo", dayId: "f1d4", cardId: "a" }], "f1d4", 0, "a", cards), true);

const closed: LogEvent[] = [
  { type: "block-done", dayId: "f1d4", blockIndex: 0 },
  { type: "rule", dayId: "f1d4" },
  { type: "commit", dayId: "f1d4", cardId: "a", graded: true },
  { type: "commit", dayId: "f1d4", cardId: "b", graded: true },
];
assert.equal(failedCheck(closed, checkDay, cards), true);

const schedule: Schedule = {
  rolloverHour: 4,
  timezone: "Asia/Kolkata",
  offWeekday: "Sunday",
  diagnostic: { id: "diagnostic", title: "Diagnostic", minutesEach: 15, cardIds: ["a"] },
  days: [checkDay],
  transfer: [],
  posttest: ["post-f1", "post-f2", "post-f3", "post-f4a", "post-f4b", "post-f5", "post-f6"],
  aloud: "aloud-1",
  quarantine: [],
};
const built = buildDays(schedule, closed, cards);
assert.ok(built.some((day) => day.id === "f1d4-stay-1"));
assert.ok(built.some((day) => day.id === "f1d4-stay-2"));

const before = study("f1d3", 1, [{ kind: "rule", minutes: 15 }]);
const after = study("f2d1", 2, [{ kind: "rule", minutes: 15 }]);
const slipped: LogEvent[] = [
  { type: "rule", dayId: "f1d3", minimum: true },
  { type: "rule", dayId: "f1d4", minimum: true },
  { type: "block-done", dayId: "f1d4", blockIndex: 0 },
  { type: "commit", dayId: "f1d4", cardId: "a", graded: true },
  { type: "commit", dayId: "f1d4", cardId: "b", graded: true },
  { type: "commit", dayId: "f1d4", cardId: "c", graded: true },
  { type: "commit", dayId: "f1d4", cardId: "d", graded: true },
];
const held = currentPlace([before, checkDay, after], slipped);
assert.equal(held.repeat, true);
assert.equal(held.day.id, "f1d4-hold-1");

const released = currentPlace([before, checkDay, after], [
  ...slipped,
  { type: "rule", dayId: "f1d4-hold-1" },
]);
assert.equal(released.day.id, "f2d1");

assert.match(tagLine([
  { type: "commit", graded: true },
  { type: "tag", tag: "too-small" },
  { type: "tag", tag: "non-minimal" },
  { type: "hint", hintLevel: 4 },
]), /too-small 1\/1/);

console.log("progress ok");
