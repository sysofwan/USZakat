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

export default function LandingPage() {
  const navigate = useNavigate();
  const existingData = hasExistingData();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%)',
        color: 'white',
      }}
    >
      {/* Hero Section */}
      <Container maxWidth="md" sx={{ pt: { xs: 8, md: 12 }, pb: 6, textAlign: 'center' }}>
        <Typography
          variant="h2"
          sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '2.5rem', md: '3.5rem' } }}
        >
          ZakatFolio
        </Typography>
        <Typography variant="h5" sx={{ mb: 1, opacity: 0.9, fontWeight: 300 }}>
          Precise Zakat. Total Privacy.
        </Typography>
        <Typography
          variant="body1"
          sx={{ mb: 4, maxWidth: 600, mx: 'auto', opacity: 0.8 }}
        >
          A high-integrity financial tool for the modern Muslim investor.
          Calculate Zakat on 401(k)s, IRAs, and brokerage portfolios using
          contemporary scholarly rulings from Sh. Dr. Yasir Qadhi and the
          Fiqh Council of North America.
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
              desc: 'Implements the 25% stock proxy for passive investments and net liquid value calculations for retirement accounts.',
            },
            {
              icon: <SecurityIcon sx={{ fontSize: 48 }} />,
              title: 'Zero-Knowledge Privacy',
              desc: 'Your financial data never leaves your device. All data is stored locally with optional Google Drive sync to your personal account.',
            },
            {
              icon: <StorageIcon sx={{ fontSize: 48 }} />,
              title: 'Year-over-Year Tracking',
              desc: 'Maintain a complete history of your Zakat calculations with detailed breakdowns and income source documentation.',
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
