import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import FormationCombobox from "../components/FormationCombobox";
import TagInput from "../components/TagInput";
import PasswordChecklist, { motDePasseValide } from "../components/PasswordChecklist";
import type { Formation } from "../data/formations";
import { enregistrerCodeParrainage, enregistrerParrainageEnAttente, obtenirCodeParrainageMemorise, signalerErreurParrainage } from "../lib/referral";

function obtenirCodeParrainageInitial() {
  return new URLSearchParams(window.location.search).get("parrain") ?? obtenirCodeParrainageMemorise();
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"connexion" | "inscription">(() => {
    const params = new URLSearchParams(window.location.search);
    const aUnParrain = Boolean(obtenirCodeParrainageInitial());
    return params.get("mode") === "inscription" || aUnParrain ? "inscription" : "connexion";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [formation, setFormation] = useState("");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [niveauFormation, setNiveauFormation] = useState<number | null>(null);
  const [codeParrainage, setCodeParrainage] = useState(() => obtenirCodeParrainageInitial()?.toUpperCase() ?? "");
  const [afficherParrainage, setAfficherParrainage] = useState(() => Boolean(obtenirCodeParrainageInitial()));

  useEffect(() => {
    const code = obtenirCodeParrainageInitial();
    if (code) enregistrerCodeParrainage(code);
  }, []);

  function handleFormationSelect(f: Formation) {
    setFormation(f.label);
    setNiveauFormation(f.niveauOrdinal);
    setPreferences((prev) => (prev.includes(f.domaine) ? prev : [...prev, f.domaine]));
  }

  async function handleConnexion(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setChargement(false);
    if (error) {
      setErreur(error.status === 429 || error.message.toLowerCase().includes("rate limit")
        ? "Trop de demandes d'emails de confirmation. Attends quelques minutes ou utilise une autre adresse de test."
        : error.message);
      return;
    }
    const erreurParrainage = await enregistrerParrainageEnAttente();
    if (erreurParrainage) signalerErreurParrainage(erreurParrainage);
    navigate("/app");
  }

  async function handleInscription(e: FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (!motDePasseValide(password)) {
      setErreur("Le mot de passe ne respecte pas toutes les exigences ci-dessous.");
      return;
    }

    setChargement(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom,
          prenom,
          formation: formation.trim() || null,
          preferences: preferences.length ? preferences : null,
          niveau_formation: niveauFormation,
        },
      },
    });
    setChargement(false);
    if (error) {
      setErreur(error.status === 429 || error.message.toLowerCase().includes("rate limit")
        ? "Trop de demandes d'emails de confirmation. Attends quelques minutes ou utilise une autre adresse de test."
        : error.message);
      return;
    }
    if (codeParrainage) enregistrerCodeParrainage(codeParrainage);
    if (data.session) {
      const erreurParrainage = await enregistrerParrainageEnAttente();
      if (erreurParrainage) signalerErreurParrainage(erreurParrainage);
      navigate("/app");
    } else {
      setMessage(codeParrainage
        ? "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse. Ton code de parrainage est conservé et sera associé après ta première connexion."
        : "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-6 py-10 text-ink sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#F7F6F3_1px,transparent_1px),linear-gradient(to_bottom,#F7F6F3_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden border border-paper/20 bg-paper shadow-2xl md:grid-cols-[0.85fr_1.15fr]">
        <aside className="hidden flex-col justify-between bg-navy p-8 text-paper md:flex lg:p-12">
          <div>
            <p className="font-display text-2xl font-extrabold tracking-tight">NAUKA<span className="text-highlight">.</span></p>
            <p className="mt-16 max-w-xs font-display text-4xl font-extrabold leading-none lg:text-5xl">Révise moins au hasard<span className="text-highlight">.</span></p>
            <p className="mt-6 max-w-xs text-sm leading-6 text-paper/65">Transforme tes cours en entraînements ciblés et garde une progression visible, notion par notion.</p>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-paper/45">Ton espace de révision</p>
        </aside>

        <main className={mode === "inscription" ? "relative w-full p-6 sm:p-10" : "relative w-full p-6 sm:p-10 md:p-12"}>
          <div className="mb-8 md:hidden">
            <p className="font-display text-xl font-extrabold tracking-tight text-navy">NAUKA<span className="text-highlight">.</span></p>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink">
            {mode === "connexion" ? "Se connecter" : "Créer un compte"}
          </h1>
          <p className="mt-1 text-sm text-inkmuted">
            {mode === "connexion" ? "Accède à tes questionnaires et à ta progression." : "Quelques informations pour personnaliser tes révisions."}
          </p>

          <div className="mt-6 flex border-b border-line text-sm">
            <button type="button" onClick={() => setMode("connexion")} className={mode === "connexion" ? "flex-1 border-b-2 border-navy py-3 font-bold text-navy transition-colors" : "flex-1 border-b-2 border-transparent py-3 text-inkmuted transition-colors hover:text-ink"}>
              Connexion
            </button>
            <button type="button" onClick={() => setMode("inscription")} className={mode === "inscription" ? "flex-1 border-b-2 border-navy py-3 font-bold text-navy transition-colors" : "flex-1 border-b-2 border-transparent py-3 text-inkmuted transition-colors hover:text-ink"}>
              Inscription
            </button>
          </div>

          {mode === "inscription" && (
            <button
              type="button"
              onClick={() => setAfficherParrainage((actif) => !actif)}
              className="mt-5 text-left text-sm font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy"
            >
              {afficherParrainage ? "Masquer le code de parrainage" : "J'ai un code de parrainage"}
            </button>
          )}

          <form onSubmit={mode === "connexion" ? handleConnexion : handleInscription} className="mt-6 space-y-6">
            {/* SECTION IDENTITÉ */}
            {mode === "inscription" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-inkmuted">Identité</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-inkmuted">Prénom (facultatif)</label>
                    <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-navy" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-inkmuted">Nom (facultatif)</label>
                    <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-navy" />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION CONNEXION */}
            <div>
              {mode === "inscription" && (
                <p className="text-xs font-semibold uppercase tracking-widest text-inkmuted">Connexion</p>
              )}
              <div className="mt-3 space-y-4">
                <div>
                  <label className="text-xs font-medium text-inkmuted">Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-navy" />
                </div>
                <div>
                  <label className="text-xs font-medium text-inkmuted">Mot de passe</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-navy" />
                  {mode === "inscription" && <PasswordChecklist motDePasse={password} />}
                </div>
              </div>
            </div>

            {mode === "inscription" && afficherParrainage && (
              <div>
                <label className="text-xs font-medium text-inkmuted">Code de parrainage</label>
                <input
                  type="text"
                  value={codeParrainage}
                  onChange={(e) => setCodeParrainage(e.target.value.toUpperCase())}
                  placeholder="Ex. 4A7F2C91"
                  autoComplete="off"
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm uppercase outline-none transition-colors focus:border-navy"
                />
                <p className="mt-1 text-xs text-inkmuted">Après ton premier questionnaire terminé, toi et ton parrain recevrez 7 jours de Pro.</p>
              </div>
            )}

            {/* SECTION PARCOURS ACADÉMIQUE */}
            {mode === "inscription" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-inkmuted">Parcours académique (facultatif)</p>
                <div className="mt-3 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-inkmuted">Formation</label>
                    <FormationCombobox value={formation} onSelect={handleFormationSelect} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-inkmuted">Matières préférées</label>
                    <TagInput tags={preferences} onChange={setPreferences} />
                  </div>
                </div>
              </div>
            )}

            {erreur && <p className="text-sm text-red-600">{erreur}</p>}
            {message && <p className="text-sm text-inkmuted">{message}</p>}

            <button type="submit" disabled={chargement} className="w-full rounded-md bg-navy px-4 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-ink disabled:opacity-60">
              {chargement ? "Chargement..." : mode === "connexion" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}