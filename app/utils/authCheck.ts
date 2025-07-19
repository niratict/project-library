// app/utils/authCheck.ts
'use client';
import { routes } from './routeConfig';

export function getAuthStatus() {
  if (typeof window === 'undefined') return { type: 'none', id: null };
  
  const userId = localStorage.getItem('user_id');
  const staffId = localStorage.getItem('staff_id');
  
  if (staffId) {
    return { type: 'staff' as const, id: staffId };
  } else if (userId) {
    return { type: 'user' as const, id: userId };
  }
  
  return { type: 'none' as const, id: null };
}

export function canAccessRoute(pathname: string) {
  const route = routes.find(r => r.path === pathname);
  if (!route) return false;
  
  const auth = getAuthStatus();
  
  switch (route.requiresAuth) {
    case 'none':
      return true;
    case 'user':
      return auth.type === 'user';
    case 'staff':
      return auth.type === 'staff';
    default:
      return false;
  }
}

//=====================================