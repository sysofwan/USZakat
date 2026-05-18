import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { PortfolioProvider } from './context/PortfolioContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import AccountConfigPage from './pages/AccountConfigPage';
import AnnualReviewPage from './pages/AnnualReviewPage';
import SummaryPage from './pages/SummaryPage';
import HistoryPage from './pages/HistoryPage';
import PaymentTrackingPage from './pages/PaymentTrackingPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00695c',      // dark teal
      light: '#439889',
      dark: '#003d33',
    },
    secondary: {
      main: '#004d40',      // deeper teal
      light: '#39796b',
      dark: '#00251a',
    },
    background: {
      default: '#f5f5f5',   // light grey base
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#616161',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0,0,0,0.08)',
    '0px 2px 6px rgba(0,0,0,0.10)',
    '0px 4px 12px rgba(0,0,0,0.12)',
    '0px 6px 16px rgba(0,0,0,0.14)',
    '0px 8px 24px rgba(0,0,0,0.16)',
    '0px 12px 32px rgba(0,0,0,0.18)',
    '0px 16px 40px rgba(0,0,0,0.20)',
    '0px 20px 48px rgba(0,0,0,0.22)',
    ...Array(16).fill('0px 24px 56px rgba(0,0,0,0.24)'),
  ] as any,
  components: {
    MuiCard: {
      defaultProps: {
        elevation: 2,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: '0px 2px 8px rgba(0, 105, 92, 0.3)',
          '&:hover': {
            boxShadow: '0px 4px 16px rgba(0, 105, 92, 0.4)',
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 14px rgba(0, 105, 92, 0.4)',
        },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PortfolioProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/account/:id" element={<AccountConfigPage />} />
              <Route path="/review" element={<AnnualReviewPage />} />
              <Route path="/summary" element={<SummaryPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/:entryId/payments" element={<PaymentTrackingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </PortfolioProvider>
    </ThemeProvider>
  );
}
