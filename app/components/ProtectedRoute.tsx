// app/components/ProtectedRoute.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthStatus, canAccessRoute } from "../utils/authCheck";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = () => {
      const canAccess = canAccessRoute(pathname);
      setHasAccess(canAccess);

      if (!canAccess) {
        const auth = getAuthStatus();

        // Redirect logic
        if (auth.type === "none") {
          // Not logged in - redirect to appropriate login page or home
          if (pathname.startsWith('/admin') || 
              pathname === '/bookcopies' || 
              pathname === '/bookmanagement' ||
              pathname === '/borrowmanagement' ||
              pathname === '/categorymanagement' ||
              pathname === '/profile_staff' ||
              pathname === '/reports' ||
              pathname === '/returnbook' ||
              pathname === '/staffmanagement' ||
              pathname === '/usersmanagement') {
            router.push('/');  // Redirect to home instead of login_admin
          } else {
            router.push('/');  // Redirect to home instead of login
          }
        } else if (auth.type === "user") {
          // User trying to access staff route - redirect to user dashboard
          router.push("/dashboard");
        } else if (auth.type === "staff") {
          // Staff trying to access user route - redirect to admin dashboard
          router.push("/admindashboard");
        }
      }

      setIsLoading(false);
    };

    checkAccess();
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">กำลังตรวจสอบสิทธิ์...</div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-pulse text-lg text-gray-600">
            กำลังเปลี่ยนเส้นทาง...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}