import { Outlet, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Stack,
  Box,
  Container,
} from '@mui/material';
import { useAuth } from '@/hooks/auth';

function NavBar() {
  const { token, logout } = useAuth();
  return (
    <AppBar position="sticky" sx={{ mb: 3 }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Fitness Tracker
        </Typography>
        {token ? (
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={Link} to="/">
              Home
            </Button>
            <Button color="inherit" component={Link} to="/types">
              Ćwiczenia
            </Button>
            <Button color="inherit" component={Link} to="/sessions">
              Sesje
            </Button>
            <Button color="inherit" component={Link} to="/goals">
              Cele
            </Button>
            <Button color="inherit" onClick={logout}>
              Wyloguj
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={Link} to="/login">
              Logowanie
            </Button>
            <Button color="inherit" component={Link} to="/register">
              Rejestracja
            </Button>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default function Layout() {
  return (
    <Box
      component="main"
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        pb: 4,
      }}
    >
      <NavBar />
      <Container maxWidth="lg" sx={{ pt: 2 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
