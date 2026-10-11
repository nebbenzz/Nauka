import LegalLayout from "../components/LegalLayout";

export default function CguPage() {
  return (
    <LegalLayout titre="Conditions Générales d'Utilisation" majeStamp="6 septembre 2026">
      <h2>Objet</h2>
      <p>
        Les présentes CGU régissent l'accès et l'utilisation du site Nauka, plateforme de révision par
        questionnaires assistée par intelligence artificielle.
      </p>

      <h2>Accès au service</h2>
      <p>
        L'accès à certaines fonctionnalités nécessite la création d'un compte. Tu t'engages à fournir des
        informations exactes et à conserver la confidentialité de ton mot de passe. Le service est destiné aux
        personnes âgées d'au moins 15 ans ; en dessous de cet âge, la création d'un compte nécessite l'accord d'un
        représentant légal.
      </p>

      <h2>Description du service</h2>
      <p>Nauka propose deux forfaits :</p>
      <ul>
        <li><strong>Découverte</strong> (gratuit) : accès aux questionnaires existants, limité à 5 questionnaires complétés par jour</li>
        <li><strong>Pro</strong> (payant) : questionnaires illimités, génération de questionnaires personnalisés à partir de documents PDF, correction par IA des zones de code, de schéma et de réponses rédigées</li>
      </ul>

      <h2>Contenu généré par IA — limites de responsabilité</h2>
      <p>
        Les questionnaires, corrections et explications générés par l'intelligence artificielle sont produits
        automatiquement à partir du contenu que tu fournis ou des données disponibles sur la plateforme. Malgré le
        soin apporté, ce contenu peut contenir des imprécisions ou des erreurs. Nauka ne garantit pas l'exactitude
        académique du contenu généré et t'invite à le confronter à tes cours et sources de référence, en
        particulier avant un examen.
      </p>

      <h2>Contenu que tu importes</h2>
      <p>
        Tu es seul responsable des documents que tu importes sur la plateforme, et tu garantis disposer des droits
        nécessaires sur ce contenu (cours personnels, notes de cours autorisées à la diffusion privée). Il est
        interdit d'importer des contenus protégés par des droits que tu ne détiens pas, ou des contenus illicites.
      </p>

      <h2>Usage autorisé</h2>
      <p>Tu t'engages à ne pas :</p>
      <ul>
        <li>Tenter de contourner les limites de forfait ou les mesures de sécurité du site</li>
        <li>Utiliser le service à des fins commerciales sans accord préalable</li>
        <li>Perturber le bon fonctionnement du site ou de son infrastructure</li>
      </ul>

      <h2>Résiliation</h2>
      <p>
        Tu peux supprimer ton compte à tout moment. Nauka se réserve le droit de suspendre un compte en cas de
        non-respect des présentes CGU.
      </p>

      <h2>Évolution du service</h2>
      <p>
        Nauka est en développement actif : les fonctionnalités, matières et notions disponibles sont amenées à
        évoluer. Les présentes CGU peuvent être modifiées ; en cas de changement substantiel, tu en seras informé.
      </p>
    </LegalLayout>
  );
}