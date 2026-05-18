import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CalculateIcon from '@mui/icons-material/Calculate';
import StorageIcon from '@mui/icons-material/Storage';
import { hasExistingData } from '../services/storage';
import Logo from '../components/Logo';

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
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Logo size="large" color="white" />
        </Box>
        <Typography variant="h5" sx={{ mb: 1, opacity: 0.9, fontWeight: 300 }}>
          Precise Zakat. Total Privacy.
        </Typography>
        <Typography
          variant="body1"
          sx={{ mb: 4, maxWidth: 600, mx: 'auto', opacity: 0.8 }}
        >
          A private zakat calculator for the modern Muslim investor.
          Calculate zakat on 401(k)s, IRAs, and brokerage portfolios using
          published rulings from the Fiqh Council of North America.
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

        {existingData && (
          <Typography variant="body2" sx={{ mt: 2, opacity: 0.7 }}>
            ✓ Existing portfolio data detected
          </Typography>
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
              desc: 'Your financial data never leaves your device. All data is stored locally in your browser — nothing is sent to any server.',
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
                <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
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
    </Box>
  );
}
