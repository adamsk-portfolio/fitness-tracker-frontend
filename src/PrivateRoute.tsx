import { Navigate } from 'react-router-dom';
import { useAuth } from './auth';

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  return useAuth().token ? children : <Navigate to="/login" replace />;
}
