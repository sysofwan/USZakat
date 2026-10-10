import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Drawer,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import BackupIcon from '@mui/icons-material/Backup';
import CloudIcon from '@mui/icons-material/Cloud';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import SyncIcon from '@mui/icons-material/Sync';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LogoIcon from './LogoIcon';
import { brand, heroBackground } from '../theme';
import SyncConflictDialog from './SyncConflictDialog';
import FileConflictDialog from './FileConflictDialog';
import { useDrive } from '../context/DriveContext';
import { useLocalFile } from '../context/LocalFileContext';

import RateReviewIcon from '@mui/icons-material/RateReview';

const DRAWER_WIDTH = 248;
const sidebarBackground = `linear-gradient(180deg, ${brand.dark} 0%, ${brand.ink} 100%)`;

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Reviews', path: '/history', icon: <RateReviewIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  { label: 'About', path: '/about', icon: <InfoIcon /> },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [driveMenuAnchor, setDriveMenuAnchor] = useState<null | HTMLElement>(null);
  const [connectMenuAnchor, setConnectMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isConnected, isSyncing, lastSyncTime, syncError, handleSignIn, handleSignOut } = useDrive();
  const localFile = useLocalFile();
  const canLinkFile = localFile.status === 'none';
  const showConnect = !isConnected || canLinkFile;
  const closeConnectMenu = () => setConnectMenuAnchor(null);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawerContent = (
    <Box sx={{ height: '100%', background: sidebarBackground, display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', minHeight: 72, gap: 1 }}>
        <Box
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.25 }}
          onClick={() => navigate('/')}
        >
          <LogoIcon size={32} />
          <Typography sx={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>US Zakat Calculator</Typography>
        </Box>
      </Toolbar>
      <List sx={{ flexGrow: 1, px: 1.5, pt: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                color: brand.mintText,
                borderRadius: '10px',
                mb: 0.5,
                '&.Mui-selected, &.Mui-selected:hover': {
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  '& .MuiListItemIcon-root': { color: brand.accent },
                },
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.06)',
                },
              }}
            >
              <ListItemIcon sx={{ color: '#80cbc4', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: 500 } } }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Linked data file status */}
      {(localFile.status === 'linked' || localFile.status === 'needs-permission') && (
        <Box
          sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          onClick={() => {
            if (localFile.status === 'needs-permission') localFile.reconnect();
            else navigate('/settings');
          }}
        >
          {localFile.status === 'linked' ? (
            <DescriptionIcon sx={{ color: localFile.error ? '#ffb74d' : brand.accent, fontSize: 24 }} />
          ) : (
            <LinkOffIcon sx={{ color: '#ffb74d', fontSize: 24 }} />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: brand.mint }}>
              {localFile.fileName}
            </Typography>
            <Typography variant="caption" sx={{ color: '#80cbc4' }}>
              {localFile.status === 'needs-permission'
                ? 'Click to reconnect'
                : localFile.isSaving
                  ? 'Saving...'
                  : localFile.error ?? (localFile.lastSaved ? `Saved ${localFile.lastSaved}` : 'Linked')}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Google Drive status + connect options */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {isConnected && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isSyncing ? (
                <SyncIcon sx={{ color: '#80cbc4', fontSize: 24, animation: 'spin 1s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
              ) : (
                <CloudDoneIcon sx={{ color: brand.accent, fontSize: 24 }} />
              )}
              <Typography variant="body2" sx={{ color: brand.mint, flexGrow: 1 }}>
                {isSyncing ? 'Syncing...' : syncError ? syncError : lastSyncTime ? `Synced ${lastSyncTime}` : 'Drive Connected'}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => setDriveMenuAnchor(e.currentTarget)}
                sx={{ color: '#80cbc4' }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
            <Menu
              anchorEl={driveMenuAnchor}
              open={Boolean(driveMenuAnchor)}
              onClose={() => setDriveMenuAnchor(null)}
            >
              <MenuItem onClick={() => { handleSignOut(); setDriveMenuAnchor(null); }}>
                Disconnect Drive
              </MenuItem>
            </Menu>
          </>
        )}
        {showConnect && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<BackupIcon sx={{ fontSize: 22 }} />}
              onClick={(e) => setConnectMenuAnchor(e.currentTarget)}
              sx={{ color: brand.mint, borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textTransform: 'none' }}
              fullWidth
            >
              Back Up &amp; Sync
            </Button>
            <Menu
              anchorEl={connectMenuAnchor}
              open={Boolean(connectMenuAnchor)}
              onClose={closeConnectMenu}
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              {!isConnected && (
                <MenuItem onClick={() => { closeConnectMenu(); handleSignIn(); }}>
                  <ListItemIcon><CloudIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Google Drive" secondary="Sync across devices" />
                </MenuItem>
              )}
              {canLinkFile && (
                <MenuItem onClick={() => { closeConnectMenu(); localFile.linkNewFile(); }}>
                  <ListItemIcon><NoteAddIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="New data file" secondary="Auto-save to a file on this computer" />
                </MenuItem>
              )}
              {canLinkFile && (
                <MenuItem onClick={() => { closeConnectMenu(); localFile.linkExistingFile(); }}>
                  <ListItemIcon><FileOpenIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Open data file" secondary="Continue from an existing file" />
                </MenuItem>
              )}
              {localFile.status === 'unsupported' && (
                <MenuItem disabled>
                  <ListItemIcon><NoteAddIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Data file" secondary="Requires Chrome or Edge on desktop" />
                </MenuItem>
              )}
            </Menu>
          </>
        )}
        <Typography variant="caption" sx={{ textAlign: 'center', color: '#80cbc4' }}>
          <Link href="https://uszakat.sspods.com/privacy" color="inherit" underline="hover">Privacy Policy</Link>
          {' · '}
          <Link href="https://uszakat.sspods.com/terms" color="inherit" underline="hover">Terms</Link>
        </Typography>
      </Box>
    </Box>
  );

  // Landing page gets full-width layout (no drawer)
  if (location.pathname === '/') {
    return (
      <Box>
        <CssBaseline />
        <Outlet />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          background: heroBackground,
          color: brand.mint,
          boxShadow: 'none',
          display: { md: 'none' },
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ color: brand.mint }}
            aria-label="Open menu"
          >
            <MenuIcon />
          </IconButton>
          <LogoIcon size={26} />
          <Typography sx={{ fontWeight: 700, color: 'white' }}>US Zakat Calculator</Typography>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 5 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: '56px', md: 0 },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
      <SyncConflictDialog />
      <FileConflictDialog />
    </Box>
  );
}
