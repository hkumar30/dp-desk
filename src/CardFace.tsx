import { useEffect, useRef, useState } from "react";
import { checkCells as askCells, loadKey, postLog, readDraft, writeDraft } from "./api";
import type { Card, LogEvent } from "./types";
import { cellsMatch, hasAttempt, hintLevel, swapsOnDate } from "./progress";

const HINTS = [
  "What is the repeated decision?",
  "What does the next decision still need from the past?",
];

const TAGS = [
  ["infeasible", "Infeasible"],
  ["too-small", "Too small"],
  ["vague", "Vague"],
  ["wrong-quantity", "Wrong quantity"],
  ["wrong-anchor", "Wrong anchor"],
  ["transition", "Transition / base / order"],
] as const;

function readClock(key: string, duration: number): { elapsed: number; paused: boolean } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { elapsed: 0, paused: false };
    const parsed = JSON.parse(raw) as { elapsed?: number; paused?: boolean };
    return {
      elapsed: Math.max(0, Math.min(duration, parsed.elapsed ?? 0)),
      paused: Boolean(parsed.paused),
    };
  } catch {
    return { elapsed: 0, paused: false };
  }
}

export function CardFace({
  card,
  cards,
  dayId,
  blockIndex,
  events,
  studyDate,
  minutes,
  diagnostic,
  hintsAllowed,
  note,
  advance = "block",
  onChange,
}: {
  card: Card;
  cards: Record<string, Card>;
  dayId: string;
  blockIndex: number;
  events: LogEvent[];
  studyDate: string;
  minutes: number;
  diagnostic: boolean;
  hintsAllowed: boolean;
  note?: string;
  advance?: "next" | "block" | "set";
  onChange: () => void;
}) {
  const duration = minutes * 60;
  const clockKey = `desk-clock:${dayId}:${card.id}`;
  const draftKey = `${dayId}:${card.id}`;
  const [sentence, setSentence] = useState("");
  const [second, setSecond] = useState("");
  const [answer, setAnswer] = useState("");
  const [mid, setMid] = useState("");
  const [cellNote, setCellNote] = useState("");
  const [hintText, setHintText] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [swapName, setSwapName] = useState("");
  const [askingSwap, setAskingSwap] = useState(false);
  const started = useRef<number | null>(null);
  const firstKey = useRef<number | null>(null);
  const hinted = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const forCard = (event: LogEvent) => event.dayId === dayId && event.cardId === card.id;
  const graded = events.find((event) => event.type === "commit" && event.graded && forCard(event));
  const anyCommit = events.find((event) => event.type === "commit" && forCard(event));
  const level = hintLevel(events, dayId, card.id);
  const gave = events.some((event) => event.type === "give-up" && forCard(event));
  const attempted = hasAttempt(events, dayId, card.id);
  const timeUp = elapsed >= duration;
  const unlocked = Boolean(graded || anyCommit) || gave || timeUp;

  useEffect(() => {
    area.current?.focus();
  }, [card.id]);

  useEffect(() => {
    const saved = readClock(clockKey, duration);
    started.current = Date.now() - saved.elapsed * 1000;
    setElapsed(saved.elapsed);
    setPaused(saved.paused);
    setSentence(readDraft(draftKey));
    setSecond("");
    setAnswer("");
    setMid("");
    setCellNote("");
    setAskingSwap(false);
    firstKey.current = null;
    hinted.current = false;
  }, [card.id, clockKey, draftKey, duration]);

  useEffect(() => {
    try {
      localStorage.setItem(clockKey, JSON.stringify({ elapsed, paused }));
    } catch {
      /* the clock still runs on the page */
    }
  }, [clockKey, elapsed, paused]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setElapsed((value) => (value >= duration ? value : value + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, duration, card.id]);

  useEffect(() => {
    let cancel = false;
    const texts: string[] = [];
    for (let step = 1; step <= level && step <= 2; step += 1) texts.push(HINTS[step - 1]);
    (async () => {
      try {
        if (level >= 3) {
          const key = await loadKey(card.id, "hint3");
          texts.push(key.hint3 ?? "");
        }
        if (level >= 4) {
          const key = await loadKey(card.id, "sentence");
          texts.push(key.sentence ?? "");
        }
        if (!cancel) setHintText(texts.slice(0, level));
      } catch {
        if (!cancel) setHintText(["The hint did not load."]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [card.id, level]);

  async function commit(text: string, wantGraded: boolean) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const gradedCommit = wantGraded && level === 0 && !hinted.current;
    const prior = events.filter((event) => event.type === "commit" && forCard(event)).length;
    const ok = await postLog({
      type: "commit",
      dayId,
      blockIndex,
      cardId: card.id,
      sentence: trimmed,
      graded: gradedCommit,
      studyDate,
      revision: prior + 1,
      firstKeystrokeAt: firstKey.current,
      committedAt: Date.now(),
    });
    if (!ok) {
      setCellNote("The file did not take that line. It is still in the box.");
      return;
    }
    onChange();
  }

  async function takeHint(next: number) {
    if (!unlocked || next !== level + 1 || next > hintCap) return;
    hinted.current = true;
    const ok = await postLog({ type: "hint", dayId, blockIndex, cardId: card.id, hintLevel: next, studyDate });
    if (!ok) {
      setCellNote("The file did not take that hint.");
      return;
    }
    onChange();
  }

  async function checkCells() {
    if (!attempted) return;
    let answerOk = false;
    let midOk = false;
    try {
      const checked = await askCells(card.id, answer, mid);
      answerOk = checked.answerOk;
      midOk = checked.midOk;
    } catch {
      setCellNote("The cells did not load.");
      return;
    }
    setCellNote(answerOk && midOk ? "Both cells match." : "Those cells do not match.");
    const ok = await postLog({ type: "cells", dayId, blockIndex, cardId: card.id, answerOk, midOk, studyDate });
    if (!ok) setCellNote("The file did not take those cells.");
    onChange();
  }

  async function tag(name: string) {
    const ok = await postLog({ type: "tag", dayId, blockIndex, cardId: card.id, tag: name, studyDate });
    if (!ok) setCellNote("The file did not take that tag.");
    else onChange();
  }

  async function swap() {
    if (!card.alternateId || !swapName.trim() || swapsOnDate(events, studyDate) >= 1 || attempted) return;
    const ok = await postLog({
      type: "swap",
      dayId,
      blockIndex,
      cardId: card.id,
      recognizedName: swapName.trim(),
      studyDate,
    });
    if (!ok) setCellNote("The file did not take that swap.");
    else onChange();
  }

  async function giveUp() {
    const ok = await postLog({ type: "give-up", dayId, blockIndex, cardId: card.id, studyDate });
    if (!ok) setCellNote("The file did not take that.");
    else onChange();
  }

  const swapped = events.some(
    (event) => event.type === "swap" && event.dayId === dayId && event.cardId === card.id && event.blockIndex === blockIndex,
  );
  if (swapped && card.alternateId && cards[card.alternateId]) {
    return (
      <CardFace
        card={cards[card.alternateId]}
        cards={cards}
        dayId={dayId}
        blockIndex={blockIndex}
        events={events}
        studyDate={studyDate}
        minutes={minutes}
        diagnostic={diagnostic}
        hintsAllowed={hintsAllowed}
        note={note}
        advance={advance}
        onChange={onChange}
      />
    );
  }

  const left = Math.max(0, duration - elapsed);
  const clock = timeUp ? "time" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const showHints = unlocked && hintsAllowed;
  const hintCap = card.id.startsWith("diag-") ? 3 : 4;
  const matched = cellsMatch(events, dayId, card.id);
  const lockedSentence = graded?.sentence ?? anyCommit?.sentence ?? "";
  const status = !attempted
    ? "Write the sentence, then Commit."
    : !matched
      ? "Type the two cells, then Check cells. The second label is what your sentence should mean."
      : "If your sentence matches the second cell's meaning, leave it untagged.";

  return (
    <article className="face">
      <header className="top">
        <span>{card.title}</span>
        <span aria-label={timeUp ? "time is up" : `${left} seconds left`}>{clock}</span>
        <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "Run" : "Pause"}</button>
      </header>
      {note && <p className="fine">{note}</p>}
      <p className="problem">{card.statement}</p>
      <p className="fine">{card.constraints}</p>
      <p className="fine">{card.tiny}</p>
      {!attempted && !askingSwap && card.alternateId && (
        <button type="button" className="texty" onClick={() => setAskingSwap(true)}>I already know this</button>
      )}
      {askingSwap && !attempted && (
        <div className="line">
          <input
            aria-label="Name of the problem you recognize"
            value={swapName}
            onChange={(event) => setSwapName(event.target.value)}
          />
          <button type="button" onClick={() => void swap()}>Swap</button>
        </div>
      )}
      <div className="write">
        <textarea
          ref={area}
          className="draft"
          aria-label="State sentence"
          value={attempted ? lockedSentence : sentence}
          readOnly={attempted}
          onChange={(event) => {
            if (firstKey.current === null) firstKey.current = Date.now() - (started.current ?? Date.now());
            setSentence(event.target.value);
            writeDraft(draftKey, event.target.value);
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !attempted) {
              event.preventDefault();
              void commit(sentence, true);
            }
          }}
        />
        <div className="rule-row">
          <span className="rule" />
          {!attempted && (
            <button type="button" className="commit" onClick={() => void commit(sentence, true)}>Commit</button>
          )}
          {attempted && <span className="commit">{graded ? "Committed" : "Recorded, not graded"}</span>}
        </div>
      </div>
      <p className="fine">{status}</p>
      {attempted && !matched && (
        <p className="fine">
          {diagnostic && advance !== "set"
            ? "This set finishes when every card's cells match."
            : advance === "set"
              ? "You can open the next card. This set finishes when every card's cells match."
              : advance === "next"
                ? "Next card opens when both cells match."
                : "This block finishes when both cells match."}
        </p>
      )}
      {attempted && (
        <div className="cells">
          <label>
            {card.answerLabel}
            <input aria-label={card.answerLabel} value={answer} onChange={(event) => setAnswer(event.target.value)} />
          </label>
          <label>
            {card.midLabel}
            <input aria-label={card.midLabel} value={mid} onChange={(event) => setMid(event.target.value)} />
          </label>
          <button type="button" onClick={() => void checkCells()}>Check cells</button>
          {cellNote && <p>{cellNote}</p>}
        </div>
      )}
      {!unlocked && <p className="fine">The hints stay blank until you commit, the clock ends, or you give up.</p>}
      {diagnostic && !hintsAllowed && unlocked && (
        <p className="fine">Hints for this set wait until every sentence on it is committed.</p>
      )}
      {showHints && (
        <ol className="hints">
          {hintText.map((text, index) => <li key={`${index}-${text.slice(0, 24)}`}>{text}</li>)}
          {level < hintCap && <li><button type="button" onClick={() => void takeHint(level + 1)}>Hint {level + 1}</button></li>}
        </ol>
      )}
      {!attempted && (
        <button type="button" className="texty" onClick={() => void giveUp()}>Give up</button>
      )}
      {level >= 1 && level < 4 && (
        <div className="write">
          <textarea
            className="draft"
            aria-label="Second sentence"
            value={second}
            onChange={(event) => setSecond(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void commit(second, false);
              }
            }}
          />
          <button type="button" className="texty" onClick={() => void commit(second, false)}>Keep this second sentence</button>
        </div>
      )}
      {(attempted || level === 4) && (
        <div className="tags">
          {TAGS.filter(([id]) => id !== "transition" || card.leetcode).map(([id, label]) => (
            <button key={id} type="button" onClick={() => void tag(id)}>{label}</button>
          ))}
          <button type="button" onClick={() => void tag("non-minimal")}>Non-minimal note</button>
          <button type="button" onClick={() => void tag("no-miss")}>No miss</button>
        </div>
      )}
      {card.leetcode && attempted && (
        <p className="fine">Code it on LeetCode {card.leetcode} only after this sentence.</p>
      )}
    </article>
  );
}
