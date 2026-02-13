import { Link, useLocation } from "wouter";

const menuItems = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/company", label: "Company" },
  { href: "/account/reports", label: "Reports" },
  { href: "/account/billing", label: "Billing" },
  { href: "/account/security", label: "Security" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="account-layout">
      <nav className="account-sidebar">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <span
              className={
                "account-sidebar-link" +
                (location === item.href ? " active" : "")
              }
            >
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
      <div className="account-content">{children}</div>
    </div>
  );
}
