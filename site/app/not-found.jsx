import { Arrow, Logo } from "../components/Icons";

export const metadata = { title: "Page not found · Astrolabe" };

export default function NotFound() {
  return (
    <main className="lost" id="top">
      <div>
        <Logo className="mark" />
        <h1>This page drifted off the map</h1>
        <p>The link may be old, or the page moved. The rest of Astrolabe is still on course.</p>
        <div className="hero-cta">
          <a className="btn btn-ink" href="/">
            Back to the homepage{" "}
            <span className="arrow">
              <Arrow />
            </span>
          </a>
          <a className="btn btn-line" href="https://github.com/adeyanjufuhad/astrolabe">
            GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
