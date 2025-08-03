import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

import { AuthProvider } from '@/hooks/auth';   // <-- alias z tsconfig / vite

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />            {/* globalny reset + dark-mode */}
      <AuthProvider>             {/* kontekst przechowujący token + login/logout */}
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
