import assert from "node:assert/strict";
import test from "node:test";

import {
  estQuizCompatibleAvecNiveau,
  dedupliquerQuizParNotion,
  formatDureeQuiz,
  formatNiveauQuiz,
  getPreviewNotions,
  getScorePourcentage,
  uniformiserTitresQuestionnaires,
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
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global", notion_nom: "Droit civil", notion_niveau: 2 }, 1), false);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global", notion_nom: "Droit civil", notion_niveau: 1 }, 1), true);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global", notion_nom: "Droit civil", notion_niveau: 3, niveau_premiere_decouverte: 1 }, 2), true);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global", notion_niveau: 1 }, 3), true);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global" }, 3), true);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global", niveau_contenu_max: 2 }, 1), true);
  assert.equal(estQuizCompatibleAvecNiveau({ type: "global", niveau_contenu_max: 1 }, 1), true);
});

test("uniformiserTitresQuestionnaires classe chaque carte selon sa première apparition et son année cible", () => {
  const [actuel, ancien] = uniformiserTitresQuestionnaires([
    { id: "actuel", titre: "Droit constitutionnel [L2]", type: "notion", est_avance: false, matiere_nom: "Droit", notion_nom: "Droit constitutionnel - Ve République", notion_niveau: 2, niveau_cible: 2, niveau_premiere_decouverte: 1, niveau_contenu_max: 2 },
    { id: "ancien", titre: "Droit civil [L1]", type: "notion", est_avance: false, matiere_nom: "Droit", notion_nom: "Droit civil - les personnes", notion_niveau: 1, niveau_cible: 1, niveau_premiere_decouverte: 1, niveau_contenu_max: 1 },
  ], 2);

  assert.equal(actuel.titreAffiche, "Droit constitutionnel (Ve République) - approfondissement");
  assert.equal(ancien.titreAffiche, "Droit civil (les personnes) - fondamentaux");
});

test("uniformiserTitresQuestionnaires distingue deux années du même parcours pour une notion déjà connue", () => {
  const resultats = uniformiserTitresQuestionnaires([
    { id: "l2", titre: "Droit pénal [L2]", type: "notion", est_avance: false, matiere_nom: "Droit", notion_nom: "Droit pénal", notion_niveau: 2, niveau_cible: 2, niveau_premiere_decouverte: 2, niveau_contenu_max: 2 },
    { id: "l3", titre: "Droit pénal [L3]", type: "notion", est_avance: false, matiere_nom: "Droit", notion_nom: "Droit pénal", notion_niveau: 2, niveau_cible: 3, niveau_premiere_decouverte: 2, niveau_contenu_max: 3 },
  ], 3);

  assert.deepEqual(resultats.map((quiz) => quiz.titreAffiche), ["Droit pénal - fondamentaux", "Droit pénal - approfondissement"]);
});

test("uniformiserTitresQuestionnaires classe les anciennes fiches de notion selon leur niveau, pas celui du profil", () => {
  const resultats = uniformiserTitresQuestionnaires([
    { id: "prog-l1", titre: "Programmation impérative - initiation", type: "notion", est_avance: false, matiere_nom: "Informatique", notion_nom: "Programmation impérative - initiation", notion_niveau: 1, niveau_cible: null, niveau_premiere_decouverte: null },
    { id: "prog-l2", titre: "Programmation impérative - intermédiaire", type: "notion", est_avance: false, matiere_nom: "Informatique", notion_nom: "Programmation impérative - intermédiaire", notion_niveau: 2, niveau_cible: null, niveau_premiere_decouverte: null },
  ], 3);

  assert.deepEqual(resultats.map((quiz) => quiz.titreAffiche), [
    "Programmation impérative - fondamentaux",
    "Programmation impérative - approfondissement",
  ]);
});

