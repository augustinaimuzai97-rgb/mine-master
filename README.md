# Mine Master — starter application

A React + TypeScript + Supabase + Netlify starter for a rewards dashboard.

## Included in this first build

- Email/password registration and login
- User profile and wallet creation trigger
- Dashboard with points balance
- Daily mining reward claim (once per UTC day)
- Daily check-in reward claim (once per UTC day)
- Transaction history
- Responsive layout for mobile and desktop
- Server-side reward claim function
- Supabase Row Level Security policies

## Important scope and safety notes

This starter uses **MM points**, not real money. It is not a bank, deposit-taking service, investment product, or proof of income. Mining rewards are simulated platform rewards. Deposits, cash withdrawals, transfers, KYC, and payment-provider connections are intentionally not activated. Do not collect bank account details or promise cash returns until you have a lawful business model, suitable licences/approvals where required, and a verified payment/payout provider.

## 1. Requirements

- Node.js 20 or newer
- A Supabase account/project
- A Netlify account
- A GitHub account (recommended for deployment)

## 2. Install locally

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not put the Supabase service-role key in any `VITE_` variable.

## 3. Configure Supabase

1. Create a new Supabase project.
2. Open **SQL Editor**.
3. Run all of `supabase/schema.sql`.
4. Open **Project Settings → API** and copy the Project URL and anon/publishable key into `.env`.
5. In **Authentication → URL Configuration**, add your local URL `http://localhost:5173` and your deployed Netlify URL to the allowed redirect URLs.
6. For early testing, you can configure email confirmation according to your testing needs. For a public launch, configure a real email provider and keep confirmation enabled.

## 4. Configure server secrets

In Netlify, open **Site configuration → Environment variables** and add:

- `SUPABASE_URL` — your project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the secret service-role key from Supabase
- `MINE_MASTER_DAILY_REWARD` — points per daily mining claim, e.g. `10`
- `MINE_MASTER_CHECKIN_REWARD` — points per daily check-in, e.g. `2`

Keep the service-role key private. Never put it in frontend code, GitHub, screenshots, or a public `.env` file.

## 5. Run locally

```bash
npm run dev
```

Open the local URL shown by Vite. To test the Netlify Function locally, install the Netlify CLI and run:

```bash
npx netlify dev
```

Netlify CLI needs the server environment variables available locally. Use a private local `.env` file and never commit it.

## 6. Deploy to Netlify

1. Push this project to a private GitHub repository.
2. In Netlify choose **Add new site → Import an existing project**.
3. Connect GitHub and select the repository.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Add the four server environment variables listed above and the two `VITE_` variables.
7. Deploy the site.
8. Add the final Netlify URL to Supabase Auth's allowed redirect URLs.
9. Test signup, email confirmation, login, dashboard loading, mining claim, check-in, and duplicate-claim rejection.

## 7. Before a public launch

- Set up a custom domain and HTTPS.
- Configure email delivery and account recovery.
- Review Supabase RLS policies and database backups.
- Add rate limiting / abuse controls to reward claims.
- Add monitoring and audit logs.
- Have the privacy policy and terms reviewed.
- Obtain legal/compliance advice before adding real-money deposits, balances, transfers, or withdrawals.

## Project structure

```text
mine-master/
├── netlify/
│   └── functions/
│       └── claim-reward.mts
├── src/
│   ├── lib/
│   │   └── supabase.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── style.css
├── supabase/
│   └── schema.sql
├── .env.example
├── .gitignore
├── index.html
├── netlify.toml
├── package.json
├── tsconfig.json
└── vite.config.ts
```
