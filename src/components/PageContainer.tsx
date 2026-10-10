import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { ReactNode } from 'react';
import BackupBanner from './BackupBanner';

interface PageContainerProps {
  title: string;
  /** Small label above the title, e.g. the section name */
  overline?: string;
  /** One-line description under the title */
  subtitle?: ReactNode;
  maxWidth?: number;
  children: ReactNode;
  action?: ReactNode;
  /** Link back to the parent page, shown above the title */
  back?: { label: string; onClick: () => void };
}

export default function PageContainer({ title, overline, subtitle, maxWidth = 760, children, action, back }: PageContainerProps) {
  return (
    <Box sx={{ maxWidth, mx: 'auto' }}>
      <BackupBanner />
      {back && (
        <Button startIcon={<ArrowBackIcon />} onClick={back.onClick} size="small" sx={{ mb: 1.5, ml: -1 }}>
          {back.label}
        </Button>
      )}
      <Box
        sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' },
          flexWrap: 'wrap', gap: 2, mb: 4,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {overline && (
            <Typography variant="overline" color="primary" sx={{ display: 'block', lineHeight: 1.6 }}>
              {overline}
            </Typography>
          )}
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.75rem', md: '2.1rem' } }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}
