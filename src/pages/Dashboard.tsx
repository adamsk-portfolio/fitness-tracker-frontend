import { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { fetchSessions, fetchGoals } from '@/services/api';

export default function Dashboard() {
  const [sessionCount, setSessionCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);

  useEffect(() => {
    (async () => {
      const sessions = await fetchSessions();
      const goals = await fetchGoals();
      setSessionCount(sessions.length);
      setGoalCount(goals.length);
    })();
  }, []);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>
        Witaj w Fitness Tracker!
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="subtitle1">Łączna liczba sesji</Typography>
            <Typography variant="h2">{sessionCount}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="subtitle1">Ustawione cele</Typography>
            <Typography variant="h2">{goalCount}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
