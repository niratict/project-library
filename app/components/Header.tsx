"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";

interface UserToken {
  user_id: number;
  email: string;
  user_type: "citizen" | "educational";
  iat: number;
  exp: number;
}

interface StaffToken {
  staff_id: number;
  name: string;
  email: string;
  user_type: "admin" | "librarian";
  citizen_id: string;
  iat: number;
  exp: number;
}

type AuthUser =
  | {
      type: "user";
      data: UserToken;
    }
  | {
      type: "staff";
      data: StaffToken;
    };

export default function Header() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    const checkAuthAndRedirect = () => {
      // ตรวจสอบ user token ก่อน
      const userToken = localStorage.getItem("token");
      if (userToken) {
        try {
          const decoded: UserToken = jwtDecode(userToken);
          if (isMounted) {
            setAuthUser({ type: "user", data: decoded });
          }

          // ถ้า user login แล้วและอยู่ที่หน้าแรก ให้ redirect ไป dashboard
          if (pathname === "/" && isMounted) {
            router.replace("/dashboard");
            return;
          }
        } catch {
          console.error("User token ผิดหรือหมดอายุ");
          localStorage.removeItem("token");
        }
      }

      // ถ้าไม่มี user token ให้ตรวจสอบ staff token
      const staffToken = localStorage.getItem("staffToken");
      if (staffToken) {
        try {
          const decoded: StaffToken = jwtDecode(staffToken);
          if (isMounted) {
            setAuthUser({ type: "staff", data: decoded });
          }

          // ถ้า staff login แล้วและอยู่ที่หน้าแรก ให้ redirect ตาม role
          if (pathname === "/" && isMounted) {
            if (decoded.user_type === "admin") {
              router.replace("/admindashboard");
            } else if (decoded.user_type === "librarian") {
              router.replace("/admindashboard");
            }
            return;
          }
        } catch {
          console.error("Staff token ผิดหรือหมดอายุ");
          localStorage.removeItem("staffToken");
          localStorage.removeItem("staffInfo");
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const handleLogout = () => {
    if (authUser?.type === "user") {
      localStorage.removeItem("token");
    } else if (authUser?.type === "staff") {
      localStorage.removeItem("staffToken");
      localStorage.removeItem("staffInfo");
    }
    setAuthUser(null);
    setShowDropdown(false);
    router.push("/");
  };

  const getUserDisplayName = () => {
    if (!authUser) return "";

    if (authUser.type === "user") {
      return authUser.data.email;
    } else {
      return authUser.data.name || authUser.data.email;
    }
  };

  const getUserTypeLabel = () => {
    if (!authUser) return "";

    const typeLabels = {
      citizen: "สมาชิกทั่วไป",
      educational: "สมาชิกสถาบันการศึกษา",
      admin: "ผู้ดูแลระบบ",
      librarian: "บรรณารักษ์",
    };

    return typeLabels[authUser.data.user_type] || authUser.data.user_type;
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (authUser) {
      // ถ้า login แล้ว ไม่ให้ไปหน้าแรก แต่ไปหน้า dashboard ตามสิทธิ์
      if (authUser.type === "user") {
        router.push("/dashboard");
      } else if (authUser.type === "staff") {
        if (authUser.data.user_type === "admin") {
          router.push("/admindashboard");
        } else if (authUser.data.user_type === "librarian") {
          router.push("/admindashboard");
        }
      }
    } else {
      // ถ้ายังไม่ login ให้ไปหน้าแรกได้
      router.push("/");
    }
  };

  // แสดง loading state ระหว่างการตรวจสอบ auth
  if (isLoading) {
    return (
      <header className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow pt-15">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <h1 className="text-lg font-bold">ห้องสมุดประชาชน</h1>
          <div className="animate-pulse">
            <div className="bg-white bg-opacity-20 rounded-full h-8 w-32"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
        <button onClick={handleLogoClick} className="cursor-pointer">
          <img
            src="/logo/logoWeb.png"
            alt="ห้องสมุดประชาชน"
            className="h-[80px] w-auto hover:opacity-80 transition-opacity"
          />
        </button>

        <nav className="hidden md:flex space-x-6 text-sm font-medium">
          {/* เมนูสำหรับ Users (citizen, educational) */}
          {authUser?.type === "user" && (
            <>
              <Link
                href="/dashboard"
                className="hover:text-gray-200 transition-colors"
              >
                หน้าแรก
              </Link>
              <Link
                href="/search"
                className="hover:text-gray-200 transition-colors"
              >
                ค้นหาหนังสือ
              </Link>
              <Link
                href="/reservations"
                className="hover:text-gray-200 transition-colors"
              >
                ประวัติการจอง
              </Link>
              <Link
                href="/borrow"
                className="hover:text-gray-200 transition-colors"
              >
                ประวัติการยืม
              </Link>
            </>
          )}

          {/* เมนูสำหรับ Staff (admin, librarian) */}
          {authUser?.type === "staff" && (
            <>
              {authUser.data.user_type === "admin" && (
                <Link
                  href="/admindashboard"
                  className="hover:text-gray-200 transition-colors"
                >
                  Admin Dashboard
                </Link>
              )}
              {authUser.data.user_type === "librarian" && (
                <Link
                  href="/admindashboard"
                  className="hover:text-gray-200 transition-colors"
                >
                  Librarian Dashboard
                </Link>
              )}
              <Link
                href="/search"
                className="hover:text-gray-200 transition-colors"
              >
                ค้นหาหนังสือ
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4 relative">
          {authUser ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="bg-white text-purple-700 px-3 py-1 rounded-full shadow hover:bg-gray-100 text-xs font-semibold flex flex-col items-center min-w-32"
              >
                <span className="truncate max-w-24">
                  {getUserDisplayName()}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {getUserTypeLabel()}
                </span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg z-50 overflow-hidden text-sm">
                  <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <p className="font-semibold text-xs text-gray-600">
                      {authUser.type === "user" ? "สมาชิก" : "พนักงาน"}
                    </p>
                    <p className="text-xs text-gray-800 truncate">
                      {getUserDisplayName()}
                    </p>
                  </div>

                  {authUser.type === "user" && (
                    <Link
                      href="/profile"
                      className="block px-4 py-2 hover:bg-pink-100 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      👤 โปรไฟล์
                    </Link>
                  )}

                  {authUser.type === "staff" && (
                    <Link
                      href="/staff/profile"
                      className="block px-4 py-2 hover:bg-pink-100 transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      👤 โปรไฟล์พนักงาน
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600 transition-colors"
                  >
                    🚪 ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <button className="w-40 bg-blue-600 text-white px-4 py-1 rounded font-semibold hover:bg-blue-700 text-sm transition-colors">
                  เข้าสู่ระบบสมาชิก
                </button>
              </Link>
              <Link href="/login_admin">
                <button className="w-40 bg-green-600 text-white px-4 py-1 rounded font-semibold hover:bg-green-700 text-sm transition-colors">
                  เข้าสู่ระบบพนักงาน
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
