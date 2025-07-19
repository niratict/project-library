"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { getAuthStatus } from "@/app/utils/authCheck";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuthStatus();

    // Debug log
    console.log("Auth status:", auth);
    console.log("localStorage user_id:", localStorage.getItem("user_id"));
    console.log("localStorage staff_id:", localStorage.getItem("staff_id"));

    // Redirect authenticated users to their respective dashboards
    if (auth.type === "user") {
      router.push("/dashboard");
    } else if (auth.type === "staff") {
      router.push("/admindashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      <main className="bg-[#f0fbff] min-h-screen p-8 font-sans">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            ยินดีต้อนรับสู่ห้องสมุดประชาชนออนไลน์
          </h1>
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
            ระบบจัดการห้องสมุดที่ทันสมัย เพื่อการให้บริการที่ดีที่สุดแก่ประชาชน<br></br>
            พร้อมระบบค้นหาหนังสือ การยืม-คืนหนังสือ และการจัดการที่มีประสิทธิภาพ
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/register">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                สมัครสมาชิกใหม่
              </button>
            </Link>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 mt-10">
            <div className="bg-white rounded-lg shadow p-6 hover:bg-blue-50 shadow-xl shadow-purple-500">
              <Link href="/search">
                <div className="text-4xl text-blue-600 mb-2 text-center">
                  🔍
                </div>
                <h2 className="text-lg font-semibold text-center">
                  ค้นหาหนังสือ
                </h2>
                <p className="text-sm text-gray-500 text-center">
                  ค้นหาหนังสือจากคลังที่มีหนังสือมากมาย
                  ด้วยระบบค้นหาที่รวดเร็วและแม่นยำ
                </p>
              </Link>
            </div>
          </div>

          {/* Login Section */}
          <div className="bg-white rounded-lg shadow p-6 mt-10 text-left shadow-xl shadow-pink-500">
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
              เข้าใช้งานระบบ
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-blue-400 rounded-lg p-6">
                <div className="text-3xl text-blue-600 mb-2 text-center">
                  👤
                </div>
                <h3 className="text-lg font-semibold text-center text-blue-800">
                  สำหรับสมาชิก
                </h3>
                <p className="text-sm text-gray-600 text-center">
                  ค้นหาหนังสือ ยืม-คืนหนังสือ และจัดการบัญชีส่วนตัว
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link href="/login">
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      เข้าสู่ระบบสมาชิก
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                      สมัครสมาชิกใหม่
                    </button>
                  </Link>
                </div>
              </div>
              <div className="border border-green-500 rounded-lg p-6">
                <div className="text-3xl text-green-600 mb-2 text-center">
                  🔍
                </div>
                <h3 className="text-lg font-semibold text-center text-green-800">
                  สำหรับพนักงาน
                </h3>
                <p className="text-sm text-gray-600 text-center">
                  จัดการหนังสือ สมาชิก และระบบการยืม-คืนหนังสือ
                </p>
                <Link href="/login_admin">
                  <button className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded">
                    เข้าสู่ระบบพนักงาน
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
