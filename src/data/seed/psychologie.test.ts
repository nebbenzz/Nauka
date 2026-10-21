import assert from "node:assert/strict";
import test from "node:test";
import { psychologieQuestions, psychologieQuizzes } from "./psychologie";
import { dedupliquerQuizParNotion } from "../../lib/catalogUtils";
import { creerQuizMatiereParNiveau, creerQuizNotionParNiveau } from "../../lib/quizSeedGroups";

test("le seed psychologie contient dix questions par notion et année au programme", () => {
  const notions = new Map<string, typeof psychologieQuestions>();
  for (const question of psychologieQuestions) {
    const questions = notions.get(question.notion) ?? [];
    questions.push(question);
    notions.set(question.notion, questions);
  }

  assert.equal(notions.size, 8);
  assert.equal(new Set(psychologieQuestions.map((question) => question.id)).size, psychologieQuestions.length);
  assert.equal(new Set(psychologieQuestions.map((question) => question.intitule)).size, psychologieQuestions.length);

  for (const [notion, questions] of notions) {
    const anneesAttendues = notion === "Introduction à la psychologie et grandes approches" ? [1] : [1, 2, 3];
    for (const annee of anneesAttendues) {
      const questionsDeLAnnee = questions.filter((question) => question.niveau === annee);
      assert.equal(questionsDeLAnnee.length, 10, `${notion} L${annee}`);
      assert.deepEqual(new Set(questionsDeLAnnee.map((question) => question.type)), new Set(["qcm", "qcu"]));
      for (const question of questionsDeLAnnee) {
        assert.equal(question.reponses?.length, 4);
        const reponsesCorrectes = question.reponses?.filter((reponse) => reponse.correcte).length;
        assert.equal(
          question.type === "qcu" ? reponsesCorrectes === 1 : reponsesCorrectes !== undefined && reponsesCorrectes > 1,
          true,
        );
      }
    }
  }
});

test("le seed crée des questionnaires distincts par notion et année plus un questionnaire transversal", () => {
  const quizzesParNotion = creerQuizNotionParNiveau(psychologieQuestions, [], psychologieQuizzes);
  const quizTransversal = psychologieQuizzes.find((quiz) => quiz.titre === "Psychologie — toutes les notions");
  const idsAttendus = psychologieQuestions.map((question) => question.id);

  assert.equal(quizzesParNotion.length, 22);
  assert.ok(quizTransversal);
  assert.deepEqual(new Set(quizTransversal.questionIds), new Set(idsAttendus));
  assert.ok(quizzesParNotion.some((quiz) => quiz.titre === "Introduction à la psychologie et grandes approches [L1]"));
  assert.ok(quizzesParNotion.some((quiz) => quiz.titre === "Psychobiologie et neuropsychologie [L2]"));
  assert.ok(quizzesParNotion.some((quiz) => quiz.titre === "Psychobiologie et neuropsychologie [L3]"));

  const cartesParNotion = quizzesParNotion.map((quiz) => ({
    id: quiz.titre,
    titre: quiz.titre,
    type: quiz.type,
    est_avance: false,
    matiere_nom: "Psychologie",
    notion_nom: quiz.notionFiltre ?? null,
    notion_niveau: quiz.niveauNotion ?? 1,
    niveau_cible: quiz.niveauCible ?? null,
    niveau_premiere_decouverte: quiz.niveauPremiereDecouverte ?? 1,
    niveau_contenu_max: quiz.niveauCible ?? null,
    notions_couvertes: [],
    est_a_moi: false,
    dernier_score: null,
  }));
  const cartesVisibles = dedupliquerQuizParNotion(cartesParNotion, 1);
  assert.equal(cartesVisibles.length, 22);
  assert.deepEqual(new Set(cartesVisibles.map((quiz) => quiz.niveau_cible)), new Set([1, 2, 3]));

  for (const quiz of quizzesParNotion) {
    const questions = psychologieQuestions.filter((question) =>
      question.notion === quiz.notionFiltre && question.niveau === quiz.niveauCible,
    );
    assert.equal(quiz.questionIds.length, 10);
    assert.deepEqual(new Set(quiz.questionIds), new Set(questions.map((question) => question.id)));
  }

  const questionnairesParAnnee = creerQuizMatiereParNiveau("Psychologie", psychologieQuestions, psychologieQuizzes);
  assert.deepEqual(questionnairesParAnnee.map((quiz) => quiz.niveauCible), [1, 2, 3]);
  for (const quiz of questionnairesParAnnee) {
    assert.equal(quiz.questionIds.length, quiz.niveauCible === 1 ? 80 : 70);
    assert.ok(quiz.questionIds.every((id) => psychologieQuestions.find((question) => question.id === id)?.niveau === quiz.niveauCible));
  }
});
