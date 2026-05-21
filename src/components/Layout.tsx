import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Drawer,
  IconButton,
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
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SyncIcon from '@mui/icons-material/Sync';
import Logo from './Logo';
import LogoIcon from './LogoIcon';
import SyncConflictDialog from './SyncConflictDialog';
import { useDrive } from '../context/DriveContext';

import RateReviewIcon from '@mui/icons-material/RateReview';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Reviews', path: '/history', icon: <RateReviewIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  { label: 'About', path: '/about', icon: <InfoIcon /> },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [driveMenuAnchor, setDriveMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isConnected, isSyncing, lastSyncTime, syncError, handleSignIn, handleSignOut } = useDrive();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawerContent = (
    <Box sx={{ height: '100%', bgcolor: '#00352e', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', minHeight: 64, gap: 1 }}>
        <Box
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}
          onClick={() => navigate('/')}
        >
          <LogoIcon size={32} />
          <Logo size="medium" color="#e0f2f1" />
        </Box>
      </Toolbar>
      <List sx={{ flexGrow: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                color: '#b2dfdb',
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  '& .MuiListItemIcon-root': { color: '#4db6ac' },
                },
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.06)',
                },
              }}
            >
              <ListItemIcon sx={{ color: '#80cbc4' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Google Drive status */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {isConnected ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isSyncing ? (
                <SyncIcon sx={{ color: '#80cbc4', fontSize: 24, animation: 'spin 1s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
              ) : (
                <CloudDoneIcon sx={{ color: '#4db6ac', fontSize: 24 }} />
              )}
              <Typography variant="body2" sx={{ color: '#e0f2f1', flexGrow: 1 }}>
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
        ) : (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloudOffIcon sx={{ fontSize: 22 }} />}
            onClick={handleSignIn}
            sx={{ color: '#e0f2f1', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textTransform: 'none' }}
            fullWidth
          >
            Connect Google Drive
          </Button>
        )}
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
          bgcolor: '#00352e',
          color: '#e0f2f1',
          boxShadow: 3,
          display: { md: 'none' },
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ color: '#e0f2f1' }}
          >
            <MenuIcon />
          </IconButton>
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
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: '56px', md: 0 },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
      <SyncConflictDialog />
    </Box>
  );
}
