import { useCallback, useEffect, useMemo, useState } from "react";
import { currentDeskId, loadCards, loadLog, loadSchedule, postLog, readDraft, writeDraft } from "./api";
import { adherence, consecutive, studyDate } from "./calendar";
import { CardFace } from "./CardFace";
import { LessonFace } from "./LessonFace";
import { Markdown } from "./markdown";
import {
  blockDone,
  buildDays,
  cardSettled,
  checkScore,
  currentPlace,
  hasAttempt,
  playedId,
  replaced,
  sentenceMinutes,
  tagLine,
  usedRecently,
  visibleCardIds,
} from "./progress";
import type { Block, Card, LogEvent, Schedule, StudyDay } from "./types";

function lessonReady(events: LogEvent[], dayId: string, blockIndex: number): boolean {
  return events.some(
    (event) =>
      event.dayId === dayId &&
      event.blockIndex === blockIndex &&
      ((event.type === "cells" && event.answerOk) || event.type === "block-done"),
  );
}

export function App() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [cards, setCards] = useState<Record<string, Card>>({});
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [view, setView] = useState<"today" | "sentences" | "help">("today");
  const [short, setShort] = useState(false);
  const [rule, setRule] = useState("");
  const [freeSentence, setFreeSentence] = useState("");
  const [cardCursor, setCardCursor] = useState(0);
  const [saveNote, setSaveNote] = useState("");
  const today = studyDate(new Date());

  const reload = useCallback(() => {
    loadLog().then(setEvents).catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    loadSchedule().then(setSchedule);
    loadCards().then(setCards);
    reload();
  }, [reload]);

  const days = useMemo(() => (schedule ? buildDays(schedule, events, cards) : []), [schedule, events, cards]);
  const place = useMemo(() => (days.length ? currentPlace(days, events) : null), [days, events]);

  useEffect(() => {
    document.title = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
    }).format(new Date());
  }, []);

  useEffect(() => {
    if (!place) return;
    setCardCursor(0);
    setSaveNote("");
    setRule(readDraft(`rule:${place.day.id}`));
    setFreeSentence(readDraft(`method:${place.day.id}:${place.blockIndex}`));
  }, [place?.day.id, place?.blockIndex]);

  if (!schedule || !place || Object.keys(cards).length === 0) return <p className="fine">Loading the desk.</p>;
  const here = place;

  const selection = short ? shortSelection(place.day) : place.day.blocks.map((item, index) => ({ block: item, index }));
  const activePair = selection.find((item) => !blockDone(events, place.day.id, item.index)) ?? selection[selection.length - 1];
  const active = activePair.block;
  const activeIndex = activePair.index;
  const shownIds = visibleCardIds(active, short);

  const closedDates = events.filter((event) => event.type === "rule" && event.studyDate).map((event) => event.studyDate as string);
  const streak = consecutive(closedDates, today);
  const ratio = adherence(closedDates, today);
  const oldRule = [...events].reverse().find((event) => event.type === "rule" && event.text);
  const ready = blockReady(active, events, place.day.id, activeIndex, cards, shownIds);
  const shortened = Boolean(shownIds && active.cardIds && shownIds.length < active.cardIds.length);
  const minimumClose = shortened || events.some((event) => event.type === "block-done" && event.dayId === place.day.id && event.minimum);
  const score = active.kind === "check" && active.cardIds
    ? checkScore(events, place.day.id, activeIndex, active.cardIds, cards)
    : null;

  async function finish() {
    const ok = await postLog({
      type: "block-done",
      dayId: here.day.id,
      blockIndex: activeIndex,
      studyDate: today,
      minimum: shortened,
    });
    if (!ok) setSaveNote("The file did not take that.");
    reload();
  }

  async function commitFree() {
    if (!freeSentence.trim()) return;
    const ok = await postLog({
      type: "commit",
      dayId: here.day.id,
      blockIndex: activeIndex,
      cardId: "method",
      sentence: freeSentence.trim(),
      graded: true,
      studyDate: today,
    });
    if (!ok) setSaveNote("The file did not take that line. It is still in the box.");
    reload();
  }

  async function commitRule() {
    if (!rule.trim()) return;
    const ok = await postLog({
      type: "rule",
      dayId: here.day.id,
      text: rule.trim(),
      minimum: minimumClose,
      studyDate: today,
    });
    if (!ok) setSaveNote("The file did not take that rule.");
    reload();
  }

  return (
    <div className="sheet" data-theme="paper">
      <header className="top">
        <span>{today}</span>
        <span>{streak} days in a row</span>
        {ratio.scheduled > 0 && <span>closed {ratio.closed} of {ratio.scheduled} study days</span>}
        <Nav view={view} setView={setView} />
        <button type="button" onClick={() => setShort((value) => !value)}>{short ? "Full day" : "Short day"}</button>
      </header>
      {place.repeat && <p className="fine">Slip. This family stays until you close a full day.</p>}
      {short && <p className="fine">A short day is retrieval, two cards, and a rule. It still closes.</p>}
      {saveNote && <p className="fine">{saveNote}</p>}
      {view === "help" ? (
        <HowTo />
      ) : view === "sentences" ? (
        <SentenceList events={events} />
      ) : (
        <div className="body">
          <nav className="margin" aria-label="Today">
            <ol className="index">
              {selection.map((item) => (
                <li key={`${item.block.kind}-${item.index}`} className={item.index === activeIndex ? "now" : undefined}>
                  {String(item.index + 1).padStart(2, "0")} {blockLabel(item.block, place.day.id)}
                </li>
              ))}
            </ol>
            <p className="errors">{tagLine(events)}</p>
            <p className="fine">{place.day.title}</p>
            {short && active.kind === "check" && <p className="fine">This check stays four cards.</p>}
          </nav>
          <div>
            {oldRule && active.kind === "retrieval" && <p className="ruled">{oldRule.text}</p>}
            {active.kind === "retrieval" && !active.cardId && (
              <article className="face">
                <p className="problem">{active.note}</p>
                <textarea
                  className="draft"
                  aria-label="State sentence"
                  value={freeSentence}
                  onChange={(event) => {
                    setFreeSentence(event.target.value);
                    writeDraft(`method:${place.day.id}:${activeIndex}`, event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void commitFree();
                    }
                  }}
                />
                <button type="button" className="commit" onClick={() => void commitFree()}>Commit</button>
                <p className="fine">Write the sentence, then Commit. Then mark this block done.</p>
              </article>
            )}
            {active.cardId && !shownIds && cards[active.cardId] && (
              <CardFace
                key={`${place.day.id}-${active.cardId}`}
                card={cards[active.cardId]}
                cards={cards}
                dayId={place.day.id}
                blockIndex={activeIndex}
                events={events}
                studyDate={today}
                minutes={sentenceMinutes(active)}
                diagnostic={false}
                hintsAllowed
                note={coldNote(active)}
                onChange={reload}
              />
            )}
            {shownIds && (
              <CardList
                ids={shownIds}
                cards={cards}
                cursor={Math.min(cardCursor, shownIds.length - 1)}
                setCursor={setCardCursor}
                dayId={place.day.id}
                blockIndex={activeIndex}
                events={events}
                studyDate={today}
                minutes={sentenceMinutes(active, active.cardIds?.length ?? shownIds.length)}
                diagnostic={Boolean(active.diagnostic)}
                weekly={active.kind === "cards" && !active.diagnostic}
                onChange={reload}
              />
            )}
            {active.kind === "lesson" && active.lessonId && !blockDone(events, place.day.id, activeIndex) && (
              <LessonFace
                key={active.lessonId}
                lessonId={active.lessonId}
                dayId={place.day.id}
                blockIndex={activeIndex}
                optional={Boolean(active.optional)}
                onChange={reload}
              />
            )}
            {score && ready && (
              <p className="fine">
                {score.passes} of {score.total} with no level-4 hint.{" "}
                {score.held ? "A rough signal that this family holds." : "The next two days stay on this family."}
              </p>
            )}
            {active.kind === "rule" && !dayHasRule(events, place.day.id) && (
              <article className="face">
                <p className="problem">One rule, in your own words. Then the page stops.</p>
                <textarea
                  className="draft"
                  aria-label="Rule"
                  value={rule}
                  onChange={(event) => {
                    setRule(event.target.value);
                    writeDraft(`rule:${place.day.id}`, event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void commitRule();
                    }
                  }}
                />
                <button type="button" className="commit" onClick={() => void commitRule()}>Commit</button>
                <p className="fine">Write one rule, then Commit. That closes the day.</p>
              </article>
            )}
            {active.kind === "rule" && dayHasRule(events, place.day.id) && (
              <p className="ruled">{events.find((event) => event.type === "rule" && event.dayId === place.day.id)?.text}</p>
            )}
            {active.kind !== "rule" && ready && !blockDone(events, place.day.id, activeIndex) && (
              <button type="button" className="texty" onClick={() => void finish()}>This block is done</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function blockLabel(block: Block, dayId: string): string {
  if (block.diagnostic && dayId === "diagnostic") return "diagnostic";
  return block.kind;
}

function Nav({ view, setView }: { view: "today" | "sentences" | "help"; setView: (view: "today" | "sentences" | "help") => void }) {
  const items = [
    ["today", "Today"],
    ["sentences", "Sentences"],
    ["help", "How to use"],
  ] as const;
  return (
    <span className="nav">
      {items.map(([id, label]) =>
        view === id ? (
          <span key={id} className="now">{label}</span>
        ) : (
          <button key={id} type="button" onClick={() => setView(id)}>{label}</button>
        ),
      )}
    </span>
  );
}

function HowTo() {
  const [source, setSource] = useState("");
  useEffect(() => {
    fetch("/content/how.md")
      .then((response) => (response.ok ? response.text() : "This page is not on disk yet."))
      .then(setSource);
  }, []);
  const id = currentDeskId();
  return (
    <div>
      <Markdown source={source} />
      <p className="fine">Desk id {id || "unavailable in this browser"}</p>
    </div>
  );
}

function coldNote(block: Block): string | undefined {
  if (block.kind === "cold" && block.minutes > 15) {
    return "The sentence is due in 15 minutes. Coding stays on LeetCode after it.";
  }
  if (block.kind === "cold" && block.minutes <= 12) return "Say the sentence out loud before you commit it.";
  return undefined;
}

function dayHasRule(events: LogEvent[], dayId: string): boolean {
  return events.some((event) => event.type === "rule" && event.dayId === dayId);
}

function shortSelection(day: StudyDay): { block: Block; index: number }[] {
  const pairs = day.blocks.map((block, index) => ({ block, index }));
  const retrieval = pairs.find((item) => item.block.kind === "retrieval");
  const practice = pairs.find((item) => item.block.kind === "cards" || item.block.kind === "check" || item.block.kind === "cold");
  const rule = pairs.find((item) => item.block.kind === "rule");
  return [retrieval, practice, rule].filter((item): item is { block: Block; index: number } => Boolean(item));
}

function blockReady(
  block: Block,
  events: LogEvent[],
  dayId: string,
  blockIndex: number,
  cards: Record<string, Card>,
  shownIds: string[] | undefined,
): boolean {
  if (block.kind === "lesson") return lessonReady(events, dayId, blockIndex);
  if (block.kind === "rule") return false;
  if (block.cardId) return cardSettled(events, dayId, blockIndex, block.cardId, cards);
  if (block.kind === "retrieval") {
    return events.some((event) => event.type === "commit" && event.dayId === dayId && event.cardId === "method" && event.blockIndex === blockIndex);
  }
  if (shownIds) return shownIds.length > 0 && shownIds.every((id) => cardSettled(events, dayId, blockIndex, id, cards));
  return false;
}

function CardList({
  ids,
  cards,
  cursor,
  setCursor,
  dayId,
  blockIndex,
  events,
  studyDate,
  minutes,
  diagnostic,
  weekly,
  onChange,
}: {
  ids: string[];
  cards: Record<string, Card>;
  cursor: number;
  setCursor: (value: number) => void;
  dayId: string;
  blockIndex: number;
  events: LogEvent[];
  studyDate: string;
  minutes: number;
  diagnostic: boolean;
  weekly: boolean;
  onChange: () => void;
}) {
  const [pending, setPending] = useState<null | "redo" | "external">(null);
  const id = ids[cursor];
  useEffect(() => setPending(null), [id]);
  const card = id ? cards[id] : undefined;
  if (!card || !id) return <p className="fine">That card is missing.</p>;
  const played = playedId(events, dayId, blockIndex, id, cards);
  const attempted = hasAttempt(events, dayId, played) || replaced(events, dayId, id);
  const hintsAllowed = !diagnostic || ids.every((cardId) => {
    const next = playedId(events, dayId, blockIndex, cardId, cards);
    return hasAttempt(events, dayId, next) || replaced(events, dayId, cardId);
  });
  const canNext = cursor < ids.length - 1 && (diagnostic ? attempted : cardSettled(events, dayId, blockIndex, id, cards));
  const slotReplaced = replaced(events, dayId, id);

  async function mark(type: "redo" | "external") {
    await postLog({ type, dayId, blockIndex, cardId: id, studyDate });
    onChange();
  }

  return (
    <div>
      <p className="fine">{cursor + 1} of {ids.length}</p>
      {weekly && !slotReplaced && !attempted && !pending && (
        <p className="fine">
          {!usedRecently(events, "redo", studyDate) && (
            <button type="button" className="texty" onClick={() => setPending("redo")}>Blank-file redo</button>
          )}
          {!usedRecently(events, "external", studyDate) && (
            <button type="button" className="texty" onClick={() => setPending("external")}>Code an old sentence</button>
          )}
        </p>
      )}
      {pending === "redo" && (
        <article className="face">
          <p className="problem">Open a blank file. Code a problem whose sentence you already committed. 25 minutes. No notes.</p>
          <button type="button" className="texty" onClick={() => void mark("redo")}>The redo is done</button>
        </article>
      )}
      {pending === "external" && (
        <article className="face">
          <p className="problem">Code one sentence you committed. Compare the judge with the tag you gave it.</p>
          <button type="button" className="texty" onClick={() => void mark("external")}>Compared</button>
        </article>
      )}
      {slotReplaced ? (
        <p className="problem">That slot was this week's redo. The other cards stay.</p>
      ) : pending ? null : (
        <CardFace
          key={`${dayId}-${id}`}
          card={card}
          cards={cards}
          dayId={dayId}
          blockIndex={blockIndex}
          events={events}
          studyDate={studyDate}
          minutes={minutes}
          diagnostic={diagnostic}
          hintsAllowed={hintsAllowed}
          advance={diagnostic ? (cursor < ids.length - 1 ? "set" : "block") : cursor < ids.length - 1 ? "next" : "block"}
          onChange={onChange}
        />
      )}
      {cursor > 0 && <button type="button" className="texty" onClick={() => setCursor(cursor - 1)}>Previous card</button>}
      {canNext && <button type="button" className="texty" onClick={() => setCursor(cursor + 1)}>Next card</button>}
    </div>
  );
}

function SentenceList({ events }: { events: LogEvent[] }) {
  const lines = events.filter((event) => (event.type === "commit" && event.sentence) || (event.type === "rule" && event.text));
  if (lines.length === 0) return <p className="problem">The page is blank.</p>;
  return (
    <div>
      {lines.map((event, index) => (
        <article key={`${event.t}-${index}`} className="entry">
          <p className="fine">{event.studyDate} {event.type === "rule" ? "rule" : event.cardId}</p>
          <p className={event.type === "rule" ? "ruled" : "draft"}>{event.type === "rule" ? event.text : event.sentence}</p>
        </article>
      ))}
    </div>
  );
}
