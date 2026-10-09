import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Link,
  Paper,
  Typography,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CalculateIcon from '@mui/icons-material/Calculate';
import StorageIcon from '@mui/icons-material/Storage';
import { hasExistingData } from '../services/storage';
import ImportBackupButton from '../components/ImportBackupButton';
import LogoIcon from '../components/LogoIcon';

// Absolute so they match the URLs on the Google OAuth consent screen exactly
const PRIVACY_URL = 'https://uszakat.sspods.com/privacy';
const TERMS_URL = 'https://uszakat.sspods.com/terms';

// Keep in sync with the static home page in index.html
const CAPABILITIES = [
  'Tracks your bank, brokerage, retirement, HSA, and debt accounts',
  'Guides you through an annual zakat review on your hawl (lunar anniversary) date',
  'Handles 401(k)s and IRAs with long-term or short-term methods, including taxes and penalties',
  'Applies a zakatable-asset percentage to passively held stocks and funds',
  'Checks the nisab threshold using the current gold price',
  'Keeps a history of past reviews, tracks zakat payments, and exports reports to Excel',
];

export default function LandingPage() {
  const navigate = useNavigate();
  const existingData = hasExistingData();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #003d33 0%, #00695c 50%, #00897b 100%)',
        color: 'white',
      }}
    >
      {/* Hero Section */}
      <Container maxWidth="md" sx={{ pt: { xs: 8, md: 12 }, pb: 6, textAlign: 'center' }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <LogoIcon size={120} />
        </Box>
        <Typography
          variant="h3"
          component="h1"
          sx={{ mb: 1, fontWeight: 800, fontSize: { xs: '2.2rem', md: '3rem' } }}
        >
          US Zakat Calculator
        </Typography>
        <Typography variant="h5" component="p" sx={{ mb: 2, opacity: 0.9, fontWeight: 300 }}>
          Precise Zakat. Total Privacy.
        </Typography>
        <Typography
          variant="body1"
          sx={{ mb: 4, maxWidth: 640, mx: 'auto', opacity: 0.85 }}
        >
          US Zakat Calculator is a free web app that helps Muslims in the United States calculate
          the zakat they owe each year on cash, brokerage accounts, 401(k)s, IRAs, HSAs, gold, and
          other assets, using published rulings from the Fiqh Council of North America.
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/dashboard')}
          sx={{
            bgcolor: 'white',
            color: 'primary.dark',
            fontWeight: 700,
            px: 5,
            py: 1.5,
            fontSize: '1.1rem',
            '&:hover': { bgcolor: 'grey.100' },
          }}
        >
          {existingData ? 'Welcome Back — View Dashboard' : 'Get Started'}
        </Button>

        {existingData ? (
          <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
            ✓ Existing portfolio data detected
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
              Free. No sign-up or login required.
            </Typography>
            <ImportBackupButton
              label="Restore from a Backup File"
              onImported={() => navigate('/dashboard')}
              sx={{ color: 'white', opacity: 0.85, textTransform: 'none' }}
            />
          </Box>
        )}
      </Container>

      {/* Features */}
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Grid container spacing={4}>
          {[
            {
              icon: <CalculateIcon sx={{ fontSize: 48 }} />,
              title: 'Scholarly Precision',
              desc: 'Uses the zakatable-assets method for passive stock investments, with configurable proxy percentage. Supports both long-term and short-term calculation methods for retirement accounts.',
            },
            {
              icon: <SecurityIcon sx={{ fontSize: 48 }} />,
              title: 'Complete Privacy',
              desc: 'Your financial data stays with you — in your browser, a file you choose, or your own Google Drive. It is never sent to our servers.',
            },
            {
              icon: <StorageIcon sx={{ fontSize: 48 }} />,
              title: 'Year-over-Year Tracking',
              desc: 'Maintain a complete history of your zakat calculations with detailed breakdowns and payment tracking.',
            },
          ].map((feature) => (
            <Grid size={{ xs: 12, md: 4 }} key={feature.title}>
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  borderRadius: 3,
                  height: '100%',
                }}
                elevation={0}
              >
                {feature.icon}
                <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {feature.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Functionality */}
      <Container maxWidth="md" sx={{ pb: 6 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
          What it does
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 3, opacity: 0.9 }}>
          {CAPABILITIES.map((item) => (
            <Typography component="li" variant="body1" key={item} sx={{ mb: 0.5 }}>
              {item}
            </Typography>
          ))}
        </Box>
      </Container>

      {/* Data storage & Google Drive disclosure */}
      <Container maxWidth="md" sx={{ pb: 6 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Your data and Google Drive
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mb: 1.5 }}>
          Your financial information is saved in your browser and is never sent to our servers. To
          keep it safe or use it on another device, you can download a backup file, or link a data
          file on your computer that updates as you work.
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mb: 1.5 }}>
          <strong>Why the app asks for Google Drive access:</strong> connecting Google Drive is
          optional. If you connect it, the app uses Google Drive only to (1) store a backup of your
          zakat data in a hidden, app-only folder in your Drive so you can restore it on another
          device, and (2) save Excel zakat reports to a Drive folder you pick. It can only access files
          it creates or that you select — not the rest of your Drive — and never shares or sells your
          data.
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Read our <Link href={PRIVACY_URL} color="inherit" underline="always">Privacy Policy</Link>{' '}
          for full details.
        </Typography>
      </Container>

      <Box
        component="footer"
        sx={{ py: 3, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: 14 }}
      >
        <Link href={PRIVACY_URL} color="inherit" sx={{ mx: 1.5, opacity: 0.85 }}>Privacy Policy</Link>
        <Link href={TERMS_URL} color="inherit" sx={{ mx: 1.5, opacity: 0.85 }}>Terms of Service</Link>
        <Link href="https://github.com/sysofwan/USZakat" color="inherit" sx={{ mx: 1.5, opacity: 0.85 }}>
          Source Code
        </Link>
      </Box>
    </Box>
  );
}
