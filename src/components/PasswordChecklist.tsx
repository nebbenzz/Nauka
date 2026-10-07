interface Regle {
  label: string;
  test: (mdp: string) => boolean;
}

export const REGLES_MOT_DE_PASSE: Regle[] = [
  { label: "Au moins 10 caractères", test: (mdp) => mdp.length >= 10 },
  { label: "Une lettre majuscule", test: (mdp) => /[A-Z]/.test(mdp) },
  { label: "Une lettre minuscule", test: (mdp) => /[a-z]/.test(mdp) },
  { label: "Un chiffre", test: (mdp) => /[0-9]/.test(mdp) },
  { label: "Un caractère spécial (!@#$%^&*...)", test: (mdp) => /[!@#$%^&*()_+\-=[\]{};':"|<>?,./`~]/.test(mdp) },
];

export function motDePasseValide(mdp: string): boolean {
  return REGLES_MOT_DE_PASSE.every((r) => r.test(mdp));
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PasswordChecklist({ motDePasse }: { motDePasse: string }) {
  const nbValide = REGLES_MOT_DE_PASSE.filter((r) => r.test(motDePasse)).length;

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {REGLES_MOT_DE_PASSE.map((_, i) => (
          <span
            key={i}
            className={i < nbValide ? "h-1 flex-1 rounded-full bg-sage" : "h-1 flex-1 rounded-full bg-line"}
          />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {REGLES_MOT_DE_PASSE.map((regle) => {
          const ok = regle.test(motDePasse);
          return (
            <li key={regle.label} className={ok ? "flex items-center gap-2 text-xs text-sage" : "flex items-center gap-2 text-xs text-inkmuted"}>
              <span className={ok ? "flex h-4 w-4 items-center justify-center rounded-full bg-sage/20 text-sage" : "flex h-4 w-4 items-center justify-center rounded-full border border-line"}>
                {ok && <IconCheck />}
              </span>
              {regle.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}