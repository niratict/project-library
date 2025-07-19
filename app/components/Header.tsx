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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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

  // ปิด mobile menu เมื่อ resize หน้าจอ
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileMenu(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ปิด dropdown และ mobile menu เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest(".dropdown-container") &&
        !target.closest(".mobile-menu-container")
      ) {
        setShowDropdown(false);
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (authUser?.type === "user") {
      localStorage.removeItem("token");
      localStorage.removeItem("user_id"); // เพิ่มบรรทัดนี้
    } else if (authUser?.type === "staff") {
      localStorage.removeItem("staffToken");
      localStorage.removeItem("staffInfo");
      localStorage.removeItem("staff_id"); // เพิ่มบรรทัดนี้
    }

    // หรือจะใช้วิธีลบทั้งหมดเลยก็ได้ (ถ้าไม่มีข้อมูลสำคัญอื่นใน localStorage)
    // localStorage.clear();

    setAuthUser(null);
    setShowDropdown(false);
    setShowMobileMenu(false);
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

  const handleMobileMenuToggle = () => {
    setShowMobileMenu(!showMobileMenu);
    setShowDropdown(false);
  };

  const handleMobileMenuClose = () => {
    setShowMobileMenu(false);
  };

  // แสดง loading state ระหว่างการตรวจสอบ auth
  if (isLoading) {
    return (
      <header className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow">
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
    <header className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 ">
          {/* Logo */}
          <div className="bg-gray-200 bg-opacity-8 rounded-xl pt-7 mr-2">
            <button
              onClick={handleLogoClick}
              className="cursor-pointer flex-shrink-0"
            >
              <img
                src="/logo/logoWeb.png"
                alt="ห้องสมุดประชาชน"
                className="h-[60px] sm:h-[80px] w-auto hover:opacity-80 transition-opacity"
              />
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6 text-sm font-medium">
            {/* เมนูสำหรับ Users (citizen, educational) */}
            {authUser?.type === "user" && (
              <>
                <Link
                  href="/dashboard"
                  className=" transition-colors px-3 py-2 rounded-md hover:bg-white/20  hover:bg-opacity-10"
                >
                  หน้าแรก
                </Link>
                <Link
                  href="/search"
                  className=" transition-colors px-3 py-2 rounded-md hover:bg-white/20 hover:bg-opacity-10"
                >
                  ค้นหาหนังสือ
                </Link>
                <Link
                  href="/reservations"
                  className=" transition-colors px-3 py-2 rounded-md hover:bg-white/20 hover:bg-opacity-10"
                >
                  ประวัติการจอง
                </Link>
                <Link
                  href="/borrow"
                  className=" transition-colors px-3 py-2 rounded-md hover:bg-white/20 hover:bg-opacity-10"
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
                    className=" transition-colors px-3 py-2 rounded-md hover:bg-white/20 hover:bg-opacity-10"
                  >
                    Admin Dashboard
                  </Link>
                )}
                {authUser.data.user_type === "librarian" && (
                  <Link
                    href="/admindashboard"
                    className=" transition-colors px-3 py-2 rounded-md hover:bg-white/20 hover:bg-opacity-10"
                  >
                    Librarian Dashboard
                  </Link>
                )}
                <Link
                  href="/search"
                  className=" transition-colors px-3 py-2 rounded-md hover:bg-white/20 hover:bg-opacity-10"
                >
                  ค้นหาหนังสือ
                </Link>
              </>
            )}
          </nav>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-4 relative">
            {authUser ? (
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="bg-white text-purple-700 px-3 py-2 rounded-full shadow hover:bg-gray-100 text-xs font-semibold flex flex-col items-center min-w-32 transition-all duration-200"
                >
                  <span className="truncate max-w-24">
                    {getUserDisplayName()}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {getUserTypeLabel()}
                  </span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg z-50 overflow-hidden text-sm border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <p className="font-semibold text-xs text-gray-600">
                        {authUser.type === "user" ? "สมาชิก" : "พนักงาน"}
                      </p>
                      <p className="text-xs text-gray-800 truncate">
                        {getUserDisplayName()}
                      </p>
                    </div>

                    {/* เมนูจัดการสำหรับ User */}
                    {authUser.type === "user" && (
                      <Link
                        href="/profile_user"
                        onClick={() => setShowDropdown(false)}
                      >
                        <button className="w-full text-left px-4 py-3 hover:bg-blue-50 text-blue-600 transition-colors">
                          👤 จัดการโปรไฟล์
                        </button>
                      </Link>
                    )}

                    {/* เมนูจัดการสำหรับ Staff */}
                    {authUser.type === "staff" && (
                      <Link
                        href="/profile_staff"
                        onClick={() => setShowDropdown(false)}
                      >
                        <button className="w-full text-left px-4 py-3 hover:bg-blue-50 text-blue-600 transition-colors">
                          👤 จัดการโปรไฟล์
                        </button>
                      </Link>
                    )}

                    <div className="border-t border-gray-200"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 transition-colors"
                    >
                      🚪 ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 text-sm transition-colors">
                    เข้าสู่ระบบสมาชิก
                  </button>
                </Link>
                <Link href="/login_admin">
                  <button className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 text-sm transition-colors">
                    เข้าสู่ระบบพนักงาน
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden mobile-menu-container">
            <button
              onClick={handleMobileMenuToggle}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors"
              aria-expanded="false"
            >
              <span className="sr-only">เปิดเมนูหลัก</span>
              {/* Hamburger Icon */}
              <svg
                className={`${showMobileMenu ? "hidden" : "block"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close Icon */}
              <svg
                className={`${showMobileMenu ? "block" : "hidden"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white bg-opacity-95 rounded-lg mt-2 mb-4 shadow-lg backdrop-blur-sm">
              {/* Mobile User Info */}
              {authUser && (
                <div className="px-3 py-2 border-b border-gray-300 mb-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs text-gray-600">{getUserTypeLabel()}</p>
                </div>
              )}

              {/* Mobile Navigation Links */}
              {authUser?.type === "user" && (
                <>
                  <Link
                    href="/dashboard"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-purple-100 hover:text-purple-800 transition-colors"
                    onClick={handleMobileMenuClose}
                  >
                    หน้าแรก
                  </Link>
                  <Link
                    href="/search"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-purple-100 hover:text-purple-800 transition-colors"
                    onClick={handleMobileMenuClose}
                  >
                    ค้นหาหนังสือ
                  </Link>
                  <Link
                    href="/reservations"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-purple-100 hover:text-purple-800 transition-colors"
                    onClick={handleMobileMenuClose}
                  >
                    ประวัติการจอง
                  </Link>
                  <Link
                    href="/borrow"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-purple-100 hover:text-purple-800 transition-colors"
                    onClick={handleMobileMenuClose}
                  >
                    ประวัติการยืม
                  </Link>
                </>
              )}

              {authUser?.type === "staff" && (
                <>
                  <Link
                    href="/admindashboard"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-purple-100 hover:text-purple-800 transition-colors"
                    onClick={handleMobileMenuClose}
                  >
                    {authUser.data.user_type === "admin"
                      ? "Admin Dashboard"
                      : "Librarian Dashboard"}
                  </Link>
                  <Link
                    href="/search"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-purple-100 hover:text-purple-800 transition-colors"
                    onClick={handleMobileMenuClose}
                  >
                    ค้นหาหนังสือ
                  </Link>
                </>
              )}

              {/* Mobile Management Menu */}
              {authUser && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="px-3 py-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      จัดการ
                    </p>
                  </div>

                  {/* เมนูจัดการสำหรับ User ใน Mobile */}
                  {authUser.type === "user" && (
                    <Link
                      href="/profile_user"
                      className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={handleMobileMenuClose}
                    >
                      👤 จัดการโปรไฟล์
                    </Link>
                  )}

                  {/* เมนูจัดการสำหรับ Staff ใน Mobile */}
                  {authUser.type === "staff" && (
                    <Link
                      href="/profile_staff"
                      className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={handleMobileMenuClose}
                    >
                      🛠️ จัดการโปรไฟล์เจ้าหน้าที่
                    </Link>
                  )}
                </div>
              )}

              {/* Mobile Auth Buttons */}
              {!authUser && (
                <div className="px-3 py-2 space-y-2">
                  <Link href="/login">
                    <button
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 text-sm transition-colors"
                      onClick={handleMobileMenuClose}
                    >
                      เข้าสู่ระบบสมาชิก
                    </button>
                  </Link>
                  <Link href="/login_admin">
                    <button
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 text-sm transition-colors"
                      onClick={handleMobileMenuClose}
                    >
                      เข้าสู่ระบบพนักงาน
                    </button>
                  </Link>
                </div>
              )}

              {/* Mobile Logout Button */}
              {authUser && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                  >
                    🚪 ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
