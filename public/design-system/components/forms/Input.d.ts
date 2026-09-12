export interface InputProps {
  label?: string;
  hint?: string;
  error?: string;
  /** Force LTR (emails, domains, passwords) inside RTL pages */
  ltr?: boolean;
  value?: string;
  placeholder?: string;
  type?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
  wrapStyle?: React.CSSProperties;
}
export function Input(props: InputProps): JSX.Element;
