import type { Block, Card, LogEvent, Schedule, StudyDay } from "./types";

const TRANSFER_CARDS = [
  ["card-746", "card-subset-11", "decoy-gas"],
  ["card-55", "card-paths", "card-lis-short"],
  ["card-139", "card-518", "card-pal-count"],
  ["card-213", "card-377", "card-stick"],
  ["card-53", "card-494", "card-fee"],
  ["card-f1-hops", "card-obstacles", "card-lps"],
  ["card-coins-6", "card-lcs-short", "card-two-tx"],
  ["card-squares", "card-edit-short", "card-mode-original"],
];

export function flatten(schedule: Schedule): StudyDay[] {
  const diagnostic: StudyDay = {
    id: schedule.diagnostic.id,
    family: 0,
    index: 0,
    title: schedule.diagnostic.title,
    firstOfFamily: true,
    lastOfFamily: true,
    blocks: [
      {
        kind: "cards",
        minutes: schedule.diagnostic.minutesEach,
        cardIds: schedule.diagnostic.cardIds,
        diagnostic: true,
      },
    ],
  };
  const transfer: StudyDay[] = schedule.transfer.map((item, index) => ({
    id: `transfer-${index + 1}`,
    family: 9,
    index: index + 1,
    title: "Transfer",
    firstOfFamily: index === 0,
    lastOfFamily: index === schedule.transfer.length - 1,
    blocks: [
      { kind: "cold", minutes: 40, cardId: item.cardId, leetcode: item.leetcode },
      { kind: "cards", minutes: 36, cardIds: TRANSFER_CARDS[index % TRANSFER_CARDS.length] },
      { kind: "rule", minutes: 15 },
    ],
  }));
  const postSentences: StudyDay = {
    id: "posttest-sentences",
    family: 10,
    index: 1,
    title: "Posttest sentences",
    firstOfFamily: true,
    lastOfFamily: false,
    blocks: [{ kind: "cards", minutes: 15, cardIds: schedule.posttest, diagnostic: true }],
  };
  const postCode: StudyDay = {
    id: "posttest-code",
    family: 10,
    index: 2,
    title: "Posttest code",
    firstOfFamily: false,
    lastOfFamily: true,
    blocks: [
      { kind: "cards", minutes: 35, cardIds: ["post-f4a", "post-f4b", "post-f1"] },
      { kind: "rule", minutes: 15 },
    ],
  };
  const aloud: StudyDay = {
    id: "aloud",
    family: 11,
    index: 1,
    title: "Aloud",
    firstOfFamily: true,
    lastOfFamily: true,
    blocks: [
      { kind: "cold", minutes: 12, cardId: schedule.aloud },
      { kind: "rule", minutes: 15 },
    ],
  };
  return [diagnostic, ...schedule.days, ...transfer, postSentences, postCode, aloud];
}

export function buildDays(schedule: Schedule, events: LogEvent[], cards: Record<string, Card>): StudyDay[] {
  const days = flatten(schedule).map((day) => ({ ...day, blocks: day.blocks.map((block) => ({ ...block })) }));
  const code = days.find((day) => day.id === "posttest-code");
  const codeBlock = code?.blocks.find((block) => block.cardIds);
  if (codeBlock?.cardIds) {
    const others = ["post-f1", "post-f2", "post-f3", "post-f5", "post-f6"];
    codeBlock.cardIds = ["post-f4a", "post-f4b", weakest(events, "posttest-sentences", others)];
  }
  const out: StudyDay[] = [];
  for (const day of days) {
    out.push(day);
    if (failedCheck(events, day, cards)) {
      const ids = familyCardIds(days, day.family);
      out.push(stayDay(day, 1, ids));
      out.push(stayDay(day, 2, ids));
    }
  }
  return out;
}

function weakest(events: LogEvent[], dayId: string, ids: string[]): string {
  let worst = ids[0];
  let worstScore = -1;
  for (const id of ids) {
    const level = hintLevel(events, dayId, id);
    const graded = commitsFor(events, dayId, id).length > 0;
    const score = level * 10 + (graded ? 0 : 5);
    if (score > worstScore) {
      worstScore = score;
      worst = id;
    }
  }
  return worst;
}

function familyCardIds(days: StudyDay[], family: number): string[] {
  const ids: string[] = [];
  for (const day of days) {
    if (day.family !== family) continue;
    for (const block of day.blocks) {
      if (block.cardId) ids.push(block.cardId);
      ids.push(...(block.cardIds ?? []));
    }
  }
  return [...new Set(ids)];
}

