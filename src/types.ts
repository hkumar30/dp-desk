export type Card = {
  id: string;
  stateId: string;
  family: number;
  title: string;
  statement: string;
  constraints: string;
  tiny: string;
  answerLabel: string;
  midLabel: string;
  leetcode: number | null;
  alternateId: string | null;
  negative: boolean;
  variant: boolean;
  decoy: boolean;
};

export type KeyFile = {
  answer: string;
  mid: string;
  sentence: string;
  hint3: string;
};

export type GateCell = { label: string; value: string };

export type Block = {
  kind: "retrieval" | "lesson" | "cold" | "cards" | "check" | "rule";
  minutes: number;
  cardId?: string | null;
  cardIds?: string[];
  lessonId?: string;
  note?: string;
  leetcode?: number;
  optional?: boolean;
  diagnostic?: boolean;
};

export type StudyDay = {
  id: string;
  family: number;
  index: number;
  title: string;
  firstOfFamily: boolean;
  lastOfFamily: boolean;
  blocks: Block[];
};

export type Schedule = {
  rolloverHour: number;
  timezone: string;
  offWeekday: string;
  diagnostic: { id: string; title: string; minutesEach: number; cardIds: string[] };
  days: StudyDay[];
  transfer: { cardId: string; leetcode: number }[];
  posttest: string[];
  aloud: string;
  quarantine: string[];
};

export type LogEvent = {
  t?: string;
  type: string;
  dayId?: string;
  blockIndex?: number;
  cardId?: string;
  sentence?: string;
  graded?: boolean;
  hintLevel?: number;
  answerOk?: boolean;
  midOk?: boolean;
  tag?: string;
  minimum?: boolean;
  text?: string;
  recognizedName?: string;
  studyDate?: string;
  revision?: number;
  firstKeystrokeAt?: number | null;
  committedAt?: number;
};
