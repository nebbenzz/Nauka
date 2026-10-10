import assert from "node:assert/strict";
import test from "node:test";
import type { QuestionSeed } from "../data/seed/types";
import { creerQuizAgreges, creerQuizMatiereParNiveau, creerQuizNotionParNiveau } from "./quizSeedGroups";

function question(id: string, notion: string, niveau: number): QuestionSeed {
  return { id, notion, niveau, type: "qcu", intitule: id, explication: "Test" };
}

test("creerQuizAgreges génère un pool séparé par niveau avec le niveau de première découverte", () => {
  const questions = [
    question("personnes-1", "Droit civil - les personnes", 1),
    question("personnes-2", "Droit civil - les personnes", 1),
    question("famille-1", "Droit civil - la famille", 2),
    question("famille-2", "Droit civil - la famille", 2),
    question("contrat-1", "Droit des contrats", 2),
  ];
  const quizzes = creerQuizAgreges(questions, [{
    titre: "Droit civil",
    notionsIncluses: ["Droit civil - les personnes", "Droit civil - la famille"],
  }]);

  assert.deepEqual(quizzes.map((quiz) => quiz.titre), ["Droit civil [L1]", "Droit civil [L2]"]);
  assert.deepEqual(quizzes.map((quiz) => quiz.niveauCible), [1, 2]);
  assert.ok(quizzes.every((quiz) => quiz.niveauNotion === 1 && quiz.niveauPremiereDecouverte === 1));
  assert.ok(quizzes.every((quiz) => quiz.type === "global"));
  assert.deepEqual(quizzes[0].notionsIncluses, ["Droit civil - les personnes", "Droit civil - la famille"]);
  assert.deepEqual(quizzes[0].questionIds, ["personnes-1", "personnes-2"]);
  assert.deepEqual(quizzes[1].questionIds, ["famille-1", "famille-2"]);
});

test("creerQuizAgreges évite les quiz déjà présents et refuse une notion inconnue", () => {
  const questions = [
    question("civil-1", "Droit civil - les personnes", 1),
    question("civil-2", "Droit civil - la famille", 2),
    question("seul-1", "Droit pénal", 2),
  ];

  const groupe = [{ titre: "Droit civil", notionsIncluses: ["Droit civil - les personnes", "Droit civil - la famille"] }];
  assert.deepEqual(creerQuizAgreges(questions, groupe, [{ titre: "Droit civil [L1]", type: "global", questionIds: [] }]).map((quiz) => quiz.titre), ["Droit civil [L2]"]);
  assert.throws(
    () => creerQuizAgreges(questions, [{ titre: "Droit civil", notionsIncluses: ["Droit civil - les personnes", "Droit inexistant"] }]),
    /n'existe pas dans le seed/,
  );
});

test("creerQuizNotionParNiveau crée des cartes distinctes et conserve l'année de première découverte", () => {
  const quizzes = creerQuizNotionParNiveau([
    question("algo-l1", "Algorithmique", 1),
    question("algo-l2", "Algorithmique", 2),
    question("vision-l3", "Vision artificielle", 3),
  ], []);

  assert.deepEqual(quizzes.map((quiz) => [quiz.titre, quiz.niveauCible, quiz.niveauPremiereDecouverte]), [
    ["Algorithmique [L1]", 1, 1],
    ["Algorithmique [L2]", 2, 1],
    ["Vision artificielle [L3]", 3, 3],
  ]);
});

test("creerQuizMatiereParNiveau sépare les années et ne crée l'avancé que si le pool le permet", () => {
  const quizzes = creerQuizMatiereParNiveau("Droit", [
    question("l1-a", "Introduction au droit", 1),
    question("l1-b", "Introduction au droit", 1),
    question("l1-c", "Introduction au droit", 1),
    question("l1-d", "Introduction au droit", 1),
    question("l1-e", "Introduction au droit", 1),
    { ...question("l1-f", "Introduction au droit", 1), type: "libre" },
    { ...question("l1-g", "Introduction au droit", 1), type: "libre" },
    question("l2-a", "Droit des affaires", 2),
  ]);

  assert.deepEqual(quizzes.map((quiz) => [quiz.titre, quiz.niveauCible, quiz.estAvance ?? false]), [
    ["Droit [L1]", 1, false],
    ["Droit — épreuve avancée [L1]", 1, true],
    ["Droit [L2]", 2, false],
  ]);
});

test("creerQuizMatiereParNiveau regroupe les pools globaux avancés dans une seule carte", () => {
  const quizzes = creerQuizMatiereParNiveau("Gestion", [
    question("gestion-l1", "Comptabilité", 1),
    question("gestion-l2", "Fiscalité", 2),
    question("gestion-l3", "Contrôle de gestion", 3),
    question("gestion-l4-a", "Gestion financière", 4),
    question("gestion-l4-b", "Gestion financière", 4),
  ]);

  assert.deepEqual(quizzes.map((quiz) => [quiz.titre, quiz.niveauCible, quiz.questionIds]), [
    ["Gestion [L1]", 1, ["gestion-l1"]],
    ["Gestion [L2]", 2, ["gestion-l2"]],
    ["Gestion [L3]", 3, ["gestion-l3", "gestion-l4-a", "gestion-l4-b"]],
  ]);
  assert.deepEqual(quizzes[2].niveauxInclus, [3, 4]);
});