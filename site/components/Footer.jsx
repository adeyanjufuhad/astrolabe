import { Logo } from "./Icons";
import { TAG } from "../lib/docs";

export default function Footer() {
  return (
    <footer>
      <div className="container foot">
        <a className="brand" href="/" translate="no">
          <Logo />
          Astrolabe
        </a>
        <nav aria-label="Footer">
          <a href="/docs">Docs</a>
          <a href="/docs/install">Install</a>
          <a href="/docs/github-action">GitHub Action</a>
          <a href="/docs/cli">CLI</a>
          <a href="/docs/license">MIT License</a>
        </nav>
        <small>
          {TAG} · Interactions adapted from{" "}
          <a href="https://reactbits.dev" style={{ textDecoration: "underline" }}>
            React Bits
          </a>
        </small>
      </div>
    </footer>
  );
}
