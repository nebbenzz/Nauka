import assert from "node:assert/strict";
import test from "node:test";

import { filtrerQuestionsParNiveau, tirerQuestionsStandard } from "./quizSelection";

test("filtrerQuestionsParNiveau keeps questions at or below the user's level", () => {
  const questions = [
    { id: "q1", notion_niveau: 1 },
    { id: "q2", notion_niveau: 2 },
    { id: "q3", notion_niveau: 3 },
    { id: "q4", notion_niveau: null },
  ];

  assert.deepEqual(filtrerQuestionsParNiveau(questions, 2).map((question) => question.id), ["q1", "q2"]);
  assert.equal(filtrerQuestionsParNiveau(questions, null).length, 4);
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
