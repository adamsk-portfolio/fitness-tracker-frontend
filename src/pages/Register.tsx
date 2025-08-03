import { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/services/api';

const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy adres e-mail'),
  password: z.string().min(6, 'Hasło musi mieć min. 6 znaków'),
});
type RegisterData = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [serverErr, setServerErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterData) => {
    setServerErr(null);
    try {
      await api.post('/auth/register', data);
      navigate('/login', { replace: true });
    } catch (err: any) {
      setServerErr(err.response?.data?.message ?? 'Rejestracja nie powiodła się');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Stack
          component="form"
          spacing={3}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Typography variant="h5" textAlign="center">
            Załóż konto
          </Typography>

          {serverErr && <Alert severity="error">{serverErr}</Alert>}

          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          <TextField
            label="Hasło"
            type="password"
            fullWidth
            required
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? '...' : 'Zarejestruj'}
          </Button>

          <Button component={Link} to="/login">
            Masz konto? Zaloguj się
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
