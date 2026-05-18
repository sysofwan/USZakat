import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/zakatCalculator';
import { getPaymentStatus } from '../utils/payments';
import { v4 as uuidv4 } from 'uuid';
import PageContainer from '../components/PageContainer';

export default function PaymentTrackingPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { portfolio, dispatch } = usePortfolio();

  const entry = portfolio.history.find((h) => h.id === entryId);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  if (!entry) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          History entry not found
        </Typography>
        <Button variant="contained" onClick={() => navigate('/history')}>
          Go to History
        </Button>
      </Box>
    );
  }

  const payments = entry.payments;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, entry.totalZakat - totalPaid);
  const progress = entry.totalZakat > 0 ? Math.min(100, (totalPaid / entry.totalZakat) * 100) : 0;
  const status = getPaymentStatus(entry.totalZakat, totalPaid);

  const handleAdd = () => {
    const parsedAmount = parseFloat(amount);
    if (!recipient.trim() || !parsedAmount || parsedAmount <= 0) return;

    dispatch({
      type: 'ADD_PAYMENT',
      payload: {
        entryId: entry.id,
        payment: {
          id: uuidv4(),
          recipient: recipient.trim(),
          amount: parsedAmount,
          date: new Date(date).toISOString(),
        },
      },
    });
    setRecipient('');
    setAmount('');
  };

  const handleDelete = (paymentId: string) => {
    dispatch({
      type: 'DELETE_PAYMENT',
      payload: { entryId: entry.id, paymentId },
    });
  };

  return (
    <PageContainer title="Zakat Payments">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/history')}
        sx={{ mb: 2 }}
      >
        Back to History
      </Button>

      {entry.totalZakat <= 0 ? (
        <Card sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No Zakat Due
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your wealth was below the Nisab threshold for this period ({entry.year} AH / {entry.gregorianYear || new Date(entry.date).getFullYear()} CE).
              No payments are required.
            </Typography>
          </CardContent>
        </Card>
      ) : (
      <>
      {/* Status Overview */}
      <Card
        sx={{
          mb: 3,
          background:
            status.label === 'Settled'
              ? 'linear-gradient(135deg, #003d33 0%, #00695c 100%)'
              : undefined,
          color: status.label === 'Settled' ? 'white' : undefined,
        }}
      >
        <CardContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="overline" sx={{ opacity: 0.8 }}>
            {entry.year} AH / {entry.gregorianYear || new Date(entry.date).getFullYear()} CE — {new Date(entry.date).toLocaleDateString()}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, my: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {formatCurrency(entry.totalZakat)}
            </Typography>
            <Chip label={status.label} color={status.color} />
          </Box>

          <Box sx={{ maxWidth: 400, mx: 'auto', mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: status.label === 'Settled' ? 'rgba(255,255,255,0.2)' : undefined,
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Paid: {formatCurrency(totalPaid)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Remaining: {formatCurrency(remaining)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Add Payment Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Record a Payment
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <TextField
              label="Recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Local Masjid, Islamic Relief"
              sx={{ flex: 2, minWidth: 200 }}
            />
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              sx={{ flex: 1, minWidth: 120 }}
            />
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              sx={{ flex: 1, minWidth: 140 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={!recipient.trim() || !parseFloat(amount)}
              sx={{ height: 56 }}
            >
              Add
            </Button>
          </Box>
          {remaining > 0 && totalPaid > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {formatCurrency(remaining)} remaining to fulfill your zakat obligation.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment List */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Payment History ({payments.length})
      </Typography>

      {payments.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No payments recorded yet. Use the form above to track your zakat disbursements.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            {payments.map((payment, idx) => (
              <Box key={payment.id}>
                {idx > 0 && <Divider />}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{payment.recipient}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(payment.date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontWeight: 600 }} color="primary">
                      {formatCurrency(payment.amount)}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(payment.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
      </>
      )}
    </PageContainer>
  );
}
