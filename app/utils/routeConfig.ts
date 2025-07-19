// app/utils/routeConfig.ts
export interface RouteConfig {
  path: string;
  requiresAuth: 'none' | 'user' | 'staff';
}

export const routes: RouteConfig[] = [
  // Public routes - ไม่ต้อง login
  { path: '/', requiresAuth: 'none' },
  { path: '/search', requiresAuth: 'none' },
  { path: '/login', requiresAuth: 'none' },
  { path: '/login_admin', requiresAuth: 'none' },
  { path: '/register', requiresAuth: 'none' },
  
  // User-only routes - ต้องมี user_id
  { path: '/dashboard', requiresAuth: 'user' },
  { path: '/borrow', requiresAuth: 'user' },
  { path: '/profile_user', requiresAuth: 'user' },
  { path: '/reservations', requiresAuth: 'user' },
  
  // Staff-only routes - ต้องมี staff_id
  { path: '/admindashboard', requiresAuth: 'staff' },
  { path: '/bookcopies', requiresAuth: 'staff' },
  { path: '/bookmanagement', requiresAuth: 'staff' },
  { path: '/borrowmanagement', requiresAuth: 'staff' },
  { path: '/categorymanagement', requiresAuth: 'staff' },
  { path: '/profile_staff', requiresAuth: 'staff' },
  { path: '/reports', requiresAuth: 'staff' },
  { path: '/returnbook', requiresAuth: 'staff' },
  { path: '/staffmanagement', requiresAuth: 'staff' },
  { path: '/usersmanagement', requiresAuth: 'staff' }
];