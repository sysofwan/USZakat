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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DevicesIcon from '@mui/icons-material/Devices';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudIcon from '@mui/icons-material/Cloud';
import { hasExistingData } from '../services/storage';
import ImportBackupButton from '../components/ImportBackupButton';
import LogoIcon from '../components/LogoIcon';

// Absolute so they match the URLs on the Google OAuth consent screen exactly
const PRIVACY_URL = 'https://uszakat.sspods.com/privacy';
const TERMS_URL = 'https://uszakat.sspods.com/terms';

const glassPanel = {
  p: 4,
  bgcolor: 'rgba(255,255,255,0.1)',
  backdropFilter: 'blur(10px)',
  color: 'white',
  borderRadius: 3,
};

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
              <Paper sx={{ ...glassPanel, textAlign: 'center', height: '100%' }} elevation={0}>
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
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Paper sx={glassPanel} elevation={0}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, textAlign: 'center', mb: 3 }}>
            What it does
          </Typography>
          <Grid container spacing={2}>
            {CAPABILITIES.map((item) => (
              <Grid size={{ xs: 12, md: 6 }} key={item} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <CheckCircleIcon sx={{ color: '#80cbc4', fontSize: 22, mt: '1px' }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>{item}</Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      {/* Data storage & Google Drive disclosure */}
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Paper sx={glassPanel} elevation={0}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, textAlign: 'center', mb: 3 }}>
            Your data and Google Drive
          </Typography>
          <Grid container spacing={4}>
            {[
              {
                icon: <DevicesIcon sx={{ fontSize: 36 }} />,
                title: 'Saved on your device',
                desc: 'Your financial information is saved in your browser and is never sent to our servers.',
              },
              {
                icon: <DescriptionIcon sx={{ fontSize: 36 }} />,
                title: 'Backup files',
                desc: 'To keep it safe or use it on another device, download a backup file, or link a data file on your computer that updates as you work.',
              },
              {
                icon: <CloudIcon sx={{ fontSize: 36 }} />,
                title: 'Why the app asks for Google Drive access',
                desc: 'Optional. If you connect it, the app uses Drive only to back up your zakat data to a hidden, app-only folder and to save Excel reports to a folder you pick. It can’t see the rest of your Drive, and never shares or sells your data.',
              },
            ].map((block) => (
              <Grid size={{ xs: 12, md: 4 }} key={block.title} sx={{ textAlign: 'center' }}>
                {block.icon}
                <Typography variant="subtitle1" component="h3" sx={{ mt: 1, mb: 1, fontWeight: 600 }}>
                  {block.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>{block.desc}</Typography>
              </Grid>
            ))}
          </Grid>
          <Typography variant="body2" sx={{ textAlign: 'center', mt: 4, opacity: 0.9 }}>
            Read our <Link href={PRIVACY_URL} color="inherit" underline="always">Privacy Policy</Link>{' '}
            for full details.
          </Typography>
        </Paper>
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
