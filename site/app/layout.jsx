import "./globals.css";
import { Sprite } from "../components/Icons";

const TITLE = "Astrolabe · Catch design-token drift before it ships";
const DESCRIPTION =
  "Astrolabe opens your pages in a real browser and flags every color, spacing, radius and font that isn't one of your design tokens, with the nearest token to use instead. Open source CLI and GitHub Action.";

export const metadata = {
  metadataBase: new URL("https://astrolabe-pi.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  icons: { icon: { url: "/assets/logo.svg", type: "image/svg+xml" } },
  openGraph: {
    title: TITLE,
    description: "Flags every color, spacing, radius and font value that isn't one of your design tokens. Open source CLI and GitHub Action.",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Astrolabe: a sky hero with floating cards showing a 94% fidelity score" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, images: ["/og.jpg"] },
};

export const viewport = { themeColor: "#1462d6" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Marks JS as available before first paint, so reveal and entrance styles apply without a flash. */}
        <script
          dangerouslySetInnerHTML={{
            // Runs before first paint: enables reveal styles. It also clears the setting left by the
            // pause-motion button that used to exist, so nobody stays stuck with frozen motion.
            __html:
              "document.documentElement.classList.add('js');try{localStorage.removeItem('astrolabe-motion')}catch(e){}",
          }}
        />
        {/* Plain Google Fonts rather than next/font: next/font renames the families, and site/tokens.json
            names them as "Inter Tight" and "JetBrains Mono" for the CI check. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <link rel="preload" as="image" href="/assets/clouds-near.webp" type="image/webp" />
      </head>
      <body>
        <a className="skip" href="#top">
          Skip to content
        </a>
        <Sprite />
        {children}
      </body>
    </html>
  );
}
