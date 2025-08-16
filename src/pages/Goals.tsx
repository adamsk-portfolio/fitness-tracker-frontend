import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Box, Paper, Stack, TextField, MenuItem, Button, Typography, Alert, CircularProgress, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, useMediaQuery, useTheme, Chip, LinearProgress,
  ToggleButton, ToggleButtonGroup, Card, CardContent
} from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import RefreshIcon from '@mui/icons-material/Refresh'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '@/services/api'

import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

type Metric = 'duration' | 'calories' | 'sessions'
type Period = 'weekly' | 'monthly' | 'yearly'

interface TypeOpt { id: number; name: string }

interface GoalProgress {
  value: number
  target: number
  percent: number
  remaining: number
  status: 'active' | 'achieved' | 'overdue' | 'future'
  window: { start: string; end: string }
}

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
  progress?: GoalProgress | null
}

type Filters = {
  metric: '' | Metric
  period: '' | Period
  typeId: string
  from: string
  to: string
}

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

const PIE_STATUS_COLORS: Record<string, string> = {
  achieved: '#2e7d32',
  active: '#1976d2',
  overdue: '#d32f2f',
  future: '#757575',
}
const METRIC_COLORS: Record<string, string> = {
  'Czas (min)': '#42a5f5',
  Kalorie: '#26a69a',
  Sesje: '#ab47bc',
}
const statusChipColor = (s?: GoalProgress['status']): any => {
  switch (s) {
    case 'achieved': return 'success'
    case 'active': return 'primary'
    case 'overdue': return 'error'
    case 'future': return 'default'
    default: return 'default'
  }
}
const statusLabel = (s?: GoalProgress['status']): string => {
  switch (s) {
    case 'achieved': return 'Osiągnięty'
    case 'active': return 'Aktywny'
    case 'overdue': return 'Po terminie'
    case 'future': return 'Przyszły'
    default: return '—'
  }
}