function stayDay(source: StudyDay, n: number, ids: string[]): StudyDay {
  const pool = ids.length > 0 ? ids : ["card-746"];
  const pick = (offset: number) => pool[(n * 3 + offset) % pool.length];
  return {
    id: `${source.id}-stay-${n}`,
    family: source.family,
    index: source.index + n,
    title: "Same family",
    firstOfFamily: false,
    lastOfFamily: false,
    blocks: [
      { kind: "retrieval", minutes: 15, cardId: pick(0) },
      { kind: "cold", minutes: 40, cardId: pick(1) },
      { kind: "cards", minutes: 36, cardIds: [pick(2), pick(3), pick(4)] },
      { kind: "rule", minutes: 15 },
    ],
  };
}

function holdDay(source: StudyDay, n: number, ids: string[]): StudyDay {
  const pool = ids.length > 0 ? ids : ["card-746"];
  const pick = (offset: number) => pool[(n * 2 + offset) % pool.length];
  const cards = [...new Set([pick(2), pick(3), pick(4)])];
  return {
    id: `${source.id}-hold-${n}`,
    family: source.family,
    index: source.index,
    title: "Full day on this family",
    firstOfFamily: false,
    lastOfFamily: false,
    blocks: [
      { kind: "retrieval", minutes: 15, cardId: pick(0) },
      { kind: "cold", minutes: 40, cardId: pick(1) },
      { kind: "cards", minutes: 36, cardIds: cards },
      { kind: "rule", minutes: 15 },
    ],
  };
}

export function rulesOf(events: LogEvent[]): LogEvent[] {
  return events.filter((event) => event.type === "rule" && event.dayId);
}

export function dayClosed(events: LogEvent[], day: StudyDay): boolean {
  const needsRule = day.blocks.some((block) => block.kind === "rule");
  if (needsRule) return events.some((event) => event.type === "rule" && event.dayId === day.id);
  return day.blocks.every((_, index) => blockDone(events, day.id, index));
}

export function blockDone(events: LogEvent[], dayId: string, blockIndex: number): boolean {
  return events.some((event) => event.type === "block-done" && event.dayId === dayId && event.blockIndex === blockIndex);
}

function ruleIsMinimum(events: LogEvent[], dayId: string): boolean {
  return events.some((event) => event.type === "rule" && event.dayId === dayId && event.minimum);
}

function pendingHold(source: StudyDay, events: LogEvent[], ids: string[]): StudyDay | null {
  for (let n = 1; n <= 8; n += 1) {
    const hold = holdDay(source, n, ids);
    if (!dayClosed(events, hold)) return hold;
    if (!ruleIsMinimum(events, hold.id)) return null;
  }
  return null;
}

export function currentPlace(
  days: StudyDay[],
  events: LogEvent[],
): { day: StudyDay; blockIndex: number; repeat: boolean } {
  const recent: boolean[] = [];
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i];
    if (!dayClosed(events, day)) {
      return { day, blockIndex: openBlock(day, events), repeat: false };
    }
    recent.push(ruleIsMinimum(events, day.id));
    const next = days[i + 1];
    const slipped = recent.length >= 2 && recent[recent.length - 1] && recent[recent.length - 2];
    if (slipped && next && next.family !== day.family && day.family !== 0 && day.family !== 9) {
      const hold = pendingHold(day, events, familyCardIds(days, day.family));
      if (hold) return { day: hold, blockIndex: openBlock(hold, events), repeat: true };
    }
  }
  const last = days[days.length - 1];
  return { day: last, blockIndex: last.blocks.length - 1, repeat: false };
}

function openBlock(day: StudyDay, events: LogEvent[]): number {
  const index = day.blocks.findIndex((_, blockIndex) => !blockDone(events, day.id, blockIndex));
  return index === -1 ? day.blocks.length - 1 : index;
}

export function commitsFor(events: LogEvent[], dayId: string, cardId: string): LogEvent[] {
  return events.filter((event) => event.type === "commit" && event.graded && event.dayId === dayId && event.cardId === cardId);
}

export function hintLevel(events: LogEvent[], dayId: string, cardId: string): number {
  return events.reduce((max, event) => {
    if (event.type === "hint" && event.dayId === dayId && event.cardId === cardId) return Math.max(max, event.hintLevel ?? 0);
    return max;
  }, 0);
}

export function playedId(
  events: LogEvent[],
  dayId: string,
  blockIndex: number,
  cardId: string,
  cards: Record<string, Card>,
): string {
  const swapped = events.some(
    (event) => event.type === "swap" && event.dayId === dayId && event.blockIndex === blockIndex && event.cardId === cardId,
  );
  if (!swapped) return cardId;
  const alt = cards[cardId]?.alternateId;
  return alt && cards[alt] ? alt : cardId;
}

