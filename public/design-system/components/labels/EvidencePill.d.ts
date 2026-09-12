export interface EvidencePillProps {
  /** observed = solid ink, inferred = blue tint (machine judgement), limited = dashed, unavailable = hollow */
  state?: 'observed' | 'inferred' | 'limited' | 'unavailable';
  /** Override label text (e.g. "Complete", "Category: home fragrance", Arabic) */
  children?: React.ReactNode;
  uppercase?: boolean;
  style?: React.CSSProperties;
}
export function EvidencePill(props: EvidencePillProps): JSX.Element;
