import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import Header from "../includes/Header";
import Footer from "../includes/Footer";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabaseClient";
import { estInscritListePro, memoriserEmailPro, obtenirEmailProMemorise } from "../lib/proWaitlist";

const DATE_LANCEMENT_PRO = "1er janvier 2027";

const AVANTAGES_COMMUNS = [
  "Questionnaires illimités, sans limite quotidienne",
  "Questionnaires avancés chronométrés avec zones de code, de schéma et de texte",
  "Correction et explications détaillées générées par IA",
  "Accès à l'ensemble des matières et notions dès leur ajout",
];

export default function AbonnementsPage() {
  const { session, chargement: chargementSession } = useSession();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<"decouverte" | "pro" | null>(null);
  const [abonnementIntervalle, setAbonnementIntervalle] = useState<string | null>(null);
  const [generationsUtilisees, setGenerationsUtilisees] = useState(0);

  const [periode, setPeriode] = useState<"mensuel" | "annuel">("annuel");
  const [chargement, setChargement] = useState(false);
  const [chargementPortail, setChargementPortail] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [emailAlerte, setEmailAlerte] = useState(() => obtenirEmailProMemorise());
  const [emailAlerteDejaInscrit, setEmailAlerteDejaInscrit] = useState(false);
  const [messageAlerte, setMessageAlerte] = useState<string | null>(null);

  useEffect(() => {
    async function chargerStatutListePro() {
      const emailInitial = session?.user.email ?? obtenirEmailProMemorise();
      if (!emailInitial) return;
      if (session?.user.email) setEmailAlerte(emailInitial);
      if (await estInscritListePro(emailInitial)) setEmailAlerteDejaInscrit(true);
    }

    void chargerStatutListePro();
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("plan, pro_expires_at, abonnement_intervalle, generations_ia_ce_mois, generations_ia_reset_mois")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const proActif = data.plan === "pro" && (!data.pro_expires_at || new Date(data.pro_expires_at) > new Date());
        setPlan(proActif ? "pro" : "decouverte");
        setAbonnementIntervalle(data.abonnement_intervalle);
        if (data.abonnement_intervalle === "mensuel") {
          const aujourdHui = new Date();
          const reset = data.generations_ia_reset_mois ? new Date(data.generations_ia_reset_mois) : null;
          const memeMois = !!reset && reset.getFullYear() === aujourdHui.getFullYear() && reset.getMonth() === aujourdHui.getMonth();
          setGenerationsUtilisees(memeMois ? data.generations_ia_ce_mois : 0);
        }
      });
  }, [session]);

  async function handleAbonner() {
    if (!session?.user) {
      navigate("/connexion");
      return;
    }
    setErreur(null);
    setChargement(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setChargement(false);
      setErreur("Ta session a expiré, reconnecte-toi et réessaie.");
      return;
    }

    const priceId = periode === "mensuel" ? import.meta.env.VITE_STRIPE_PRICE_MENSUEL : import.meta.env.VITE_STRIPE_PRICE_ANNUEL;

    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { price_id: priceId, intervalle: periode },
      headers: { Authorization: `Bearer ${token}` },
    });

    setChargement(false);

    if (error || data?.error || !data?.url) {
      setErreur("Impossible de démarrer le paiement. Réessaie.");
      return;
    }

    window.location.href = data.url;
  }

  async function handleGererAbonnement() {
    setChargementPortail(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setChargementPortail(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke("create-portal-session", {
      headers: { Authorization: `Bearer ${token}` },
    });

    setChargementPortail(false);

    if (error || data?.error || !data?.url) {
      setErreur("Impossible d'ouvrir la gestion de l'abonnement. Réessaie.");
      return;
    }

    window.location.href = data.url;
  }

  async function handleAlertePro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (emailAlerteDejaInscrit) return;
    const email = emailAlerte.trim().toLowerCase();
    const { error } = await supabase.from("pro_waitlist").insert({ email });
    if (error && error.code !== "23505") {
      setMessageAlerte("Impossible d'enregistrer ton adresse pour le moment.");
      return;
    }
    memoriserEmailPro(email);
    setEmailAlerteDejaInscrit(true);
    setMessageAlerte("Ta demande est déjà enregistrée. Tu seras prévenu du lancement du Pro.");
  }

  if (chargementSession || (session?.user && plan === null)) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <p className="mx-auto max-w-2xl px-6 py-12 text-sm text-inkmuted">Chargement...</p>
      </div>
    );
  }

  // VUE POUR LES COMPTES DÉJÀ PRO
  if (plan === "pro") {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <div className="mx-auto max-w-md px-6 py-16">
          <p className="text-center font-mono text-xs uppercase tracking-widest text-navy">Abonnement</p>
          <div className="relative mt-6">
            <div className="absolute inset-0 translate-x-2 translate-y-2 border border-navy/25 bg-highlight/20" />
            <div className="relative border border-navy bg-white p-8">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-extrabold">Forfait Pro</h1>
              </div>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-inkmuted">
                {abonnementIntervalle === "annuel"
                  ? "Facturation annuelle"
                  : abonnementIntervalle === "mensuel"
                  ? "Facturation mensuelle"
                  : "Facturation en cours"}
              </p>

              {abonnementIntervalle === "mensuel" ? (
                <p className="mt-6 text-sm text-inkmuted">
                  {generationsUtilisees} / 15 générations de questionnaires utilisées ce mois-ci.
                </p>
              ) : (
                <p className="mt-6 text-sm text-inkmuted">Générations de questionnaires illimitées.</p>
              )}

              {erreur && <p className="mt-4 text-sm text-red-600">{erreur}</p>}

              <button
                type="button"
                onClick={handleGererAbonnement}
                disabled={chargementPortail}
                className="mt-8 w-full rounded-md bg-navy px-6 py-3 text-sm font-bold text-paper transition-colors hover:bg-ink disabled:opacity-60"
              >
                {chargementPortail ? "Redirection..." : "Gérer mon abonnement"}
              </button>
              <p className="mt-3 text-center text-xs text-inkmuted">
                Modifier le moyen de paiement ou résilier, directement via Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!chargementSession) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-16">
          <section className="border border-navy bg-navy p-8 text-paper shadow-lg sm:p-10">
            <p className="font-mono text-xs uppercase tracking-widest text-highlight">Pro en préparation</p>
            <h1 className="mt-4 font-display text-3xl font-extrabold">L'abonnement arrive plus tard.</h1>
            <p className="mt-4 text-sm leading-6 text-paper/70">Notio reste accessible gratuitement pendant sa phase de lancement. Le forfait Pro est prévu pour le {DATE_LANCEMENT_PRO}; son prix et ses fonctionnalités seront confirmés avant son ouverture.</p>
            <p className="mt-4 text-sm leading-6 text-paper/70">En attendant, le parrainage permet de débloquer Pro pendant 7 jours après le premier questionnaire terminé de ami(e) parrainé(e).</p>
            <form onSubmit={handleAlertePro} className="mt-6 flex flex-col gap-2 sm:flex-row">
              <input type="email" required disabled={emailAlerteDejaInscrit} value={emailAlerteDejaInscrit ? "Demande déjà enregistrée" : emailAlerte} onChange={(e) => setEmailAlerte(e.target.value)} placeholder="ton@email.fr" className="min-w-0 flex-1 rounded-md border border-paper/20 bg-paper/10 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper/45 focus:border-highlight disabled:cursor-default disabled:text-paper/45" />
              <button type="submit" disabled={emailAlerteDejaInscrit} className="rounded-md bg-highlight px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-60">{emailAlerteDejaInscrit ? "Demande enregistrée" : "Être prévenu"}</button>
            </form>
            {messageAlerte && <p className="mt-2 text-xs text-paper/70">{messageAlerte}</p>}
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // VUE POUR LES COMPTES DÉCOUVERTE / NON CONNECTÉS
  const avantageSupplementaire =
    periode === "mensuel"
      ? "15 générations de questionnaires personnalisés par mois"
      : "Générations de questionnaires personnalisés illimitées";

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <section className="relative overflow-hidden bg-navy px-6 py-12 text-center text-paper sm:px-10 sm:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#F7F6F3_1px,transparent_1px),linear-gradient(to_bottom,#F7F6F3_1px,transparent_1px)] [background-size:40px_40px]" />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-widest text-highlight">Abonnements</p>
            <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">Va plus loin dans tes révisions</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-paper/70">
          Le forfait Découverte reste gratuit, sans limite de temps. Le forfait Pro débloque la génération de questionnaires à partir de tes propres cours.
            </p>
          </div>
        </section>

        <div className="relative mx-auto -mt-6 w-full max-w-sm">
          <div className="absolute inset-0 translate-x-2 translate-y-2 border border-navy/25 bg-highlight/20" />

          <div className="relative border border-navy bg-white p-8 text-left shadow-lg">
            <div className="mx-auto flex w-fit rounded-md border border-line p-1 text-sm">
              <button
                type="button"
                onClick={() => setPeriode("mensuel")}
                className={periode === "mensuel" ? "rounded-md bg-navy px-5 py-2 text-paper transition-colors" : "rounded-md px-5 py-2 text-inkmuted transition-colors"}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setPeriode("annuel")}
                className={periode === "annuel" ? "rounded-md bg-navy px-5 py-2 text-paper transition-colors" : "rounded-md px-5 py-2 text-inkmuted transition-colors"}
              >
                Annuel <span className="ml-1 text-xs text-sage">-33%</span>
              </button>
            </div>

            <div className="mt-6 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-extrabold">Pro</h2>
              <span className="rounded-full bg-highlight/30 px-3 py-1 text-xs font-semibold text-ink">
                {periode === "annuel" ? "Recommandé" : ""}
              </span>
            </div>

            <p className="mt-3">
              <span className="font-display text-4xl font-extrabold">{periode === "mensuel" ? "9,99 €" : "6,67 €"}</span>
              <span className="text-sm text-inkmuted"> / mois</span>
            </p>
            {periode === "annuel" ? (
              <p className="mt-1 text-xs text-sage">Facturé 79,99 € une fois par an — économie de 33%</p>
            ) : (
              <p className="mt-1 text-xs text-inkmuted">Facturé mensuellement, résiliable à tout moment</p>
            )}

            <ul className="mt-6 space-y-2.5">
              {AVANTAGES_COMMUNS.map((avantage) => (
                <li key={avantage} className="flex items-start gap-2 text-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-sage">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {avantage}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm font-medium">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-sage">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {avantageSupplementaire}
              </li>
            </ul>

            {erreur && <p className="mt-4 text-sm text-red-600">{erreur}</p>}

            <button
              type="button"
              onClick={handleAbonner}
              disabled={chargement}
              className="mt-6 w-full rounded-md bg-navy px-6 py-3 text-sm font-bold text-paper transition-colors hover:bg-ink disabled:opacity-60"
            >
              {chargement ? "Redirection..." : "S'abonner"}
            </button>
            <p className="mt-3 text-center text-xs text-inkmuted">Paiement sécurisé par Stripe.</p>
            <p className="mt-2 text-center text-xs text-inkmuted">
              En t'abonnant, tu acceptes les <Link to="/cgv" className="underline hover:text-ink">conditions générales de vente</Link>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}