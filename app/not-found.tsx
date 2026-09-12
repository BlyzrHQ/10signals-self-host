import Link from "next/link";
import { SiteHeader } from "./components/site-header";
import { ActionSeparator, EdgeStateCard } from "./components/signal-overview";

export default function NotFound() {
  return <main className="ds-page" lang="en" dir="ltr">
    <div className="ds-frame-wide">
      <SiteHeader compact />
      <section className="rp-state-page" aria-labelledby="not-found-title">
        <p className="rp-state-page-kicker">404 · Page not found</p>
        <h1 className="rp-state-page-title" id="not-found-title">This page isn’t here.</h1>
        <p className="rp-state-page-lead">The link may have changed. Nothing you saved was removed: saved reports stay reachable from your account.</p>
        <div className="rp-states">
          <EdgeStateCard where="Address" state="unavailable" stateLabel="Unavailable" title="No page at this address" body="The address did not match a report, a shared link or a product page. A shared report link may have been made private by its owner."
            actions={<><Link href="/account">Open my account</Link><ActionSeparator /><Link href="/">Run a new report</Link></>} />
        </div>
      </section>
    </div>
  </main>;
}
