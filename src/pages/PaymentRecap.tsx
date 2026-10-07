import { Link, useSearchParams } from "react-router-dom";
import Header from "../includes/Header";

export default function PaymentRecap() {
  const [searchParams] = useSearchParams();
  const succes = searchParams.get("statut") === "succes";

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        {succes ? (
          <>
            <h1 className="font-display text-2xl font-extrabold">Bienvenue dans le forfait Pro</h1>
            <p className="mt-3 text-sm text-inkmuted">
              Ton abonnement est actif. Il peut prendre quelques instants pour apparaître sur ton profil.
            </p>
            <Link to="/app" className="mt-6 inline-block rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-navy transition-colors">
              Aller au tableau de bord
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-extrabold">Récapitulatif</h1>
            <p className="mt-3 text-sm text-inkmuted">Aucun paiement en cours.</p>
            <Link to="/abonnements" className="mt-6 inline-block rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-navy transition-colors">
              Voir les abonnements
            </Link>
          </>
        )}
      </div>
    </div>
  );
}