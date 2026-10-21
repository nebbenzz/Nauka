import assert from "node:assert/strict";
import test from "node:test";
import { FORMATIONS } from "../formations";
import { butTcMatiere, butTcQuestions, butTcQuizzes } from "./but-tc";

const niveauParSemestre: Record<string, number> = {
  "Fondamentaux du marketing (S1)": 1,
  "Études marketing et comportement du consommateur (S2)": 1,
  "Négociation commerciale (S3)": 2,
  "Marketing opérationnel et communication commerciale (S4)": 2,
  "Marketing digital et acquisition (S5)": 3,
  "Stratégie commerciale et développement d'activité (S6)": 3,
};

test("le seed BUT TC couvre les six semestres avec dix questions par notion", () => {
  const questionsParNotion = new Map<string, typeof butTcQuestions>();
  for (const question of butTcQuestions) {
    const questions = questionsParNotion.get(question.notion) ?? [];
    questions.push(question);
    questionsParNotion.set(question.notion, questions);
  }

  assert.equal(questionsParNotion.size, 6);
  assert.equal(butTcQuestions.length, 60);
  assert.equal(new Set(butTcQuestions.map((question) => question.id)).size, 60);
  assert.equal(new Set(butTcQuestions.map((question) => question.intitule)).size, 60);
  assert.ok(FORMATIONS.some((formation) => formation.label === "BUT Techniques de Commercialisation"));

  for (const [notion, questions] of questionsParNotion) {
    assert.equal(questions.length, 10, notion);
    assert.ok(notion.match(/\(S[1-6]\)$/), `semestre manquant pour ${notion}`);
    assert.ok(questions.every((question) => question.niveau === niveauParSemestre[notion]));
    for (const question of questions) {
      assert.ok(question.type === "qcm" || question.type === "qcu");
      assert.equal(question.reponses?.length, 4);
      const bonnesReponses = question.reponses?.filter((reponse) => reponse.correcte).length;
      assert.equal(
        question.type === "qcu" ? bonnesReponses === 1 : bonnesReponses !== undefined && bonnesReponses > 1,
        true,
        question.intitule,
      );
    }
  }
});

test("le seed crée un questionnaire par notion et un questionnaire global par année", () => {
  const quizzesNotion = butTcQuizzes.filter((quiz) => quiz.type === "notion");
  const quizzesGlobaux = butTcQuizzes.filter((quiz) => quiz.type === "global");

  assert.equal(butTcMatiere.nom, "Techniques de commercialisation");
  assert.equal(quizzesNotion.length, 6);
  assert.equal(quizzesGlobaux.length, 3);
  assert.ok(butTcQuizzes.every((quiz) => quiz.formationCible === "BUT Techniques de Commercialisation"));
  assert.ok(quizzesNotion.every((quiz) => quiz.questionIds.length === 10));
  assert.deepEqual(quizzesGlobaux.map((quiz) => [quiz.niveauCible, quiz.questionIds.length]), [
    [1, 20],
    [2, 20],
    [3, 20],
  ]);
});
