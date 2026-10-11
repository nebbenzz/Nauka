const PREFIXE_CLE = "nauka:quiz:";
const ANCIEN_PREFIXE_CLE = "notio:quiz:";

function cleAncienne(cle: string): string {
  return `${ANCIEN_PREFIXE_CLE}${cle}`;
}

export function getQuizSessionState(cle: string): string | null {
  const nouvelleCle = `${PREFIXE_CLE}${cle}`;
  const valeur = window.sessionStorage.getItem(nouvelleCle);
  if (valeur !== null) return valeur;

  const ancienneCle = cleAncienne(cle);
  const ancienneValeur = window.sessionStorage.getItem(ancienneCle);
  if (ancienneValeur !== null) {
    window.sessionStorage.setItem(nouvelleCle, ancienneValeur);
    window.sessionStorage.removeItem(ancienneCle);
  }
  return ancienneValeur;
}

export function setQuizSessionState(cle: string, valeur: string) {
  window.sessionStorage.setItem(`${PREFIXE_CLE}${cle}`, valeur);
  window.sessionStorage.removeItem(cleAncienne(cle));
}

export function removeQuizSessionState(cle: string) {
  window.sessionStorage.removeItem(`${PREFIXE_CLE}${cle}`);
  window.sessionStorage.removeItem(cleAncienne(cle));
}
