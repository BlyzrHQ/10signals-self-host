export interface DialogProps {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
  width?: number;
}
export function Dialog(props: DialogProps): JSX.Element;
