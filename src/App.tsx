import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
} from 'react-router-dom';

import { useAuth }        from '@/hooks/auth';
import Login              from '@/pages/Login';
import Register           from '@/pages/Register';
import ExerciseTypes      from '@/pages/ExerciseTypes';
import Sessions           from '@/pages/Sessions';
import PrivateRoute       from '@/components/PrivateRoute';

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
          /* menu po zalogowaniu */
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={Link} to="/types">
              Ćwiczenia
            </Button>
            <Button color="inherit" component={Link} to="/sessions">
              Sesje
            </Button>
            <Button color="inherit" onClick={logout}>
              Wyloguj
            </Button>
          </Stack>
        ) : (
          /* linki publiczne */
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

/* ────────────────────────── Layout ────────────────────────── */
function Layout() {
  return (
    <>
      <NavBar />
      <Container sx={{ mt: 4 }}>
        <Outlet /> {/* w to miejsce React Router wstrzykuje podstrony */}
      </Container>
    </>
  );
}

/* ────────────────────────── App (routing) ─────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ——— PUBLIC ——— */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ——— PRIVATE (chronione) ——— */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index          element={<Navigate to="/types" replace />} />
          <Route path="types"   element={<ExerciseTypes />}     />
          <Route path="sessions" element={<Sessions />}         />
        </Route>

        {/* ——— 404 fallback ——— */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
