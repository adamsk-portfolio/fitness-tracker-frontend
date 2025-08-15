import { useState } from 'react';
import {
  Box, Paper, Stack, TextField, Button, Typography, Alert,
  IconButton, InputAdornment, Divider,
} from '@mui/material';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';

import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/auth';

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres e-mail'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});
type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPw, setShowPw] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginData) => {
    setServerErr(null);
    try {
      await login(data.email, data.password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setServerErr(err.response?.data?.message ?? 'Błąd logowania');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <Paper sx={{ p: 4, width: 420 }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Typography variant="h5" align="center">Logowanie</Typography>

          {serverErr && <Alert severity="error">{serverErr}</Alert>}

          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            onFocus={() => setServerErr(null)}
          />

          <TextField
            label="Hasło"
            type={showPw ? 'text' : 'password'}
            fullWidth
            required
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            onFocus={() => setServerErr(null)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPw(s => !s)} edge="end">
                    {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ textTransform: 'none' }}>
            {isSubmitting ? '...' : 'Zaloguj'}
          </Button>

          <Divider>albo</Divider>

          <Button
            component="a"
            href="/api/auth/google/login"
            startIcon={<GoogleIcon />}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Zaloguj przez Google
          </Button>

          <Button component={Link} to="/register">Nie masz konta? Zarejestruj się</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
