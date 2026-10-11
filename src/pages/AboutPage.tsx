import {
  Box,
  Card,
  CardContent,
  Divider,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PageContainer from '../components/PageContainer';
import { ZAKAT_METHOD_SOURCES } from '../types';

export default function AboutPage() {
  return (
    <PageContainer overline="About" title="About & Methodology" subtitle="How US Zakat Calculator applies published rulings to your accounts.">

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Scholarly Basis
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            US Zakat Calculator implements zakat rulings based on the methodology outlined by{' '}
            <strong>Dr. Yasir Qadhi</strong> and the{' '}
            <strong>Fiqh Council of North America (FCNA)</strong>, tailored for
            North American Muslim investors with retirement and brokerage accounts.
            For retirement accounts, you can instead choose the method of the{' '}
            <strong>Assembly of Muslim Jurists of America (AMJA)</strong>.
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
            <strong>proxy percentage (default 30%, per the FCNA)</strong> estimates the
            zakatable portion. You can adjust this per-review based on your fund's
            actual ratio.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Formula: Zakatable Value = Market Value × Proxy %
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Retirement Accounts — Three Methods
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Scholars differ on how to zakat a 401(k), IRA, or HSA you can&apos;t fully access
            yet. You can choose between the two FCNA methods and the AMJA method in Settings
            or during each annual review.
          </Typography>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Fiqh Council of North America (FCNA)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Source:{' '}
            <Link href={ZAKAT_METHOD_SOURCES.fcnaRetirement} target="_blank" rel="noopener">
              Zakat on Retirement Accounts
            </Link>{' '}
            (Council-approved, updated Feb 2026) and{' '}
            <Link href={ZAKAT_METHOD_SOURCES.fcnaStocks} target="_blank" rel="noopener">
              Zakat on Stocks
            </Link>
            . You choose by your intent for the funds, and the two methods can&apos;t be mixed.
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            FCNA Long-term (Recommended)
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Apply the zakatable proxy percentage to stocks; cash, bonds, metals, and
            Bitcoin count at full value. No tax or penalty deductions, since they will
            not be incurred. This treats the account as a long-term investment.
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            FCNA Short-term
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Use full market value, then deduct taxes and early withdrawal penalties.
            This treats the account as a liquid asset you could cash out today.
          </Typography>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Assembly of Muslim Jurists of America (AMJA)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Sources: the{' '}
            <Link href={ZAKAT_METHOD_SOURCES.amjaRecommendations} target="_blank" rel="noopener">
              16th Imams&apos; Conference recommendations
            </Link>{' '}
            (2019; AMJA notes these are not its final resolutions), §34 on deducting taxes
            and penalties and §36 on estimating the zakatable share of stocks;{' '}
            <Link href={ZAKAT_METHOD_SOURCES.amjaIra} target="_blank" rel="noopener">
              Fatwa 87102
            </Link>{' '}
            (Dr. Hatem al-Haj, 2012), which combines a ~30% zakatable-asset estimate with
            the withdrawable amount and suggests one fifth of the total as a reasonable
            estimate; and{' '}
            <Link href={ZAKAT_METHOD_SOURCES.amja401k} target="_blank" rel="noopener">
              Fatwa 23284
            </Link>{' '}
            (Dr. Main Al-Qudah, 2008), whose formula is withdrawable amount − penalty − tax.
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            AMJA Accessible Amount
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Full ownership is a condition of zakat, so zakat is due only on what you could
            withdraw today. Apply the zakatable proxy percentage to stocks, then deduct taxes
            and early withdrawal penalties from the whole account.
          </Typography>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            How they differ
          </Typography>
          <Box sx={{ overflowX: 'auto', mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Method</TableCell>
                  <TableCell>Stocks</TableCell>
                  <TableCell>Tax &amp; penalty</TableCell>
                  <TableCell align="right">Example</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>FCNA Long-term</TableCell>
                  <TableCell>Zakatable portion</TableCell>
                  <TableCell>Not deducted</TableCell>
                  <TableCell align="right">$750</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>FCNA Short-term</TableCell>
                  <TableCell>Full market value</TableCell>
                  <TableCell>Deducted</TableCell>
                  <TableCell align="right">$1,700</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>AMJA</TableCell>
                  <TableCell>Zakatable portion</TableCell>
                  <TableCell>Deducted</TableCell>
                  <TableCell align="right">$510</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Example: zakat on a $100,000 Traditional 401(k) in stock index funds, with a 30%
            proxy, 22% tax rate, and 10% early withdrawal penalty.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Note: If you are 59½ or older, the 10% early withdrawal penalty is waived.
            For HSAs, the 20% non-medical withdrawal penalty is waived at 65. Neither
            FCNA nor AMJA addresses HSAs specifically; the app treats them like other
            retirement accounts.
            Roth accounts deduct the penalty only, not tax.
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
              <strong>Stocks (Passive/Long-term):</strong> 30% proxy applied (or your fund's actual ratio).
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
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Bitcoin:</strong> 100% of market value zakatable, per the FCNA
              ruling that zakat is due on Bitcoin held for a lunar year above Nisab.
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
            US Zakat Calculator follows a <strong>privacy-first design</strong>. Your
            financial data is stored in your browser's local storage, and optionally in a
            backup file on your computer or your own Google Drive. No data is ever sent to or
            stored on our servers.
          </Typography>
          <Typography variant="body2">
            <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link>
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
        US Zakat Calculator — Precise Zakat. Total Privacy.
      </Typography>
    </PageContainer>
  );
}
