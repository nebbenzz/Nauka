import LegalLayout from "../components/LegalLayout";

export default function MentionsLegalesPage() {
  return (
    <LegalLayout titre="Mentions légales" majeStamp="6 septembre 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le site Nauka est édité par DUJARDIN Benjamin (entreprise), [À COMPLÉTER : statut —
        entrepreneur individuel / auto-entrepreneur / société], immatriculé sous le numéro SIRET [À COMPLÉTER],
        dont le siège est situé [À COMPLÉTER : adresse].
      </p>
      <p>Adresse e-mail de contact : nauka.serviceapp@gmail.com</p>
      <p>Directeur de la publication : DUJARDIN Benjamin</p>

      <h2>Hébergement</h2>
      <p>
        Le site (frontend) est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
      </p>
      <p>
        La base de données, l'authentification et les fonctions serveur sont hébergées par Supabase Inc., via des
        serveurs situés dans l'Union européenne.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments du site Nauka (structure, textes, identité visuelle) est protégé par le droit de la
        propriété intellectuelle. Toute reproduction non autorisée est interdite.
      </p>
      <p>
        Les documents que tu importes (au format PDF) restent ta propriété. Les questionnaires générés à partir de
        ces documents te sont destinés dans le cadre de ton usage personnel du service.
      </p>

      <h2>Contact</h2>
      <p>Pour toute question relative au site : <a href="/contact">nous contacter</a> ou envoyer un email à nauka.serviceapp@gmail.com</p>
    </LegalLayout>
  );
}