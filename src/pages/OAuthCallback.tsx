import { useEffect, useState } from 'react';
import { Box, Paper, Stack, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function OAuthCallback() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = sp.get('access_token');
    const error = sp.get('error');

    if (error) {
      setErr(error);
      return;
    }
    if (token) {
      localStorage.setItem('token', token);
      navigate('/dashboard', { replace: true });
    } else {
      setErr('Brak tokenu w odpowiedzi OAuth.');
    }
  }, [sp, navigate]);

  if (!err) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <Paper sx={{ p: 4, width: 400 }}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography>Logowanie przez Google…</Typography>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <Paper sx={{ p: 4, width: 460 }}>
        <Stack spacing={2}>
          <Alert severity="error">{err}</Alert>
          <Button component={Link} to="/login" variant="contained">Wróć do logowania</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
