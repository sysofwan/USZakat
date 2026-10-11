# US Zakat Calculator

A web app to calculate zakat for US-based income and investment portfolios. Supports stocks, retirement accounts (401k/IRA/HSA), gold, Bitcoin, cash, and other assets with full transparency into the calculation methodology.

**Live:** [uszakat.sspods.com](https://uszakat.sspods.com/)

## Features

- **Multi-account portfolio** — Add brokerage, retirement (401k, IRA, Roth, HSA), cash, gold, Bitcoin, and other accounts
- **Three retirement methods** — FCNA Long-term, FCNA Short-term, or AMJA Accessible Amount, each linked to its source fatwas
- **Retirement account handling** — Traditional, Roth, mixed, and HSA accounts, with tax and early-withdrawal penalty rules
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

Zakat is 2.5% of net zakatable wealth, due each lunar (Hijri) year once wealth reaches the Nisab (85g of gold). Stock and retirement treatment follows the Fiqh Council of North America (FCNA) rulings on [stocks](https://fiqhcouncil.org/zakah-on-stocks/) and [retirement funds](https://fiqhcouncil.org/zakah-on-retirement-funds/), with the Assembly of Muslim Jurists of America (AMJA) method available as an alternative for retirement accounts.

### Asset treatment
- **Cash, bonds, gold & silver ETFs, Bitcoin, actively traded stocks** — 100% of market value.
- **Long-term stocks / funds** — Only the zakatable portion: the underlying companies' zakatable assets (cash, receivables, inventory) as a share of market value. Defaults to the FCNA's 30% estimate; per-symbol percentages can be entered instead (see `scripts/update_zakat_proxy.py`, which estimates them as current assets ÷ market cap).
- **Debts** — Short-term debts (e.g. current credit card balances) are deducted; long-term debts (mortgages, student and auto loans) are not.

### Retirement accounts (401k, IRA, HSA)

| Method | Stocks | Cash, bonds, metals, Bitcoin | Tax & penalty | Source |
|---|---|---|---|---|
| **FCNA Long-term** (default) | Zakatable portion | Full value | Not deducted, since they will not be incurred | [FCNA retirement fatwa](https://fiqhcouncil.org/zakah-on-retirement-funds/) |
| **FCNA Short-term** | Full market value | Full value | Deducted | [FCNA retirement fatwa](https://fiqhcouncil.org/zakah-on-retirement-funds/) |
| **AMJA Accessible Amount** | Zakatable portion | Full value | Deducted from the whole account | [2019 Imams' Conference recommendations](https://www.amjaonline.org/declaration-articles/recommendations-of-the-16-th-annual-imams-conference-on-contemporary-financial-issues-real-estate-and-retirement-accounts) (not final AMJA resolutions): §34 deduct taxes & penalties, §36 zakatable share of stocks; fatwa [87102](https://www.amjaonline.org/fatwa/en/87102/zakat-on-ira) (~30% estimate on the withdrawable amount); fatwa [23284](https://www.amjaonline.org/fatwa/en/23284/zakat-and-the-401k-retirement-plan) (withdrawable − penalty − tax) |

FCNA's two methods are chosen by intent and can't be mixed within an account. AMJA's method rests on full ownership: zakat is due only on what could be withdrawn today.

Penalties (FCNA Short-term and AMJA only): 10% for retirement accounts (waived at 59½+); 20% for HSAs on non-medical withdrawals (waived at 65+). Roth accounts deduct the penalty only, not tax.

## License

[MIT](LICENSE)
