// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// กำหนด paths และสิทธิ์การเข้าถึง
const PROTECTED_PATHS = {
  // Admin เท่านั้น
  ADMIN_ONLY: ["/usersmanagement", "/staffmanagement"],

  // Admin และ Librarian
  ADMIN_LIBRARIAN: [
    "/categorymanagement",
    "/bookmanagement",
    "/bookcopies",
    "/borrowmanagement",
    "/returnbook",
    "/reports",
  ],

  // User (citizen, educational) - ต้อง login
  USER_ONLY: ["/borrow"],

  // ทุกบทบาท แต่ต้อง login
  ALL_AUTHENTICATED: ["/search"],

  // ไม่ต้อง login
  PUBLIC: ["/dashboard", "/", "/login", "/register"],
};

// Function สำหรับตรวจสอบ JWT Token
async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    );
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// Function สำหรับตรวจสอบสิทธิ์การเข้าถึง
function checkAccess(
  userType: string,
  userRole: string,
  pathname: string
): boolean {
  // ตรวจสอบ Admin only paths
  if (PROTECTED_PATHS.ADMIN_ONLY.some((path) => pathname.startsWith(path))) {
    return userType === "staff" && userRole === "admin";
  }

  // ตรวจสอบ Admin + Librarian paths
  if (
    PROTECTED_PATHS.ADMIN_LIBRARIAN.some((path) => pathname.startsWith(path))
  ) {
    return (
      userType === "staff" && (userRole === "admin" || userRole === "librarian")
    );
  }

  // ตรวจสอบ User only paths
  if (PROTECTED_PATHS.USER_ONLY.some((path) => pathname.startsWith(path))) {
    return (
      userType === "user" &&
      (userRole === "citizen" || userRole === "educational")
    );
  }

  // ตรวจสอบ All authenticated paths
  if (
    PROTECTED_PATHS.ALL_AUTHENTICATED.some((path) => pathname.startsWith(path))
  ) {
    return true; // ถ้าผ่าน token verification มาได้แล้ว
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ข้าม API routes และ static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ตรวจสอบ public paths
  if (
    PROTECTED_PATHS.PUBLIC.some(
      (path) => pathname === path || pathname.startsWith(path)
    )
  ) {
    return NextResponse.next();
  }

  // ดึง token จาก cookie
  const token = request.cookies.get("token")?.value;

  if (!token) {
    // ไม่มี token - redirect ไป login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ตรวจสอบ token
  const payload = await verifyToken(token);

  if (!payload) {
    // Token ไม่ถูกต้อง - redirect ไป login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("token"); // ลบ token ที่ไม่ถูกต้อง
    return response;
  }

  // ดึงข้อมูล user จาก payload
  const userType = payload.type as string;
  const userRole = payload.user_type as string;

  // ตรวจสอบสิทธิ์การเข้าถึง
  const hasAccess = checkAccess(userType, userRole, pathname);

  if (!hasAccess) {
    // ไม่มีสิทธิ์เข้าถึง - redirect ไปหน้าที่เหมาะสม
    let redirectPath = "/dashboard";

    if (userType === "staff") {
      redirectPath = "/admindashboard";
    }

    const accessDeniedUrl = new URL(redirectPath, request.url);
    accessDeniedUrl.searchParams.set("error", "access_denied");
    return NextResponse.redirect(accessDeniedUrl);
  }

  return NextResponse.next();
}

// กำหนด matcher สำหรับ paths ที่ต้องการให้ middleware ทำงาน
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
