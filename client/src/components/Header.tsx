import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "../hooks/use-auth";

let logoExists: boolean | null = null;
function tryLoadLogo(): boolean {
  if (logoExists !== null) return logoExists;
  try {
    const modules = import.meta.glob("../assets/meru-logo.png", { eager: true });
    logoExists = Object.keys(modules).length > 0;
  } catch {
    logoExists = false;
  }
  return logoExists;
}

export default function Header() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const hasLogo = tryLoadLogo();

  const links = [
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/designed-for", label: "Designed For" },
    { href: "/sample", label: "Sample" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="site-header">
      <Link href="/">
        <span className="header-brand" data-testid="link-home">
          {hasLogo ? (
            <img src="/src/assets/meru-logo.png" alt="Meru Express" className="brand-logo" />
          ) : (
            <span className="brand-badge">ME</span>
          )}
          <span className="brand-text">
            <span className="brand-name">Meru Express</span>
            <span className="brand-tagline">Logistics Decision Intelligence</span>
          </span>
        </span>
      </Link>
      <button className="mobile-menu-btn" onClick={() => setOpen(!open)} data-testid="button-mobile-menu" aria-label="Toggle menu">
        {open ? "\u2715" : "\u2630"}
      </button>
      <nav className={open ? "open" : ""}>
        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              <span
                className={location === l.href ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </span>
            </Link>
          ))}
          {isAuthenticated && (
            <Link href="/dashboard">
              <span
                className={location === "/dashboard" ? "active" : ""}
                onClick={() => setOpen(false)}
                data-testid="link-dashboard"
              >
                Dashboard
              </span>
            </Link>
          )}
          {isAuthenticated && isAdmin && (
            <Link href="/admin">
              <span
                className={location.startsWith("/admin") ? "active" : ""}
                onClick={() => setOpen(false)}
                data-testid="link-admin"
              >
                Admin
              </span>
            </Link>
          )}
        </div>
        <div className="nav-auth">
          {isLoading ? null : isAuthenticated ? (
            <>
              <Link href="/account">
                <span className="btn-link-primary" onClick={() => setOpen(false)} data-testid="link-my-account">My Account</span>
              </Link>
              <a href="/api/logout" className="btn-link" data-testid="button-logout" onClick={() => setOpen(false)}>
                Log Out
              </a>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <span className="btn-link" onClick={() => setOpen(false)} data-testid="link-login">Log In</span>
              </Link>
              <Link href="/auth/signup">
                <span className="btn-link-primary" onClick={() => setOpen(false)} data-testid="link-signup">Get Started</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
