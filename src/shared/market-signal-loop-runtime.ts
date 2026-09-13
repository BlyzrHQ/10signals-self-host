import {
  MARKET_SIGNAL_FUNCTION_ID,
  MARKET_SIGNAL_FUNCTION_VERSION,
  MARKET_SIGNAL_LOOP_CONTRACT_VERSION,
  type TenSignalsLoopInput,
  type TenSignalsLoopOutput,
  parseTenSignalsLoopInput,
  parseTenSignalsLoopOutput,
} from "./market-signal-loop-contract.ts";

export type TenSignalsLoopPortResult = Omit<TenSignalsLoopOutput, "contractVersion" | "functionId" | "functionVersion" | "requestId" | "primaryDomain" | "productPlan">;

export type TenSignalsLoopPort = {
  run(input: TenSignalsLoopInput): Promise<TenSignalsLoopPortResult>;
};

/**
 * Executes one finite 10Signals function invocation through an injected
 * adapter. The adapter owns the existing durable report workflow. This wrapper
 * validates the caller's input and the exact terminal output but does not add a
 * second retry, billing, or orchestration layer around the report runtime.
 */
export async function callTenSignalsLoop(value: unknown, port: TenSignalsLoopPort): Promise<TenSignalsLoopOutput> {
  const input = parseTenSignalsLoopInput(value);
  const result = await port.run(input);
  if (result.metrics.comparisonTarget !== input.comparisonTarget) throw new Error("10Signals loop adapter returned a result for a different comparison target.");
  const output = parseTenSignalsLoopOutput({
    ...result,
    contractVersion: MARKET_SIGNAL_LOOP_CONTRACT_VERSION,
    functionId: MARKET_SIGNAL_FUNCTION_ID,
    functionVersion: MARKET_SIGNAL_FUNCTION_VERSION,
    requestId: input.requestId,
    primaryDomain: input.primaryDomain,
    productPlan: input.productPlan,
  });
  return output;
}
