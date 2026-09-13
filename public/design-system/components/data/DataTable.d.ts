export interface DataTableProps<Row extends { id: string; anchor?: string } = { id: string; anchor?: string; [k: string]: unknown }> {
  columns: { key: string; label: string; width?: string; render?: (row: Row) => React.ReactNode }[];
  rows: Row[];
  /** Below this the table scrolls horizontally */
  minWidth?: number;
  /** Expandable evidence drawer under the open row */
  renderDrawer?: (row: Row) => React.ReactNode;
  openId?: string | null;
  highlightId?: string | null;
}
export function DataTable<Row extends { id: string; anchor?: string }>(props: DataTableProps<Row>): JSX.Element;