test("uniformiserTitresQuestionnaires utilise avancé à partir de la troisième année sans suffixe numérique", () => {
  const resultats = uniformiserTitresQuestionnaires([
    { id: "l1", titre: "Algorithmique [L1]", type: "notion", est_avance: false, matiere_nom: "Informatique", notion_nom: "Algorithmique", notion_niveau: 1, niveau_cible: 1, niveau_premiere_decouverte: 1 },
    { id: "l2", titre: "Algorithmique [L2]", type: "notion", est_avance: false, matiere_nom: "Informatique", notion_nom: "Algorithmique", notion_niveau: 1, niveau_cible: 2, niveau_premiere_decouverte: 1 },
    { id: "l3", titre: "Algorithmique [L3]", type: "notion", est_avance: false, matiere_nom: "Informatique", notion_nom: "Algorithmique", notion_niveau: 1, niveau_cible: 3, niveau_premiere_decouverte: 1 },
    { id: "nouvelle-l3", titre: "Vision artificielle [L3]", type: "notion", est_avance: false, matiere_nom: "Informatique", notion_nom: "Vision artificielle", notion_niveau: 3, niveau_cible: 3, niveau_premiere_decouverte: 3 },
  ], 3);

  assert.deepEqual(resultats.map((quiz) => quiz.titreAffiche), [
    "Algorithmique - fondamentaux",
    "Algorithmique - approfondissement",
    "Algorithmique - avancé",
    "Vision artificielle - fondamentaux",
  ]);
});

test("uniformiserTitresQuestionnaires classe aussi les quiz globaux selon leur contenu et les quiz avancés", () => {
  const [ancien, actuel, avance] = uniformiserTitresQuestionnaires([
    { id: "ancien", titre: "Informatique [L1]", type: "global", est_avance: false, matiere_nom: "Informatique", notion_nom: null, notion_niveau: null, niveau_cible: 1, niveau_premiere_decouverte: 1, niveau_contenu_max: 1 },
    { id: "actuel", titre: "Droit [L2]", type: "global", est_avance: false, matiere_nom: "Droit", notion_nom: null, notion_niveau: null, niveau_cible: 2, niveau_premiere_decouverte: 1, niveau_contenu_max: 2 },
    { id: "avance", titre: "Droit — épreuve avancée [L2]", type: "global", est_avance: true, matiere_nom: "Droit", notion_nom: null, notion_niveau: null, niveau_cible: 2, niveau_premiere_decouverte: 1, niveau_contenu_max: 2 },
  ], 2);

  assert.equal(ancien.titreAffiche, "Informatique - fondamentaux");
  assert.equal(actuel.titreAffiche, "Droit - approfondissement");
  assert.equal(avance.titreAffiche, "Droit (format avancé) - approfondissement");
});

