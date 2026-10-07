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
      { created_at: "2026-10-01T12:00:00.000Z", reponses_json: { "question-1": ["bonne"] } },
      { created_at: "2026-10-04T12:00:00.000Z", reponses_json: { "question-1": [] } },
    ],
    maintenant,
  );

  assert.deepEqual(activite.get("notion-1"), {
    nombreReponsesTotal: 2,
    nombreReponsesRecentes: 2,
    derniereReponse: "2026-10-04T12:00:00.000Z",
    scoreRecent: 50,
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
      created_at: "2026-10-04T12:00:00.000Z",
      reponses_json: { details: [{ question_id: "question-1", statut: "partiel" }] },
    }],
    maintenant,
  );

  assert.equal(activite.get("notion-1")?.nombreReponsesRecentes, 1);
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
    [{ created_at: "2026-06-01T12:00:00.000Z", reponses_json: { "question-1": ["bonne"] } }],
    maintenant,
  );

  assert.equal(activite.get("notion-1")?.nombreReponsesTotal, 1);
  assert.equal(activite.get("notion-1")?.nombreReponsesRecentes, 0);
  assert.equal(activite.get("notion-1")?.scoreRecent, null);
  assert.equal(determinerFiabilite(activite.get("notion-1")!), "À actualiser");
});

test("determinerEtatCouverture requires enough recent responses and a stable score", () => {
  assert.equal(determinerEtatCouverture({ nombreReponsesTotal: 0, nombreReponsesRecentes: 0, derniereReponse: null, scoreRecent: null }), "a-decouvrir");
  assert.equal(determinerEtatCouverture({ nombreReponsesTotal: 9, nombreReponsesRecentes: 9, derniereReponse: "2026-10-04T12:00:00.000Z", scoreRecent: 100 }), "en-cours");
  assert.equal(determinerEtatCouverture({ nombreReponsesTotal: 12, nombreReponsesRecentes: 12, derniereReponse: "2026-10-04T12:00:00.000Z", scoreRecent: 75 }), "maitrise");
  assert.equal(determinerFiabilite({ nombreReponsesTotal: 3, nombreReponsesRecentes: 3, derniereReponse: "2026-10-04T12:00:00.000Z", scoreRecent: 100 }), "Fiabilité limitée");
});