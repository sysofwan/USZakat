import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { usePortfolio } from '../context/PortfolioContext';
import { useDrive } from '../context/DriveContext';
import type { ZakatMethod } from '../types';
import { HIJRI_MONTHS, getCurrentHijriDate, formatHijriDate } from '../utils/hijriDate';
import PageContainer from '../components/PageContainer';

export default function SettingsPage() {
  const { portfolio, dispatch } = usePortfolio();
  const { isConnected, handleRestore, isSyncing } = useDrive();
  const { settings } = portfolio;

  const [hawlMonth, setHawlMonth] = useState<number | ''>(settings.hawlMonth ?? '');
  const [hawlDay, setHawlDay] = useState<number | ''>(settings.hawlDay ?? '');
  const [zakatMethod, setZakatMethod] = useState<ZakatMethod>(settings.zakatMethod);
  const [stockProxyPercent, setStockProxyPercent] = useState(settings.stockProxyPercent);
  const [saved, setSaved] = useState(false);

  const currentHijri = getCurrentHijriDate();

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        zakatMethod,
        stockProxyPercent,
        ...(hawlMonth && hawlDay ? { hawlMonth, hawlDay } : { hawlMonth: undefined, hawlDay: undefined }),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <PageContainer title="Settings">
      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully.
        </Alert>
      )}

      {/* Zakat Calculation Method */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Retirement Account Method
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Per the{' '}
            <Link href="https://fiqhcouncil.org/zakah-on-retirement-funds/" target="_blank" rel="noopener">
              FCNA ruling on retirement funds
            </Link>
            , choose how you view your 401(k)/IRA accounts. This is the default for new reviews —
            you can override it during each annual review.
          </Typography>

          <RadioGroup
            value={zakatMethod}
            onChange={(e) => setZakatMethod(e.target.value as ZakatMethod)}
          >
            <FormControlLabel
              value="long_term"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Long-term Investment (Recommended)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pay zakat on the zakatable portion (stock proxy %) only. No tax or penalty deductions.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="short_term"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Short-term / Liquid View
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pay zakat on full market value minus taxes and early withdrawal penalties.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Hawl Date */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Zakat Calculation Date (Hawl)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The Hijri date when your wealth first reached nisab. Zakat becomes due on this
            date each lunar year. Today is{' '}
            <strong>{formatHijriDate(currentHijri.month, currentHijri.day)}</strong>.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Hijri Month</InputLabel>
              <Select
                value={hawlMonth}
                label="Hijri Month"
                onChange={(e) => setHawlMonth(e.target.value as number)}
              >
                {HIJRI_MONTHS.map((name, idx) => (
                  <MenuItem key={idx + 1} value={idx + 1}>
                    {idx + 1}. {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Day"
              type="number"
              value={hawlDay}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') { setHawlDay(''); return; }
                const n = parseInt(val);
                if (!isNaN(n)) setHawlDay(n);
              }}
              onBlur={() => {
                if (hawlDay === '') return;
                setHawlDay(Math.min(30, Math.max(1, hawlDay)));
              }}
              slotProps={{ htmlInput: { min: 1, max: 30 } }}
              sx={{ width: 100 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Default Stock Proxy */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Default Stock Proxy %
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The default zakatable percentage for passively-held stocks. Zakāh on a business is 2.5%
            of the book value of the zakātable assets (which are cash, receivables, and inventory),
            and each shareholder must pay their prorated portion of zakāh at the end of the lunar
            year. The default of 25% is based on the S&P 500 average. This pre-fills the value
            during each annual review — you can adjust it per-review based on your fund's actual
            zakatable ratio.
          </Typography>
          <TextField
            label="Default Proxy %"
            type="number"
            value={stockProxyPercent}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) setStockProxyPercent(Math.min(100, Math.max(0, v)));
            }}
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
              htmlInput: { min: 0, max: 100 },
            }}
            sx={{ width: 180 }}
          />
        </CardContent>
      </Card>

      <Box sx={{ textAlign: 'right' }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          size="large"
        >
          Save Settings
        </Button>
      </Box>

      {isConnected && (
        <>
          <Divider sx={{ my: 3 }} />
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Google Drive</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your data is automatically synced to Google Drive. You can restore from your last backup below.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<CloudDownloadIcon />}
                onClick={async () => {
                  const success = await handleRestore();
                  if (success) alert('Data restored from Google Drive!');
                }}
                disabled={isSyncing}
              >
                Restore from Drive
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
