import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { usePortfolio } from '../context/PortfolioContext';
import { HIJRI_MONTHS, getCurrentHijriDate, formatHijriDate } from '../utils/hijriDate';
import PageContainer from '../components/PageContainer';

export default function SettingsPage() {
  const { portfolio, dispatch } = usePortfolio();
  const { settings } = portfolio;

  const [hawlMonth, setHawlMonth] = useState<number | ''>(settings.hawlMonth ?? '');
  const [hawlDay, setHawlDay] = useState<number | ''>(settings.hawlDay ?? '');
  const [stockProxyPercent, setStockProxyPercent] = useState(settings.stockProxyPercent);
  const [saved, setSaved] = useState(false);

  const currentHijri = getCurrentHijriDate();

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
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

      {/* Stock Proxy Multiplier */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Passive Stock Proxy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            For passively-held stocks (index funds, ETFs held long-term), only a percentage of the
            market value is considered zakatable — representing the portion of underlying liquid
            assets. The common scholarly opinion is 25%.
          </Typography>

          <Box sx={{ px: 1 }}>
            <Slider
              value={stockProxyPercent}
              onChange={(_, v) => setStockProxyPercent(v as number)}
              min={0}
              max={100}
              step={5}
              marks={[
                { value: 0, label: '0%' },
                { value: 25, label: '25%' },
                { value: 50, label: '50%' },
                { value: 100, label: '100%' },
              ]}
              valueLabelDisplay="on"
              valueLabelFormat={(v) => `${v}%`}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Current: {stockProxyPercent}% of passive stock value is zakatable
          </Typography>
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
