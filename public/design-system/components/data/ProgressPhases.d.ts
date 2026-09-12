export interface ProgressPhasesProps {
  phases: string[];
  /** Index of the running phase; phases.length = all done */
  current?: number;
  /** Index where the run stopped, or -1 */
  failedAt?: number;
  /** Phase indexes completed as "skipped, not checked" (◔) */
  skipped?: number[];
  runningLabel?: string;
}
export function ProgressPhases(props: ProgressPhasesProps): JSX.Element;
