export interface SourceTagProps {
  /** ai = blue tint (shares the Inferred tint), rule = grey outline */
  source?: 'ai' | 'rule';
  labels?: { ai: string; rule: string };
  style?: React.CSSProperties;
}
export function SourceTag(props: SourceTagProps): JSX.Element;
