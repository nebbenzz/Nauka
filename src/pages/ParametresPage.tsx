import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../includes/Header";
import Footer from "../includes/Footer";
import PasswordChecklist, { motDePasseValide } from "../components/PasswordChecklist";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabaseClient";
import { COULEURS_PREDEFINIES, useThemeColor } from "../hooks/useThemeColor";

function Etiquette({ numero }: { numero: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-paper font-mono text-xs font-semibold text-inkmuted">
      {numero}
    </span>
  );
}

export default function ParametresPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const { couleur: couleurPerso } = useThemeColor();
  const [ancienMotDePasse, setAncienMotDePasse] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [confirmationSuppression, setConfirmationSuppression] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargementMotDePasse, setChargementMotDePasse] = useState(false);
  const [chargementSuppression, setChargementSuppression] = useState(false);
  const [chargementCouleur, setChargementCouleur] = useState(false);
  const { couleur, sauvegarderCouleur } = useThemeColor();

  async function handleChangerCouleur(nouvelleCouleur: string) {
    setChargementCouleur(true);
    setMessage(null);
    setErreur(null);
    const error = await sauvegarderCouleur(nouvelleCouleur);
    setChargementCouleur(false);
    if (error) {
      setErreur("La couleur n'a pas pu être enregistrée. Réessaie dans un instant.");
      return;
    }
    setMessage("Ta couleur personnalisée a été enregistrée.");
  }

  async function handleChangerMotDePasse(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);

    if (!session?.user.email) {
      setErreur("Impossible de vérifier ce compte. Reconnecte-toi puis réessaie.");
      return;
    }
    if (!motDePasseValide(nouveauMotDePasse)) {
      setErreur("Le nouveau mot de passe ne respecte pas toutes les exigences.");
      return;
    }
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setErreur("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (ancienMotDePasse === nouveauMotDePasse) {
      setErreur("Le nouveau mot de passe doit être différent de l'ancien.");
      return;
    }

    setChargementMotDePasse(true);
    const { error: verificationError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: ancienMotDePasse,
    });
    if (verificationError) {
      setChargementMotDePasse(false);
      setErreur("L'ancien mot de passe est incorrect.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: nouveauMotDePasse });
    setChargementMotDePasse(false);
    if (error) {
      setErreur("Le mot de passe n'a pas pu être modifié. Réessaie dans un instant.");
      return;
    }

    setAncienMotDePasse("");
    setNouveauMotDePasse("");
    setConfirmationMotDePasse("");
    setMessage("Ton mot de passe a été modifié.");
  }

  async function handleSupprimerCompte() {
    setErreur(null);
    setMessage(null);
    if (!session?.access_token || confirmationSuppression !== "SUPPRIMER") return;

    setChargementSuppression(true);
    const { error } = await supabase.functions.invoke("delete-account", {
      body: { confirmation: confirmationSuppression },
    });
    if (error) {
      setChargementSuppression(false);
      setErreur("Le compte n'a pas pu être supprimé. Réessaie dans un instant.");
      return;
    }

    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8 border-b border-line pb-6">
          <div className="flex items-center gap-2">
            <span className="h-6 w-1 rounded-sm" style={{ backgroundColor: couleurPerso }} aria-hidden="true" />
            <h1 className="font-display text-3xl font-extrabold text-black">Paramètres</h1>
          </div>

          <p className="mt-2 max-w-xl text-sm leading-6 text-inkmuted">Gère tes accès et les données associées à ton compte Notio.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <section className="rounded-lg border border-line bg-white p-5 sm:p-7">
            <div className="flex items-start gap-4 border-b border-line pb-5">
              <Etiquette numero="01" />
              <div>
                <h2 className="font-display text-xl font-bold">Sécurité</h2>
                <p className="mt-1 text-sm text-inkmuted">Modifie ton mot de passe après vérification de l'ancien.</p>
              </div>
            </div>

            <form onSubmit={handleChangerMotDePasse} className="mt-6 space-y-4">
              <div>
                <label htmlFor="ancien-mot-de-passe" className="text-xs font-medium text-inkmuted">Mot de passe actuel</label>
                <input id="ancien-mot-de-passe" type="password" autoComplete="current-password" required value={ancienMotDePasse} onChange={(e) => setAncienMotDePasse(e.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-ink" />
              </div>
              <div>
                <label htmlFor="nouveau-mot-de-passe" className="text-xs font-medium text-inkmuted">Nouveau mot de passe</label>
                <input id="nouveau-mot-de-passe" type="password" autoComplete="new-password" required value={nouveauMotDePasse} onChange={(e) => setNouveauMotDePasse(e.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-ink" />
                <PasswordChecklist motDePasse={nouveauMotDePasse} />
              </div>
              <div>
                <label htmlFor="confirmation-mot-de-passe" className="text-xs font-medium text-inkmuted">Confirmer le nouveau mot de passe</label>
                <input id="confirmation-mot-de-passe" type="password" autoComplete="new-password" required value={confirmationMotDePasse} onChange={(e) => setConfirmationMotDePasse(e.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-ink" />
              </div>
              {erreur && <p role="alert" className="text-sm text-red-600">{erreur}</p>}
              {message && <p role="status" className="text-sm text-sage">{message}</p>}
              <button type="submit" disabled={chargementMotDePasse} style={{ backgroundColor: couleur }} className="rounded-md px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
                {chargementMotDePasse ? "Vérification..." : "Modifier le mot de passe"}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 sm:p-7">
            <div className="flex items-start gap-4 border-b border-line pb-5">
              <Etiquette numero="02" />
              <div>
                <h2 className="font-display text-xl font-bold">Ta couleur Notio</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-inkmuted">
                  Choisis une couleur dominante pour personnaliser les éléments principaux de l'application.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-6">
              <label className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-full border-8 border-paper shadow-sm" style={{ backgroundColor: couleur }}>
                <input
                  type="color"
                  value={couleur}
                  onChange={(e) => handleChangerCouleur(e.target.value)}
                  disabled={chargementCouleur}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Choisir une couleur personnalisée"
                />
                <span className="pointer-events-none rounded-full bg-white/90 px-2 py-1 font-mono text-[10px] uppercase text-ink opacity-0 transition-opacity group-hover:opacity-100">
                  Modifier
                </span>
              </label>

              <div>
                <p className="text-sm font-semibold">Couleurs proposées</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {COULEURS_PREDEFINIES.map((option) => (
                    <button
                      key={option.valeur}
                      type="button"
                      onClick={() => handleChangerCouleur(option.valeur)}
                      disabled={chargementCouleur}
                      aria-label={`Choisir ${option.nom}`}
                      aria-pressed={couleur === option.valeur}
                      className="h-9 w-9 rounded-full border-2 border-white shadow-sm outline-none ring-line transition-transform hover:scale-110 focus:ring-2 disabled:cursor-wait disabled:opacity-60"
                      style={{ backgroundColor: option.valeur }}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-inkmuted">La couleur est enregistrée sur ton compte et appliquée aux éléments principaux.</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-red-200 bg-red-50/60 p-5 lg:col-span-2 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-800">Zone sensible</p>
                <h2 className="mt-1 font-display text-xl font-bold text-red-900">Suppression du compte</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-red-900/70">La suppression est définitive. Ton profil, tes questionnaires et tes résultats seront supprimés et cette action ne pourra pas être annulée.</p>
              </div>
              <div className="w-full shrink-0 sm:max-w-xs">
                <label htmlFor="confirmation-suppression" className="text-xs font-medium text-red-900/80">Écris SUPPRIMER pour confirmer</label>
                <input id="confirmation-suppression" type="text" autoComplete="off" value={confirmationSuppression} onChange={(e) => setConfirmationSuppression(e.target.value)} className="mt-1 w-full rounded-md border border-red-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500" />
                <button type="button" disabled={confirmationSuppression !== "SUPPRIMER" || chargementSuppression} onClick={handleSupprimerCompte} className="mt-3 w-full rounded-md bg-red-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40">
                  {chargementSuppression ? "Suppression..." : "Supprimer définitivement mon compte"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}