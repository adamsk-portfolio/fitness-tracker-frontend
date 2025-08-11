import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Stack,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/services/api';

interface ExerciseType {
  id: number;
  name: string;
}

const newTypeSchema = z.object({
  name: z.string().min(2, 'Min. 2 znaki'),
});
type NewType = z.infer<typeof newTypeSchema>;

export default function ExerciseTypes() {
  const [rows, setRows]      = useState<ExerciseType[]>([]);
  const [isLoading, setLoad] = useState(true);
  const [error, setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoad(true);
      const { data } = await api.get<ExerciseType[]>('/exercise-types');
      setRows(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się pobrać listy');
    } finally {
      setLoad(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewType>({
    resolver: zodResolver(newTypeSchema),
  });

  const add = async (data: NewType) => {
    try {
      await api.post('/exercise-types', data);
      reset();
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się dodać typu');
    }
  };

  const del = async (id: number) => {
    try {
      await api.delete(`/exercise-types/${id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się usunąć typu');
    }
  };

  const columns: GridColDef[] = [
    { field: 'id',   headerName: 'ID',    width: 80 },
    { field: 'name', headerName: 'Nazwa', flex: 1   },
    {
      field: 'actions',
      type:  'actions',
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
        Typy ćwiczeń
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }} component="form" onSubmit={handleSubmit(add)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Nowy typ"
            fullWidth
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ whiteSpace: 'nowrap' }}
          >
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
