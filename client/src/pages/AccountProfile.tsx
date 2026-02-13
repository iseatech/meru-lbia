import { useState, useEffect } from "react";
import AccountLayout from "../components/AccountLayout";

const STORAGE_KEY = "meru_profile";

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  country: string;
}

const empty: ProfileData = {
  fullName: "",
  email: "demo@meruexpress.com",
  phone: "",
  role: "",
  country: "",
};

export default function AccountProfile() {
  const [form, setForm] = useState<ProfileData>(empty);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setForm(JSON.parse(raw)); } catch {}
    }
  }, []);

  function handleChange(field: keyof ProfileData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSaved(true);
  }

  return (
    <AccountLayout>
      <h1>Profile</h1>
      <form onSubmit={handleSave} className="account-form">
        <label>
          Full Name
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            data-testid="input-profile-name"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            readOnly
            className="input-readonly"
            data-testid="input-profile-email"
          />
        </label>
        <label>
          Phone
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            data-testid="input-profile-phone"
          />
        </label>
        <label>
          Role / Title
          <input
            type="text"
            value={form.role}
            onChange={(e) => handleChange("role", e.target.value)}
            data-testid="input-profile-role"
          />
        </label>
        <label>
          Country
          <input
            type="text"
            value={form.country}
            onChange={(e) => handleChange("country", e.target.value)}
            data-testid="input-profile-country"
          />
        </label>
        <button type="submit" className="btn-primary" data-testid="button-save-profile">Save</button>
        {saved && <span className="save-msg">Saved (demo)</span>}
      </form>
    </AccountLayout>
  );
}
