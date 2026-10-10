import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { PortfolioProvider } from './context/PortfolioContext';
import { DriveProvider } from './context/DriveContext';
import { LocalFileProvider } from './context/LocalFileContext';
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

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PortfolioProvider>
        <DriveProvider>
          <LocalFileProvider>
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
          </LocalFileProvider>
        </DriveProvider>
      </PortfolioProvider>
    </ThemeProvider>
  );
}
