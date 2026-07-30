import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

/**
 * The Mudita Diamonds / PS Jewellers crest.
 *
 * Deliberately no `mix-blend-screen`. The source PNG is ~90% transparent with no
 * black backdrop, so screen-blending it against the light header pushed every
 * gold pixel toward white and the mark rendered almost invisibly. The blend mode
 * was only ever needed back when the exported file still had a black box behind
 * the crest. If the logo is ever re-exported with a solid background, fix the
 * asset rather than reintroducing the blend.
 */
export default function BrandLogo({ className = "h-12 w-12", priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/assets/ps-jewellers-logo.png"
      alt="PS Jewellers — Mudita Diamonds"
      // The asset is 3375x4219 (4:5 portrait), not square. Declaring 220x220
      // made Next reserve a square box, and object-contain then letterboxed the
      // crest inside it, so an h-14 w-14 slot rendered the mark at ~45x56 with
      // dead space either side. These match the real aspect ratio.
      width={220}
      height={275}
      className={`object-contain ${className}`}
      priority={priority}
      sizes="(max-width: 1024px) 64px, 80px"
    />
  );
}
