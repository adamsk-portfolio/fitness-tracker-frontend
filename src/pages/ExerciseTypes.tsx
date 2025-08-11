import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '@/services/api';

type TypeRow = { id: number; name: string };

export default function ExerciseTypes() {
  const [rows, setRows] = useState<TypeRow[]>([]);
  const [name, setName] = useState('');
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const namesSet = useMemo(
    () => new Set(rows.map(r => r.name.trim().toLowerCase())),
    [rows]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<TypeRow[]>('/exercise-types');
      setRows(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się pobrać typów ćwiczeń');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Podaj nazwę ćwiczenia');
      return;
    }
    if (namesSet.has(trimmed.toLowerCase())) {
      setError('Taki typ już istnieje.');
      return;
    }

    try {
      setSaving(true);
      await api.post('/exercise-types', { name: trimmed });
      setName('');
      setSuccess('Dodano nowy typ.');
      await load();
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 409) {
        setError(msg || 'Taki typ już istnieje.');
      } else {
        setError(msg || 'Nie udało się dodać typu.');
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/exercise-types/${id}`);
      setSuccess('Usunięto typ.');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Nie udało się usunąć typu.');
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Typy ćwiczeń</Typography>

      <Paper sx={{ p: 2, mb: 3 }} component="form" onSubmit={onAdd}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Nazwa nowego typu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setSuccess(null)}
            disabled={isSaving}
            sx={{ minWidth: 240 }}
          />
          <Button
            variant="contained"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Dodaję…' : 'Dodaj'}
          </Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </Paper>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ p: 1 }}>
          {rows.length === 0 ? (
            <Typography sx={{ p: 2, opacity: 0.7 }}>Brak typów — dodaj pierwszy powyżej.</Typography>
          ) : (
            <List dense>
              {rows.map((r) => (
                <ListItem
                  key={r.id}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => onDelete(r.id)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText primary={r.name} />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
}
