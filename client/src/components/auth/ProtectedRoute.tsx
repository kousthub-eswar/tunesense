import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { Disc } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] w-full flex flex-col items-center justify-center gap-3 p-6 select-none">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center animate-pulse shadow-glow">
          <Disc className="w-6 h-6 animate-spin text-brand-400" style={{ animationDuration: '3s' }} />
        </div>
        <p className="text-xs text-content-secondary font-medium tracking-tight">
          Verifying session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
