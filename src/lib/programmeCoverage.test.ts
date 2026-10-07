import assert from "node:assert/strict";
import test from "node:test";
import { programmeLicenceInformatiqueLaRochelle } from "../data/programmeLicenceInformatiqueLaRochelle";
import { construireSemestresProgramme, estProgrammeLicenceInformatiqueLaRochelle } from "./programmeCoverage";

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