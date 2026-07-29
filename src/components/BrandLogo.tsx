import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

export default function BrandLogo({ className = "h-12 w-12", priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/assets/ps-jewellers-logo.png"
      alt="PS Jewellers"
      width={220}
      height={220}
      className={`object-contain mix-blend-screen ${className}`}
      priority={priority}
      sizes="(max-width: 1024px) 64px, 80px"
    />
  );
}
