import { DesignSystemClient } from "../components/design-system-client";

export default async function DesignSystemPage({ searchParams }: { searchParams: Promise<{ lang?: string; view?: string }> }) {
  const params = await searchParams;
  return <DesignSystemClient initialAr={params.lang === "ar"} initialKit={params.view === "kit"} />;
}
