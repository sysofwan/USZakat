import {
  Box,
  Card,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';
import PageContainer from '../components/PageContainer';

export default function AboutPage() {
  return (
    <PageContainer title="About & Methodology">

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Scholarly Basis
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ZakatUSA implements zakat rulings based on the methodology outlined by{' '}
            <strong>Dr. Yasir Qadhi</strong> and the{' '}
            <strong>Fiqh Council of North America (FCNA)</strong>, tailored for
            North American Muslim investors with retirement and brokerage accounts.
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Why Passive Stocks Use a Proxy
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Zakat on business ownership is due on the zakatable assets of the business —
            cash, receivables, and inventory — not on fixed assets like buildings or
            equipment. For passive, long-term stock investments, a{' '}
            <strong>proxy percentage (default 25%)</strong> estimates the zakatable
            portion. You can adjust this per-review based on your fund's actual ratio
            (e.g. via zakat.zoya.finance).
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Formula: Zakatable Value = Market Value × Proxy %
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Retirement Accounts — Two Methods
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Per the FCNA ruling, there are two mutually exclusive methods for
            calculating zakat on retirement accounts (401k, IRA, HSA):
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Method 1: Long-term Investment (Recommended)
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Apply the zakatable proxy percentage — no tax or penalty deductions.
            This treats the account as a long-term business investment.
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Method 2: Short-term / Liquid View
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Use full market value, then deduct taxes and early withdrawal penalties.
            This treats the account as a liquid asset you could cash out today.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Note: If you are 59½ or older, the 10% early withdrawal penalty is waived.
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Asset Types
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Cash:</strong> 100% zakatable.
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Stocks (Passive/Long-term):</strong> 25% proxy applied.
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Stocks (Active Trading):</strong> 100% zakatable.
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Bonds / Fixed Income:</strong> 100% of principal zakatable.
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Gold & Silver ETFs:</strong> 100% zakatable.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Nisab Threshold
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Zakat is only obligatory when your net zakatable wealth equals or exceeds
            the Nisab — the equivalent of <strong>85 grams of gold</strong> at current
            market prices. If below Nisab, no Zakat is due.
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Debt Treatment
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Only <strong>short-term liabilities</strong> — such as immediate credit card
            balances and current month's bills — are deductible from your zakatable
            wealth. Long-term debts like mortgages and student loans are excluded.
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Privacy & Data Ownership
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ZakatUSA follows a <strong>privacy-first design</strong>. Your
            financial data is stored exclusively in your browser's local storage.
            No data is ever sent to or stored on any server.
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
        ZakatUSA — Precise Zakat. Total Privacy.
      </Typography>
    </PageContainer>
  );
}
