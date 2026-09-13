"use client";

import { useEffect, useState } from "react";

const COMMAND = "marketsignal-trigger configure";
const AGENTS = [
  { name: "Grok Bot", icon: "grok-bot" },
  { name: "Claude Code", icon: "claude-code" },
  { name: "Meta Muse", icon: "meta-muse" },
  { name: "OpenClaw", icon: "openclaw" },
  { name: "Hermes", icon: "hermes" },
];
const INSTALL_URL = "https://github.com/BlyzrHQ/market-signal/blob/codex/market-signal-cli/docs/direct-trigger-cli.md";

export function AgentSetup({ ar }: { ar: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (!open) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setInterval(() => {
      setTyped((value) => {
        const next = reduced ? COMMAND.length : Math.min(value + 1, COMMAND.length);
        if (next === COMMAND.length) window.clearInterval(timer);
        return next;
      });
    }, reduced ? 0 : 45);
    return () => window.clearInterval(timer);
  }, [open]);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return <section className="agent-setup" aria-labelledby="agent-title">
    <p className="agent-eyebrow">{ar ? "مسار آخر، نفس الأدلة" : "YOUR AGENT. THE SAME EVIDENCE."}</p>
    <h2 id="agent-title">{ar ? "دع وكيلك يتولى المهمة." : "Let your agent do it."}</h2>
    <ul className="agent-brand-list" aria-label={ar ? "الوكلاء" : "Agents"}>
      {AGENTS.map(({ name, icon }) => <li key={icon}>
        {/* Local SVG brand assets retain their original vector artwork. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/agents/${icon}.svg`} alt="" width="28" height="28" />
        <span>{name}</span>
      </li>)}
    </ul>
    <p className="agent-description">{ar ? "امنح وكيلك أدوات البحث عن المنافسين ومقارنة المنتجات والأسعار، بنتائج منظمة ومصادر واضحة." : "Give your agent the tools to research competitors, compare products, and bring back prices—with sources."}</p>
    <button className="agent-reveal" type="button" aria-expanded={open} aria-controls="agent-command-panel" onClick={() => { setOpen(!open); setTyped(0); setCopyState("idle"); }}>
      {open ? (ar ? "إخفاء الإعداد" : "Hide setup") : (ar ? "دع وكيلك يتولى المهمة" : "Let your agent do it")}
    </button>
    <div id="agent-command-panel" hidden={!open} className="agent-command-panel">
      <p className="agent-prerequisite">{ar ? "أولاً: احصل على CLI المعتمد من مسؤول فريقك وثبّته. تحتاج إلى بيئة Trigger مجهزة بالمهام ومفتاح خاص." : "First, install your team’s approved CLI. Requires a provisioned Trigger environment and a private environment key."} <a href={INSTALL_URL} target="_blank" rel="noreferrer">{ar ? "تعليمات التثبيت" : "Installation instructions"}</a></p>
      <div className="agent-terminal" dir="ltr">
        <div className="agent-terminal-head"><span>{ar ? "إعداد CLI" : "CLI SETUP"}</span><span>terminal</span></div>
        <div className="agent-command-line">
          <span className="agent-prompt" aria-hidden="true">$</span>
          <code aria-label={COMMAND}><span aria-hidden="true">{COMMAND.slice(0, typed)}<span className={typed < COMMAND.length ? "agent-cursor" : "agent-cursor is-finished"} /></span></code>
        </div>
        <button type="button" className="agent-copy" onClick={copyCommand}>{copyState === "copied" ? (ar ? "تم النسخ" : "Copied") : (ar ? "نسخ الأمر" : "Copy command")}</button>
      </div>
      <p className="agent-security">{ar ? "أدخل المفتاح في نافذة CLI المخفية فقط، وليس في محادثة الوكيل." : "Enter the key only at the CLI’s hidden prompt—not in your agent chat."}</p>
      <p className="agent-copy-status" role="status">{copyState === "failed" ? (ar ? "تعذر النسخ. حدد الأمر وانسخه يدوياً." : "Couldn’t copy. Select the command and copy it manually.") : copyState === "copied" ? (ar ? "تم نسخ أمر الإعداد." : "Setup command copied.") : ""}</p>
    </div>
    {!open && <p className="agent-setup-note">{ar ? "CLI للفريق · نتائج منظمة · مفاتيح خاصة" : "Team CLI · Structured results · Private credentials"}</p>}
  </section>;
}
