// Operator-owned additions to an existing subscription period. Never Stripe money.
export function ensureReportCreditGrantSchema(database) {
  database.exec(`CREATE TABLE IF NOT EXISTS report_credit_grants (
    id text PRIMARY KEY NOT NULL,
    workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    reports integer NOT NULL CHECK(reports > 0 AND reports <= 1000),
    period_start text NOT NULL,
    period_end text NOT NULL,
    reason text NOT NULL,
    created_at text NOT NULL
  );
  CREATE INDEX IF NOT EXISTS report_credit_grants_period_idx
    ON report_credit_grants(workspace_id, period_start, period_end);`);
}

export function reportCreditBonus(database, workspaceId, subscription) {
  if (!subscription) return 0;
  const row = database.prepare(`SELECT coalesce(sum(reports), 0) AS reports
    FROM report_credit_grants WHERE workspace_id = ? AND period_start = ? AND period_end = ?`)
    .get(workspaceId, subscription.currentPeriodStart, subscription.currentPeriodEnd);
  return Number(row.reports);
}

export function grantReportCredits(database, { workspaceId, reports, grantId, reason }, now = new Date()) {
  if (typeof workspaceId !== 'string' || !workspaceId || !Number.isSafeInteger(reports) || reports < 1 || reports > 1000
    || typeof grantId !== 'string' || !/^[A-Za-z0-9:_-]{8,120}$/.test(grantId)
    || typeof reason !== 'string' || !reason.trim() || reason.length > 200 || !Number.isFinite(now.getTime())) {
    throw new Error('Invalid report credit grant.');
  }
  return database.transaction(() => {
    const subscription = database.prepare(`SELECT s.current_period_start, s.current_period_end, s.status, s.plan_tier
      FROM workspace_subscriptions s JOIN workspaces w ON w.id = s.workspace_id
      WHERE s.workspace_id = ? AND w.kind = 'personal'`).get(workspaceId);
    const nowIso = now.toISOString();
    if (!subscription || !['active', 'trialing'].includes(subscription.status)
      || !['starter','solo','growth','agency'].includes(subscription.plan_tier)
      || !Number.isFinite(Date.parse(subscription.current_period_start)) || !Number.isFinite(Date.parse(subscription.current_period_end))
      || nowIso < subscription.current_period_start || nowIso >= subscription.current_period_end) {
      throw new Error('An active personal-workspace subscription is required.');
    }
    const prior = database.prepare('SELECT * FROM report_credit_grants WHERE id = ?').get(grantId);
    if (prior && (prior.workspace_id !== workspaceId || prior.reports !== reports || prior.reason !== reason.trim()
      || prior.period_start !== subscription.current_period_start || prior.period_end !== subscription.current_period_end)) {
      throw new Error('Grant id is already bound to different work.');
    }
    if (!prior) database.prepare(`INSERT INTO report_credit_grants
      (id,workspace_id,reports,period_start,period_end,reason,created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(grantId,workspaceId,reports,subscription.current_period_start,subscription.current_period_end,reason.trim(),nowIso);
    return { grantId, workspaceId, reports, replayed: Boolean(prior), expiresAt: subscription.current_period_end };
  }).immediate();
}
