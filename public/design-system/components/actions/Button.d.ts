/**
 * @startingPoint section="Actions" subtitle="Outlined pill buttons in three variants" viewport="700x120"
 */
export interface ButtonProps {
  /** primary = outlined blue pill (never solid), secondary = grey outline, ghost = no border */
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  block?: boolean;
  type?: 'button' | 'submit';
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Button(props: ButtonProps): JSX.Element;
