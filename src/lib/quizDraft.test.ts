import assert from "node:assert/strict";
import test from "node:test";

import {
  clearQuizDraft,
  choisirBrouillonLePlusRecent,
  getDraftStorageKey,
  getQuestionsFromDraft,
  readQuizDraft,
  saveQuizDraft,
} from "./quizDraft";

test("getDraftStorageKey scopes the draft to the user and quiz", () => {
  assert.equal(getDraftStorageKey("quiz-42", "user-7"), "notio:quiz:draft:user-7:quiz-42");
});

test("choisirBrouillonLePlusRecent selects the newest synchronized copy", () => {
  const local = { selections: {}, reponsesAvancees: {}, questionsIds: ["q1"], updatedAt: "2026-10-05T10:00:00.000Z" };
  const distant = { selections: {}, reponsesAvancees: {}, questionsIds: ["q2"], updatedAt: "2026-10-05T11:00:00.000Z" };

  assert.equal(choisirBrouillonLePlusRecent(local, distant), distant);
  assert.equal(choisirBrouillonLePlusRecent(distant, local), distant);
  assert.equal(choisirBrouillonLePlusRecent(local, null), local);
  assert.equal(choisirBrouillonLePlusRecent(null, distant), distant);
});

test("saveQuizDraft and readQuizDraft round-trip a draft payload", () => {
  const storage = new Map<string, string>();
  const saved = {
    selections: { q1: ["a", "b"] },
    reponsesAvancees: { q2: "texte libre" },
    questionsIds: ["q1", "q2"],
    updatedAt: "2026-10-05T12:00:00.000Z",
  };

  saveQuizDraft("quiz-42", "user-7", saved, storage as unknown as Storage);
  assert.deepEqual(readQuizDraft("quiz-42", "user-7", storage as unknown as Storage), saved);
});

test("clearQuizDraft removes the stored data", () => {
  const storage = new Map<string, string>();
  const saved = {
    selections: { q1: ["a"] },
    reponsesAvancees: {},
    questionsIds: ["q1"],
    updatedAt: "2026-10-05T12:00:00.000Z",
  };

  saveQuizDraft("quiz-42", "user-7", saved, storage as unknown as Storage);
  clearQuizDraft("quiz-42", "user-7", storage as unknown as Storage);
  assert.equal(readQuizDraft("quiz-42", "user-7", storage as unknown as Storage), null);
});

test("getQuestionsFromDraft preserves the saved question order when resuming", () => {
  const draft = {
    selections: { q1: ["a"] },
    reponsesAvancees: {},
    questionsIds: ["q2", "q1"],
    updatedAt: "2026-10-05T12:00:00.000Z",
  };

  const questions = [
    { id: "q1", label: "first" },
    { id: "q2", label: "second" },
    { id: "q3", label: "third" },
  ];

  assert.deepEqual(
    getQuestionsFromDraft(draft, questions).map((question) => question.id),
    ["q2", "q1"],
  );
});
