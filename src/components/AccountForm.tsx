import { useState } from 'react';
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
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_DESCRIPTIONS,
  ASSET_LABELS,
  ACCOUNT_ASSET_MAP,
  NON_DEDUCTIBLE_ASSETS,
} from '../types';
import type { AccountType, AssetType } from '../types';

export interface AccountFormValues {
  name: string;
  type: AccountType;
  assets: AssetType[];
}

interface AccountFormProps {
  initial?: AccountFormValues;
  submitLabel: string;
  onSubmit: (values: AccountFormValues) => void;
  onCancel?: () => void;
}

export default function AccountForm({ initial, submitLabel, onSubmit, onCancel }: AccountFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [accountType, setAccountType] = useState<AccountType>(initial?.type ?? 'standard');
  const [assets, setAssets] = useState<AssetType[]>(initial?.assets ?? ['cash']);

  // Reset the draft if the account is replaced from outside (e.g. file/drive
  // reconciliation) while this form stays mounted. Adjusting state during
  // render is the React-recommended alternative to a synchronizing effect.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setName(initial?.name ?? '');
    setAccountType(initial?.type ?? 'standard');
    setAssets(initial?.assets ?? ['cash']);
  }

  const handleAssetToggle = (asset: AssetType) => {
    setAssets((prev) =>
      prev.includes(asset) ? prev.filter((a) => a !== asset) : [...prev, asset]
    );
  };

  const handleSave = () => {
    if (!name.trim() || assets.length === 0) return;
    onSubmit({ name: name.trim(), type: accountType, assets });
  };

  return (
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

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
        {onCancel && (
          <Button onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!name.trim() || assets.length === 0}
        >
          {submitLabel}
        </Button>
      </Box>
    </Box>
  );
}
