import { Link } from "wouter";
import SEO from "../components/SEO";

export default function NotFound() {
  return (
    <div className="auth-page">
      <SEO title="Page Not Found - Meru Express" description="The page you are looking for does not exist." />
      <div className="auth-card" data-testid="card-404">
        <h1>404</h1>
        <p className="auth-subtitle">The page you are looking for does not exist or has been moved.</p>
        <Link href="/">
          <span className="btn-primary" data-testid="link-go-home">Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
