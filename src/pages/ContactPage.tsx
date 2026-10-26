import { useEffect, useState, type FormEvent } from "react";
import Header from "../includes/Header";
import Footer from "../includes/Footer";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabaseClient";

const TITRES_SUJET = {
  probleme: "Parlons de ce qui te bloque.",
  commentaire: "Partage ton expérience.",
  question: "Une question ? Échangeons.",
  autre: "Une demande particulière ? Écrivons-nous.",
} as const;

export default function ContactPage() {
  const { session } = useSession();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [sujet, setSujet] = useState<"probleme" | "commentaire" | "question" | "autre">("probleme");
  const [message, setMessage] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("prenom, nom, email")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNom(`${data.prenom || ""} ${data.nom || ""}`.trim());
          setEmail(data.email || "");
        }
      });
  }, [session]);

  async function handleSoumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const headers: Record<string, string> = {};
    if (session?.user) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const { data, error } = await supabase.functions.invoke("envoyer-ticket", {
      body: { nom, email, sujet, message, site_web: siteWeb },
      headers,
    });

    setEnvoi(false);

    if (error || data?.error) {
      setErreur(typeof data?.error === "string" ? data.error : "Échec de l'envoi. Réessaie.");
      return;
    }

    setEnvoye(true);
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <section className="flex min-h-72 flex-col justify-center border-l-4 border-highlight bg-navy p-8 text-paper sm:p-10 lg:min-h-full lg:p-12">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-highlight">Formulaire d'aide</p>
            <h1 className="mt-6 max-w-sm font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{TITRES_SUJET[sujet]}</h1>
            <p className="mt-6 max-w-sm text-sm leading-6 text-paper/70">Une question, un problème rencontré ou simplement une remarque ? Écris-nous, notre équipe te répondra directement par email.</p>
          </div>
        </section>

        {envoye ? (
          <section className="flex min-h-64 items-center justify-center border border-line bg-white p-8 text-center shadow-sm">
            <div>
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-navy/10 text-navy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m5 12 4 4L19 6" /></svg>
              </span>
              <p className="mt-4 font-display text-xl font-bold">Message envoyé</p>
              <p className="mt-2 text-sm text-inkmuted">Merci, on te répondra directement par email.</p>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSoumettre} className="relative space-y-5 border border-line bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-2 border-b border-line pb-5">
              <h2 className="font-display text-xl font-bold">Envoyer un message</h2>
              <p className="mt-1 text-sm text-inkmuted">Les champs marqués sont nécessaires pour nous répondre.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nom" className="text-xs font-medium text-inkmuted">Nom</label>
                <input
                  id="nom"
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                                    className="mt-1 w-full border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-xs font-medium text-inkmuted">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 w-full border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-navy"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sujet" className="text-xs font-medium text-inkmuted">Sujet</label>
              <div className="relative mt-1">
                <select
                  id="sujet"
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value as any)}
                  className="w-full appearance-none border border-line bg-white px-3 py-2.5 pr-10 text-sm text-ink outline-none focus:border-navy"
                >
                  <option value="probleme">Signaler un problème</option>
                  <option value="commentaire">Laisser un commentaire</option>
                  <option value="question">Poser une question</option>
                  <option value="autre">Autre</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-inkmuted">
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="message" className="text-xs font-medium text-inkmuted">Message</label>
              <textarea
                id="message"
                required
                minLength={10}
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 w-full border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-navy"
              />
            </div>

            <div className="absolute left-[-9999px]" aria-hidden="true">
              <label htmlFor="site_web">Ne pas remplir ce champ</label>
              <input
                type="text"
                id="site_web"
                name="site_web"
                tabIndex={-1}
                autoComplete="off"
                value={siteWeb}
                onChange={(e) => setSiteWeb(e.target.value)}
              />
            </div>

            {erreur && <p className="text-sm text-red-600">{erreur}</p>}

            <button type="submit" disabled={envoi} className="w-full bg-navy px-6 py-3 text-sm font-bold text-paper transition-colors hover:bg-ink disabled:opacity-60">
              {envoi ? "Envoi..." : "Envoyer le message"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}