import { useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, IconButton, Alert, CircularProgress, Divider, useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import api from '@/services/api';

type Totals = { minutes: number; calories: number; sessions: number };
type Summary = {
  range: 'week' | 'month';
  window: { start: string; end: string };
  totals: Totals;
};

function MiniMetricChart({
  title,
  weekValue,
  monthValue,
}: {
  title: string;
  weekValue: number;
  monthValue: number;
}) {
  const MONTH_FILL = '#B0BEC5';
  const MONTH_STROKE = '#78909C';
  const WEEK_FILL  = '#66BB6A';
  const WEEK_STROKE = '#2E7D32';

  const data = [
    { name: 'miesiąc', value: monthValue, fill: MONTH_FILL, stroke: MONTH_STROKE },
    { name: 'tydzień', value: weekValue,  fill: WEEK_FILL,  stroke: WEEK_STROKE  },
  ];

  const max = Math.max(weekValue || 0, monthValue || 0);
  const yMax = max <= 0 ? 10 : Math.ceil(max * 1.15);

  return (
    <div style={{ flex: 1, minWidth: 280, height: 260 }}>
      <div style={{ fontSize: 14, color: '#90a4ae', margin: '0 0 4px 8px' }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} domain={[0, yMax]} />
          <Tooltip />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} strokeWidth={1} maxBarSize={72}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} stroke={d.stroke} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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

  const windowWeek  = week
    ? `${new Date(week.window.start).toLocaleString()} — ${new Date(week.window.end).toLocaleString()}`
    : '—';
  const windowMonth = month
    ? `${new Date(month.window.start).toLocaleString()} — ${new Date(month.window.end).toLocaleString()}`
    : '—';

  const colorWeek  = '#66BB6A';
  const colorMonth = '#B0BEC5';

  const w = week?.totals || { minutes: 0, calories: 0, sessions: 0 };
  const m = month?.totals || { minutes: 0, calories: 0, sessions: 0 };

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
              <Typography variant="h4" sx={{ mt: 0.5 }}>{w.minutes}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Okno</Typography>
              <Typography variant="body2">{windowWeek}</Typography>
            </Paper>

            <Paper sx={{ p: 2, flex: 1, borderLeft: `4px solid ${colorWeek}` }}>
              <Typography variant="overline" color="text.secondary">KALORIE – TYDZIEŃ</Typography>
              <Typography variant="h4" sx={{ mt: 0.5 }}>{w.calories}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Sesje – tydzień</Typography>
              <Typography variant="body2">{w.sessions}</Typography>
            </Paper>

            <Paper sx={{ p: 2, flex: 1, borderLeft: `4px solid ${colorMonth}` }}>
              <Typography variant="overline" color="text.secondary">PORÓWNANIE MIESIĄCA</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {`${m.minutes} min, ${m.calories} kcal, ${m.sessions} sesji`}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Okno</Typography>
              <Typography variant="body2">{windowMonth}</Typography>
            </Paper>
          </Stack>

          <Paper sx={{ p: { xs: 1, md: 2 } }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Tydzień vs miesiąc</Typography>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <MiniMetricChart title="Czas (min)" weekValue={w.minutes} monthValue={m.minutes} />
              <MiniMetricChart title="Kalorie"     weekValue={w.calories} monthValue={m.calories} />
              <MiniMetricChart title="Sesje"       weekValue={w.sessions} monthValue={m.sessions} />
            </div>
          </Paper>
        </>
      )}
    </Box>
  );
}
