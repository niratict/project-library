// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  type: 'user' | 'staff';
  data: {
    user_id?: number;
    staff_id?: number;
    user_type: 'citizen' | 'educational' | 'admin' | 'librarian';
    name: string;
    email: string;
  };
}

interface UseAuthOptions {
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const user = await response.json();
          setAuthUser(user);
          
          // ตรวจสอบสิทธิ์ถ้ากำหนดไว้
          if (options.allowedRoles && options.allowedRoles.length > 0) {
            const userRole = user.data.user_type;
            if (!options.allowedRoles.includes(userRole)) {
              // ไม่มีสิทธิ์ - redirect
              const redirectPath = options.redirectTo || (user.type === 'staff' ? '/admindashboard' : '/dashboard');
              router.push(`${redirectPath}?error=access_denied`);
              return;
            }
          }
        } else {
          // ไม่ได้ login
          if (options.requireAuth) {
            router.push('/login');
            return;
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (options.requireAuth) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [options.requireAuth, options.allowedRoles, options.redirectTo, router]);

  return { authUser, loading };
}

