import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SavingsIcon from '@mui/icons-material/Savings';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BalanceIcon from '@mui/icons-material/Balance';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import HistoryIcon from '@mui/icons-material/History';
import DevicesIcon from '@mui/icons-material/Devices';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { hasExistingData } from '../services/storage';
import ImportBackupButton from '../components/ImportBackupButton';
import LogoIcon from '../components/LogoIcon';
import { brand, heroBackground } from '../theme';

// Absolute so they match the URLs on the Google OAuth consent screen exactly
const PRIVACY_URL = 'https://uszakat.sspods.com/privacy';
const TERMS_URL = 'https://uszakat.sspods.com/terms';
const SOURCE_URL = 'https://github.com/sysofwan/USZakat';

const C = brand;

// Copy below is mirrored in the static home page in index.html — keep them in sync.
const FEATURES = [
  { icon: <AccountBalanceIcon />, title: 'Every account in one place', desc: 'Bank, brokerage, 401(k), IRA, HSA, and debt accounts, organized the way you hold them.' },
  { icon: <SavingsIcon />, title: 'Retirement accounts done right', desc: 'Long-term or short-term methods for 401(k)s and IRAs, including taxes and early-withdrawal penalties.' },
  { icon: <ShowChartIcon />, title: 'Stocks and funds', desc: 'Applies a zakatable-asset percentage to passively held stocks and funds — per fund or as a default.' },
  { icon: <BalanceIcon />, title: 'Live nisab check', desc: 'Compares your wealth against the nisab threshold using the current price of gold.' },
  { icon: <EventRepeatIcon />, title: 'Guided annual review', desc: 'A step-by-step zakat review each year on your hawl (lunar anniversary) date.' },
  { icon: <HistoryIcon />, title: 'History and payments', desc: 'Keep past reviews, track zakat payments as you make them, and export reports to Excel.' },
];

const STEPS = [
  { title: 'Add your accounts', desc: 'List your bank, brokerage, retirement, and debt accounts. No account numbers or logins needed.' },
  { title: 'Run your annual review', desc: 'On your hawl date, enter balances. The app applies FCNA methods, stock proxies, and the nisab check.' },
  { title: 'Pay and keep records', desc: 'See exactly what you owe, log payments as you make them, and export a report.' },
];

const DATA_POINTS = [
  { icon: <DevicesIcon />, title: 'Saved on your device', desc: 'Your financial information is saved in your browser and is never sent to our servers.' },
  { icon: <DescriptionIcon />, title: 'Backup files', desc: 'To keep it safe or use it on another device, download a backup file, or link a data file on your computer that updates as you work.' },
  { icon: <CloudIcon />, title: 'Why the app asks for Google Drive access', desc: 'Optional. If you connect it, the app uses Drive only to back up your zakat data to a hidden, app-only folder and to save Excel reports to a folder you pick. It can’t see the rest of your Drive, and never shares or sells your data.' },
];

// Illustrative numbers for the hero preview (long-term method, 30% stock proxy)
const EXAMPLE_ROWS = [
  { name: 'Checking & savings', note: 'Cash · 100% zakatable', value: '$12,400' },
  { name: 'Brokerage', note: 'Index funds · 30% zakatable', value: '$58,200' },
  { name: '401(k)', note: 'Long-term method · 30%', value: '$64,300' },
  { name: 'Credit card', note: 'Short-term debt', value: '−$1,800' },
];

