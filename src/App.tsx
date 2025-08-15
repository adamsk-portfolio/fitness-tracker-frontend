import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
} from 'react-router-dom';

import { useAuth }   from '@/hooks/auth';
import Login         from '@/pages/Login';
import Register      from '@/pages/Register';
import ExerciseTypes from '@/pages/ExerciseTypes';
import Sessions      from '@/pages/Sessions';
import Goals         from '@/pages/Goals';
import Dashboard     from '@/pages/Dashboard';
import PrivateRoute  from '@/components/PrivateRoute';
import LoginOAuth    from '@/pages/LoginOAuth'; // ✅ właściwy import

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Stack,
  Container,
} from '@mui/material';

function NavBar() {
  const { token, logout } = useAuth();

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Fitness&nbsp;Tracker
        </Typography>

        {token ? (
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={Link} to="/dashboard">Pulpit</Button>
            <Button color="inherit" component={Link} to="/types">Ćwiczenia</Button>
            <Button color="inherit" component={Link} to="/sessions">Sesje</Button>
            <Button color="inherit" component={Link} to="/goals">Cele</Button>
            <Button color="inherit" onClick={logout}>Wyloguj</Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={Link} to="/login">Logowanie</Button>
            <Button color="inherit" component={Link} to="/register">Rejestracja</Button>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  );
}

function Layout() {
  return (
    <>
      <NavBar />
      <Container sx={{ mt: 4 }}>
        <Outlet />
      </Container>
    </>
  );
}

function HomeRedirect() {
  const { token } = useAuth();
  return <Navigate to={token ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<HomeRedirect />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/login/oauth"   element={<LoginOAuth />} /> {/* ✅ callback */}

        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="types"     element={<ExerciseTypes />} />
            <Route path="sessions"  element={<Sessions />} />
            <Route path="goals"     element={<Goals />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
