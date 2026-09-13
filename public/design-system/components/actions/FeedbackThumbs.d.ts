export interface FeedbackThumbsProps {
  /** Controlled value; null = no vote */
  value?: 'up' | 'down' | null;
  onChange?: (value: 'up' | 'down' | null) => void;
  size?: number;
  labels?: { group: string; up: string; down: string };
}
export function FeedbackThumbs(props: FeedbackThumbsProps): JSX.Element;
