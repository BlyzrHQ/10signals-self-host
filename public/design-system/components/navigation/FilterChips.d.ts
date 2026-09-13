export interface FilterChipsProps {
  label?: string;
  options: { key: string; label: string; count?: number | string }[];
  value: string;
  onChange: (key: string) => void;
}
export function FilterChips(props: FilterChipsProps): JSX.Element;
