import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  maxWidth?: number;
  children: ReactNode;
  action?: ReactNode;
}

export default function PageContainer({ title, maxWidth = 700, children, action }: PageContainerProps) {
  return (
    <Box sx={{ maxWidth, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}
