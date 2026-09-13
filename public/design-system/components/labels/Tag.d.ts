export interface TagProps {
  variant?: 'neutral' | 'ink' | 'accent' | 'outline' | 'planned';
  /** Uppercase tracked 10px (default) vs sentence-case 11px */
  kicker?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Tag(props: TagProps): JSX.Element;
