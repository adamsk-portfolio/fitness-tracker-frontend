import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Box, Paper, Stack, TextField, MenuItem, Button, Typography, Alert, CircularProgress, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '@/services/api'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'

type Metric = 'duration' | 'calories' | 'sessions'
type Period = 'weekly' | 'monthly' | 'yearly'

interface TypeOpt { id: number; name: string }
interface GoalRow {
  id: number
  description: string | null
  target_value: number | null
  period: Period | null
  metric: Metric | null
  start_date: string | null
  end_date: string | null
  exercise_type_id: number | null
  exercise_type: string | null
}

/** ---- Zod ---- */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const schema = z.object({
  description: z.string().min(3, 'Za krótki opis'),
  target_value: z.string().refine(v => Number(v) > 0, 'Musi być > 0'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  metric: z.enum(['duration', 'calories', 'sessions']),
  typeId: z.string().optional(),
  start_date: z.string().optional().refine(v => !v || dateRegex.test(v), 'Format: RRRR-MM-DD'),
  end_date: z.string().optional().refine(v => !v || dateRegex.test(v), 'Format: RRRR-MM-DD'),
}).refine((data) => {
  if (!data.start_date || !data.end_date) return true
  return new Date(data.start_date) <= new Date(data.end_date)
}, { message: 'Data „Od” musi być ≤ „Do”', path: ['end_date'] })
type FormT = z.infer<typeof schema>

/** ---- helpers ---- */
const dash = (v: unknown) => (v == null || v === '' ? '—' : String(v))
const dashNum = (v: unknown) => (v == null || v === '' ? '—' : Number(v).toLocaleString())
const dashDate = (v: unknown) => {
  if (!v) return '—'
  const d = new Date(String(v))
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString()
  const d2 = new Date(String(v).replace(' ', 'T'))
  return Number.isNaN(d2.getTime()) ? '—' : d2.toLocaleDateString()
}
const labelMetric = (m: Metric | null) =>
  m === 'duration' ? 'Czas (min)' : m === 'calories' ? 'Kalorie' : m === 'sessions' ? 'Sesje' : '—'
const labelPeriod = (p: Period | null) =>
  p === 'weekly' ? 'Tygodniowy' : p === 'monthly' ? 'Miesięczny' : p === 'yearly' ? 'Roczny' : '—'
const toInputDate = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Goals() {
  const [types, setTypes] = useState<TypeOpt[]>([])
  const [rows, setRows] = useState<GoalRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null)

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })

  // EDIT modal
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<GoalRow | null>(null)

  /** typy ćwiczeń (raz) */
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const tRes = await api.get<TypeOpt[]>('exercise-types')
        if (alive) setTypes(tRes.data)
      } catch (e) { console.error(e) }
    })()
    return () => { alive = false }
  }, [])

  /** pobranie celów */
  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { page, pageSize } = paginationModel
      const gRes = await api.get('goals', { params: { page: page + 1, page_size: pageSize } })
      const raw = gRes.data
      const itemsRaw = Array.isArray(raw) ? raw : (raw?.items ?? [])
      const items: GoalRow[] = (itemsRaw as any[]).map((it) => ({
        id: it.id,
        description: it.description ?? null,
        target_value: it.target_value ?? null,
        period: (it.period ?? null) as Period | null,
        metric: (it.metric ?? null) as Metric | null,
        start_date: it.start_date ?? null,
        end_date: it.end_date ?? null,
        exercise_type_id: it.exercise_type_id ?? null,
        exercise_type: it.exercise_type ?? null,
      }))
      setRows(items)
      setTotal((Array.isArray(raw) ? items.length : Number(raw?.total ?? items.length)) || 0)
    } catch (e: any) {
      console.error(e)
      setError(e.response?.data?.message ?? 'Nie udało się pobrać celów')
    } finally {
      setLoading(false)
    }
  }, [paginationModel])

  useEffect(() => { load() }, [load])

  /** formularz DODAWANIA */
  const addForm = useForm<FormT>({
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
  })
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = addForm

  const add = async (data: FormT) => {
    try {
      const payload: any = {
        description: data.description,
        target_value: Number(data.target_value),
        period: data.period,
        metric: data.metric,
      }
      if (data.typeId) payload.exercise_type_id = Number(data.typeId)
      if (data.start_date) payload.start_date = data.start_date
      if (data.end_date) payload.end_date = data.end_date

      await api.post('goals', payload)
      reset({
        metric: 'duration',
        period: 'weekly',
        description: '',
        target_value: '',
        typeId: '',
        start_date: '',
        end_date: '',
      } as any)
      setSnack({ sev: 'success', msg: 'Cel dodany' })
      setPaginationModel((m) => ({ ...m, page: 0 }))
      await load()
    } catch (e: any) {
      setSnack({ sev: 'error', msg: e.response?.data?.message ?? 'Nie udało się dodać celu' })
    }
  }

  /** formularz EDYCJI (osobny RHF) */
  const editForm = useForm<FormT>({ resolver: zodResolver(schema) })
  const openEdit = (row: GoalRow) => {
    setEditing(row)
    editForm.reset({
      description: row.description ?? '',
      target_value: row.target_value != null ? String(row.target_value) : '',
      period: (row.period ?? 'weekly') as any,
      metric: (row.metric ?? 'duration') as any,
      typeId: row.exercise_type_id != null ? String(row.exercise_type_id) : '',
      start_date: toInputDate(row.start_date),
      end_date: toInputDate(row.end_date),
    } as any)
    setEditOpen(true)
  }
  const submitEdit = async (data: FormT) => {
    if (!editing) return
    try {
      const payload: any = {
        description: data.description,
        target_value: Number(data.target_value),
        period: data.period,
        metric: data.metric,
      }
      // ▶ wysyłamy exercise_type_id tylko jeśli wybrano typ
      if (data.typeId) {
        payload.exercise_type_id = Number(data.typeId)
      }
      if (data.start_date) payload.start_date = data.start_date
      if (data.end_date) payload.end_date = data.end_date

      await api.put(`goals/${editing.id}`, payload)
      setSnack({ sev: 'success', msg: 'Cel zaktualizowany' })
      setEditOpen(false)
      setEditing(null)
      await load()
    } catch (e: any) {
      setSnack({ sev: 'error', msg: e.response?.data?.message ?? 'Nie udało się zaktualizować celu' })
    }
  }

  const del = async (id: number) => {
    if (!window.confirm('Na pewno usunąć ten cel?')) return
    const backup = rows
    setRows((r) => r.filter(x => x.id !== id))
    try {
      await api.delete(`goals/${id}`)
      setSnack({ sev: 'success', msg: 'Cel usunięty' })
      setPaginationModel((m) => {
        const nextCount = backup.length - 1
        if (nextCount <= 0 && m.page > 0) return { ...m, page: m.page - 1 }
        return m
      })
      await load()
    } catch (e: any) {
      setRows(backup)
      setSnack({ sev: 'error', msg: e.response?.data?.message ?? 'Nie udało się usunąć celu' })
    }
  }

  /** STATYSTYKI (bieżąca strona) */
  const stats = useMemo(() => {
    const by = { duration: 0, calories: 0, sessions: 0 } as Record<Metric, number>
    for (const r of rows) if (r.metric && by[r.metric] != null) by[r.metric]++
    return { total, by }
  }, [rows, total])

  /** DANE DO WYKRESU (bieżąca strona) */
  const chartData = useMemo(() => {
    const byCount = { duration: 0, calories: 0, sessions: 0 } as Record<Metric, number>
    const bySum   = { duration: 0, calories: 0, sessions: 0 } as Record<Metric, number>
    for (const r of rows) {
      if (!r.metric) continue
      byCount[r.metric]++
      if (r.target_value != null && !Number.isNaN(Number(r.target_value))) {
        bySum[r.metric] += Number(r.target_value)
      }
    }
    return [
      { name: 'Czas (min)', count: byCount.duration, sum: bySum.duration },
      { name: 'Kalorie',   count: byCount.calories,  sum: bySum.calories },
      { name: 'Sesje',     count: byCount.sessions,  sum: bySum.sessions },
    ]
  }, [rows])

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'description', headerName: 'Opis', flex: 1, renderCell: (p) => <span title={String(p.row.description ?? '')}>{dash(p.row.description)}</span> },
    { field: 'metric', headerName: 'Metryka', width: 140, renderCell: (p) => <span>{labelMetric(p.row.metric)}</span> },
    { field: 'target_value', headerName: 'Cel', width: 110, renderCell: (p) => <span>{dashNum(p.row.target_value)}</span> },
    { field: 'period', headerName: 'Okres', width: 140, renderCell: (p) => <span>{labelPeriod(p.row.period)}</span> },
    { field: 'exercise_type', headerName: 'Typ ćwiczenia', width: 170, renderCell: (p) => <span>{dash(p.row.exercise_type)}</span> },
    { field: 'start_date', headerName: 'Od', width: 140, renderCell: (p) => <span>{dashDate(p.row.start_date)}</span> },
    { field: 'end_date', headerName: 'Do', width: 140, renderCell: (p) => <span>{dashDate(p.row.end_date)}</span> },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem key="edit" icon={<EditIcon />} label="Edytuj" onClick={() => openEdit(params.row as GoalRow)} />,
        <GridActionsCellItem key="del" icon={<DeleteIcon />} label="Usuń" onClick={() => del(params.id as number)} showInMenu={false} />,
      ],
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h5">Cele treningowe</Typography>
        <Button startIcon={<RefreshIcon />} onClick={() => load()} disabled={isLoading}>Odśwież</Button>
      </Stack>

      {/* WYKRES: podsumowanie danych na bieżącej stronie */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Podsumowanie na stronie</Typography>
        <Box sx={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Liczba celów" />
              <Bar dataKey="sum" name="Suma wartości" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* QUICK STATS */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="body2" color="text.secondary">Łącznie celów</Typography><Typography variant="h5">{stats.total}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="body2" color="text.secondary">Czas (min) — strona</Typography><Typography variant="h5">{stats.by.duration}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="body2" color="text.secondary">Kalorie — strona</Typography><Typography variant="h5">{stats.by.calories}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="body2" color="text.secondary">Sesje — strona</Typography><Typography variant="h5">{stats.by.sessions}</Typography></Paper>
      </Stack>

      {/* FORM DODAWANIA */}
      <Paper sx={{ p: 2, mb: 3 }} component="form" onSubmit={handleSubmit(add)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Opis" sx={{ minWidth: 220 }} {...register('description')} error={!!errors.description} helperText={errors.description?.message} />
          <TextField label="Wartość" type="number" sx={{ minWidth: 120 }} {...register('target_value')} error={!!errors.target_value} helperText={errors.target_value?.message} />
          <TextField select label="Okres" sx={{ minWidth: 160 }} defaultValue="weekly" {...register('period')} error={!!errors.period} helperText={errors.period?.message}>
            <MenuItem value="weekly">Tygodniowy</MenuItem><MenuItem value="monthly">Miesięczny</MenuItem><MenuItem value="yearly">Roczny</MenuItem>
          </TextField>
          <TextField select label="Metryka" sx={{ minWidth: 160 }} defaultValue="duration" {...register('metric')} error={!!errors.metric} helperText={errors.metric?.message}>
            <MenuItem value="duration">Czas (min)</MenuItem><MenuItem value="calories">Kalorie</MenuItem><MenuItem value="sessions">Sesje</MenuItem>
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <TextField select label="Typ ćwiczenia (opcjonalnie)" sx={{ minWidth: 220 }} defaultValue="" {...register('typeId')}>
            <MenuItem value="">— dowolny —</MenuItem>{types.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
          </TextField>
          <TextField label="Od" type="date" sx={{ minWidth: 160 }} InputLabelProps={{ shrink: true }} {...register('start_date')} error={!!errors.start_date} helperText={errors.start_date?.message} />
          <TextField label="Do" type="date" sx={{ minWidth: 160 }} InputLabelProps={{ shrink: true }} {...register('end_date')} error={!!errors.end_date} helperText={errors.end_date?.message} />
          <Button variant="contained" type="submit" disabled={isSubmitting}>{isSubmitting ? '...' : 'Dodaj'}</Button>
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
            getRowId={(row) => row.id}
            pageSizeOptions={[5, 10, 25]}
            paginationMode="server"
            rowCount={total}
            paginationModel={paginationModel}
            onPaginationModelChange={(m) => setPaginationModel(m)}
            loading={isLoading}
            disableRowSelectionOnClick
            density="standard"
          />
        </Paper>
      )}

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Edytuj cel</DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
            <TextField label="Opis" sx={{ minWidth: 220 }} {...editForm.register('description')} error={!!editForm.formState.errors.description} helperText={editForm.formState.errors.description?.message} />
            <TextField label="Wartość" type="number" sx={{ minWidth: 120 }} {...editForm.register('target_value')} error={!!editForm.formState.errors.target_value} helperText={editForm.formState.errors.target_value?.message} />
            <TextField select label="Okres" sx={{ minWidth: 160 }} defaultValue="weekly" {...editForm.register('period')} error={!!editForm.formState.errors.period} helperText={editForm.formState.errors.period?.message}>
              <MenuItem value="weekly">Tygodniowy</MenuItem><MenuItem value="monthly">Miesięczny</MenuItem><MenuItem value="yearly">Roczny</MenuItem>
            </TextField>
            <TextField select label="Metryka" sx={{ minWidth: 160 }} defaultValue="duration" {...editForm.register('metric')} error={!!editForm.formState.errors.metric} helperText={editForm.formState.errors.metric?.message}>
              <MenuItem value="duration">Czas (min)</MenuItem><MenuItem value="calories">Kalorie</MenuItem><MenuItem value="sessions">Sesje</MenuItem>
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Typ ćwiczenia (opcjonalnie)" sx={{ minWidth: 220 }} defaultValue="" {...editForm.register('typeId')}>
              <MenuItem value="">— dowolny —</MenuItem>{types.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
            </TextField>
            <TextField label="Od" type="date" sx={{ minWidth: 160 }} InputLabelProps={{ shrink: true }} {...editForm.register('start_date')} error={!!editForm.formState.errors.start_date} helperText={editForm.formState.errors.start_date?.message} />
            <TextField label="Do" type="date" sx={{ minWidth: 160 }} InputLabelProps={{ shrink: true }} {...editForm.register('end_date')} error={!!editForm.formState.errors.end_date} helperText={editForm.formState.errors.end_date?.message} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={editForm.handleSubmit(submitEdit)}>Zapisz zmiany</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <MuiAlert elevation={6} variant="filled" severity={snack?.sev || 'success'} onClose={() => setSnack(null)}>{snack?.msg}</MuiAlert>
      </Snackbar>
    </Box>
  )
}
