/** Explicit operator mode; never inferred from missing billing credentials. */
export function selfHostedEnabled(environment: Record<string, string | undefined> = process.env) {
  return environment.MARKET_SIGNAL_MODE === "self-hosted";
}

export function localExecutionEnabled(environment: Record<string, string | undefined> = process.env) {
  return selfHostedEnabled(environment) && environment.MARKET_SIGNAL_EXECUTION_BACKEND === "local";
}
