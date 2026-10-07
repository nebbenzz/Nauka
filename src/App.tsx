import { useEffect } from "react";
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
import { enregistrerCodeParrainageDepuisUrl, enregistrerParrainageEnAttente } from "./lib/referral";
import { supabase } from "./lib/supabaseClient";

function App() {
  useThemeColor();

  useEffect(() => {
    enregistrerCodeParrainageDepuisUrl();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void enregistrerParrainageEnAttente();
    });
  }, []);

  return (
    <BrowserRouter>
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