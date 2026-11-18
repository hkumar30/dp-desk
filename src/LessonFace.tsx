import { useEffect, useState } from "react";
import { checkLesson, loadLabels, loadLesson, postLog } from "./api";
import { Markdown, splitReveal } from "./markdown";

export function LessonFace({
  lessonId,
  dayId,
  blockIndex,
  optional,
  onChange,
}: {
  lessonId: string;
  dayId: string;
  blockIndex: number;
  optional: boolean;
  onChange: () => void;
}) {
  const [source, setSource] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let live = true;
    setOpen(false);
    setNote("");
    loadLesson(lessonId).then((text) => {
      if (live) setSource(text);
    });
    loadLabels(lessonId).then((next) => {
      if (!live) return;
      setLabels(next);
      setValues(next.map(() => ""));
    });
    return () => {
      live = false;
    };
  }, [lessonId]);

  const { before, after } = splitReveal(source);

  async function check() {
    const ok = await checkLesson(lessonId, values);
    if (!ok) {
      setNote("Those cells do not match.");
      setOpen(false);
      return;
    }
    setNote("The table matches.");
    setOpen(true);
    await postLog({ type: "cells", dayId, blockIndex, cardId: lessonId, answerOk: true, midOk: true });
    onChange();
  }

  async function skip() {
    await postLog({ type: "block-done", dayId, blockIndex, text: "skipped lesson" });
    onChange();
  }

  return (
    <article className="face">
      <Markdown source={before} />
      {labels.length > 0 && (
        <div className="cells">
          {labels.map((label, index) => (
            <label key={label}>
              {label}
              <input
                aria-label={label}
                value={values[index] ?? ""}
                onChange={(event) => {
                  const next = [...values];
                  next[index] = event.target.value;
                  setValues(next);
                }}
              />
            </label>
          ))}
          <button type="button" onClick={() => void check()}>Check the table</button>
          {note && <p>{note}</p>}
        </div>
      )}
      {open && <Markdown source={after} />}
      {optional && <button type="button" className="texty" onClick={() => void skip()}>Skip this algorithm</button>}
    </article>
  );
}
