/**
 * @startingPoint section="Surfaces" subtitle="Flat card with kicker, title, meta" viewport="700x160"
 */
export interface CardProps {
  /** surface = filled #f7f9f9 (default), raised = white + hairline, outline = ring only, dashed = proposal / planned */
  variant?: 'surface' | 'raised' | 'outline' | 'dashed';
  kicker?: string;
  title?: string;
  meta?: string;
  padding?: string;
  as?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Card(props: CardProps): JSX.Element;
