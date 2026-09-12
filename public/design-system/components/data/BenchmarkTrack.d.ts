export interface BenchmarkTrackProps {
  label: string;
  hint?: string;
  /** 0–100 */
  yours: number;
  median: number;
  leader: number;
  leaderName?: string;
  /** e.g. "22 points behind market median" — the number is the source of truth */
  status: string;
  action?: string;
  labels?: { you: string; median: string; leader: string };
}
export function BenchmarkTrack(props: BenchmarkTrackProps): JSX.Element;
