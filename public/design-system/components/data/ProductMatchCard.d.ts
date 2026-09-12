/**
 * @startingPoint section="Data" subtitle="One of your products vs its rival products" viewport="900x260"
 */
export interface ProductMatchCardProps {
  product: { name: string; sku?: string; price: string; summary?: string };
  rivals: { id: string; name: string; domain: string; url?: string; price?: string; same?: boolean; diff: string; basis?: string; youLower?: boolean; needsEvidence?: boolean; evidence: 'observed'|'inferred'|'limited'|'unavailable'; confidence?: string; next?: string; source?: 'ai'|'rule'; noImage?: boolean; vote?: 'up'|'down'|null }[];
  labels?: { you: string; rivals: string; rival: string; same: string; substitute: string };
  onVote?: (rivalId: string, vote: 'up'|'down'|null) => void;
}
export function ProductMatchCard(props: ProductMatchCardProps): JSX.Element;
