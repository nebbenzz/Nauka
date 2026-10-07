import assert from "node:assert/strict";
import test from "node:test";

import {
  analyserActiviteNotions,
  determinerEtatCouverture,
  determinerFiabilite,
} from "./competenceCoverage";

const maintenant = new Date("2026-10-05T12:00:00.000Z");

test("analyserActiviteNotions compte les réponses classiques récentes par notion", () => {
  const activite = analyserActiviteNotions(
    [{ id: "notion-1" }],
    [{
      id: "question-1",
      notion_id: "notion-1",
      type: "qcu",
      points: 1,
      reponses: [{ id: "bonne", est_correcte: true }],
    }],
    [
      { id: "result-1", created_at: "2026-10-01T12:00:00.000Z", reponses_json: { "question-1": ["bonne"] } },
      { id: "result-2", created_at: "2026-10-04T12:00:00.000Z", reponses_json: { "question-1": [] } },
    ],
    maintenant,
  );

  assert.deepEqual(activite.get("notion-1"), {
    nombreQuestionsDistinctesTotal: 1,
    nombreQuestionsDistinctesRecentes: 1,
    nombreSessionsRecentes: 2,
    derniereReponse: "2026-10-04T12:00:00.000Z",
    scoreRecent: 0,
  });
});

test("analyserActiviteNotions reads the per-question statuses saved by advanced quizzes", () => {
  const activite = analyserActiviteNotions(
    [{ id: "notion-1" }],
    [{
      id: "question-1",
      notion_id: "notion-1",
      type: "libre",
      points: 2,
      reponses: [],
    }],
    [{
      id: "result-1",
      created_at: "2026-10-04T12:00:00.000Z",
      reponses_json: { details: [{ question_id: "question-1", statut: "partiel" }] },
    }],
    maintenant,
  );

  assert.equal(activite.get("notion-1")?.nombreQuestionsDistinctesRecentes, 1);
  assert.equal(activite.get("notion-1")?.nombreSessionsRecentes, 1);
  assert.equal(activite.get("notion-1")?.scoreRecent, 50);
});

test("analyserActiviteNotions keeps stale activity but excludes it from the recent score", () => {
  const activite = analyserActiviteNotions(
    [{ id: "notion-1" }],
    [{
      id: "question-1",
      notion_id: "notion-1",
      type: "qcu",
      points: 1,
      reponses: [{ id: "bonne", est_correcte: true }],
    }],
    [{ id: "result-1", created_at: "2026-06-01T12:00:00.000Z", reponses_json: { "question-1": ["bonne"] } }],
    maintenant,
  );

  assert.equal(activite.get("notion-1")?.nombreQuestionsDistinctesTotal, 1);
  assert.equal(activite.get("notion-1")?.nombreQuestionsDistinctesRecentes, 0);
  assert.equal(activite.get("notion-1")?.nombreSessionsRecentes, 0);
  assert.equal(activite.get("notion-1")?.scoreRecent, null);
  assert.equal(determinerFiabilite(activite.get("notion-1")!), "À actualiser");
});

test("determinerEtatCouverture requires enough recent responses and a stable score", () => {
  assert.equal(determinerEtatCouverture({ nombreQuestionsDistinctesTotal: 0, nombreQuestionsDistinctesRecentes: 0, nombreSessionsRecentes: 0, derniereReponse: null, scoreRecent: null }), "a-decouvrir");
  assert.equal(determinerEtatCouverture({ nombreQuestionsDistinctesTotal: 9, nombreQuestionsDistinctesRecentes: 9, nombreSessionsRecentes: 2, derniereReponse: "2026-10-04T12:00:00.000Z", scoreRecent: 100 }), "en-cours");
  assert.equal(determinerEtatCouverture({ nombreQuestionsDistinctesTotal: 12, nombreQuestionsDistinctesRecentes: 10, nombreSessionsRecentes: 2, derniereReponse: "2026-10-04T12:00:00.000Z", scoreRecent: 75 }), "maitrise");
  assert.equal(determinerFiabilite({ nombreQuestionsDistinctesTotal: 3, nombreQuestionsDistinctesRecentes: 3, nombreSessionsRecentes: 1, derniereReponse: "2026-10-04T12:00:00.000Z", scoreRecent: 100 }), "limitée");
});

test("repeating one question does not confirm mastery without distinct questions and sessions", () => {
  const repeatedQuestionResults = Array.from({ length: 10 }, (_, index) => ({
    id: `result-${index}`,
    created_at: `2026-10-${String(Math.floor(index / 2) + 1).padStart(2, "0")}T${index % 2 === 0 ? "09" : "10"}:00:00.000Z`,
    reponses_json: { "question-1": ["bonne"] },
  }));
  const activite = analyserActiviteNotions(
    [{ id: "notion-1" }],
    [{ id: "question-1", notion_id: "notion-1", type: "qcu", points: 1, reponses: [{ id: "bonne", est_correcte: true }] }],
    repeatedQuestionResults,
    maintenant,
  ).get("notion-1")!;

  assert.equal(activite.nombreQuestionsDistinctesRecentes, 1);
  assert.equal(activite.nombreSessionsRecentes, 10);
  assert.equal(determinerEtatCouverture(activite), "en-cours");
});

test("mastery requires distinct questions answered across at least two sessions", () => {
  const questions = Array.from({ length: 10 }, (_, index) => ({
    id: `question-${index}`,
    notion_id: "notion-1",
    type: "qcu" as const,
    points: 1,
    reponses: [{ id: `bonne-${index}`, est_correcte: true }],
  }));
  const resultats = [0, 1].map((sessionIndex) => ({
    id: `result-${sessionIndex}`,
    created_at: `2026-10-0${sessionIndex + 1}T12:00:00.000Z`,
    reponses_json: Object.fromEntries(questions.slice(sessionIndex * 5, sessionIndex * 5 + 5).map((question, index) => [question.id, [`bonne-${sessionIndex * 5 + index}`]])),
  }));
  const activite = analyserActiviteNotions([{ id: "notion-1" }], questions, resultats, maintenant).get("notion-1")!;

  assert.equal(activite.nombreQuestionsDistinctesRecentes, 10);
  assert.equal(activite.nombreSessionsRecentes, 2);
  assert.equal(activite.scoreRecent, 100);
  assert.equal(determinerEtatCouverture(activite), "maitrise");
});