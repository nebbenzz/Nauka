import LegalLayout from "../components/LegalLayout";

export default function ConfidentialitePage() {
  return (
    <LegalLayout titre="Politique de confidentialité" majeStamp="6 septembre 2026">
      <p>
        Cette page explique quelles données sont collectées sur Nauka, pourquoi, et comment tu peux exercer tes
        droits, conformément au Règlement Général sur la Protection des Données (RGPD).
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>Données de compte : email, nom, prénom, mot de passe (jamais stocké en clair)</li>
        <li>Données de profil (facultatives) : formation, établissement, niveau d'études, matières préférées, objectif de révision, date d'examen</li>
        <li>Contenu des questionnaires : réponses données, résultats, scores, code ou schémas soumis dans les questionnaires avancés</li>
        <li>Documents PDF que tu importes (forfait Pro), utilisés uniquement pour générer ton questionnaire</li>
        <li>Données de paiement : gérées intégralement par Stripe — Nauka ne stocke ni ne voit jamais ton numéro de carte bancaire</li>
      </ul>

      <h2>Finalités du traitement</h2>
      <ul>
        <li>Fournir le service : création de compte, suivi de progression, génération et correction de questionnaires</li>
        <li>Gestion des abonnements et de la facturation</li>
        <li>Amélioration du service</li>
      </ul>

      <h2>Destinataires des données</h2>
      <p>Certaines données sont transmises à des sous-traitants, uniquement dans la mesure nécessaire au fonctionnement du service :</p>
      <ul>
        <li><strong>Supabase</strong> (hébergement de la base de données, authentification, stockage des fichiers)</li>
        <li><strong>Anthropic</strong> (traitement des documents PDF et génération/correction des questionnaires par l'IA Claude)</li>
        <li><strong>Stripe</strong> (traitement des paiements et gestion des abonnements)</li>
        <li><strong>Vercel</strong> (hébergement du site)</li>
      </ul>
      <p>
        Certains de ces prestataires sont situés hors de l'Union européenne (États-Unis) ; les transferts de
        données s'appuient sur les garanties prévues par ces prestataires (clauses contractuelles types ou
        équivalent).
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Les données de compte sont conservées tant que le compte est actif. Les documents PDF importés sont
        conservés pour permettre la régénération ou la consultation du questionnaire associé, et peuvent être
        supprimés sur demande.
      </p>

      <h2>Tes droits</h2>
      <p>
        Conformément au RGPD, tu disposes d'un droit d'accès, de rectification, d'effacement, de limitation, de
        portabilité et d'opposition sur tes données. Tu peux exercer ces droits en écrivant à nauka.serviceapp@gmail.com
        ou directement depuis ton profil pour les informations qui y sont modifiables.
      </p>
      <p>
        Tu peux également introduire une réclamation auprès de la CNIL (www.cnil.fr) si tu estimes que tes droits
        ne sont pas respectés.
      </p>

      <h2>Cookies</h2>
      <p>
        Nauka utilise uniquement des cookies strictement nécessaires au fonctionnement du service (maintien de ta
        session de connexion). Aucun cookie publicitaire ou de suivi tiers n'est utilisé.
      </p>
    </LegalLayout>
  );
}