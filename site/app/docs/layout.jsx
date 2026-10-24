import Footer from "../../components/Footer";
import Nav from "../../components/Nav";
import { DocsPager, DocsSidebar } from "../../components/docs/DocsNav";

export const metadata = {
  title: { default: "Docs · Astrolabe", template: "%s · Astrolabe docs" },
  description: "Everything about Astrolabe: install it, write a token file, read the reports, run it on every pull request, and keep scan history.",
};

export default function DocsLayout({ children }) {
  return (
    <>
      <Nav solid />
      <div className="docs-shell container" id="top">
        <DocsSidebar />
        <main className="doc">
          {children}
          <DocsPager />
        </main>
      </div>
      <Footer />
    </>
  );
}
