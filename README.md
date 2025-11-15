# Anna Murphy – Can I Afford It?

An interactive, mobile-friendly money planner crafted by financial clarity mentor Anna Murphy. It helps users decide whether they can comfortably afford a purchase right now with four quick inputs, a color-coded Money Health result, plain-English guidance, and an optional ConvertKit email capture that keeps the conversation going with Anna.

## Features

- 📊 **Affordability Planner** – cash balance, income, expenses, and purchase cost sliders with numeric inputs.
- 🌈 **Money Health Meter** – instant zone feedback (Healthy / Tight / Risky) with a cushion calculator.
- 🎉 **Gamified Delight** – celebratory confetti when the result moves into the Healthy zone.
- 💌 **Email Capture** – optional ConvertKit opt-in that sends the Money Health summary to the inbox and invites users to stay in touch with Anna Murphy.
- 📱 **Responsive Layout** – tuned for mobile-first usage with accessible controls and typography.

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to try the planner locally.

## Environment variables

Create a `.env.local` file with your Zapier webhook URL:

```bash
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/...
```

The email capture form calls the `/api/subscribe` route, which sends submissions to the Zapier webhook. The Zapier webhook should be configured to:
1. Log data to Google Sheets
2. Trigger a second Zap that adds the subscriber to ConvertKit

Leave `ZAPIER_WEBHOOK_URL` unset to work offline without triggering real API calls (the form will still validate but won't submit).

## Available scripts

| Script          | Description                               |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Start the local development server.       |
| `npm run build` | Generate an optimized production build.   |
| `npm run start` | Serve the production build locally.       |
| `npm run lint`  | Run ESLint using the project config.      |

## Design system highlights

- **Colors** – Emerald (#4FB286) for healthy results, Amber (#FFC857) for tight, and Rose (#E9724C) for risky.
- **Typography** – Poppins for display headlines and Inter for body copy, loaded via the shared Google Fonts import.
- **Tone** – Supportive, human language that reflects Anna Murphy's calm, confidence-building coaching (“No spreadsheets. No judgment.”).

## Deployment

The app is optimized for deployment on Vercel. Push the repository to GitHub, connect the project in Vercel, and add the required environment variables in the dashboard. Every push to your main branch will trigger a new preview build.

If you previously customized the project to deploy as a static site, make sure the **Build & Output Settings → Output Directory** field is empty. The included `vercel.json` pins the build step to the official Next.js runtime so Vercel produces the correct serverless output even when the project was created with an alternate preset. After updating the configuration, trigger a redeploy and the root route (`/`) should serve the planner instead of the generic 404 page.
