import { createTheme } from '@mui/material';

/** Brand tokens shared by the landing page and the app */
export const brand = {
  ink: '#00251f',
  dark: '#00352e',
  deep: '#004d40',
  primary: '#00695c',
  accent: '#4db6ac',
  mint: '#e0f2f1',
  mintText: '#b2dfdb',
  surface: '#f4f8f7',
  border: '#dcebe8',
  inputBorder: '#c9dcd8',
};

/** Dark teal gradient used for hero areas and highlight cards */
export const heroBackground = `radial-gradient(900px 500px at 85% 0%, rgba(77,182,172,0.28), transparent 60%),
  linear-gradient(160deg, ${brand.dark} 0%, ${brand.deep} 55%, ${brand.primary} 100%)`;

const theme = createTheme({
  palette: {
    primary: { main: brand.primary, light: '#439889', dark: '#003d33' },
    secondary: { main: brand.deep, light: '#39796b', dark: '#00251a' },
    info: { main: '#00796b' },
    background: { default: brand.surface, paper: '#ffffff' },
    divider: brand.border,
    text: { primary: '#1d2b28', secondary: '#5f6b68' },
  },
  typography: {
    fontFamily: '"Inter Variable", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { fontWeight: 700, letterSpacing: '0.12em' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: 16, border: `1px solid ${brand.border}` },
      },
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: 24, '&:last-child': { paddingBottom: 24 } } },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: brand.border },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10 },
        sizeLarge: { padding: '10px 24px' },
        outlined: { borderColor: brand.inputBorder },
      },
    },
    MuiFab: {
      styleOverrides: { root: { boxShadow: '0 8px 24px rgba(0, 105, 92, 0.35)' } },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          // Soft status colors instead of saturated fills
          variants: [
            { props: { variant: 'filled', color: 'warning' }, style: { backgroundColor: '#fff4e5', color: '#9a5b00' } },
            { props: { variant: 'filled', color: 'success' }, style: { backgroundColor: '#e8f5e9', color: '#1b5e20' } },
            { props: { variant: 'filled', color: 'error' }, style: { backgroundColor: '#fdecea', color: '#b3261e' } },
          ],
        },
        outlined: { borderColor: brand.inputBorder },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: brand.inputBorder },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          alignItems: 'center',
          variants: [
            {
              props: { variant: 'standard', severity: 'info' },
              style: { backgroundColor: brand.mint, color: brand.deep, border: `1px solid ${brand.border}` },
            },
            { props: { variant: 'standard', severity: 'success' }, style: { border: '1px solid #c8e6c9' } },
            { props: { variant: 'standard', severity: 'warning' }, style: { border: '1px solid #ffe0b2' } },
            { props: { variant: 'standard', severity: 'error' }, style: { border: '1px solid #ffcdd2' } },
          ],
        },
      },
    },
    MuiAccordion: {
      defaultProps: { disableGutters: true, elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${brand.border}`,
          borderRadius: 16,
          '&::before': { display: 'none' },
          '&:first-of-type, &:last-of-type': { borderRadius: 16 },
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4 } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: brand.border },
        head: { fontWeight: 600, color: '#5f6b68', backgroundColor: brand.surface },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: brand.border } },
    },
  },
});

export default theme;
