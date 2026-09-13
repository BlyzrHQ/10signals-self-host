/**
 * @startingPoint section="Navigation" subtitle="Underline tabs with counts and dashed Planned tabs" viewport="700x60"
 */
export interface TabsProps {
  tabs: { key: string; label: string; count?: number | string; planned?: boolean }[];
  value: string;
  onChange: (key: string) => void;
  plannedLabel?: string;
  /** Right-aligned slot (e.g. the deep link) */
  trailing?: React.ReactNode;
  /** Swaps arrow-key direction */
  rtl?: boolean;
}
export function Tabs(props: TabsProps): JSX.Element;
