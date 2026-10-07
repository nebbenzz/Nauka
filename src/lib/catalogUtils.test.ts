import assert from "node:assert/strict";
import test from "node:test";

import {
  estQuizCompatibleAvecNiveau,
  formatDureeQuiz,
  formatNiveauQuiz,
  getPreviewNotions,
  getScorePourcentage,
} from "./catalogUtils";

test("formatNiveauQuiz uses notion level when available", () => {
  assert.equal(formatNiveauQuiz({ type: "notion", notion_niveau: 3, est_avance: false }), "niv. 3");
});

test("formatNiveauQuiz returns an empty value for subject-level quizzes", () => {
  assert.equal(formatNiveauQuiz({ type: "global", notion_niveau: null, est_avance: false }), "");
});

test("formatDureeQuiz converts seconds to minutes", () => {
  assert.equal(formatDureeQuiz(540), "9 min");
});

test("getScorePourcentage keeps it in a human-readable range", () => {
  assert.equal(getScorePourcentage(18, 25), 72);
  assert.equal(getScorePourcentage(0, 0), null);
});

test("getPreviewNotions caps the preview to 3 items", () => {
  assert.deepEqual(getPreviewNotions(["Droit des contrats", "Responsabilité civile", "Obligations", "Notion 4"]), [
    "Droit des contrats",
    "Responsabilité civile",
    "Obligations",
  ]);
});

test("estQuizCompatibleAvecNiveau filters out higher-year concepts for L1 students", () => {
  assert.equal(estQuizCompatibleAvecNiveau({ type: "notion", notion_niveau: 1 }, 1), true);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "notion", notion_niveau: 2 }, 1), false);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global", notion_niveau: 2 }, 1), false);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global", notion_niveau: 1 }, 3), true);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global" }, 3), true);
});
