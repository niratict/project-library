// components/ProtectedRoute.tsx
import { ReactNode } from 'react';
import { useAuth } from '@/app/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requireAuth = true, 
  redirectTo,
  fallback 
}: ProtectedRouteProps) {
  const { authUser, loading } = useAuth({ 
    requireAuth, 
    allowedRoles, 
    redirectTo 
  });

  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !authUser) {
    return null; // จะถูก redirect ไปหน้า login แล้ว
  }

  return <>{children}</>;
}

