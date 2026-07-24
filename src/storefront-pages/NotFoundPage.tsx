import SiteLayout from "../components/SiteLayout";
import ButtonLink from "../components/ButtonLink";
import type { AppState } from "../types";

interface NotFoundPageProps {
  appState?: AppState;
}

export default function NotFoundPage({ appState }: NotFoundPageProps) {
  return (
    <SiteLayout appState={appState}>
      <section className="mx-auto flex max-w-content flex-col items-center gap-6 px-5 py-32 text-center">
        <p className="font-serif text-6xl text-gold-500">404</p>
        <h1 className="font-serif text-3xl text-ink">Page not found.</h1>
        <ButtonLink href="/" dark>
          Return home
        </ButtonLink>
      </section>
    </SiteLayout>
  );
}
