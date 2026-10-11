import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import PaymentRecap from "./pages/PaymentRecap";
import ProfilePage from "./pages/ProfilePage";
import QuestionnairesListPage from "./pages/QuestionnairesListPage";
import QuizTakingPage from "./pages/QuizTakingPage";
import CreerQuestionnairePage from "./pages/CreerQuestionnairePage";
import AbonnementsPage from "./pages/AbonnementsPage";
import ContactPage from "./pages/ContactPage";
import ParametresPage from "./pages/ParametresPage";
import { useThemeColor } from "./hooks/useThemeColor";

import CguPage from "./pages/CguPage";
import CgvPage from "./pages/CgvPage";
import ConfidentialitePage from "./pages/ConfidentialitePage";
import MentionLegalesPage from "./pages/MentionLegalesPage";
import { consommerMessageParrainage, enregistrerCodeParrainageDepuisUrl, enregistrerParrainageEnAttente, signalerErreurParrainage } from "./lib/referral";
import { supabase } from "./lib/supabaseClient";

function App() {
  useThemeColor();
  const [messageParrainage, setMessageParrainage] = useState<string | null>(null);

  useEffect(() => {
    enregistrerCodeParrainageDepuisUrl();
  }, []);

  useEffect(() => {
    const afficherMessageParrainage = () => setMessageParrainage(consommerMessageParrainage());
    afficherMessageParrainage();
    window.addEventListener("nauka:referral-notice", afficherMessageParrainage);
    return () => window.removeEventListener("nauka:referral-notice", afficherMessageParrainage);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void enregistrerParrainageEnAttente().then((message) => {
          if (message) signalerErreurParrainage(message);
        });
      }
    });
  }, []);

  return (
    <BrowserRouter>
      {messageParrainage && (
        <div role="status" className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-xl items-start justify-between gap-4 rounded-md border border-highlight/50 bg-white px-4 py-3 text-sm text-ink shadow-lg">
          <span>{messageParrainage}</span>
          <button type="button" onClick={() => setMessageParrainage(null)} aria-label="Fermer le message de parrainage" className="shrink-0 font-semibold text-inkmuted hover:text-ink">Fermer</button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/connexion" element={<AuthPage />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/questionnaires" element={<QuestionnairesListPage />} />
        <Route path="/questionnaires/:id" element={<QuizTakingPage />} />
        <Route path="/paiement-recapitulatif" element={<PaymentRecap />} />
        <Route path="/creer-questionnaire" element={<CreerQuestionnairePage />} />
        <Route path="/abonnements" element={<AbonnementsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/parametres" element={<ParametresPage />} />
        <Route path="/cgv" element={<CgvPage />} />
        <Route path="/cgu" element={<CguPage />} />
        <Route path="/confidentialite" element={<ConfidentialitePage />} />
        <Route path="/mentions-legales" element={<MentionLegalesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;