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
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { usePortfolio } from '../context/PortfolioContext';
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_DESCRIPTIONS,
  ASSET_LABELS,
  ACCOUNT_ASSET_MAP,
  NON_DEDUCTIBLE_ASSETS,
} from '../types';
import type { Account, AccountType, AssetType } from '../types';
import PageContainer from '../components/PageContainer';

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
  const [assets, setAssets] = useState<AssetType[]>(
    existingAccount?.assets || ['cash']
  );

  useEffect(() => {
    if (!isNew && existingAccount) {
      setName(existingAccount.name);
      setAccountType(existingAccount.type);
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
            onChange={(e) => {
              const newType = e.target.value as AccountType;
              setAccountType(newType);
              // Reset assets to valid ones for the new account type
              const validAssets = ACCOUNT_ASSET_MAP[newType];
              setAssets((prev) => {
                const filtered = prev.filter((a) => validAssets.includes(a));
                return filtered.length > 0 ? filtered : [validAssets[0]];
              });
            }}
          >
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Account Type Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: -1 }}>
          {ACCOUNT_TYPE_DESCRIPTIONS[accountType]}
        </Typography>

        {/* Asset Selection */}
        <FormControl component="fieldset">
          <FormLabel component="legend">Asset Types in This Account</FormLabel>
          <FormGroup>
            {ACCOUNT_ASSET_MAP[accountType].map((asset) => (
              <Box key={asset}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={assets.includes(asset)}
                      onChange={() => handleAssetToggle(asset)}
                    />
                  }
                  label={ASSET_LABELS[asset]}
                />
                {NON_DEDUCTIBLE_ASSETS.includes(asset) && (
                  <Typography variant="caption" color="warning.main" sx={{ ml: 4, display: 'block', mt: -0.5 }}>
                    ⚠ Long-term debt — not deducted from your Zakat calculation
                  </Typography>
                )}
              </Box>
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
