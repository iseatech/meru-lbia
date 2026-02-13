import AccountLayout from "../components/AccountLayout";

export default function AccountBilling() {
  return (
    <AccountLayout>
      <h1>Billing</h1>
      <p className="billing-notice">Billing will be enabled at launch.</p>
      <form className="account-form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Card
          <input type="text" value="**** **** **** ****" disabled className="input-disabled" data-testid="input-billing-card" />
        </label>
        <label>
          Billing Email
          <input type="email" value="" disabled placeholder="—" className="input-disabled" data-testid="input-billing-email" />
        </label>
        <label>
          Billing Address
          <input type="text" value="" disabled placeholder="—" className="input-disabled" data-testid="input-billing-address" />
        </label>
        <button type="button" className="btn-primary" disabled data-testid="button-update-billing">
          Update billing (coming soon)
        </button>
      </form>
    </AccountLayout>
  );
}