test("uniformiserTitresQuestionnaires préserve les titres des quiz personnalisés", () => {
  const [quiz] = uniformiserTitresQuestionnaires([
    { id: "personnalise", titre: "Sciences de la Vie", type: "personnalise", est_avance: true, matiere_nom: "Sciences de la Vie", notion_nom: null, notion_niveau: null },
  ], 3);

  assert.equal(quiz.titreAffiche, "Sciences de la Vie");
});

  test("uniformiserTitresQuestionnaires se base sur la première année de découverte, pas le niveau maximal du pool", () => {
    const [notionDejaVue, nouvelleNotion] = uniformiserTitresQuestionnaires([
      { id: "civil", titre: "Droit civil", type: "global", est_avance: false, matiere_nom: "Droit", notion_nom: "Droit civil", notion_niveau: 1, niveau_cible: 3, niveau_premiere_decouverte: 1, niveau_contenu_max: 3 },
      { id: "environnement", titre: "Droit de l'environnement", type: "notion", est_avance: false, matiere_nom: "Droit", notion_nom: "Droit de l'environnement", notion_niveau: 3, niveau_cible: 3, niveau_premiere_decouverte: 3, niveau_contenu_max: 3 },
    ], 3);

    assert.equal(notionDejaVue.titreAffiche, "Droit civil - avancé");
    assert.equal(nouvelleNotion.titreAffiche, "Droit de l'environnement - fondamentaux");
  });

  test("dedupliquerQuizParNotion garde un seul quiz public du niveau courant et conserve les quiz personnels", () => {
    const resultat = dedupliquerQuizParNotion([
      { id: "droit-l2", titre: "Droit international public — approfondissement", type: "notion", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Droit", notion_nom: "Droit international public", notion_niveau: 2, niveau_contenu_max: 2 },
      { id: "droit-l3", titre: "Droit international public - L3", type: "notion", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Droit", notion_nom: "Droit international public - L3", notion_niveau: 3, niveau_contenu_max: 3 },
      { id: "personnel", titre: "Droit international public personnel", type: "notion", est_avance: false, est_a_moi: true, dernier_score: null, matiere_nom: "Droit", notion_nom: "Droit international public", notion_niveau: 3, niveau_contenu_max: 3 },
      { id: "global", titre: "Droit général", type: "global", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Droit", notion_nom: null, notion_niveau: null, niveau_contenu_max: 3 },
    ], 3);

    assert.deepEqual(resultat.map((quiz) => quiz.id), ["droit-l2", "droit-l3", "personnel", "global"]);
  });

  test("dedupliquerQuizParNotion préfère le pool fusionné et ne garde qu'un quiz global par matière et format", () => {
    const resultat = dedupliquerQuizParNotion([
      { id: "personnes", titre: "Droit civil (les personnes) - fondamentaux", type: "notion", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Droit", notion_nom: "Droit civil - les personnes", notion_niveau: 1, niveau_cible: 1, niveau_premiere_decouverte: 1, niveau_contenu_max: 1, notions_couvertes: [] },
      { id: "famille", titre: "Droit civil (la famille) - fondamentaux", type: "notion", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Droit", notion_nom: "Droit civil - la famille", notion_niveau: 1, niveau_cible: 1, niveau_premiere_decouverte: 1, niveau_contenu_max: 1, notions_couvertes: [] },
      { id: "droit-civil", titre: "Droit civil [L1]", type: "global", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Droit", notion_nom: "Droit civil", notion_niveau: 1, niveau_cible: 1, niveau_premiere_decouverte: 1, niveau_contenu_max: 2, notions_couvertes: ["Droit civil - les personnes", "Droit civil - la famille"] },
      { id: "gestion-a", titre: "Gestion — panorama", type: "global", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Gestion", notion_nom: null, notion_niveau: null, niveau_cible: null, niveau_premiere_decouverte: null, niveau_contenu_max: 2, notions_couvertes: [] },
      { id: "gestion-b", titre: "Gestion — fondamentaux", type: "global", est_avance: false, est_a_moi: false, dernier_score: 70, matiere_nom: "Gestion", notion_nom: null, notion_niveau: null, niveau_cible: 1, niveau_premiere_decouverte: 1, niveau_contenu_max: 2, notions_couvertes: [] },
      { id: "gestion-avance", titre: "Gestion — épreuve avancée", type: "global", est_avance: true, est_a_moi: false, dernier_score: null, matiere_nom: "Gestion", notion_nom: null, notion_niveau: null, niveau_cible: 1, niveau_premiere_decouverte: 1, niveau_contenu_max: 2, notions_couvertes: [] },
      { id: "personnel", titre: "Droit civil — mon cours", type: "notion", est_avance: false, est_a_moi: true, dernier_score: null, matiere_nom: "Droit", notion_nom: "Droit civil - la famille", notion_niveau: 2, niveau_contenu_max: 2 },
    ], 2);

    assert.deepEqual(resultat.map((quiz) => quiz.id), ["droit-civil", "gestion-b", "gestion-avance", "personnel"]);
  });

  test("dedupliquerQuizParNotion garde un seul quiz global par matière et descripteur annuel", () => {
    const resultat = dedupliquerQuizParNotion([
      { id: "gestion-l2", titre: "Gestion [L2]", type: "global", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Gestion", notion_nom: null, notion_niveau: null, niveau_cible: 2, niveau_premiere_decouverte: 1 },
      { id: "gestion-l3", titre: "Gestion [L3]", type: "global", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Gestion", notion_nom: null, notion_niveau: null, niveau_cible: 3, niveau_premiere_decouverte: 1 },
      { id: "gestion-l4", titre: "Gestion [L4]", type: "global", est_avance: false, est_a_moi: false, dernier_score: null, matiere_nom: "Gestion", notion_nom: null, notion_niveau: null, niveau_cible: 4, niveau_premiere_decouverte: 1 },
      { id: "gestion-format-avance", titre: "Gestion — épreuve avancée [L4]", type: "global", est_avance: true, est_a_moi: false, dernier_score: null, matiere_nom: "Gestion", notion_nom: null, notion_niveau: null, niveau_cible: 4, niveau_premiere_decouverte: 1 },
    ], 4);

    assert.deepEqual(resultat.map((quiz) => quiz.id), ["gestion-l2", "gestion-l3", "gestion-format-avance"]);
  });
