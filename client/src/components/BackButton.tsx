import { Link } from "wouter";

export default function BackButton({ to = "/services", label = "Back to Services" }: { to?: string; label?: string }) {
  return (
    <Link href={to}>
      <span className="back-button" data-testid="button-back">
        &larr; {label}
      </span>
    </Link>
  );
}
