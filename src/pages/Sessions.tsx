import { useEffect, useState, useCallback } from 'react';
import {
  Box, Paper, Stack, TextField, MenuItem, Button, Typography, Alert, CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/services/api';

interface Type {
  id: number;
  name: string;
}

interface SessionRow {
  db_id: number;
  lp: number;
  exercise_type: string;
  duration: number;
  calories: number;
  date: string | null;
}

const newSessionSchema = z.object({
  typeId: z.string().min(1, 'Wybierz typ'),
  duration: z.string().min(1, 'Podaj czas').refine((v) => Number(v) > 0, 'Musi być > 0'),
  calories: z.string().min(1, 'Podaj kcal').refine((v) => Number(v) > 0, 'Musi być > 0'),
  date: z.string().optional(),
});
type NewSession = z.infer<typeof newSessionSchema>;

function fmtDate(value: unknown): string {
  if (!value) return '—';
  const raw = String(value);
  const d1 = new Date(raw);
  if (!Number.isNaN(d1.getTime())) return d1.toLocaleString();
  const d2 = new Date(raw.replace(' ', 'T'));
  if (!Number.isNaN(d2.getTime())) return d2.toLocaleString();
  return raw;
}

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
        api.get('/sessions', { params: { page: 1, page_size: 1000 } }),
      ]);
      setTypes(typesData);

      const itemsRaw = Array.isArray(sessData) ? sessData : (sessData?.items ?? []);
      const items: SessionRow[] = itemsRaw.map((it: any, idx: number) => ({
        db_id: it.id,
        lp: idx + 1,
        exercise_type: it.exercise_type,
        duration: it.duration,
        calories: it.calories,
        date: it.date ?? null,
      }));

      setRows(items);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się pobrać danych');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<NewSession>({
    resolver: zodResolver(newSessionSchema),
    defaultValues: { typeId: '', date: '' },
  });

  const add = async (data: NewSession) => {
    try {
      const payload: any = {
        exercise_type_id: Number(data.typeId),
        duration: Number(data.duration),
        calories: Number(data.calories),
      };
      if (data.date) {
        payload.date = new Date(data.date).toISOString();
      }

      await api.post('/sessions', payload);
      reset({ typeId: '', duration: '', calories: '', date: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się dodać sesji');
    }
  };

  const del = async (db_id: number) => {
    try {
      await api.delete(`/sessions/${db_id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się usunąć sesji');
    }
  };

  const columns: GridColDef[] = [
    { field: 'lp', headerName: 'Lp.', width: 80, sortable: false },
    { field: 'exercise_type', headerName: 'Typ', flex: 1, minWidth: 160 },
    { field: 'duration', headerName: 'Minuty', width: 110 },
    { field: 'calories', headerName: 'Kcal', width: 110 },
    {
      field: 'date',
      headerName: 'Data',
      width: 220,
      renderCell: (p) => <span>{fmtDate(p.row?.date)}</span>,
      sortComparator: (a, b) => {
        const ta = new Date(String(a)).getTime() || 0;
        const tb = new Date(String(b)).getTime() || 0;
        return ta - tb;
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          key="del"
          icon={<DeleteIcon />}
          label="Usuń"
          onClick={() => del((params.row as SessionRow).db_id)}
          showInMenu={false}
        />,
      ],
    },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Sesje treningowe</Typography>

      <Paper sx={{ p: 2, mb: 3 }} component="form" onSubmit={handleSubmit(add)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Typ"
            sx={{ minWidth: 160 }}
            defaultValue=""
            {...register('typeId')}
            error={!!errors.typeId}
            helperText={errors.typeId?.message}
          >
            <MenuItem value="">— wybierz —</MenuItem>
            {types.map((t) => (
              <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
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

          <TextField
            label="Data"
            type="datetime-local"
            sx={{ minWidth: 220 }}
            InputLabelProps={{ shrink: true }}
            {...register('date')}
            helperText="Opcjonalnie — kiedy wykonano sesję"
          />

          <Button variant="contained" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '...' : 'Dodaj'}
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isLoading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ height: 520 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => (row as SessionRow).db_id}
            pageSizeOptions={[5, 10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            disableRowSelectionOnClick
          />
        </Paper>
      )}
    </Box>
  );
}
