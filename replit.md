# Meru Express

## Overview
Meru Express logistics decision intelligence SPA with real authentication (Google OAuth via Replit Auth + email/password with bcrypt), PostgreSQL session storage, admin role system, TOTP 2FA for admin dashboard access, DB-first trade.gov intelligence layer, and account management area.

## Recent Changes
- 2026-02-12: 2FA moved into /admin/system page — AdminPanelGate now redirects to /admin/system instead of /admin/2fa/* routes. SystemAdmin page shows 2FA setup/verify/status section at top. AdminGate (for /dashboard) also redirects to /admin/system. Back navigation added to admin sidebar (Admin Home + Back to Site). RolesAdmin now has CTA linking to /admin/users.
- 2026-02-11: Admin audit & control for trade.gov intelligence — GET list/entry/:id, POST deactivate/:id endpoints, is_active soft-delete column, DB loader filters active-only, test script in server/dev/.
- 2026-02-11: Trade.gov DB-first intelligence layer — meru_tradegov_sources + meru_tradegov_entries tables, DB loader (intelligence.tradegov.db.ts), engine updated to try DB first then fallback to static, admin ingest route added.
- 2026-02-11: Trade & Country Intelligence section added to PDF and HTML brief output via briefTemplate.ts with service-mode gating.
- 2026-02-11: Document Integrity & Verification Layer — meru_document_verifications table, verification codes, PDF SHA-256 hashing, Code128 barcode + QR code embedded in PDF, public GET /verify/:code endpoint.
- 2026-02-11: Intelligence Engine foundation — static country intelligence for China/Russia, integrated into POST /meru/decision-briefs pipeline.
- 2026-02-11: Admin 2FA system implemented — meru_user_roles + meru_admin_2fa tables, admin bootstrap route, TOTP 2FA setup/verify endpoints with AES-256-GCM encrypted secrets and SHA-256 hashed recovery codes.
- 2026-02-11: Full auth system implemented — Google OAuth (Replit OIDC), email/password register/login with bcrypt, server-side password validation, PostgreSQL session storage, 30-min inactivity auto-logout.
- 2026-02-11: Rebuilt from scratch with plain CSS, exact file structure per spec.

## Architecture
- **Frontend**: React SPA with wouter routing, plain CSS (styles.css)
- **Backend**: Express with auth + admin API routes, Vite dev server integration
- **Auth**: Replit OIDC (Google OAuth) + email/password with bcrypt. Sessions in PostgreSQL via connect-pg-simple. 7-day TTL, 30-min inactivity timeout.
- **Admin**: Role-based access via meru_user_roles table. Admin bootstrap via env-key-protected endpoint. TOTP 2FA required for /dashboard.
- **2FA**: TOTP via otpauth library. Secrets encrypted with AES-256-GCM (TOTP_ENCRYPTION_KEY env). Recovery codes hashed with SHA-256.
- **Intelligence Engine**: DB-first strategy. Queries meru_tradegov_entries for curated trade.gov data, falls back to static country intelligence if no DB match. Runtime = DB lookup only, no external API calls.
- **Document Integrity**: Verification codes (MERU-YYYYMMDD-HHMMSS-XXXXXXXX), PDF SHA-256 hashing, Code128 barcode + QR code in PDF, public verification endpoint.
- **Database**: PostgreSQL with Drizzle ORM. Tables: users, sessions, meru_user_roles, meru_admin_2fa, meru_decision_briefs, meru_document_verifications, meru_tradegov_sources, meru_tradegov_entries.
- **Pages**: Landing, About, Services (8 subservice pages), Designed For, Sample, Contact, Sign Up, Log In, Dashboard (admin+2FA gated), Account area, 2FA Setup, 2FA Verify
- **Layout**: Shared Header/Footer + AccountLayout sidebar for /account/* pages

## Intelligence Engine Flow
1. `runIntelligenceEngine(country)` is called when creating a decision brief
2. First tries `loadTradeGovIntelligence(country)` — queries meru_tradegov_entries by country_code or country_name
3. If DB match found, returns IntelligenceResult with source: "DB"
4. If no DB match, falls back to `staticCountryIntelligence(country)` with source: "STATIC"
5. Result stored as intelligence_result_json in meru_decision_briefs
6. Rendered in PDF via renderIntelligencePdf() with service-mode gating (LOGISTICS_ONLY, COMPLIANCE_ONLY, COMBINED)

## Ingesting Trade.gov Data (curl example)
```bash
curl -X POST https://your-app.replit.app/admin/intelligence/tradegov/ingest \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_ADMIN_SESSION" \
  -d '{
    "country_code": "CN",
    "country_name": "China",
    "topic": "Section 301 Tariffs",
    "summary": "Additional tariffs on Chinese goods under Section 301.",
    "tags": ["tariff", "section-301", "trade-war"],
    "risk_level": "HIGH",
    "barriers": ["Tariff: Additional 25% duties on List 4A goods"],
    "regulatory_flags": ["USTR: Section 301 tariff exclusion process"],
    "sector_insights": ["Electronics: Supply chain diversification accelerating"],
    "source": {
      "title": "Trade.gov China Country Commercial Guide",
      "url": "https://www.trade.gov/country-commercial-guides/china",
      "publisher": "International Trade Administration",
      "updated_at": "2026-01-15"
    }
  }'
```

## Key Files
- `client/src/App.tsx` - Router with all routes, DashboardGate (admin+2FA enforcement), InactivityWrapper
- `client/src/hooks/use-auth.ts` - useAuth hook: user, isAdmin, twoFaEnabled, twoFaVerified, refetch
- `client/src/hooks/useInactivityLogout.ts` - 30-min inactivity logout
- `client/src/pages/TwoFaSetup.tsx` - 2FA setup flow (QR code, recovery codes, confirm)
- `client/src/pages/TwoFaVerify.tsx` - 2FA verification (TOTP code or recovery code)
- `client/src/components/Header.tsx` - Guest/logged-in nav
- `client/src/styles.css` - All plain CSS
- `server/admin.ts` - isAdmin helper, requireAdmin middleware, admin bootstrap, 2FA endpoints, tradegov ingest route
- `server/routes.ts` - Email/password register/login, decision-briefs CRUD, PDF generation, verify endpoint
- `server/intelligence/intelligence.engine.ts` - DB-first intelligence with static fallback
- `server/intelligence/intelligence.sources.ts` - Static country intelligence (China, Russia, default)
- `server/intelligence/intelligence.types.ts` - IntelligenceResult type definitions
- `server/intelligence/intelligence.tradegov.db.ts` - DB loader for trade.gov curated entries
- `server/security/documentIntegrity.ts` - Verification code generation, PDF hashing, barcode/QR generation
- `server/meru/briefTemplate.ts` - HTML and PDF rendering for Trade & Country Intelligence section
- `server/replit_integrations/auth/replitAuth.ts` - Session config, OIDC, isAuthenticated middleware
- `server/replit_integrations/auth/routes.ts` - /api/auth/user (returns role, twoFaEnabled, twoFaVerified)
- `shared/models/auth.ts` - All Drizzle schema definitions

## Auth Endpoints
- `POST /api/auth/register` - Create account with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/user` - Get current user + role + 2FA status
- `GET /api/login` - Google OAuth via Replit OIDC
- `GET /api/logout` - Destroy session

## Admin Endpoints
- `POST /api/admin/bootstrap` - Grant admin role (requires x-admin-bootstrap-key header)
- `GET /api/admin/2fa/status` - Check admin/2FA status
- `POST /api/admin/2fa/setup` - Generate TOTP secret, QR code, recovery codes
- `POST /api/admin/2fa/confirm-setup` - Verify initial TOTP code to enable 2FA
- `POST /api/admin/2fa/verify` - Verify TOTP code or recovery code to unlock session
- `GET /admin/intelligence/tradegov/list` - Admin-only: list entries with optional country filter, pagination
- `GET /admin/intelligence/tradegov/entry/:id` - Admin-only: full entry detail with source metadata
- `POST /admin/intelligence/tradegov/deactivate/:id` - Admin-only: soft-deactivate entry (sets is_active=false)
- `POST /admin/intelligence/tradegov/ingest` - Admin-only: ingest trade.gov curated data

## Decision Brief Endpoints
- `POST /meru/decision-briefs` - Create brief (auto-runs intelligence engine)
- `GET /meru/decision-briefs/:id/pdf` - Generate PDF with intelligence + verification
- `GET /verify/:code` - Public verification endpoint

## DashboardGate Flow
1. Not authenticated -> /auth/login
2. Not admin -> /account
3. Admin, no 2FA enabled -> /admin/2fa/setup
4. Admin, 2FA enabled, not verified this session -> /admin/2fa/verify
5. Admin, 2FA enabled + verified -> Show Dashboard

## Routes
- `/` Landing, `/about`, `/services`, `/designed-for`, `/sample`, `/contact`
- `/services/logistics-decision-brief`, `/services/customs/*`, `/services/combined`
- `/auth/signup`, `/auth/login`
- `/dashboard` - Admin dashboard (gated)
- `/admin/2fa/setup`, `/admin/2fa/verify`
- `/account`, `/account/profile`, `/account/company`, `/account/reports`, `/account/billing`, `/account/security`

## Environment Variables
- `SESSION_SECRET` - Express session secret
- `ADMIN_BOOTSTRAP_KEY` - Key for admin bootstrap endpoint
- `TOTP_ENCRYPTION_KEY` - 64-char hex key for AES-256-GCM encryption of TOTP secrets
- `DATABASE_URL` - PostgreSQL connection string

## Design
- Plain CSS, no Tailwind, no shadcn
- Simple flexbox responsive layout

## User Preferences
- STRICT MODE: Plain CSS only, no UI frameworks
