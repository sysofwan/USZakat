import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
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
import { usePortfolio } from '../context/PortfolioContext';
import type { ZakatMethod } from '../types';
import { HIJRI_MONTHS, getCurrentHijriDate, formatHijriDate } from '../utils/hijriDate';
import PageContainer from '../components/PageContainer';

export default function SettingsPage() {
  const { portfolio, dispatch } = usePortfolio();
  const { settings } = portfolio;

  const [hawlMonth, setHawlMonth] = useState<number | ''>(settings.hawlMonth ?? '');
  const [hawlDay, setHawlDay] = useState<number | ''>(settings.hawlDay ?? '');
  const [zakatMethod, setZakatMethod] = useState<ZakatMethod>(settings.zakatMethod);
  const [saved, setSaved] = useState(false);

  const currentHijri = getCurrentHijriDate();

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        zakatMethod,
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
            Hawl Date
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The annual Islamic date when your wealth first reached Nisab. Zakat becomes due on this
            date each Hijri year. Today is{' '}
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
    </PageContainer>
  );
}
