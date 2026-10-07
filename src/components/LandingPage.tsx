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
    texte: "Une ou plusieurs bonnes réponses, pour valider rapidement une notion.",
    badgeClass: "bg-highlight/25 text-ink",
    icon: <IconListe />,
  },
  {
    tag: "LIBRE",
    titre: "Réponse rédigée",
    texte: "Formulez votre réponse librement, sans indices de choix.",
    badgeClass: "bg-navy/10 text-navy",
    icon: <IconPlume />,
  },
  {
    tag: "CODE",
    titre: "Zone de code",
    texte: "Écrivez et testez une fonction directement dans le questionnaire, avec pénalité si le résultat est incorrect.",
    badgeClass: "bg-ink/10 text-ink",
    icon: <IconCode />,
  },
  {
    tag: "DESSIN",
    titre: "Zone de schéma",
    texte: "Dessinez un schéma à main levée, analysé et noté automatiquement.",
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
              Mieux réviser, <span className="text-highlight">retenir plus longtemps.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-paper/70">
              Notio transforme vos cours en questionnaires ciblés, notion par notion. Répondez, comprenez vos erreurs et construisez une progression qui vous ressemble.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => goToAppOuConnexion("/app")} className="rounded-md bg-highlight px-6 py-3 text-sm font-bold text-ink transition-colors hover:bg-paper">
                Créer un compte gratuit
              </button>
              <a href="#fonctionnement" className="rounded-md border border-paper/30 px-6 py-3 text-sm font-medium text-paper transition-colors hover:border-paper">
                Découvrir Notio
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
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-navy">Mini-quiz gratuit</p>
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
                      Refaire le mini-quiz
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

      <section className="border-y border-highlight/40 bg-highlight/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-8 text-center font-display text-lg font-extrabold text-ink">
          <span>Révisez à votre rythme.</span>
          <span className="text-ink/25">·</span>
          <span>Des questionnaires pour chaque niveau.</span>
          <span className="text-ink/25">·</span>
          <span>Une progression visible, notion par notion.</span>
          <span className="text-ink/25">·</span>
          <span>Vos cours deviennent vos entraînements.</span>
        </div>
      </section>

      <section id="fonctionnement" data-scroll-reveal className="bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-navy">Le principe Notio</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold">Un parcours simple, pensé pour apprendre vraiment.</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {[
            { n: "01", titre: "Trouvez votre prochain quiz", texte: "Parcourez le catalogue public, recherchez une matière ou une notion et retrouvez les questionnaires adaptés à votre parcours." },
            { n: "02", titre: "Répondez dans le bon format", texte: "QCM, QCU, réponse libre, code ou schéma : chaque questionnaire peut s'adapter à la façon dont la notion se vérifie." },
            { n: "03", titre: "Comprenez vos résultats", texte: "Consultez vos scores, les corrections détaillées et vos niveaux par notion pour savoir exactement quoi retravailler." },
          ].map((step) => (
            <div key={step.n} data-reveal-item style={{ transitionDelay: `${Number(step.n) * 80}ms` }} className="group transition-transform duration-300 hover:-translate-y-1">
              <p className="font-mono text-sm text-inkmuted transition-colors group-hover:text-navy">{step.n}</p>
              <h3 className="mt-3 font-display text-xl font-bold transition-colors group-hover:text-navy">{step.titre}</h3>
              <p className="mt-2 text-sm text-inkmuted">{step.texte}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      <section id="types" data-scroll-reveal className="border-y border-paper/10 bg-navy text-paper">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="font-mono text-xs uppercase tracking-widest text-highlight">Des formats qui varient</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold">Un format pour chaque matière</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {typesDeQuestions.map((type) => (
              <div key={type.tag} data-reveal-item style={{ transitionDelay: `${typesDeQuestions.indexOf(type) * 90}ms` }} className="group rounded-xl border border-paper/20 bg-paper/10 p-6 text-paper transition-all duration-300 hover:-translate-y-1 hover:border-highlight/60 hover:bg-paper/15 hover:shadow-lg">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${type.badgeClass}`}>
                  {type.icon}
                </div>
                <p className="mt-4 font-mono text-xs uppercase tracking-widest text-highlight/55">{type.tag}</p>
                <h3 className="mt-1 font-display text-lg font-bold">{type.titre}</h3>
                <p className="mt-2 text-sm text-paper/65">{type.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="suivi" data-scroll-reveal className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-navy">Garder le fil</p>
            <h2 className="mt-3 max-w-md font-display text-3xl font-extrabold">Une séance interrompue n’efface pas tes progrès.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-inkmuted">
              Notio accompagne aussi ce qui se passe entre deux questionnaires : reprendre, consolider, puis revenir à son rythme.
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {[
              { numero: "01", titre: "Reprendre où tu en étais", texte: "Tes réponses et le lot de questions restent enregistrés si tu quittes une séance en cours." },
              { numero: "02", titre: "Revoir au bon moment", texte: "Les questions à retravailler réapparaissent sur le tableau de bord quand leur rappel est dû." },
              { numero: "03", titre: "Tenir un rythme réaliste", texte: "Fixe un objectif hebdomadaire, une durée de séance et une échéance d’examen, puis suis tes séances terminées." },
            ].map((fonctionnalite) => (
              <div key={fonctionnalite.numero} data-reveal-item style={{ transitionDelay: `${Number(fonctionnalite.numero) * 80}ms` }} className="group grid gap-3 px-3 py-5 transition-colors duration-200 hover:bg-paper/60 sm:grid-cols-[3rem_1fr] sm:gap-5">
                <span className="font-mono text-xs text-inkmuted transition-colors group-hover:text-navy">{fonctionnalite.numero}</span>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink transition-colors group-hover:text-navy">{fonctionnalite.titre}</h3>
                  <p className="mt-1 text-sm leading-6 text-inkmuted">{fonctionnalite.texte}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="maitrise" data-scroll-reveal className="border-b border-paper/10 bg-navy text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-highlight">Du programme aux progrès</p>
            <h2 className="mt-3 max-w-md font-display text-3xl font-extrabold">Un score prend son sens dans la durée.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-paper/70">
              Retrouve les notions de ta formation et de ton niveau, repère celles qui restent à découvrir et vois quand une estimation de maîtrise mérite d’être confirmée.
            </p>
            <p className="mt-5 font-mono text-xs leading-5 text-paper/55">
              Les quiz par matière mélangent plusieurs notions de ton domaine ; les tirages restent adaptés à ton niveau d’études.
            </p>
          </div>
          <div className="divide-y divide-paper/20 border-y border-paper/20">
            {[
              { etat: "À découvrir", texte: "Aucune réponse enregistrée pour cette notion." },
              { etat: "En cours", texte: "Tu as commencé à travailler la notion ; les réponses récentes aident à suivre tes progrès." },
              { etat: "Maîtrisé", texte: "Au moins 10 réponses sur les 90 derniers jours et un score récent d’au moins 70 %." },
            ].map((etape) => (
              <div key={etape.etat} data-reveal-item style={{ transitionDelay: `${["À découvrir", "En cours", "Maîtrisé"].indexOf(etape.etat) * 90}ms` }} className="group grid gap-2 px-3 py-5 transition-colors duration-200 hover:bg-paper/5 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <h3 className="font-display text-lg font-bold text-paper transition-colors group-hover:text-highlight">{etape.etat}</h3>
                <p className="text-sm leading-6 text-paper/65">{etape.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" data-scroll-reveal className="border-y border-line bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="font-mono text-xs uppercase tracking-widest text-navy">Choisissez votre rythme</p>
          <div className="mt-4 grid gap-12 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <div className="flex flex-col justify-between">
              <div>
                <h2 className="max-w-md font-display text-3xl font-extrabold text-ink">Commencez gratuitement, allez plus loin quand vous êtes prêt.</h2>
                <p className="mt-5 max-w-sm text-sm leading-6 text-inkmuted">Un espace simple pour commencer aujourd'hui, puis des outils plus puissants quand vos révisions le demanderont.</p>
              </div>
              <div className="mt-8 border-l-2 border-line pl-5 md:mt-16">
                <h3 className="font-display text-xl font-bold">Découverte</h3>
                <p className="mt-1 text-sm text-inkmuted">Gratuit, sans limite de temps</p>
                <ul className="mt-6 space-y-3 text-sm text-inkmuted">
                  <li>5 questionnaires par jour</li>
                  <li>Accès aux questionnaires publics</li>
                  <li>Filtre par matière, niveau et notion</li>
                  <li>Suivi de progression par notion</li>
                </ul>
                <button type="button" onClick={() => goToAppOuConnexion("/app")} className="mt-8 rounded-md border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink">
                  Commencer gratuitement
                </button>
              </div>
            </div>
            <div className="border-l border-navy bg-navy p-8 text-paper md:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-highlight">Bientôt disponible</p>
                  <h3 className="mt-3 font-display text-2xl font-bold">Pro</h3>
                  <p className="mt-1 text-sm text-paper/65">Pour construire ses propres révisions</p>
                </div>
              </div>
              <ul className="mt-8 grid gap-3 text-sm text-paper/75 sm:grid-cols-2">
                <li>Questionnaires sans limite quotidienne</li>
                <li>Génération IA à partir de vos PDF</li>
                <li>Questionnaires avancés chronométrés</li>
                <li>Correction IA des réponses libres, du code et des schémas</li>
              </ul>
              <p className="mt-8 border-t border-paper/15 pt-5 text-sm leading-6 text-paper/70">
                Le Pro est en préparation et devrait être disponible le {DATE_LANCEMENT_PRO}. En attendant, le parrainage permet de découvrir ses fonctions pendant 7 jours.
              </p>
              <form onSubmit={handleAlertePro} className="mt-5 flex flex-col gap-2 sm:flex-row">
                <input type="email" required disabled={emailProDejaInscrit || inscriptionPro} value={emailProDejaInscrit ? "Demande déjà enregistrée" : emailPro} onChange={(e) => setEmailPro(e.target.value)} placeholder="ton@email.fr" aria-label="Adresse email pour être prévenu du lancement du Pro" className="min-w-0 flex-1 rounded-md border border-paper/20 bg-paper/10 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper/45 focus:border-highlight disabled:cursor-default disabled:text-paper/45" />
                <button type="submit" disabled={emailProDejaInscrit || inscriptionPro} className="rounded-md bg-highlight px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-paper disabled:opacity-60">
                  {inscriptionPro ? "Inscription..." : emailProDejaInscrit ? "Demande enregistrée" : "Être prévenu"}
                </button>
              </form>
              {messagePro && <p className="mt-2 text-xs text-paper/70">{messagePro}</p>}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}