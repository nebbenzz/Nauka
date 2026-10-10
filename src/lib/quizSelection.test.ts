import assert from "node:assert/strict";
import test from "node:test";

import { filtrerQuestionsParNiveau, filtrerQuestionsParNiveauCible, tirerQuestionsStandard } from "./quizSelection";

test("filtrerQuestionsParNiveau keeps questions at or below the user's level", () => {
  const questions = [
    { id: "q1", niveau: 1, notion_niveau: 3 },
    { id: "q2", niveau: 2, notion_niveau: 1 },
    { id: "q3", niveau: 3, notion_niveau: 1 },
    { id: "q4", niveau: null, notion_niveau: 2 },
    { id: "q5", notion_niveau: 1 },
    { id: "q6", niveau: null, notion_niveau: null },
  ];

  assert.deepEqual(filtrerQuestionsParNiveau(questions, 2).map((question) => question.id), ["q1", "q2", "q4", "q5"]);
  assert.equal(filtrerQuestionsParNiveau(questions, null).length, 6);
});

test("filtrerQuestionsParNiveauCible preserves exact pools and adapts combined pools to the user's level", () => {
  const questions = [
    { id: "l2", niveau: 2 },
    { id: "l3", niveau: 3 },
    { id: "l4", niveau: 4 },
  ];

  assert.deepEqual(filtrerQuestionsParNiveauCible(questions.slice(0, 1), 2, 3).map((question) => question.id), ["l2"]);
  assert.deepEqual(filtrerQuestionsParNiveauCible(questions.slice(1), 3, 3).map((question) => question.id), ["l3"]);
  assert.deepEqual(filtrerQuestionsParNiveauCible(questions.slice(1), 3, 4).map((question) => question.id), ["l3", "l4"]);
});

test("tirerQuestionsStandard keeps only classic closed-answer questions", () => {
  const questions = [
    { id: "q1", type: "qcm" },
    { id: "q2", type: "qcu" },
    { id: "q3", type: "code" },
    { id: "q4", type: "libre" },
    { id: "q5", type: "dessin" },
    { id: "q6", type: "qcm" },
    { id: "q7", type: "qcu" },
  ];

  const selection = tirerQuestionsStandard(questions);

  assert.ok(selection.length > 0);
  assert.ok(selection.every((question) => question.type === "qcm" || question.type === "qcu"));
});
