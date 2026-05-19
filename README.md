# US Zakat Calculator

A web app to calculate zakat for US-based income and investment portfolios. Supports stocks, retirement accounts (401k/IRA), gold, cash, and other assets with full transparency into the calculation methodology.

**Live:** [uszakat.sayyidsofwan.com](https://uszakat.sayyidsofwan.com)

## Features

- **Multi-account portfolio** — Add brokerage, retirement (401k, IRA, Roth), cash, gold, and other accounts
- **Two calculation methods** — Short-term (full market value) and Long-term/FCNA (CMA proxy deductions)
- **Retirement account handling** — Splits stock vs non-stock assets; applies tax/penalty deductions for trapped non-stock holdings
- **Nisab calculation** — Real-time gold price from [Gold-API.com](https://www.gold-api.com) for 85g gold threshold
- **Step-by-step wizard** — Guided annual review with live zakat estimate as you enter data
- **Excel export** — Auditable spreadsheet with formulas showing every calculation step
- **History tracking** — Save, review, and compare past zakat calculations with payment records
- **Google Drive backup** — Optional cloud sync and Excel report storage (no server required)
- **Fully client-side** — All data stays in your browser (localStorage); nothing sent to any server

## Tech Stack

- React 19 + TypeScript
- Material UI (MUI)
- Vite
- ExcelJS (for spreadsheet export)
- Google Identity Services (optional Drive integration)
- Deployed to GitHub Pages

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The app is configured for GitHub Pages deployment:

```bash
npm run build
# Deploy the `dist/` folder to your GitHub Pages branch
```

## Google Drive Integration (Optional)

The app supports optional Google Drive backup. To use it:

1. Sign in via the sidebar when the app is running
2. Portfolio data auto-syncs to Drive's hidden app folder
3. Excel reports can be saved directly to a Drive folder of your choice

No server is required — authentication uses Google Identity Services (GIS) with client-side OAuth.

## Zakat Calculation Methods

### Short-term (Full Market Value)
Uses current market value of all assets. For retirement accounts, applies early withdrawal tax and penalty deductions.

### Long-term / FCNA (First Clear Net Assets)
For stocks held long-term, uses CMA proxy (Current Market Assets) which deducts liabilities from market value. Non-stock assets in retirement accounts still receive tax/penalty deductions since they are trapped in the retirement wrapper.

## License

[MIT](LICENSE)
