# Browser testing

Run the public route, responsive, accessibility-name, and admin-protection checks:

```powershell
npm run test:browser:install
npm run test:browser
```

The suite defaults to `http://127.0.0.1:3000` and starts the built app. Set `E2E_BASE_URL` only for an isolated staging deployment.

Authenticated admin checks require an isolated staging Supabase session saved as Playwright storage state:

```powershell
$env:E2E_BASE_URL = "https://staging.example.com"
$env:E2E_ADMIN_STORAGE_STATE = "C:\path\to\staging-admin-state.json"
npm run test:browser
```

Do not use production credentials or production storage state. The authenticated suite only opens admin screens; destructive CRUD and enquiry tests must run against staging fixtures.
