import type { ReactNode } from "react";
import ArrowIcon from "./ArrowIcon";

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  dark?: boolean;
  className?: string;
}

const base =
  "inline-flex items-center gap-2 rounded-xs px-6 py-3 text-sm font-medium tracking-wide transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

export default function ButtonLink({ href, children, dark = false, className = "" }: ButtonLinkProps) {
  const variant = dark
    ? "bg-ink text-white hover:bg-gold-500 hover:text-ink"
    : "bg-gold-500 text-white hover:bg-gold-600";

  return (
    <a className={`${base} ${variant} ${className}`} href={href}>
      <span>{children}</span>
      <ArrowIcon />
    </a>
  );
}