function SectionHeading({ overline, title, subtitle }: { overline: string; title: string; subtitle?: string }) {
  return (
    <Box sx={{ textAlign: 'center', maxWidth: 640, mx: 'auto', mb: { xs: 4, md: 6 } }}>
      <Typography variant="overline" sx={{ color: C.primary, fontWeight: 700, letterSpacing: 1.5 }}>
        {overline}
      </Typography>
      <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mt: 0.5, fontSize: { xs: '1.6rem', md: '2.1rem' } }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function InfoCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3, height: '100%', borderRadius: 3, border: `1px solid ${C.border}`,
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: '0 8px 24px rgba(0,53,46,0.08)', transform: 'translateY(-2px)' },
      }}
    >
      <Box
        sx={{
          width: 48, height: 48, borderRadius: 2, display: 'grid', placeItems: 'center',
          bgcolor: C.mint, color: C.primary, mb: 2,
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, mb: 0.75 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{desc}</Typography>
    </Paper>
  );
}

function ExampleCard() {
  return (
    <Paper
      elevation={0}
      aria-label="Example zakat review"
      sx={{
        p: { xs: 2.5, sm: 3 }, borderRadius: 4, color: 'text.primary',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)', maxWidth: 420, mx: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Annual review</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Ramadan 1447 AH</Typography>
        </Box>
        <Chip label="Example" size="small" sx={{ bgcolor: C.mint, color: C.primary, fontWeight: 600 }} />
      </Box>
      <Stack divider={<Divider flexItem />} spacing={1.25}>
        {EXAMPLE_ROWS.map((row) => (
          <Box key={row.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.name}</Typography>
              <Typography variant="caption" color="text.secondary">{row.note}</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.value}</Typography>
          </Box>
        ))}
      </Stack>
      <Box sx={{ mt: 2.5, p: 2, borderRadius: 2.5, bgcolor: C.surface }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Zakatable wealth</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>$47,350</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">Nisab (85g gold)</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: C.primary }}>
            <CheckCircleIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Met</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Zakat due (2.5%)</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: C.primary, fontVariantNumeric: 'tabular-nums' }}>
            $1,184
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const existingData = hasExistingData();

  const primaryButton = (
    <Button
      variant="contained"
      size="large"
      endIcon={<ArrowForwardIcon />}
      onClick={() => navigate('/dashboard')}
      sx={{
        bgcolor: 'white', color: C.dark, fontWeight: 700, px: 4, py: 1.5, textTransform: 'none', fontSize: '1rem',
        width: { xs: '100%', sm: 'auto' },
        boxShadow: 'none', '&:hover': { bgcolor: C.mint, boxShadow: 'none' },
      }}
    >
      {existingData ? 'Welcome Back — View Dashboard' : 'Get Started'}
    </Button>
  );

  return (
    <Box sx={{ bgcolor: 'white', color: 'text.primary' }}>
      {/* Hero */}
      <Box sx={{ background: heroBackground, color: 'white' }}>
        <Container maxWidth="lg">
          <Box component="nav" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <LogoIcon size={34} />
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>US Zakat Calculator</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button href={PRIVACY_URL} sx={{ color: C.mintText, textTransform: 'none', display: { xs: 'none', sm: 'inline-flex' } }}>
                Privacy
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', '&:hover': { borderColor: 'white' } }}
              >
                Open Calculator
              </Button>
            </Box>
          </Box>

          <Grid container spacing={{ xs: 6, md: 8 }} sx={{ alignItems: 'center', pt: { xs: 4, md: 8 }, pb: { xs: 8, md: 12 } }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Chip
                icon={<LockIcon sx={{ fontSize: 16 }} />}
                label="Free · Private · No sign-up"
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: C.mint, fontWeight: 600, mb: 3, '& .MuiChip-icon': { color: C.accent } }}
              />
              <Typography
                component="h1"
                sx={{ fontWeight: 800, fontSize: { xs: '2.6rem', md: '3.6rem' }, lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                US Zakat Calculator
              </Typography>
              <Typography sx={{ fontSize: { xs: '1.35rem', md: '1.6rem' }, fontWeight: 600, color: C.accent, mt: 1.5 }}>
                Precise zakat. Total privacy.
              </Typography>
              <Typography sx={{ mt: 2.5, fontSize: '1.05rem', lineHeight: 1.7, color: C.mintText, maxWidth: 560 }}>
                US Zakat Calculator is a free web app that helps Muslims in the United States calculate the zakat
                they owe each year on cash, brokerage accounts, 401(k)s, IRAs, HSAs, gold, and other assets, using
                published rulings from the Fiqh Council of North America.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 4, alignItems: 'center' }}>
                {primaryButton}
                {!existingData && (
                  <ImportBackupButton
                    label="Restore from Backup"
                    variant="outlined"
                    onImported={() => navigate('/dashboard')}
                    sx={{
                      color: 'white', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', py: 1.4, px: 3,
                      width: { xs: '100%', sm: 'auto' },
                      fontSize: '1rem', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.06)' },
                    }}
                  />
                )}
              </Box>
              <Typography variant="body2" sx={{ mt: 2, color: C.mintText, opacity: 0.85 }}>
                {existingData ? '✓ Existing portfolio data detected in this browser' : 'Free. No sign-up or login required.'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <ExampleCard />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Trust strip */}
      <Box sx={{ borderBottom: `1px solid ${C.border}` }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 5, rowGap: 1.5, py: 2.5 }}>
            {['Based on Fiqh Council of North America rulings', 'Live gold price for nisab', 'Open source (MIT)'].map((t) => (
              <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: C.accent }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{t}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Features */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: C.surface }}>
        <Container maxWidth="lg">
          <SectionHeading
            overline="What it does"
            title="Everything you need for an accurate zakat calculation"
            subtitle="Built for the way Muslims in the US actually hold wealth — across banks, brokerages, and retirement plans."
          />
          <Grid container spacing={3}>
            {FEATURES.map((f) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
                <InfoCard {...f} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How it works */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <SectionHeading overline="How it works" title="Three steps, once a year" />
          <Grid container spacing={{ xs: 4, md: 6 }}>
            {STEPS.map((step, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={step.title} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Box
                  sx={{
                    width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    bgcolor: C.primary, color: 'white', fontWeight: 700, fontSize: '1.1rem',
                    mx: { xs: 0, md: 'auto' }, mb: 2,
                  }}
                >
                  {i + 1}
                </Box>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mb: 1 }}>{step.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 340, mx: { md: 'auto' } }}>
                  {step.desc}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Data storage & Google Drive disclosure */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: C.surface }}>
        <Container maxWidth="lg">
          <SectionHeading
            overline="Privacy"
            title="Your data and Google Drive"
            subtitle="Your zakat data stays with you. There’s no account to create and no server that stores your finances."
          />
          <Grid container spacing={3}>
            {DATA_POINTS.map((d) => (
              <Grid size={{ xs: 12, md: 4 }} key={d.title}>
                <InfoCard {...d} />
              </Grid>
            ))}
          </Grid>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Read our{' '}
            <Link href={PRIVACY_URL} sx={{ color: C.primary, fontWeight: 600 }}>Privacy Policy</Link>{' '}
            for full details.
          </Typography>
        </Container>
      </Box>

      {/* Closing CTA */}
      <Box sx={{ background: heroBackground, color: 'white', py: { xs: 8, md: 10 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700, fontSize: { xs: '1.6rem', md: '2.1rem' } }}>
            Ready to calculate your zakat?
          </Typography>
          <Typography sx={{ color: C.mintText, mt: 1.5, mb: 4 }}>
            Free. No sign-up or login required.
          </Typography>
          {primaryButton}
        </Container>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: C.ink, color: C.mintText, py: 4 }}>
        <Container
          maxWidth="lg"
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LogoIcon size={24} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>US Zakat Calculator</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Link href={PRIVACY_URL} color="inherit" underline="hover" variant="body2">Privacy Policy</Link>
            <Link href={TERMS_URL} color="inherit" underline="hover" variant="body2">Terms of Service</Link>
            <Link href={SOURCE_URL} color="inherit" underline="hover" variant="body2">Source Code</Link>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
