export interface SegmentedProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}
export function Segmented(props: SegmentedProps): JSX.Element;
