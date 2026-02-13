import { Link, useLocation } from "wouter";
import AdminDashboard from "../pages/AdminDashboard";
import UsersAdmin from "../pages/UsersAdmin";
import RolesAdmin from "../pages/RolesAdmin";
import TradeGovAdmin from "../pages/TradeGovAdmin";
import ComplianceAdmin from "../pages/ComplianceAdmin";
import VerificationsAdmin from "../pages/VerificationsAdmin";
import SystemAdmin from "../pages/SystemAdmin";

const menuItems = [
  { href: "/admin", label: "Overview", icon: "grid" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/roles", label: "Roles", icon: "shield" },
  { href: "/admin/intelligence", label: "Intelligence", icon: "globe" },
  { href: "/admin/compliance", label: "Compliance", icon: "clipboard" },
  { href: "/admin/verifications", label: "Verifications", icon: "check" },
  { href: "/admin/system", label: "System", icon: "server" },
];

const iconPaths: Record<string, string> = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  globe: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z",
  clipboard: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 011 1v1a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z",
  check: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  server: "M2 2h20v8H2zM2 14h20v8H2zM6 6h.01M6 18h.01",
};

function SidebarIcon({ name }: { name: string }) {
  const d = iconPaths[name] || iconPaths.grid;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function Breadcrumbs() {
  const [location] = useLocation();
  const current = menuItems.find((m) => m.href === location);
  return (
    <div className="admin-breadcrumbs" data-testid="admin-breadcrumbs">
      <Link href="/admin"><span className="admin-bc-link">Admin</span></Link>
      {current && current.href !== "/admin" && (
        <>
          <span className="admin-bc-sep">/</span>
          <span className="admin-bc-current">{current.label}</span>
        </>
      )}
    </div>
  );
}

const adminRoutes: Record<string, () => JSX.Element> = {
  "/admin": AdminDashboard,
  "/admin/users": UsersAdmin,
  "/admin/roles": RolesAdmin,
  "/admin/intelligence": TradeGovAdmin,
  "/admin/compliance": ComplianceAdmin,
  "/admin/verifications": VerificationsAdmin,
  "/admin/system": SystemAdmin,
};

function AdminContent() {
  const [loc] = useLocation();
  const Component = adminRoutes[loc] || AdminDashboard;
  return <Component />;
}

export default function AdminLayout() {
  const [location] = useLocation();

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar" data-testid="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </span>
          <span className="admin-sidebar-title">Admin Panel</span>
        </div>
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <span
              className={
                "admin-sidebar-link" +
                (location === item.href ? " active" : "")
              }
              data-testid={`link-admin-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <SidebarIcon name={item.icon} />
              {item.label}
            </span>
          </Link>
        ))}
        <div className="admin-sidebar-divider" />
        <Link href="/admin">
          <span className="admin-sidebar-link admin-sidebar-back" data-testid="link-back-admin-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Admin Home
          </span>
        </Link>
        <Link href="/">
          <span className="admin-sidebar-link admin-sidebar-back" data-testid="link-back-to-site">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Site
          </span>
        </Link>
        <a href="/api/logout" className="admin-sidebar-link admin-sidebar-logout" data-testid="link-admin-logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Log Out
        </a>
      </nav>
      <div className="admin-content">
        <Breadcrumbs />
        <AdminContent />
      </div>
    </div>
  );
}
