export interface IconButtonProps {
  /** Accessible name — required, there is no visible text */
  label: string;
  pressed?: boolean;
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function IconButton(props: IconButtonProps): JSX.Element;
