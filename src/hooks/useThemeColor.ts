import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export const COULEUR_PAR_DEFAUT = "#1D3557";
const CLE_LOCAL_STORAGE = "nauka-theme-color";
const ANCIENNE_CLE_LOCAL_STORAGE = "notio-theme-color";
const FORMAT_HEX = /^#[0-9A-Fa-f]{6}$/;

export const COULEURS_PREDEFINIES = [
  { nom: "Marine", valeur: "#1D3557" },
  { nom: "Cobalt", valeur: "#164E78" },
  { nom: "Pétrole", valeur: "#145A62" },
  { nom: "Indigo", valeur: "#35408F" },
  { nom: "Prune", valeur: "#5B3158" },
  { nom: "Aubergine", valeur: "#472A50" },
  { nom: "Bordeaux", valeur: "#722F37" },
  { nom: "Brique", valeur: "#8C3F32" },
  { nom: "Terracotta", valeur: "#9A4D3A" },
  { nom: "Ocre", valeur: "#806021" },
  { nom: "Forêt", valeur: "#285943" },
  { nom: "Sapin", valeur: "#1F4A43" },
  { nom: "Olive", valeur: "#58612D" },
  { nom: "Ardoise", valeur: "#3D4D63" },
  { nom: "Bleu profond", valeur: "#245B87" },
  { nom: "Graphite", valeur: "#343A40" },
  { nom: "Chocolat", valeur: "#5A4035" },
  { nom: "Fuchsia sombre", valeur: "#7A315C" },
] as const;

function couleurValide(couleur: string | null | undefined) {
  return couleur && FORMAT_HEX.test(couleur) ? couleur : COULEUR_PAR_DEFAUT;
}

function lireCouleurStockee(): string | null {
  const couleur = localStorage.getItem(CLE_LOCAL_STORAGE);
  if (couleur !== null) return couleur;

  const ancienneCouleur = localStorage.getItem(ANCIENNE_CLE_LOCAL_STORAGE);
  if (ancienneCouleur !== null) {
    localStorage.setItem(CLE_LOCAL_STORAGE, ancienneCouleur);
    localStorage.removeItem(ANCIENNE_CLE_LOCAL_STORAGE);
  }
  return ancienneCouleur;
}

export function appliquerCouleur(couleur: string) {
  document.documentElement.style.setProperty("--color-navy", couleur);
  localStorage.setItem(CLE_LOCAL_STORAGE, couleur);
  localStorage.removeItem(ANCIENNE_CLE_LOCAL_STORAGE);
}

export function useThemeColor() {
  const [couleur, setCouleur] = useState(() => {
    if (typeof window === "undefined") return COULEUR_PAR_DEFAUT;
    return couleurValide(lireCouleurStockee());
  });

  useEffect(() => {
    appliquerCouleur(couleur);
  }, [couleur]);

  useEffect(() => {
    let actif = true;

    function appliquerCouleurCompte(couleurCompte: unknown) {
      if (actif && typeof couleurCompte === "string") {
        setCouleur(couleurValide(couleurCompte));
      }
    }

    supabase.auth.getSession().then(({ data: sessionData }) => {
      appliquerCouleurCompte(sessionData.session?.user.user_metadata?.theme_color);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nouvelleSession) => {
      if (event === "SIGNED_OUT") {
        setCouleur(COULEUR_PAR_DEFAUT);
        localStorage.removeItem(CLE_LOCAL_STORAGE);
        localStorage.removeItem(ANCIENNE_CLE_LOCAL_STORAGE);
        return;
      }
      appliquerCouleurCompte(nouvelleSession?.user.user_metadata?.theme_color);
    });

    return () => {
      actif = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function sauvegarderCouleur(nouvelleCouleur: string) {
    const couleurSecurisee = couleurValide(nouvelleCouleur);
    setCouleur(couleurSecurisee);

    const { error } = await supabase.auth.updateUser({
      data: { theme_color: couleurSecurisee },
    });

    return error;
  }

  return { couleur, sauvegarderCouleur };
}
