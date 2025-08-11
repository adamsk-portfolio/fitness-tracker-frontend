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

type Metric = 'duration' | 'calories' | 'sessions';
type Period = 'weekly' | 'monthly' | 'once';

interface TypeOpt { id: number; name: string; }

interface GoalRow {
  id: number;
  description: string;
  target_value: number;
  period: Period;
  metric: Metric;
  start_date: string | null;
  end_date: string | null;
  exercise_type_id: number | null;
  exercise_type: string | null;
}

const schema = z.object({
  description: z.string().min(3, 'Za krótki opis'),
  target_value: z.string().refine(v => Number(v) > 0, 'Musi być > 0'),
  period: z.enum(['weekly', 'monthly', 'once']),
  metric: z.enum(['duration', 'calories', 'sessions']),
  typeId: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});
type FormT = z.infer<typeof schema>;

function fmt(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  const d2 = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d2.getTime()) ? String(value) : d2.toLocaleDateString();
}

export default function Goals() {
  const [types, setTypes] = useState<TypeOpt[]>([]);
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [tRes, gRes] = await Promise.allSettled([
      api.get<TypeOpt[]>('/exercise-types'),
      api.get('/goals'),
    ]);

    if (tRes.status === 'fulfilled') {
      setTypes(tRes.value.data);
    } else {
      console.error('exercise-types failed', tRes.reason);
    }

    if (gRes.status === 'fulfilled') {
      const raw = gRes.value.data;
      const itemsRaw = Array.isArray(raw) ? raw : (raw?.items ?? []);
      const items: GoalRow[] = (itemsRaw as any[]).map((it) => ({
        id: it.id,
        description: it.description,
        target_value: it.target_value,
        period: it.period as Period,
        metric: it.metric as Metric,
        start_date: it.start_date ?? null,
        end_date: it.end_date ?? null,
        exercise_type_id: it.exercise_type_id ?? null,
        exercise_type: it.exercise_type ?? null,
      }));
      setRows(items);
    } else {
      console.error('goals failed', gRes.reason);
      setError('Nie udało się pobrać celów');
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormT>({
    resolver: zodResolver(schema),
    defaultValues: {
      metric: 'duration',
      period: 'weekly',
      description: '',
      target_value: '',
      typeId: '',
      start_date: '',
      end_date: '',
    } as any,
  });

  const add = async (data: FormT) => {
    try {
      const payload: any = {
        description: data.description,
        target_value: Number(data.target_value),
        period: data.period,
        metric: data.metric,
      };
      if (data.typeId) payload.exercise_type_id = Number(data.typeId);
      if (data.start_date) payload.start_date = data.start_date;
      if (data.end_date) payload.end_date = data.end_date;

      await api.post('/goals', payload);
      reset();
      load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Nie udało się dodać celu');
    }
  };

  const del = async (id: number) => {
    try {
      await api.delete(`/goals/${id}`);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Nie udało się usunąć celu');
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'description', headerName: 'Opis', flex: 1 },
    { field: 'metric', headerName: 'Metryka', width: 130 },
    { field: 'target_value', headerName: 'Cel', width: 110 },
    { field: 'period', headerName: 'Okres', width: 130 },
    { field: 'exercise_type', headerName: 'Typ ćwiczenia', width: 170 },
    { field: 'start_date', headerName: 'Od', width: 120, valueFormatter: (p) => fmt(p.value as string) },
    { field: 'end_date', headerName: 'Do', width: 120, valueFormatter: (p) => fmt(p.value as string) },
    {
      field: 'actions', type: 'actions', headerName: '', width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          key="del"
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
      <Typography variant="h5" gutterBottom>Cele treningowe</Typography>

      <Paper sx={{ p: 2, mb: 3 }} component="form" onSubmit={handleSubmit(add)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Opis"
            sx={{ minWidth: 220 }}
            {...register('description')}
            error={!!errors.description}
            helperText={errors.description?.message}
          />
          <TextField
            label="Wartość"
            type="number"
            sx={{ minWidth: 120 }}
            {...register('target_value')}
            error={!!errors.target_value}
            helperText={errors.target_value?.message}
          />
          <TextField
            select
            label="Okres"
            sx={{ minWidth: 160 }}
            defaultValue="weekly"
            {...register('period')}
            error={!!errors.period}
            helperText={errors.period?.message}
          >
            <MenuItem value="weekly">Tygodniowy</MenuItem>
            <MenuItem value="monthly">Miesięczny</MenuItem>
            <MenuItem value="once">Jednorazowy</MenuItem>
          </TextField>
          <TextField
            select
            label="Metryka"
            sx={{ minWidth: 160 }}
            defaultValue="duration"
            {...register('metric')}
            error={!!errors.metric}
            helperText={errors.metric?.message}
          >
            <MenuItem value="duration">Czas (min)</MenuItem>
            <MenuItem value="calories">Kalorie</MenuItem>
            <MenuItem value="sessions">Sesje</MenuItem>
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <TextField
            select
            label="Typ ćwiczenia (opcjonalnie)"
            sx={{ minWidth: 220 }}
            defaultValue=""
            {...register('typeId')}
          >
            <MenuItem value="">— dowolny —</MenuItem>
            {types.map((t) => (
              <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Od (YYYY-MM-DD)"
            sx={{ minWidth: 160 }}
            placeholder="2025-08-12"
            {...register('start_date')}
          />
          <TextField
            label="Do (YYYY-MM-DD)"
            sx={{ minWidth: 160 }}
            placeholder="2025-08-19"
            {...register('end_date')}
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
            pageSizeOptions={[5, 10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick
          />
        </Paper>
      )}
    </Box>
  );
}
