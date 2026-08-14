interface RouteErrorScreenProps {
  onReload?: () => void;
}

export function RouteErrorScreen({
  onReload = () => window.location.reload(),
}: RouteErrorScreenProps) {
  return (
    <main className="route-error-container">
      <section className="route-error-content" aria-labelledby="route-error-heading">
        <p className="route-error-brand">GigBridge</p>
        <h1 id="route-error-heading" className="route-error-heading">
          We couldn&apos;t load this page
        </h1>
        <p className="route-error-text">
          A newer version may be available. Reload the page to continue.
        </p>
        <div className="route-error-actions">
          <button type="button" className="not-found-button route-error-reload" onClick={onReload}>
            Reload page
          </button>
          <a href="/" className="route-error-home">
            Go home
          </a>
        </div>
      </section>
    </main>
  );
}

