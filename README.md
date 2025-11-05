# Money Made Simple – Can I Afford It?

An interactive, mobile-friendly money planner that helps users decide whether they can comfortably afford a purchase right now. The experience mirrors the project handover document provided by Girl Let's Talk Money: four quick inputs, a color-coded Money Health result, plain-English guidance, and optional ConvertKit email capture.

## Features

- 📊 **Affordability Planner** – cash balance, income, expenses, and purchase cost sliders with numeric inputs.
- 🌈 **Money Health Meter** – instant zone feedback (Healthy / Tight / Risky) with a cushion calculator.
- 🎉 **Gamified Delight** – celebratory confetti when the result moves into the Healthy zone.
- 💌 **Email Capture** – optional ConvertKit opt-in that sends the Money Health summary to the inbox.
- 📱 **Responsive Layout** – tuned for mobile-first usage with accessible controls and typography.

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to try the planner locally.

## Environment variables

Create a `.env.local` file with your ConvertKit credentials:

```bash
CONVERTKIT_API_KEY=your_api_key
CONVERTKIT_FORM_ID=your_form_id
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/... # Optional
# Optional: point to a different base URL (defaults to the public API)
# CONVERTKIT_BASE_URL=https://api.convertkit.com/v3
```

The email capture form calls the `/api/subscribe` route, which relays submissions directly to ConvertKit using the values above. Leave the fields unset to work offline without triggering real API calls. When `ZAPIER_WEBHOOK_URL` is present, the route will also forward the subscription summary to Zapier after a successful ConvertKit request.

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
- **Tone** – Supportive, human language pulled from the handover brief (“No spreadsheets. No judgment.”).

## Deployment

The app is optimized for deployment on Vercel. Push the repository to GitHub, connect the project in Vercel, and add the required environment variables in the dashboard. Every push to your main branch will trigger a new preview build.

If you previously customized the project to deploy as a static site, make sure the **Build & Output Settings → Output Directory** field is empty. The included `vercel.json` pins the build step to the official Next.js runtime so Vercel produces the correct serverless output even when the project was created with an alternate preset. After updating the configuration, trigger a redeploy and the root route (`/`) should serve the planner instead of the generic 404 page.
