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
        <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <img src="/nuage.png?v=3" alt="" className="absolute left-[-17px] top-[-75px] h-[158px] w-[110px] max-w-none" />
        </span>
        <span className="absolute left-[57%] top-[42%] z-10 -translate-x-1/2 -translate-y-1/2 text-[11px] font-extrabold leading-none text-ink" aria-hidden="true">
          {initiales}
        </span>
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