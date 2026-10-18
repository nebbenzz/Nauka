import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Header from "../includes/Header";
import Footer from "../includes/Footer";
import { estInscritListePro, memoriserEmailPro, obtenirEmailProMemorise } from "../lib/proWaitlist";

const DATE_LANCEMENT_PRO = "1er janvier 2027";

const fiches = [
  {
    tag: "DROIT · L1 · #0042",
    question: "Quelle est la conséquence d'une nullité absolue d'un contrat ?",
    explication: "En principe, un contrat frappé de nullité absolue est réputé n'avoir jamais existé.",
    reponses: [
      { texte: "Le contrat reste valable entre les parties", correcte: false },
      { texte: "Le contrat est réputé n'avoir jamais existé", correcte: true },
    ],
  },
  {
    tag: "INFORMATIQUE · L2 · #0117",
    question: "Quelle structure de données offre un accès en O(1) par clé ?",
    explication: "Une table de hachage offre un accès moyen en O(1) à partir d'une clé.",
    reponses: [
      { texte: "Une liste chaînée", correcte: false },
      { texte: "Une table de hachage", correcte: true },
    ],
  },
  {
    tag: "MATHÉMATIQUES · L1 · #0089",
    question: "Quelle est la dérivée de x² ?",
    explication: "La règle de dérivation des puissances donne (x²)' = 2x.",
    reponses: [
      { texte: "x", correcte: false },
      { texte: "2x", correcte: true },
    ],
  },
  {
    tag: "HISTOIRE · L1 · #0205",
    question: "En quelle année a eu lieu la chute du mur de Berlin ?",
    explication: "L'ouverture du mur de Berlin a lieu le 9 novembre 1989.",
    reponses: [
      { texte: "1989", correcte: true },
      { texte: "1991", correcte: false },
    ],
  },
  {
    tag: "BIOLOGIE · L2 · #0143",
    question: "Quel organite est le siège de la photosynthèse ?",
    explication: "La photosynthèse se déroule dans les chloroplastes des cellules végétales.",
    reponses: [
      { texte: "La mitochondrie", correcte: false },
      { texte: "Le chloroplaste", correcte: true },
    ],
  },
];

function IconListe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="5" cy="6" r="2" />
      <line x1="10" y1="6" x2="21" y2="6" />
      <circle cx="5" cy="12" r="2" fill="currentColor" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <circle cx="5" cy="18" r="2" />
      <line x1="10" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconPlume() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="3" y1="6" x2="15" y2="6" />
      <line x1="3" y1="11" x2="12" y2="11" />
      <path d="M15 15l6-6a1.5 1.5 0 0 0-2-2l-6 6v2h2z" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polyline points="8 6 3 12 8 18" />
      <polyline points="16 6 21 12 16 18" />
    </svg>
  );
}

function IconSchema() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="8" cy="8" r="4" />
      <polygon points="16 20 20 12 22 20" />
    </svg>
  );
}

