import { useEffect, useState } from "react";
import Header from "../includes/Header";
import Footer from "../includes/Footer";
import FormationCombobox from "../components/FormationCombobox";
import TagInput from "../components/TagInput";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabaseClient";
import type { Formation } from "../data/formations";
import { obtenirCodeParrainage } from "../lib/referral";
import { useThemeColor } from "../hooks/useThemeColor";


interface Profil {
  email: string;
  nom: string | null;
  prenom: string | null;
  formation: string | null;
  preferences: string[] | null;
  plan: "decouverte" | "pro";
  niveau_formation: number | null;
  etablissement: string | null;
  pro_expires_at: string | null;
}

export default function ProfilePage() {
  const { session } = useSession();
  const { couleur: couleurPerso } = useThemeColor();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [formation, setFormation] = useState("");
  const [niveauFormation, setNiveauFormation] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [etablissement, setEtablissement] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [codeParrainage, setCodeParrainage] = useState<string | null>(null);
  const [messageParrainage, setMessageParrainage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("email, nom, prenom, formation, preferences, plan, niveau_formation, etablissement, pro_expires_at")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfil(data as Profil);
          setFormation(data.formation || "");
          setNiveauFormation(data.niveau_formation);
          setPreferences(data.preferences || []);
          setEtablissement(data.etablissement || "");
          obtenirCodeParrainage().then((code) => {
            if (code) {
              setCodeParrainage(code);
            } else {
              setMessageParrainage("Le lien est indisponible. Applique la migration Supabase du parrainage puis recharge la page.");
            }
          });
        }
      });
  }, [session]);

  function handleFormationSelect(f: Formation) {
    setFormation(f.label);
    setNiveauFormation(f.niveauOrdinal);
    setPreferences((prev) => (prev.includes(f.domaine) ? prev : [...prev, f.domaine]));
  }

  async function copierCodeParrainage() {
    if (!codeParrainage) return;
    await navigator.clipboard.writeText(codeParrainage);
    setMessageParrainage("Code copié. Ton ami recevra 7 jours de Pro après son premier questionnaire terminé.");
  }

  async function handleEnregistrer() {
    if (!session?.user) return;
    setEnregistrement(true);
    setMessage(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        formation: formation.trim() || null,
        niveau_formation: niveauFormation,
        preferences: preferences.length ? preferences : null,
        etablissement: etablissement.trim() || null,
      })
      .eq("id", session.user.id);
    setEnregistrement(false);
    setMessage(error ? "Une erreur est survenue, réessaie." : "Profil mis à jour.");
  }

  if (!profil) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <p className="mx-auto max-w-2xl px-6 py-12 text-sm text-inkmuted">Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="mb-7 border-b border-line pb-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-inkmuted">
            <span className="h-6 w-1 rounded-sm" style={{ backgroundColor: couleurPerso }} aria-hidden="true" />
            Profil
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">Mon profil</h1>
          <p className="mt-2 text-sm text-inkmuted">Tes informations de compte, ta formation et tes matières préférées.</p>
        </header>

        <section className="flex flex-col gap-4 rounded-lg border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkmuted">Profil utilisateur</p>
            <p className="mt-2 text-base font-bold">{profil.prenom} {profil.nom}</p>
            <p className="mt-1 break-all text-sm text-inkmuted">{profil.email}</p>
          </div>
          <span className={profil.plan === "pro" ? "w-fit rounded-md bg-highlight/30 px-3 py-1.5 text-xs font-semibold text-ink" : "w-fit rounded-md bg-paper px-3 py-1.5 text-xs font-semibold text-inkmuted"}>
            {profil.plan === "pro" ? (profil.pro_expires_at ? "Pro offert" : "Forfait Pro") : "Forfait Découverte"}
          </span>
        </section>

        {profil.plan === "pro" && profil.pro_expires_at && (
          <section className="mt-4 rounded-lg border border-highlight/60 bg-highlight/20 px-5 py-4 text-sm text-ink">
            <p className="font-semibold">Ton accès Pro offert est actif.</p>
            <p className="mt-1 text-inkmuted">
              Grâce au parrainage, il est valable jusqu’au {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(profil.pro_expires_at))}.
            </p>
          </section>
        )}

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)]">
          <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkmuted">Parcours académique</p>
            <h2 className="mt-1 font-display text-xl font-bold">Ta formation</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-inkmuted">Formation</label>
                <FormationCombobox value={formation} onSelect={handleFormationSelect} />
                <p className="mt-1 text-xs text-inkmuted">Détermine les questionnaires accessibles à ton niveau.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-inkmuted">Établissement (facultatif)</label>
                <input
                  type="text"
                  placeholder="Ex. Université de La Rochelle"
                  value={etablissement}
                  onChange={(e) => setEtablissement(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-inkmuted">Matières préférées</label>
                <TagInput tags={preferences} onChange={setPreferences} />
              </div>
            </div>
            {message && <p className="mt-4 text-sm text-inkmuted">{message}</p>}

            <button type="button" onClick={handleEnregistrer} disabled={enregistrement} className="mt-6 rounded-md bg-ink px-6 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy disabled:opacity-60">
              {enregistrement ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </section>

          <section className="rounded-lg border border-navy/20 bg-navy p-5 text-paper sm:p-6 lg:col-start-2 lg:row-start-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-highlight">Code de parrainage</p>
            <h2 className="mt-2 font-display text-xl font-extrabold">Invite quelqu'un à réviser avec toi.</h2>
            <p className="mt-2 text-sm leading-6 text-paper/70">Partage ce code à ton ami(e). Après son premier questionnaire terminé, vous recevez chacun 7 jours de Pro.</p>
            <div className="mt-5 space-y-2">
              <label htmlFor="code-parrainage" className="text-xs font-medium text-paper/70">Ton code</label>
              <input id="code-parrainage" readOnly value={codeParrainage || "Génération du code..."} className="w-full min-w-0 rounded-md border border-paper/20 bg-paper/10 px-3 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider text-paper outline-none" />
              <button type="button" onClick={copierCodeParrainage} disabled={!codeParrainage} className="w-full rounded-md bg-highlight px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50">Copier le code</button>
            </div>
            {messageParrainage && <p role="status" className="mt-3 text-xs text-paper/70">{messageParrainage}</p>}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}