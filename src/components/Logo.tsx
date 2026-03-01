import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "mb-6" }: LogoProps) {
  return (
    <Link href="/" className={`block hover:opacity-80 transition-opacity ${className}`}>
      <Image
        src="/logo-white.png"
        alt="TourGraph"
        width={180}
        height={40}
        priority
      />
    </Link>
  );
}
