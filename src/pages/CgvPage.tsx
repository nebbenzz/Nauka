import LegalLayout from "../components/LegalLayout";

export default function CgvPage() {
  return (
    <LegalLayout titre="Conditions Générales de Vente" majeStamp="6 septembre 2026">
      <h2>Objet</h2>
      <p>
        Les présentes CGV s'appliquent à la souscription au forfait Pro de Notio, vendu par [À COMPLÉTER : nom /
        dénomination sociale de l'éditeur], [À COMPLÉTER : SIRET].
      </p>

      <h2>Prix et formules</h2>
      <ul>
        <li>Forfait Pro mensuel : 9,99 € / mois, sans engagement</li>
        <li>Forfait Pro annuel : 79,99 € / an (soit 6,67 € / mois)</li>
      </ul>
      <p>Les prix sont indiqués toutes taxes comprises (TVA non applicable, art. 293 B du CGI [À VÉRIFIER selon ton statut]).</p>

      <h2>Paiement</h2>
      <p>
        Le paiement est réalisé par carte bancaire via Stripe, prestataire de paiement sécurisé. Notio ne stocke
        aucune donnée de carte bancaire. L'abonnement est renouvelé automatiquement à chaque échéance (mensuelle ou
        annuelle selon la formule choisie), jusqu'à résiliation.
      </p>

      <h2>Résiliation</h2>
      <p>
        Tu peux résilier ton abonnement à tout moment depuis l'espace "Abonnements" du site, via le portail de
        gestion Stripe. La résiliation prend effet à la fin de la période déjà payée ; aucun remboursement au
        prorata n'est effectué pour la période en cours, sauf disposition légale contraire.
      </p>

      <h2>Droit de rétractation</h2>
      <p>
        Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas
        aux contenus numériques fournis sur un support immatériel dont l'exécution a commencé avec ton accord
        exprès, après renoncement à ton droit de rétractation. En souscrivant au forfait Pro, tu demandes
        l'exécution immédiate du service et reconnais renoncer à ton droit de rétractation de 14 jours pour cet
        accès immédiat.
      </p>

      <h2>Réclamations</h2>
      <p>
        Pour toute question relative à ta facturation ou ton abonnement : notio.service@gmail.com .
      </p>
    </LegalLayout>
  );
}