import {
  Box,
  Card,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';

export default function AboutPage() {
  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        About & Methodology
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Scholarly Basis
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ZakatFolio implements Zakat rulings based on the methodology outlined by{' '}
            <strong>Sh. Dr. Yasir Qadhi</strong> and the{' '}
            <strong>Fiqh Council of North America (FCNA)</strong>, tailored for modern
            North American Muslim investors with complex financial portfolios.
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            The 25% Stock Proxy
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            For passive, long-term stock market investments, Zakat is calculated on only{' '}
            <strong>25% of the total market value</strong>. This proxy accounts for the
            non-zakatable corporate assets (land, buildings, machinery) that do not
            represent trade goods.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Formula: Zakatable Value = Market Value × 0.25
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Net Liquid Value (Retirement Accounts)
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Zakat is only due on the amount you could legally withdraw today — the net
            liquid value. This represents full, unencumbered ownership.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Traditional (Pre-Tax) Accounts
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Net Value = Account Base × (1 − Tax Rate − 10% Penalty)
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Roth (Post-Tax) Accounts
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Net Value = Account Base × (1 − 10% Penalty)
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Mixed Accounts
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The balance is split into Roth and Traditional portions, with respective
            deductions applied to each before summing.
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
            ZakatFolio follows a <strong>zero-knowledge architecture</strong>. Your
            financial data is stored exclusively on your device (localStorage) and
            optionally synced to your personal Google Drive. No data is ever sent to
            or stored on any third-party server.
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
        ZakatFolio — Precise Zakat. Total Privacy.
      </Typography>
    </Box>
  );
}
