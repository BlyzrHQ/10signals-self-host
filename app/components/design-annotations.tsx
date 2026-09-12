"use client";

import { useEffect, useState, type ComponentType } from "react";

/** Local design feedback only; never mount or load the toolbar in production. */
export function DesignAnnotations() {
  const [Toolbar, setToolbar] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let active = true;
    import("agentation").then(({ Agentation }) => {
      if (active) setToolbar(() => Agentation);
    }).catch((error: unknown) => {
      console.warn("Design annotation toolbar could not load.", error);
    });
    return () => { active = false; };
  }, []);

  return Toolbar ? <Toolbar /> : null;
}
