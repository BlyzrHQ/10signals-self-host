export interface NavBarProps {
  name?: string;
  /** assets/logo-dot.png — falls back to a CSS dot */
  logoSrc?: string;
  badge?: React.ReactNode;
  /** Breadcrumb segments after the brand (domains are forced LTR) */
  crumbs?: string[];
  meta?: React.ReactNode;
  /** Right-side actions (links, avatar, language toggle) */
  children?: React.ReactNode;
  onBrandClick?: () => void;
}
export function NavBar(props: NavBarProps): JSX.Element;
