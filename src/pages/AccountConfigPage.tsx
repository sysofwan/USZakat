import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { usePortfolio } from '../context/PortfolioContext';
import {
  ACCOUNT_TYPE_LABELS,
  ASSET_LABELS,
} from '../types';
import type { Account, AccountType, AssetType } from '../types';
import PageContainer from '../components/PageContainer';

const ALL_ASSET_TYPES: AssetType[] = ['cash', 'stock_passive', 'stock_active', 'bonds', 'gold'];

export default function AccountConfigPage() {
  const { id } = useParams<{ id: string }>();
  const { portfolio, dispatch } = usePortfolio();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const existingAccount = !isNew
    ? portfolio.accounts.find((a) => a.id === id)
    : undefined;

  const [name, setName] = useState(existingAccount?.name || '');
  const [accountType, setAccountType] = useState<AccountType>(
    existingAccount?.type || 'standard'
  );
  const [rothPercent, setRothPercent] = useState(existingAccount?.rothPercent ?? 50);
  const [assets, setAssets] = useState<AssetType[]>(
    existingAccount?.assets || ['cash']
  );

  useEffect(() => {
    if (!isNew && existingAccount) {
      setName(existingAccount.name);
      setAccountType(existingAccount.type);
      setRothPercent(existingAccount.rothPercent ?? 50);
      setAssets(existingAccount.assets);
    }
  }, [existingAccount, isNew]);

  const handleAssetToggle = (asset: AssetType) => {
    setAssets((prev) =>
      prev.includes(asset) ? prev.filter((a) => a !== asset) : [...prev, asset]
    );
  };

  const handleSave = () => {
    if (!name.trim() || assets.length === 0) return;

    const accountData: Omit<Account, 'id'> & { id?: string } = {
      name: name.trim(),
      type: accountType,
      assets,
      ...(accountType === 'retirement_mixed' ? { rothPercent } : {}),
    };

    if (isNew) {
      dispatch({ type: 'ADD_ACCOUNT', payload: accountData });
    } else if (existingAccount) {
      dispatch({
        type: 'UPDATE_ACCOUNT',
        payload: { ...accountData, id: existingAccount.id } as Account,
      });
    }

    navigate('/dashboard');
  };

  return (
    <PageContainer title={isNew ? 'Add Account' : 'Edit Account'} maxWidth={600}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/dashboard')}
        sx={{ mb: 2 }}
      >
        Back to Dashboard
      </Button>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Account Name */}
        <TextField
          label="Account Nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Fidelity 401(k)"
          fullWidth
          required
        />

        {/* Account Type */}
        <FormControl fullWidth>
          <InputLabel>Account Type</InputLabel>
          <Select
            value={accountType}
            label="Account Type"
            onChange={(e) => setAccountType(e.target.value as AccountType)}
          >
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Roth/Traditional Slider (only for mixed) */}
        {accountType === 'retirement_mixed' && (
          <Box>
            <Typography gutterBottom>
              Roth vs Traditional Split
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={rothPercent}
                onChange={(_, val) => setRothPercent(val as number)}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
                min={0}
                max={100}
                marks={[
                  { value: 0, label: '0% Roth' },
                  { value: 50, label: '50/50' },
                  { value: 100, label: '100% Roth' },
                ]}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {rothPercent}% Roth / {100 - rothPercent}% Traditional
            </Typography>
          </Box>
        )}

        {/* Asset Selection */}
        <FormControl component="fieldset">
          <FormLabel component="legend">Asset Types in This Account</FormLabel>
          <FormGroup>
            {ALL_ASSET_TYPES.map((asset) => (
              <FormControlLabel
                key={asset}
                control={
                  <Checkbox
                    checked={assets.includes(asset)}
                    onChange={() => handleAssetToggle(asset)}
                  />
                }
                label={ASSET_LABELS[asset]}
              />
            ))}
          </FormGroup>
        </FormControl>

        {/* Save Button */}
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!name.trim() || assets.length === 0}
          sx={{ mt: 2 }}
        >
          {isNew ? 'Add Account' : 'Save Changes'}
        </Button>
      </Box>
    </PageContainer>
  );
}
