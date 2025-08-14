import { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Stack, Typography, IconButton, Alert, CircularProgress, Divider, useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api from '@/services/api';

type Totals = { minutes: number; calories: number; sessions: number };
type Summary = {
  range: 'week' | 'month';
  window: { start: string; end: string };
  totals: Totals;
};

export default function Dashboard() {
  const theme = useTheme();

  const [week, setWeek] = useState<Summary | null>(null);
  const [month, setMonth] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wRes, mRes] = await Promise.all([
        api.get<Summary>('reports/summary', { params: { range: 'week' } }),
        api.get<Summary>('reports/summary', { params: { range: 'month' } }),
      ]);
      setWeek(wRes.data);
      setMonth(mRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Nie udało się pobrać danych pulpitu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const chartData = useMemo(() => {
    const w = week?.totals || { minutes: 0, calories: 0, sessions: 0 };
    const m = month?.totals || { minutes: 0, calories: 0, sessions: 0 };
    return [
      { name: 'Czas (min)', week: w.minutes, month: m.minutes },
      { name: 'Kalorie',   week: w.calories, month: m.calories },
      { name: 'Sesje',     week: w.sessions, month: m.sessions },
    ];
  }, [week, month]);

  const windowWeek  = week  ? `${new Date(week.window.start).toLocaleString()} — ${new Date(week.window.end).toLocaleString()}` : '—';
  const windowMonth = month ? `${new Date(month.window.start).toLocaleString()} — ${new Date(month.window.end).toLocaleString()}` : '—';

  const colorWeek  = '#66BB6A';
  const strokeWeek = '#2E7D32';
  const colorMonth = '#B0BEC5';
  const strokeMonth= '#78909C';

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Pulpit</Typography>
        <IconButton onClick={load} disabled={loading} color="success" title="Odśwież">
          <RefreshIcon />
        </IconButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" sx={{ mt: 6 }}><CircularProgress /></Stack>
      ) : (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Paper sx={{ p: 2, flex: 1, borderLeft: `4px solid ${colorWeek}` }}>
              <Typography variant="overline" color="text.secondary">CZAS (min) – TYDZIEŃ</Typography>
              <Typography variant="h4" sx={{ mt: 0.5 }}>{week?.totals.minutes ?? 0}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Okno</Typography>
              <Typography variant="body2">{windowWeek}</Typography>
            </Paper>

            <Paper sx={{ p: 2, flex: 1, borderLeft: `4px solid ${colorMonth}` }}>
              <Typography variant="overline" color="text.secondary">KALORIE – TYDZIEŃ</Typography>
              <Typography variant="h4" sx={{ mt: 0.5 }}>{week?.totals.calories ?? 0}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Sesje – tydzień</Typography>
              <Typography variant="body2">{week?.totals.sessions ?? 0}</Typography>
            </Paper>

            <Paper sx={{ p: 2, flex: 1, borderLeft: `4px solid ${theme.palette.divider}` }}>
              <Typography variant="overline" color="text.secondary">PORÓWNANIE MIESIĄCA</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {`${week?.totals.minutes ?? 0} min, ${week?.totals.calories ?? 0} kcal, ${week?.totals.sessions ?? 0} sesj`}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Okno</Typography>
              <Typography variant="body2">{windowMonth}</Typography>
            </Paper>
          </Stack>

          <Paper sx={{ p: { xs: 1, md: 2 }, height: 420 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Tydzień vs miesiąc</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={chartData} barCategoryGap={20}>
                <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                  }}
                  formatter={(v: any) => [v, '']}
                />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <Bar dataKey="month" name="miesiąc" fill={colorMonth} stroke={strokeMonth} radius={[8,8,0,0]} maxBarSize={56} />
                <Bar dataKey="week"  name="tydzień" fill={colorWeek}  stroke={strokeWeek}  radius={[8,8,0,0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
