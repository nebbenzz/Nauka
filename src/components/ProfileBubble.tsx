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
      <button type="button" onClick={() => setOuvert((o) => !o)} className="flex h-9 w-9 items-center justify-center rounded-full bg-highlight text-xs font-bold text-ink">
        {initiales}
      </button>
      {ouvert && (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-line bg-white py-1 text-ink shadow-md">
          <button type="button" onClick={() => { setOuvert(false); navigate("/profil"); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5">
            Mon profil
          </button>
          <button type="button" onClick={() => { setOuvert(false); navigate("/app"); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5">
            Tableau de bord
          </button>
          <button type="button" onClick={() => { setOuvert(false); navigate("/parametres"); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5">
            Paramètres
          </button>
          <div className="my-1 border-t border-line" />
          <button type="button" onClick={handleDeconnexion} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-black/5">
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}