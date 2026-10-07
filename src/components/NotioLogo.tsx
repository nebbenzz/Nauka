type NotioLogoProps = {
    size?: number;
    showText?: boolean;
    className?: string;
};

export default function NotioLogo({
    size = 40,
    showText = true,
    className = "",
}: NotioLogoProps) {
    return (
        <div
            className={className}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: `${Math.max(8, size * 0.25)}px`,
                width: "fit-content",
            }}
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-labelledby="notio-logo-title"
            >
                <title id="notio-logo-title">Logo Notio</title>

                {/* Fond noir permanent */}
                <rect
                    x="4"
                    y="4"
                    width="56"
                    height="56"
                    rx="16"
                    fill="#000000"
                />

                {/* Relief discret */}
                <path
                    d="M16 19.5C16 17.6 18.1 16.5 19.7 17.5L32 25.2L44.3 17.5C45.9 16.5 48 17.6 48 19.5V44.5C48 46.4 45.9 47.5 44.3 46.5L32 38.8L19.7 46.5C18.1 47.5 16 46.4 16 44.5V19.5Z"
                    fill="#FFFFFF"
                    fillOpacity="0.12"
                />

                {/* Page gauche */}
                <path
                    d="M17 19.5L31 28.5V45.5L17 37.2V19.5Z"
                    fill="#FFFFFF"
                />

                {/* Page droite */}
                <path
                    d="M47 19.5L33 28.5V45.5L47 37.2V19.5Z"
                    fill="#FFFFFF"
                    fillOpacity="0.85"
                />

                {/* Ligne centrale */}
                <path
                    d="M32 28.5V45.5"
                    stroke="#000000"
                    strokeOpacity="0.28"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />

                {/* Point représentant une notion */}
                <circle
                    cx="47"
                    cy="17"
                    r="5.5"
                    fill="#FFFFFF"
                />

                <circle
                    cx="47"
                    cy="17"
                    r="2.3"
                    fill="#000000"
                />
            </svg>

            {showText && (
                <span
                    style={{
                        color: "#FFFFFF",
                        fontFamily:
                            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        fontSize: `${Math.max(20, size * 0.7)}px`,
                        fontWeight: 750,
                        letterSpacing: "-0.045em",
                        lineHeight: 1,
                    }}
                >
                    notio
                </span>
            )}
        </div>
    );
}