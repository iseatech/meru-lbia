import { Link } from "wouter";
import AccountLayout from "../components/AccountLayout";
import SEO from "../components/SEO";

export default function MyAccount() {
  return (
    <AccountLayout>
      <SEO
        title="My Account - Meru Express"
        description="Manage your Meru Express account, view reports, and update your profile."
        canonical="/account"
      />
      <h1>Dashboard</h1>
      <p className="account-welcome">Welcome back to Meru Express.</p>

      <div className="dashboard-cards">
        <div className="dash-card">
          <h3>Start New Analysis</h3>
          <p>Submit a logistics or customs request.</p>
          <Link href="/services">
            <span className="btn-primary" data-testid="button-new-analysis">Go to Services</span>
          </Link>
        </div>
        <div className="dash-card">
          <h3>View Reports</h3>
          <p>Access your completed analyses and downloads.</p>
          <Link href="/account/reports">
            <span className="btn-primary" data-testid="button-view-reports">View Reports</span>
          </Link>
        </div>
        <div className="dash-card">
          <h3>Update Company Profile</h3>
          <p>Keep your company details current.</p>
          <Link href="/account/company">
            <span className="btn-primary" data-testid="button-update-company">Edit Company</span>
          </Link>
        </div>
      </div>

      <div className="status-card">
        <h3>Account Status</h3>
        <table className="status-table">
          <tbody>
            <tr>
              <td className="status-label">Plan</td>
              <td>Starter (demo)</td>
            </tr>
            <tr>
              <td className="status-label">Last login</td>
              <td>&mdash;</td>
            </tr>
            <tr>
              <td className="status-label">Data retention</td>
              <td>&mdash;</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AccountLayout>
  );
}