const typesDeQuestions = [
  {
    tag: "QCM / QCU",
    titre: "Choix multiples",
    texte: "Une ou plusieurs réponses à trouver. Rapide, mais pas au hasard.",
    badgeClass: "bg-highlight/25 text-ink",
    icon: <IconListe />,
  },
  {
    tag: "LIBRE",
    titre: "Réponse rédigée",
    texte: "Explique avec tes mots. Pas de menu déroulant pour sauver ta copie.",
    badgeClass: "bg-navy/10 text-navy",
    icon: <IconPlume />,
  },
  {
    tag: "CODE",
    titre: "Zone de code",
    texte: "Écris et teste une fonction directement dans le questionnaire. Le compilateur ne juge pas, lui.",
    badgeClass: "bg-ink/10 text-ink",
    icon: <IconCode />,
  },
  {
    tag: "DESSIN",
    titre: "Zone de schéma",
    texte: "Trace ton schéma à main levée : il est analysé et noté automatiquement.",
    badgeClass: "bg-sage/15 text-sage",
    icon: <IconSchema />,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const landingRef = useRef<HTMLDivElement>(null);
  const [demoIndex, setDemoIndex] = useState(0);
  const [demoSelection, setDemoSelection] = useState<string | null>(null);
  const [demoScore, setDemoScore] = useState(0);
  const [demoReponseValidee, setDemoReponseValidee] = useState(false);
  const [emailPro, setEmailPro] = useState("");
  const [emailProDejaInscrit, setEmailProDejaInscrit] = useState(false);
  const [messagePro, setMessagePro] = useState<string | null>(null);
  const [inscriptionPro, setInscriptionPro] = useState(false);

  useEffect(() => {
    const landing = landingRef.current;
    if (!landing) return;

    const sections = landing.querySelectorAll<HTMLElement>("[data-scroll-reveal]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }

    landing.classList.add("scroll-reveal-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -48px 0px" });

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      landing.classList.remove("scroll-reveal-ready");
    };
  }, []);

  useEffect(() => {
    async function chargerEmailPro() {
      const emailMemorise = obtenirEmailProMemorise();
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email ?? emailMemorise;
      if (!email) return;
      setEmailPro(email);
      if (await estInscritListePro(email)) setEmailProDejaInscrit(true);
    }

    void chargerEmailPro();
  }, []);

  const demoTerminee = demoIndex >= fiches.length;
  const ficheActuelle = fiches[Math.min(demoIndex, fiches.length - 1)];
  const reponseCorrecte = ficheActuelle.reponses.find((reponse) => reponse.correcte);

  async function goToAppOuConnexion(destinationSiConnecte: string) {
    const { data } = await supabase.auth.getSession();
    navigate(data.session ? destinationSiConnecte : "/connexion?mode=inscription");
  }

  function validerReponseDemo() {
    if (!demoSelection || demoReponseValidee) return;
    if (ficheActuelle.reponses.some((reponse) => reponse.correcte && reponse.texte === demoSelection)) {
      setDemoScore((score) => score + 1);
    }
    setDemoReponseValidee(true);
  }

  function avancerDemo() {
    setDemoIndex((index) => index + 1);
    setDemoSelection(null);
    setDemoReponseValidee(false);
  }

  function recommencerDemo() {
    setDemoIndex(0);
    setDemoSelection(null);
    setDemoScore(0);
    setDemoReponseValidee(false);
  }

  async function handleAlertePro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (emailProDejaInscrit) return;
    setInscriptionPro(true);
    setMessagePro(null);
    const email = emailPro.trim().toLowerCase();
    const { error } = await supabase.from("pro_waitlist").insert({ email });
    setInscriptionPro(false);
    if (error && error.code !== "23505") {
      setMessagePro("Impossible d'enregistrer ton adresse pour le moment.");
      return;
    }
    memoriserEmailPro(email);
    setEmailProDejaInscrit(true);
    setMessagePro("Ta demande est déjà enregistrée. Tu seras prévenu du lancement du Pro.");
  }

  return (
    <div ref={landingRef} className="min-h-screen bg-paper text-ink">
      <Header />
      <section className="relative flex min-h-[calc(100svh-5rem)] items-center overflow-hidden bg-navy text-paper">
        <div className="pointer-events-none absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#F7F6F3_1px,transparent_1px),linear-gradient(to_bottom,#F7F6F3_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-20">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-highlight">La plateforme de révision pour l'enseignement supérieur</p>
            <h1 className="mt-5 max-w-2xl font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl">
              Mieux réviser, <span className="text-highlight">pour retenir plus longtemps.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-paper/70">
              Nauka transforme tes cours en questionnaires ciblés, notion par notion. Réponds, comprends tes erreurs et construis une progression qui te ressemble.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => goToAppOuConnexion("/app")} className="rounded-md bg-highlight px-6 py-3 text-sm font-bold text-ink transition-colors hover:bg-paper">
                Créer un compte gratuit
              </button>
              <a href="#fonctionnement" className="rounded-md border border-paper/30 px-6 py-3 text-sm font-medium text-paper transition-colors hover:border-paper">
                Découvrir Nauka
              </a>
            </div>
            <p className="mt-5 text-xs text-paper/50">5 questionnaires gratuits par jour · Sans engagement</p>
          </div>

          <div className="relative mx-auto w-full max-w-md md:justify-self-end">
            <div className="absolute -inset-3 translate-x-4 translate-y-4 border border-highlight/40" />
            <div className="relative bg-paper p-2 text-ink shadow-2xl">
              <div className="border border-line bg-white p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy">Envie de se tester ?</p>
                    <p className="mt-2 font-display text-lg font-extrabold">
                      {demoTerminee ? "Ta séance est terminée" : ficheActuelle.tag.split(" · ")[0]}
                    </p>
                  </div>
                  <span className="shrink-0 pt-1 text-xs font-semibold text-inkmuted">
                    {demoTerminee ? `${demoScore}/${fiches.length}` : `${demoIndex + 1} / ${fiches.length}`}
                  </span>
                </div>
                {demoTerminee ? (
                  <div className="py-6 text-center">
                    <p className="font-display text-3xl font-extrabold text-ink">{demoScore} / {fiches.length}</p>
                    <p className="mt-2 text-sm leading-6 text-inkmuted">
                      {demoScore === fiches.length ? "Tout juste. Prêt à continuer ?" : "Tu viens de tester plusieurs matières. Continue pour suivre tes progrès."}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/connexion?mode=inscription")}
                      className="mt-5 w-full rounded-md bg-navy px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-ink"
                    >
                      Créer un compte et suivre mes progrès
                    </button>
                    <button type="button" onClick={recommencerDemo} className="mt-3 text-sm font-semibold text-navy underline underline-offset-4">
                      Refaire le mini-questionnaire
                    </button>
                  </div>
                ) : (
                  <div key={demoIndex} className="fade-in">
                    <p className="mt-6 text-base font-semibold leading-6">{ficheActuelle.question}</p>
                    <div className="mt-5 space-y-2 text-sm">
                      {ficheActuelle.reponses.map((reponse) => {
                        const estSelectionnee = demoSelection === reponse.texte;
                        const classesReponse = demoReponseValidee && reponse.correcte
                          ? "flex w-full items-center justify-between border border-sage bg-sage/15 px-3 py-3 text-left font-medium"
                          : demoReponseValidee && estSelectionnee
                            ? "flex w-full items-center justify-between border border-red-300 bg-red-50 px-3 py-3 text-left font-medium text-red-700"
                            : estSelectionnee
                              ? "flex w-full items-center justify-between border border-navy bg-highlight/30 px-3 py-3 text-left font-medium"
                              : "flex w-full items-center justify-between border border-line px-3 py-3 text-left text-inkmuted hover:border-navy/50";
                        return (
                          <button
                            key={reponse.texte}
                            type="button"
                            aria-pressed={estSelectionnee}
                            disabled={demoReponseValidee}
                            onClick={() => setDemoSelection(reponse.texte)}
                            className={classesReponse}
                          >
                            {reponse.texte}
                            {demoReponseValidee && reponse.correcte && <span aria-hidden="true" className="font-bold text-sage">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                    {demoReponseValidee && (
                      <p role="status" className="mt-4 text-xs leading-5 text-inkmuted">
                        {demoSelection === reponseCorrecte?.texte ? "Bonne réponse. " : `La bonne réponse était « ${reponseCorrecte?.texte} ». `}
                        {ficheActuelle.explication}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={demoReponseValidee ? avancerDemo : validerReponseDemo}
                      disabled={!demoReponseValidee && demoSelection === null}
                      className="mt-5 w-full rounded-md bg-highlight px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-highlight/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {demoReponseValidee ? demoIndex === fiches.length - 1 ? "Voir mon résultat" : "Question suivante" : "Vérifier ma réponse"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="L'essentiel sur Nauka" className="border-y border-highlight/50 bg-highlight text-ink">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">Nauka, en bref</p>
          <p className="font-display text-base font-extrabold sm:text-lg">
            Tu t'entraînes sur tes cours. Tu repères ce qui coince. Tu sais quoi revoir.
          </p>
        </div>
      </section>

      <section id="fonctionnement" data-scroll-reveal className="relative overflow-hidden bg-paper">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full border-[36px] border-highlight/20" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-16">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-navy">Le principe Nauka</p>
              <h2 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                Relire, c'est bien. <span className="text-navy">Savoir ce qui est resté, c'est mieux.</span>
              </h2>
            </div>
            <div className="border-l-2 border-highlight pl-5">
              <p className="text-base leading-7 text-inkmuted">
                Nauka transforme tes cours en entraînements ciblés. Tu réponds, tu comprends tes erreurs et tu avances notion par notion. Le stabilo peut souffler.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { numero: "01", titre: "Pars de ton programme", texte: "Choisis une matière, un niveau ou une notion. Le catalogue t'aide à trouver un questionnaire adapté à ce que tu étudies." },
              { numero: "02", titre: "Fais travailler ta mémoire", texte: "Réponds à des questions ciblées au lieu de relire la même page en espérant un déclic mystique." },
              { numero: "03", titre: "Transforme tes erreurs en plan", texte: "Lis les corrections, repère les notions à revoir et reprends là où tu en étais." },
            ].map((etape, index) => (
              <article
                key={etape.numero}
                data-scroll-reveal-item
                style={{ transitionDelay: `${index * 100}ms` }}
                className={`group relative min-h-64 overflow-hidden border p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-8 ${index === 1 ? "border-navy bg-navy text-paper" : "border-line bg-white text-ink"}`}
              >
                <span className={`font-mono text-xs font-bold tracking-widest ${index === 1 ? "text-highlight" : "text-navy"}`}>{etape.numero} / 03</span>
                <h3 className="mt-12 max-w-xs font-display text-2xl font-extrabold leading-tight">{etape.titre}</h3>
                <p className={`mt-3 max-w-sm text-sm leading-6 ${index === 1 ? "text-paper/70" : "text-inkmuted"}`}>{etape.texte}</p>
                <span aria-hidden="true" className={`absolute -bottom-10 -right-2 font-display text-8xl font-extrabold leading-none transition-transform duration-300 group-hover:-translate-y-2 ${index === 1 ? "text-paper/5" : "text-navy/5"}`}>
                  {etape.numero}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="types" data-scroll-reveal className="overflow-hidden bg-navy text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-highlight">Pas tous les examens sont des QCM</p>
              <h2 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                Alors tes révisions ne devraient pas l'être non plus.
              </h2>
            </div>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {typesDeQuestions.map((type, index) => (
              <article
                key={type.tag}
                data-scroll-reveal-item
                style={{ transitionDelay: `${index * 80}ms` }}
                className="group flex min-h-64 flex-col border border-paper/20 bg-paper/[0.04] p-6 transition-colors duration-300 hover:border-highlight/70 hover:bg-paper/[0.08] sm:p-7"
              >
                <div className={`flex h-12 w-12 items-center justify-center ${type.badgeClass}`}>
                  {type.icon}
                </div>
                <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-highlight/70">{type.tag}</p>
                <h3 className="mt-2 font-display text-xl font-extrabold">{type.titre}</h3>
                <p className="mt-2 text-sm leading-6 text-paper/65">{type.texte}</p>
                <span aria-hidden="true" className="mt-auto self-end pt-5 font-mono text-xs text-paper/30 transition-colors group-hover:text-highlight">N° 0{index + 1}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="suivi" data-scroll-reveal className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-24 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-20">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-navy">Le temps passe, les progrès restent.</p>
            <h2 className="mt-5 max-w-xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Une séance interrompue, ce n'est pas retour à la case départ.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-inkmuted">
              Nauka garde le fil entre tes sessions : tu peux reprendre ton questionnaire, retrouver les questions à revoir et garder un rythme qui colle à ta vraie vie.
            </p>
          </div>
          <div className="border-y border-line">
            {[
              { numero: "01", titre: "Tu reprends où tu en étais", texte: "Tes réponses et les questions de ta session restent enregistrées." },
              { numero: "02", titre: "Tu revois ce qui mérite un deuxième round", texte: "Les questions à retravailler réapparaissent quand leur rappel est dû." },
              { numero: "03", titre: "Tu avances à ton rythme", texte: "Définis un objectif hebdomadaire, une durée de session et une date d'examen." },
            ].map((fonctionnalite, index) => (
              <article
                key={fonctionnalite.numero}
                data-scroll-reveal-item
                style={{ transitionDelay: `${index * 90}ms` }}
                className="group grid gap-3 border-b border-line px-2 py-6 last:border-0 sm:grid-cols-[3.5rem_1fr] sm:gap-5"
              >
                <span className="font-mono text-xs font-bold text-inkmuted transition-colors group-hover:text-navy">{fonctionnalite.numero}</span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-ink">{fonctionnalite.titre}</h3>
                  <p className="mt-1 text-sm leading-6 text-inkmuted">{fonctionnalite.texte}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="maitrise" data-scroll-reveal className="bg-paper">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-24 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-20">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-navy">Pas juste une note. Un repère.</p>
            <h2 className="mt-5 max-w-xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Tu vois ce que tu sais. Et ce qu'il te reste à travailler.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-inkmuted">
              Ta progression se construit par notion, avec des statuts pensés pour te guider — pas pour te coller une étiquette après un seul quiz.
            </p>
            <p className="mt-5 font-mono text-xs leading-5 text-inkmuted">
              Les questionnaires par matière mélangent plusieurs notions et restent adaptés à ton niveau d'études.
            </p>
          </div>
          <div className="border border-line bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-inkmuted">Ton tableau de bord</p>
                <h3 className="mt-2 font-display text-2xl font-extrabold">Chaque notion a son étape.</h3>
              </div>
            </div>
            <div className="mt-5 divide-y divide-line">
              {[
                { etat: "À découvrir", texte: "Pas encore de réponse enregistrée.", couleur: "bg-line" },
                { etat: "En cours", texte: "Tu t'entraînes : tes réponses récentes font avancer le suivi.", couleur: "bg-highlight" },
                { etat: "Maîtrisé", texte: "Au moins 10 réponses sur 90 jours et un score récent d'au moins 70 %.", couleur: "bg-sage" },
              ].map((etape, index) => (
                <article
                  key={etape.etat}
                  data-scroll-reveal-item
                  style={{ transitionDelay: `${index * 90}ms` }}
                  className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:gap-5"
                >
                  <h4 className="flex items-center gap-2 font-display font-extrabold">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${etape.couleur}`} />
                    {etape.etat}
                  </h4>
                  <p className="text-sm leading-6 text-inkmuted">{etape.texte}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="tarifs" data-scroll-reveal className="border-y border-paper/10 bg-navy text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-highlight">Choisis ton rythme</p>
              <h2 className="mt-5 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                Tu peux commencer sans sortir la carte bleue.
              </h2>
            </div>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <article data-scroll-reveal-item className="flex flex-col border border-paper/20 bg-paper p-7 text-ink sm:p-9">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-navy">Pour bien démarrer</p>
                  <h3 className="mt-3 font-display text-3xl font-extrabold">Découverte</h3>
                </div>
                <span className="bg-highlight px-3 py-1.5 font-mono text-xs font-bold">0 €</span>
              </div>
              <p className="mt-3 text-sm text-inkmuted">Gratuit, sans limite de temps. Oui, vraiment.</p>
              <ul className="mt-8 grid gap-3 text-sm text-inkmuted sm:grid-cols-2">
                <li>5 questionnaires par jour</li>
                <li>Questionnaires publics</li>
                <li>Filtres par matière, niveau et notion</li>
                <li>Suivi de progression par notion</li>
              </ul>
              <button type="button" onClick={() => goToAppOuConnexion("/app")} className="mt-9 w-fit border border-ink px-5 py-3 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper">
                Commencer gratuitement
              </button>
            </article>

            <article data-scroll-reveal-item style={{ transitionDelay: "100ms" }} className="relative flex flex-col border border-highlight/40 bg-paper/[0.04] p-7 sm:p-9">
              <div aria-hidden="true" className="absolute right-0 top-0 h-1 w-24 bg-highlight" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-highlight">Pour aller plus loin</p>
                  <h3 className="mt-3 font-display text-3xl font-extrabold">Pro</h3>
                </div>
                <span className="border border-paper/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-paper/70">Bientôt</span>
              </div>
              <p className="mt-3 text-sm text-paper/65">Construis des révisions sur mesure et pousse l'entraînement plus loin.</p>
              <ul className="mt-8 grid gap-3 text-sm text-paper/75 sm:grid-cols-2">
                <li>Questionnaires sans limite quotidienne</li>
                <li>Génération IA à partir de tes PDF</li>
                <li>Questionnaires avancés chronométrés</li>
                <li>Correction IA des réponses libres, du code et des schémas</li>
              </ul>
              <p className="mt-8 border-t border-paper/15 pt-5 text-sm leading-6 text-paper/70">
                Prévu pour le {DATE_LANCEMENT_PRO}. En attendant, le parrainage te permet de découvrir ses fonctions pendant 7 jours.
              </p>
              <form onSubmit={handleAlertePro} className="mt-5 flex flex-col gap-2 sm:flex-row">
                <input type="email" required disabled={emailProDejaInscrit || inscriptionPro} value={emailProDejaInscrit ? "Demande déjà enregistrée" : emailPro} onChange={(e) => setEmailPro(e.target.value)} placeholder="ton@email.fr" aria-label="Adresse e-mail pour être prévenu du lancement de Pro" className="min-w-0 flex-1 border border-paper/20 bg-paper/10 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper/45 focus:border-highlight disabled:cursor-default disabled:text-paper/45" />
                <button type="submit" disabled={emailProDejaInscrit || inscriptionPro} className="bg-highlight px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-paper disabled:opacity-60">
                  {inscriptionPro ? "Inscription..." : emailProDejaInscrit ? "Demande enregistrée" : "Me prévenir"}
                </button>
              </form>
              {messagePro && <p className="mt-2 text-xs text-paper/70">{messagePro}</p>}
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}