export default function Goals() {
  const [types, setTypes] = useState<TypeOpt[]>([])
  const [rows, setRows] = useState<GoalRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null)

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })
  const [filters, setFilters] = useState<Filters>({ metric: '', period: '', typeId: '', from: '', to: '' })
  const [statusFilter, setStatusFilter] = useState<'all' | 'achieved' | 'active' | 'overdue' | 'future' | 'almost'>('all')

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<GoalRow | null>(null)

  const [qOpen, setQOpen] = useState(false)
  const [qGoal, setQGoal] = useState<GoalRow | null>(null)

  const theme = useTheme()
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'))

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

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { page, pageSize } = paginationModel

      const params: Record<string, any> = {
        page: page + 1,
        page_size: pageSize,
        with_progress: true,
      }
      if (filters.metric) params.metric = filters.metric
      if (filters.period) params.period = filters.period
      if (filters.typeId) params.exercise_type_id = Number(filters.typeId)
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to

      const gRes = await api.get('goals', { params })
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
        progress: it.progress ?? null,
      }))

      setRows(items)
      setTotal((Array.isArray(raw) ? items.length : Number(raw?.total ?? items.length)) || 0)
    } catch (e: any) {
      console.error(e)
      setError(e.response?.data?.message ?? 'Nie udało się pobrać celów')
    } finally {
      setLoading(false)
    }
  }, [paginationModel, filters])

  useEffect(() => { load() }, [load])

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
      if (data.typeId !== undefined) payload.exercise_type_id = data.typeId ? Number(data.typeId) : null
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

  const sessionSchema = z.object({
    minutes: z.string().refine(v => Number(v) > 0, 'Minuty > 0'),
    calories: z.string().optional(),
  })
  type SessionForm = z.infer<typeof sessionSchema>
  const sessionForm = useForm<SessionForm>({ resolver: zodResolver(sessionSchema), defaultValues: { minutes: '', calories: '' } })

  const openQuickSession = (row: GoalRow) => {
    setQGoal(row)
    sessionForm.reset({ minutes: '', calories: '' })
    setQOpen(true)
  }
  const submitQuickSession = async (data: SessionForm) => {
    if (!qGoal) return
    try {
      const payload: any = {
        minutes: Number(data.minutes),
        calories: data.calories ? Number(data.calories) : 0,
      }
      if (qGoal.exercise_type_id != null) payload.exercise_type_id = qGoal.exercise_type_id

      await api.post('sessions', payload)
      setSnack({ sev: 'success', msg: 'Sesja dodana' })
      setQOpen(false)
      setQGoal(null)
      await load()
    } catch (e: any) {
      setSnack({ sev: 'error', msg: e.response?.data?.message ?? 'Nie udało się dodać sesji' })
    }
  }

  const statsByStatus = useMemo(() => {
    let achieved = 0, active = 0, overdue = 0, future = 0, almost = 0
    for (const r of rows) {
      const p = r.progress
      if (!p) continue
      if (p.status === 'achieved') achieved++
      if (p.status === 'active') {
        active++
        if (p.percent >= 80) almost++
      }
      if (p.status === 'overdue') overdue++
      if (p.status === 'future') future++
    }
    return { achieved, active, overdue, future, almost }
  }, [rows])

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    if (statusFilter === 'almost') {
      return rows.filter(r => r.progress && r.progress.status === 'active' && r.progress.percent >= 80 && r.progress.percent < 100)
    }
    return rows.filter(r => r.progress?.status === statusFilter)
  }, [rows, statusFilter])

  const charts = useMemo(() => {
    const cnt = { achieved: 0, active: 0, overdue: 0, future: 0 }
    const byMetric = { duration: 0, calories: 0, sessions: 0 } as Record<Metric, number>

    for (const r of rows) {
      if (r.metric) byMetric[r.metric]++
      const s = r.progress?.status as 'achieved'|'active'|'overdue'|'future'|undefined
      if (!s) continue
      cnt[s]++
    }

    return {
      statusPie: [
        { name: 'achieved', value: cnt.achieved },
        { name: 'active', value: cnt.active },
        { name: 'overdue', value: cnt.overdue },
        { name: 'future', value: cnt.future },
      ],
      metricBar: [
        { name: 'Czas (min)', count: byMetric.duration },
        { name: 'Kalorie', count: byMetric.calories },
        { name: 'Sesje', count: byMetric.sessions },
      ],
    }
  }, [rows])

  const { avgPercentActive, bestPercent } = useMemo(() => {
    const progs = rows.map(r => r.progress).filter(Boolean) as GoalProgress[]
    const active = progs.filter(p => p.status === 'active' || p.status === 'achieved')
    if (active.length === 0) return { avgPercentActive: 0, bestPercent: 0 }
    const percents = active.map(p => p.percent || 0)
    const avg = percents.reduce((a, b) => a + b, 0) / percents.length
    return { avgPercentActive: Math.round(avg * 100) / 100, bestPercent: Math.max(...percents) }
  }, [rows])

  const columns: GridColDef[] = [
    {
      field: 'exercise_type',
      headerName: 'Typ ćwiczenia',
      minWidth: 180,
      flex: 1,
      renderCell: (p) => <span title={String(p.row.exercise_type ?? '')}>{dash(p.row.exercise_type)}</span>,
    },
    {
      field: 'window',
      headerName: 'Okno',
      minWidth: 240,
      flex: 1,
      renderCell: (p) => {
        const w = p.row.progress?.window
        if (!w) return <span>—</span>
        return <span>{dashDate(w.start)} — {dashDate(w.end)}</span>
      },
    },
    {
      field: 'progress_percent',
      headerName: 'Postęp',
      minWidth: 220,
      flex: 0.9,
      sortable: false,
      renderCell: (p) => {
        const percent: number = p.row.progress?.percent ?? 0
        const status = p.row.progress?.status
        return (
          <Box sx={{ width: '100%' }}>
            <LinearProgress variant="determinate" value={percent} color={statusChipColor(status)} sx={{ height: 8, borderRadius: 4 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">{percent}%</Typography>
              <Typography variant="caption" color="text.secondary">
                {p.row.progress ? `${p.row.progress.value}/${p.row.progress.target}` : '—'}
              </Typography>
            </Stack>
          </Box>
        )
      },
    },
    {
      field: 'remaining',
      headerName: 'Pozostało',
      minWidth: 150,
      flex: 0.6,
      renderCell: (p) => {
        const rem = p.row.progress?.remaining
        if (rem == null) return <span>—</span>
        return <span>{rem} {p.row.metric === 'duration' ? 'min' : p.row.metric === 'calories' ? 'kcal' : 'sesji'}</span>
      }
    },
    {
      field: 'progress_status',
      headerName: 'Status',
      minWidth: 140,
      flex: 0.55,
      sortable: false,
      renderCell: (p) => {
        const s = p.row.progress?.status
        return <Chip size="small" label={statusLabel(s)} color={statusChipColor(s)} variant="outlined" />
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Akcje',
      minWidth: 140,
      flex: 0.55,
      getActions: (params) => [
        <GridActionsCellItem key="quick" icon={<FitnessCenterIcon />} label="Dodaj sesję" onClick={() => openQuickSession(params.row as GoalRow)} />,
        <GridActionsCellItem key="edit" icon={<EditIcon />} label="Edytuj" onClick={() => openEdit(params.row as GoalRow)} />,
        <GridActionsCellItem key="del" icon={<DeleteIcon />} label="Usuń" onClick={() => del(params.id as number)} showInMenu={false} />,
      ],
    },
  ]

  const applyFilters = async () => {
    setPaginationModel((m) => ({ ...m, page: 0 }))
    await load()
  }
  const clearFilters = async () => {
    setFilters({ metric: '', period: '', typeId: '', from: '', to: '' })
    setPaginationModel((m) => ({ ...m, page: 0 }))
    await load()
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Cele treningowe</Typography>
        <Button startIcon={<RefreshIcon />} onClick={() => load()} disabled={isLoading}>Odśwież</Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ flex: 1 }}><CardContent>
          <Typography variant="overline" color="text.secondary">Średni % aktywnych celów</Typography>
          <Typography variant="h4" fontWeight={800}>{avgPercentActive}%</Typography>
        </CardContent></Card>
        <Card sx={{ flex: 1 }}><CardContent>
          <Typography variant="overline" color="text.secondary">Najlepszy wynik</Typography>
          <Typography variant="h4" fontWeight={800}>{bestPercent}%</Typography>
        </CardContent></Card>
        <Card sx={{ flex: 1 }}><CardContent>
          <Typography variant="overline" color="text.secondary">Osiągnięte</Typography>
          <Typography variant="h4" fontWeight={800} color="success.main">{statsByStatus.achieved}</Typography>
        </CardContent></Card>
        <Card sx={{ flex: 1 }}><CardContent>
          <Typography variant="overline" color="text.secondary">Prawie gotowe (≥80%)</Typography>
          <Typography variant="h4" fontWeight={800} color="warning.main">{statsByStatus.almost}</Typography>
        </CardContent></Card>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <ToggleButtonGroup
              size="small"
              color="primary"
              value={statusFilter}
              exclusive
              onChange={(_, v) => v && setStatusFilter(v)}
            >
              <ToggleButton value="all">Wszystkie</ToggleButton>
              <ToggleButton value="achieved">Osiągnięte</ToggleButton>
              <ToggleButton value="active">Aktywne</ToggleButton>
              <ToggleButton value="almost">Prawie gotowe</ToggleButton>
              <ToggleButton value="overdue">Po terminie</ToggleButton>
              <ToggleButton value="future">Przyszłe</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Przegląd celów</Typography>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
          <Box sx={{ flex: 1, height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend formatter={(v) =>
                  v === 'achieved' ? 'Osiągnięte' :
                  v === 'active' ? 'Aktywne' :
                  v === 'overdue' ? 'Po terminie' :
                  v === 'future' ? 'Przyszłe' : v
                }/>
                <Pie data={charts.statusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                  {charts.statusPie.map((entry) => (
                    <Cell key={`status-${entry.name}`} fill={PIE_STATUS_COLORS[entry.name] || '#90a4ae'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ flex: 1, height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.metricBar} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count">
                  {charts.metricBar.map((entry) => (
                    <Cell key={`metric-${entry.name}`} fill={METRIC_COLORS[entry.name] || '#90caf9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Stack>
      </Paper>

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
        <Paper sx={{ width: '100%', overflowX: 'auto' }}>
          <DataGrid
            autoHeight
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[5, 10, 25]}
            paginationMode="server"
            rowCount={total}
            paginationModel={paginationModel}
            onPaginationModelChange={(m) => setPaginationModel(m)}
            loading={isLoading}
            disableRowSelectionOnClick
            disableColumnFilter
            disableColumnMenu
            density="standard"
            sx={{
              minWidth: 980,
              '& .MuiDataGrid-cell': { alignItems: 'center' },
            }}
          />
        </Paper>
      )}

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

      <Dialog open={qOpen} onClose={() => setQOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Dodaj sesję {qGoal?.exercise_type ? `– ${qGoal?.exercise_type}` : ''}</DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
            <TextField label="Minuty" type="number" sx={{ minWidth: 160 }}
              {...sessionForm.register('minutes')} error={!!sessionForm.formState.errors.minutes}
              helperText={sessionForm.formState.errors.minutes?.message} />
            <TextField label="Kalorie (opcjonalnie)" type="number" sx={{ minWidth: 200 }}
              {...sessionForm.register('calories')} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Sesja zostanie przypisana do typu ćwiczenia z celu (jeśli jest ustawiony).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQOpen(false)}>Anuluj</Button>
          <Button variant="contained" onClick={sessionForm.handleSubmit(submitQuickSession)}>Dodaj sesję</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <MuiAlert elevation={6} variant="filled" severity={snack?.sev || 'success'} onClose={() => setSnack(null)}>{snack?.msg}</MuiAlert>
      </Snackbar>
    </Box>
  )
}
