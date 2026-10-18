import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@mui/material';
import { usePortfolio } from '../context/PortfolioContext';
import type { Account } from '../types';
import AccountForm from '../components/AccountForm';
import type { AccountFormValues } from '../components/AccountForm';
import PageContainer from '../components/PageContainer';

export default function AccountConfigPage() {
  const { id } = useParams<{ id: string }>();
  const { portfolio, dispatch } = usePortfolio();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const existingAccount = !isNew
    ? portfolio.accounts.find((a) => a.id === id)
    : undefined;

  const handleSave = (values: AccountFormValues) => {
    if (isNew) {
      dispatch({ type: 'ADD_ACCOUNT', payload: values });
    } else if (existingAccount) {
      dispatch({
        type: 'UPDATE_ACCOUNT',
        payload: { ...values, id: existingAccount.id } as Account,
      });
    }

    navigate('/dashboard');
  };

  return (
    <PageContainer back={{ label: 'Back to Dashboard', onClick: () => navigate('/dashboard') }} overline="Accounts" title={isNew ? 'Add Account' : 'Edit Account'} subtitle="Choose the account type and the kinds of assets it holds." maxWidth={640}>

      <Card>
      <CardContent>
        <AccountForm
          key={existingAccount?.id ?? 'new'}
          initial={existingAccount}
          submitLabel={isNew ? 'Add Account' : 'Save Changes'}
          onSubmit={handleSave}
        />
      </CardContent>
      </Card>
    </PageContainer>
  );
}
