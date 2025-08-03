import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/api';

interface Type {
  id: number;
  name: string;
}

interface SessionRow {
  id: number;
  exercise_type: string;
  duration: number;
  calories: number;
  date: string;
}

const newSessionSchema = z.object({
  typeId: z.string().min(1, 'Wybierz typ'),
  duration: z
    .string()
    .min(1, 'Podaj czas')
    .refine((v) => Number(v) > 0, 'Musi być > 0'),
  calories: z
    .string()
    .min(1, 'Podaj kcal')
    .refine((v) => Number(v) > 0, 'Musi być > 0'),
});
type NewSession = z.infer<typeof newSessionSchema>;

export default function Sessions() {
  const [types, setTypes] = useState<Type[]>([]);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: typesData }, { data: sessData }] = await Promise.all([
        api.get<Type[]>('/exercise-types'),
        api.get<SessionRow[]>('/sessions'),
      ]);
      setTypes(typesData);
      setRows(sessData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się pobrać danych');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewSession>({ resolver: zodResolver(newSessionSchema) });

  const add = async (data: NewSession) => {
    try {
      await api.post('/sessions', {
        exercise_type_id: Number(data.typeId),
        duration: Number(data.duration),
        calories: Number(data.calories),
      });
      reset();
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się dodać sesji');
    }
  };

  const del = async (id: number) => {
    try {
      await api.delete(`/sessions/${id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się usunąć sesji');
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'exercise_type', headerName: 'Typ', flex: 1 },
    { field: 'duration', headerName: 'Minuty', width: 110 },
    { field: 'calories', headerName: 'Kcal', width: 110 },
    {
      field: 'date',
      headerName: 'Data',
      width: 180,
      valueFormatter: (p) => new Date(p.value as string).toLocaleString(),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Usuń"
          onClick={() => del(params.id as number)}
          showInMenu={false}
        />,
      ],
    },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Sesje treningowe
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }} component="form" onSubmit={handleSubmit(add)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Typ"
            sx={{ minWidth: 160 }}
            {...register('typeId')}
            error={!!errors.typeId}
            helperText={errors.typeId?.message}
          >
            {types.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Minuty"
            type="number"
            {...register('duration')}
            error={!!errors.duration}
            helperText={errors.duration?.message}
          />

          <TextField
            label="Kalorie"
            type="number"
            {...register('calories')}
            error={!!errors.calories}
            helperText={errors.calories?.message}
          />

          <Button variant="contained" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '...' : 'Dodaj'}
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ height: 500 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            disableRowSelectionOnClick
          />
        </Paper>
      )}
    </Box>
  );
}
