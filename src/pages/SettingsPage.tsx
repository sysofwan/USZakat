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
import DownloadIcon from '@mui/icons-material/Download';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import { usePortfolio } from '../context/PortfolioContext';
import { useDrive } from '../context/DriveContext';
import { useLocalFile } from '../context/LocalFileContext';
import { exportPortfolio } from '../services/storage';
import ImportBackupButton from '../components/ImportBackupButton';
import type { ZakatMethod } from '../types';
import { HIJRI_MONTHS, getCurrentHijriDate, formatHijriDate } from '../utils/hijriDate';
import PageContainer from '../components/PageContainer';

export default function SettingsPage() {
  const { portfolio, dispatch } = usePortfolio();
  const { isConnected, handleRestore, isSyncing } = useDrive();
  const localFile = useLocalFile();
  const { settings } = portfolio;

  const [hawlMonth, setHawlMonth] = useState<number | ''>(settings.hawlMonth ?? '');
  const [hawlDay, setHawlDay] = useState<number | ''>(settings.hawlDay ?? '');
  const [zakatMethod, setZakatMethod] = useState<ZakatMethod>(settings.zakatMethod);
  const [stockProxyPercent, setStockProxyPercent] = useState<string>(String(settings.stockProxyPercent));
  const [saved, setSaved] = useState(false);

  const currentHijri = getCurrentHijriDate();

  const proxyValue = parseFloat(stockProxyPercent);
  const proxyError = stockProxyPercent === '' || isNaN(proxyValue) || proxyValue < 0 || proxyValue > 100;

  const handleSave = () => {
    if (proxyError) return;
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        zakatMethod,
        stockProxyPercent: proxyValue,
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
            year. The default of 30% is a scholarly-approved approximation (also used by Zoya). This pre-fills the value
            during each annual review — you can adjust it per-review based on your fund's actual
            zakatable ratio.
          </Typography>
          <TextField
            label="Default Proxy %"
            type="number"
            value={stockProxyPercent}
            onChange={(e) => setStockProxyPercent(e.target.value)}
            error={proxyError}
            helperText={proxyError ? 'Enter a value between 0 and 100' : undefined}
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
          disabled={proxyError}
          size="large"
        >
          Save Settings
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Data storage */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Your Data</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your data is stored in this browser and never sent to our servers. Browsers can clear
            stored data, so keep a backup file — you can also import it to move your data to
            another browser or computer.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportPortfolio(portfolio)}>
              Export Backup
            </Button>
            <ImportBackupButton variant="outlined" />
          </Box>

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
            Auto-save to a File
          </Typography>
          {localFile.status === 'unsupported' && (
            <Typography variant="body2" color="text.secondary">
              Auto-saving to a file works in Chrome and Edge on desktop. In this browser, export a
              backup after each review.
            </Typography>
          )}
          {localFile.status === 'none' && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Keep your data in a file on your computer that updates automatically as you work.
                Save it in an iCloud Drive, Dropbox, or OneDrive folder to use the same data on
                other computers.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<NoteAddIcon />} onClick={localFile.linkNewFile}>
                  Create Data File
                </Button>
                <Button variant="outlined" startIcon={<FileOpenIcon />} onClick={localFile.linkExistingFile}>
                  Open Existing File
                </Button>
              </Box>
            </>
          )}
          {(localFile.status === 'linked' || localFile.status === 'needs-permission') && (
            <>
              {localFile.error && (
                <Alert severity="error" sx={{ mb: 2 }}>{localFile.error}</Alert>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {localFile.status === 'linked' ? (
                  <>
                    Saving to <strong>{localFile.fileName}</strong>
                    {localFile.lastSaved && <> — last saved {localFile.lastSaved}</>}.
                  </>
                ) : (
                  <>
                    Linked to <strong>{localFile.fileName}</strong>, but your browser needs permission
                    again to save to it.
                  </>
                )}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {localFile.status === 'needs-permission' && (
                  <Button variant="contained" onClick={localFile.reconnect}>Reconnect</Button>
                )}
                <Button variant="outlined" color="secondary" onClick={localFile.unlink}>
                  Stop Using File
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <>
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
