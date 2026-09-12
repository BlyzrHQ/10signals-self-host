export interface SelectProps {
  label?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  style?: React.CSSProperties;
  wrapStyle?: React.CSSProperties;
}
export function Select(props: SelectProps): JSX.Element;
