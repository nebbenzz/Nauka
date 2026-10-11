import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import ProfileBubble from "../components/ProfileBubble";
import NaukaLogo from "../components/NaukaLogo";

type HeaderProps = {
    isLightTheme?: boolean;
};

export default function Header({ isLightTheme = false }: HeaderProps) {
    const { session } = useSession();
    const navigate = useNavigate();

    const contentColor = isLightTheme ? "text-navy" : "text-paper";
    const mutedContentColor = isLightTheme ? "text-navy/65" : "text-paper/65";

    return (
        <header
            className={`sticky top-0 z-20 h-20 border-b border-paper/10 bg-navy ${contentColor}`}
        >
            <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
                <Link
                    to="/"
                    style={{ transform: "translateX(calc(24px - max(24px, calc(50vw - 36rem + 24px))))" }}
                    className={`font-display text-xl font-extrabold tracking-tight ${contentColor}`}
                >
                    <NaukaLogo />
                </Link>

                <nav className={`hidden items-center gap-8 text-sm ${mutedContentColor} md:flex`}>
                    <Link
                        to="../questionnaires"
                        className={`transition-colors hover:${contentColor}`}
                    >
                        Questionnaires
                    </Link>

                    <Link
                        to="/abonnements"
                        className={`transition-colors hover:${contentColor}`}
                    >
                        Abonnements
                    </Link>

                    <Link
                        to="/contact"
                        className={`transition-colors hover:${contentColor}`}
                    >
                        Contact
                    </Link>
                </nav>

                {session?.user ? (
                    <ProfileBubble userId={session.user.id} />
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate("/connexion")}
                            className={`text-sm ${mutedContentColor} transition-colors hover:${contentColor}`}
                        >
                            Connexion
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/connexion")}
                            className="rounded-md bg-highlight px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-paper"
                        >
                            Commencer
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}