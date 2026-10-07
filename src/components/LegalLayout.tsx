import type { ReactNode } from "react";
import Header from "../includes/Header";
import Footer from "../includes/Footer";

interface Props {
  titre: string;
  majeStamp: string;
  children: ReactNode;
}

export default function LegalLayout({ titre, majeStamp, children }: Props) {
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl font-extrabold">{titre}</h1>
        <p className="mt-1 text-xs text-inkmuted">Dernière mise à jour : {majeStamp}</p>
        <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}