import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface Props {
  userId: string;
}

export default function ProfileBubble({ userId }: Props) {
  const navigate = useNavigate();
  const [initiales, setInitiales] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("prenom, nom")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = (data.prenom || "").charAt(0);
          const n = (data.nom || "").charAt(0);
          setInitiales((p + n).toUpperCase() || "?");
        }
      });
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleDeconnexion() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-label={`Ouvrir le menu du profil${initiales ? ` (${initiales})` : ""}`}
        aria-expanded={ouvert}
        className="relative flex h-14 w-16 items-center justify-center text-ink transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
      >
        <svg viewBox="-20 0 500 360" fill="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
          <path
            d="M200.3,100.8 A65,65 0 1 1 330.0,95.0 A32,32 0 0 1 381.6,132.7 A48,48 0 1 1 380.6,227.1 A36,36 0 0 1 315.2,242.2 A38,38 0 0 1 242.9,219.6 A70,70 0 0 1 240.0,219.3 A40,40 0 0 1 165.7,240.6 A40,40 0 0 1 95.1,212.5 A52,52 0 0 1 147.2,123.0 A60,60 0 0 1 151.6,118.9 A25,25 0 1 1 198.8,102.3 A70,70 0 0 1 200.3,100.8 Z"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <g fill="#ffffff" stroke="#000000" strokeWidth="6">
            <path transform="translate(-20 -35)" d="M58 339c-9 0-16-7-16-16 0-8 5-14 13-16 3-10 12-17 23-17 11 0 20 7 22 17 9-1 17 6 17 15 0 9-7 17-17 17H58Z" />
            <path transform="translate(-30 -50)" d="M30 389c-8 0-13-5-13-12 0-6 4-11 11-12 2-8 9-13 17-13 8 0 15 5 17 12 7-.5 13 5 13 12 0 7-6 13-13 13H30Z" />
          </g>
          <text x="252" y="167" fill="#000000" fontFamily="sans-serif" fontSize="86" fontWeight="800" textAnchor="middle" dominantBaseline="middle">
            {initiales}
          </text>
        </svg>
      </button>
      {ouvert && (
        <div className="absolute right-0 z-20 mt-3 w-60 rounded-xl border border-navy/15 bg-[#FFFEFA] p-2 text-ink">
          <div className="absolute -top-2 right-5 flex items-end gap-1" aria-hidden="true">
            <span className="h-2 w-2 rounded-full border border-highlight/60 bg-[#FFFEFA]" />
            <span className="h-3 w-3 rounded-full border border-highlight/60 bg-[#FFFEFA]" />
          </div>
          <button
            type="button"
            onClick={() => { setOuvert(false); navigate("/profil"); }}
            className="group flex min-h-10 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-highlight/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-navy transition-colors group-hover:bg-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
            </span>
            Mon profil
          </button>
          <button
            type="button"
            onClick={() => { setOuvert(false); navigate("/app"); }}
            className="group flex min-h-10 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-highlight/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-navy transition-colors group-hover:bg-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
            </span>
            Tableau de bord
          </button>
          <button
            type="button"
            onClick={() => { setOuvert(false); navigate("/parametres"); }}
            className="group flex min-h-10 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-highlight/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-navy transition-colors group-hover:bg-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
                <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
                <circle cx="12.4" cy="11.1" r="3.5" />
              </svg>
            </span>
            Paramètres
          </button>
          <div className="my-2 border-t border-line/80" />
          <button
            type="button"
            onClick={handleDeconnexion}
            className="group flex min-h-10 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700 transition-colors group-hover:bg-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4"><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></svg>
            </span>
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}