export function hasAttempt(events: LogEvent[], dayId: string, cardId: string): boolean {
  return events.some(
    (event) => event.dayId === dayId && event.cardId === cardId && (event.type === "commit" || event.type === "give-up"),
  );
}

export function cellsMatch(events: LogEvent[], dayId: string, cardId: string): boolean {
  return events.some(
    (event) => event.type === "cells" && event.dayId === dayId && event.cardId === cardId && event.answerOk && event.midOk,
  );
}

export function replaced(events: LogEvent[], dayId: string, cardId: string): boolean {
  return events.some(
    (event) => (event.type === "redo" || event.type === "external") && event.dayId === dayId && event.cardId === cardId,
  );
}

export function cardSettled(
  events: LogEvent[],
  dayId: string,
  blockIndex: number,
  cardId: string,
  cards: Record<string, Card>,
): boolean {
  if (replaced(events, dayId, cardId)) return true;
  const id = playedId(events, dayId, blockIndex, cardId, cards);
  return hasAttempt(events, dayId, id) && cellsMatch(events, dayId, id);
}

export function swapsOnDate(events: LogEvent[], studyDate: string): number {
  return events.filter((event) => event.type === "swap" && event.studyDate === studyDate).length;
}

export function withinDays(a: string, b: string, days: number): boolean {
  const left = Date.parse(`${a}T00:00:00Z`);
  const right = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return Math.abs(left - right) < days * 86400000;
}

export function usedRecently(events: LogEvent[], type: string, today: string): boolean {
  return events.some((event) => event.type === type && event.studyDate && withinDays(event.studyDate, today, 7));
}

export type CheckScore = { passes: number; total: number; held: boolean };

export function checkScore(
  events: LogEvent[],
  dayId: string,
  blockIndex: number,
  cardIds: string[],
  cards: Record<string, Card>,
): CheckScore {
  let passes = 0;
  for (const cardId of cardIds) {
    const id = playedId(events, dayId, blockIndex, cardId, cards);
    const graded = commitsFor(events, dayId, id).length > 0;
    if (graded && hintLevel(events, dayId, id) < 4) passes += 1;
  }
  return { passes, total: cardIds.length, held: passes >= 3 };
}

function checkBlock(day: StudyDay): { block: Block; index: number } | null {
  const index = day.blocks.findIndex((block) => block.kind === "check");
  if (index < 0) return null;
  const block = day.blocks[index];
  if (!block.cardIds || block.cardIds.length === 0) return null;
  return { block, index };
}

export function failedCheck(events: LogEvent[], day: StudyDay, cards: Record<string, Card>): boolean {
  const found = checkBlock(day);
  if (!found || !dayClosed(events, day) || !blockDone(events, day.id, found.index)) return false;
  return !checkScore(events, day.id, found.index, found.block.cardIds ?? [], cards).held;
}

export function visibleCardIds(block: Block, short: boolean): string[] | undefined {
  if (!block.cardIds) return undefined;
  if (short && block.kind === "cards" && !block.diagnostic) return block.cardIds.slice(0, 2);
  return block.cardIds;
}

export function sentenceMinutes(block: Block, count = 1): number {
  if (block.kind === "cold") return Math.min(15, block.minutes);
  if (block.diagnostic) return block.minutes;
  if (block.cardIds) return Math.max(12, Math.round(block.minutes / Math.max(count, 1)));
  return block.minutes;
}

export function tagLine(events: LogEvent[]): string {
  const misses = ["infeasible", "too-small", "vague", "wrong-quantity", "wrong-anchor", "transition"];
  const tagged = events.filter((event) => event.type === "tag" && event.tag && misses.includes(event.tag));
  const notes = events.filter((event) => event.type === "tag" && event.tag === "non-minimal").length;
  const graded = events.filter((event) => event.type === "commit" && event.graded).length;
  const level4 = events.filter((event) => event.type === "hint" && event.hintLevel === 4).length;
  const base = Math.max(graded, 1);
  const parts = misses
    .map((tag) => {
      const count = tagged.filter((event) => event.tag === tag).length;
      return count ? `${tag} ${count}/${base}` : "";
    })
    .filter(Boolean);
  if (level4) parts.push(`level-4 ${level4}/${base}`);
  if (notes) parts.push(`non-minimal ${notes}`);
  return parts.join("  ") || "no tags yet";
}
