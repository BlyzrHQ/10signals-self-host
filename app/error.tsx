"use client";

import Link from "next/link";
import { SiteHeader } from "./components/site-header";
import { ActionSeparator, EdgeStateCard } from "./components/signal-overview";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="ds-page" lang="en" dir="ltr">
    <div className="ds-frame-wide">
      <SiteHeader compact />
      <section className="rp-state-page" aria-labelledby="error-title">
        <p className="rp-state-page-kicker">Page error</p>
        <h1 className="rp-state-page-title" id="error-title">This page couldn’t load.</h1>
        <p className="rp-state-page-lead">Retrying this page does not request a new report and does not use a report credit.</p>
        <div className="rp-states">
          <EdgeStateCard role="alert" where="This page" state="unavailable" stateLabel="Unavailable" title="Something failed while rendering" body="The saved data was not changed. Try opening the page again; if it keeps failing, your saved reports are still listed in your account."
            actions={<><button type="button" onClick={reset}>Try again</button><ActionSeparator /><Link href="/account">Back to my account</Link></>} />
        </div>
      </section>
    </div>
  </main>;
}
