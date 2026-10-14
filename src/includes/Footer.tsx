import { Link } from "react-router-dom";

interface Props {
  sidebarReduite?: boolean;
}

export default function Footer({ sidebarReduite }: Props) {
  return (
    <footer className={sidebarReduite === undefined ? "border-t border-paper/10 bg-navy text-paper" : sidebarReduite ? "border-t border-paper/10 bg-navy text-paper transition-all" : "ml-64 border-t border-paper/10 bg-navy text-paper transition-all"}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <span className="font-display text-lg font-extrabold tracking-tight text-paper">Nauka</span>
            <p className="mt-2 text-sm text-paper/60">
              Révision assistée par IA, notion par notion.
            </p>
          </div>

          <div className="sm:pr-32">
            <p className="text-xs font-semibold uppercase tracking-widest text-highlight">Contact</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/contact" className="text-paper/60 transition-colors hover:text-paper">Nous contacter</Link></li>
            </ul>
          </div>

          <div className="sm:pr-32">
            <p className="text-xs font-semibold uppercase tracking-widest text-highlight">Légal</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/mentions-legales" className="text-paper/60 transition-colors hover:text-paper">Mentions légales</Link></li>
              <li><Link to="/confidentialite" className="text-paper/60 transition-colors hover:text-paper">Confidentialité</Link></li>
              <li><Link to="/cgu" className="text-paper/60 transition-colors hover:text-paper">CGU</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-paper/10 pt-6 text-xs text-paper/45">
          © {new Date().getFullYear()} Nauka. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}