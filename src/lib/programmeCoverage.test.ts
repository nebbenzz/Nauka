import assert from "node:assert/strict";
import test from "node:test";
import { droitQuestions, quizzesLicenceDroitLaRochelle } from "../data/seed/droit";
import { programmeLicenceDroitLaRochelle } from "../data/programmeLicenceDroitLaRochelle";
import { programmeLicenceInformatiqueLaRochelle } from "../data/programmeLicenceInformatiqueLaRochelle";
import { construireSemestresProgramme, estProgrammeLicenceDroitLaRochelle, estProgrammeLicenceInformatiqueLaRochelle } from "./programmeCoverage";

test("le programme officiel ne s'applique qu'aux L1-L3 Informatique de La Rochelle", () => {
  assert.equal(estProgrammeLicenceInformatiqueLaRochelle("L1 Informatique", "La Rochelle Université"), true);
  assert.equal(estProgrammeLicenceInformatiqueLaRochelle("L3 Informatique", "Université de La Rochelle"), true);
  assert.equal(estProgrammeLicenceInformatiqueLaRochelle("M1 Informatique", "La Rochelle Université"), false);
  assert.equal(estProgrammeLicenceInformatiqueLaRochelle("L1 Informatique", "Université de Bordeaux"), false);
});

test("le niveau du profil limite la couverture aux semestres déjà concernés", () => {
  const catalogue = [];
  assert.deepEqual(construireSemestresProgramme(programmeLicenceInformatiqueLaRochelle, 1, catalogue).map((semestre) => semestre.numero), [1, 2]);
  assert.deepEqual(construireSemestresProgramme(programmeLicenceInformatiqueLaRochelle, 2, catalogue).map((semestre) => semestre.numero), [1, 2, 3, 4]);
  assert.deepEqual(construireSemestresProgramme(programmeLicenceInformatiqueLaRochelle, 3, catalogue).map((semestre) => semestre.numero), [1, 2, 3, 4, 5, 6]);
});

test("une EC distingue une notion maîtrisée d'une EC sans contenu Notio associé", () => {
  const semestres = construireSemestresProgramme(programmeLicenceInformatiqueLaRochelle, 2, [
    { nom: "Bases de données", matiere_nom: "Informatique", etat: "maitrise" },
  ]);
  const uniteBasesDeDonnees = semestres[2].unites.find((unite) => unite.nom.startsWith("Administrer des systèmes"));
  const coursBasesDeDonnees = uniteBasesDeDonnees?.cours.find((cours) => cours.nom === "Bases de données - novice");
  const coursNonAssocie = semestres[0].unites
    .find((unite) => unite.nom === "Unité fondamentale")
    ?.cours.find((cours) => cours.nom === "Mathématiques générales");

  assert.equal(coursBasesDeDonnees?.etat, "maitrise");
  assert.equal(coursNonAssocie?.etat, "non-disponible");
});

test("le programme de droit La Rochelle est réservé aux profils L1-L3 Droit de cet établissement", () => {
  assert.equal(estProgrammeLicenceDroitLaRochelle("L1 Droit", "La Rochelle Université"), true);
  assert.equal(estProgrammeLicenceDroitLaRochelle("L3 Droit", "Université de La Rochelle"), true);
  assert.equal(estProgrammeLicenceDroitLaRochelle("L1 Droit", "Université de Bordeaux"), false);
  assert.equal(estProgrammeLicenceDroitLaRochelle("M1 Droit", "La Rochelle Université"), false);
});

test("les notions des questionnaires de droit sont reliées aux EC du semestre et au bon niveau", () => {
  const semestres = construireSemestresProgramme(programmeLicenceDroitLaRochelle, 3, []);
  const semestresParNotion = new Map<string, number[]>();

  for (const semestre of programmeLicenceDroitLaRochelle.semestres) {
    for (const unite of semestre.unites) {
      for (const ec of unite.cours) {
        for (const notion of ec.notions) {
          const associes = semestresParNotion.get(notion.nom) ?? [];
          associes.push(semestre.numero);
          semestresParNotion.set(notion.nom, associes);
        }
      }
    }
  }

  assert.equal(semestres.length, 6);
  assert.deepEqual(semestres.map((semestre) => semestre.numero), [1, 2, 3, 4, 5, 6]);
  assert.equal(
    programmeLicenceDroitLaRochelle.semestres[4].unites.find((unite) => unite.nom.includes("Approfondir des fondamentaux 1"))?.nombreChoix,
    2,
  );
  assert.equal(
    programmeLicenceDroitLaRochelle.semestres[5].unites.find((unite) => unite.nom.includes("Approfondir des fondamentaux 4"))?.nombreChoix,
    2,
  );
  assert.equal(quizzesLicenceDroitLaRochelle.length, 39);

  const nouvellesQuestions = droitQuestions.filter((question) => question.id.startsWith("lr-droit-supp-"));
  assert.equal(nouvellesQuestions.length, 234);
  for (const quiz of quizzesLicenceDroitLaRochelle) {
    const notion = quiz.notionFiltre;
    assert.ok(notion && semestresParNotion.has(notion), `Notion non reliée au programme : ${notion}`);
    const questions = nouvellesQuestions.filter((question) => question.notion === notion);
    const premierSemestre = Math.min(...semestresParNotion.get(notion)!);
    assert.ok(questions.every((question) => question.niveau === Math.ceil(premierSemestre / 2)), `Niveau incorrect : ${notion}`);
    assert.equal(questions.filter((question) => question.type === "qcu").length, 3);
    assert.equal(questions.filter((question) => question.type === "qcm").length, 3);
  }
});