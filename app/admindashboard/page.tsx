"use client";
import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import Link from "next/link";

// Interface สำหรับข้อมูล Dashboard
interface DashboardStats {
  total_books: number;
  total_copies: number;
  available_copies: number;
  borrowed_copies: number;
  reserved_copies: number;
  total_users: number;
  current_borrows: number;
  current_reservations: number;
  overdue_books: number;
  total_categories: number; // เพิ่มบรรทัดนี้
}

interface PopularBook {
  title: string;
  author: string;
  borrow_count: number;
}

interface RecentActivity {
  borrow_transactions_id: number;
  title: string;
  user_name: string;
  borrow_date: string;
  return_date: string | null;
  due_date: string;
  staff_name: string;
  activity_type: string;
}

interface DashboardData {
  stats: DashboardStats;
  popular_books: PopularBook[];
  recent_activity: RecentActivity[];
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard ผู้ดูแลระบบ";
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admindashboard?endpoint=dashboard");

      if (!response.ok) {
        throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูล");
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"
      );
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (num: number): string => {
    return num.toLocaleString("th-TH");
  };

  // ฟังก์ชันคำนวณการเปลี่ยนแปลงแบบสุ่ม (สำหรับการแสดงผล)
  const getRandomChange = (): { value: number; isPositive: boolean } => {
    const value = Math.floor(Math.random() * 50) + 1;
    const isPositive = Math.random() > 0.3; // 70% โอกาสเป็นบวก
    return { value, isPositive };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen p-8 font-sans">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-white text-xl">กำลังโหลดข้อมูล...</div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen p-8 font-sans">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-red-400 text-xl">
                เกิดข้อผิดพลาด: {error}
                <button
                  onClick={fetchDashboardData}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  ลองใหม่
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const stats = dashboardData?.stats;
  if (!stats) return null;

  // คำนวณจำนวนหมวดหมู่ (ใช้ค่าคงที่หรือดึงจาก API อื่น)
  const totalCategories = stats.total_categories || 12; // ใช้ค่าจาก API หรือค่าเริ่มต้น

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">
            Dashboard <span className="text-blue-300">ผู้ดูแลระบบ</span>
          </h1>
          <p className="text-slate-300 mb-8">จัดการระบบห้องสมุดประชาชน</p>

          {/* Summary Cards - เรียงตามลำดับที่ต้องการ */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* 1. หนังสือทั้งหมด */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-xl hover:shadow-green-500 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100 font-medium">
                    หนังสือทั้งหมด
                  </p>
                  <h2 className="text-4xl text-white font-bold mt-4">
                    {formatNumber(stats.total_books)}
                  </h2>
                </div>
                <div className="text-3xl text-blue-200">📚</div>
              </div>
            </div>

            {/* 2. หมวดหมู่ */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-xl hover:shadow-orange-500 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100 font-medium">
                    หมวดหมู่
                  </p>
                  <h2 className="text-4xl text-white font-bold mt-4">
                    {formatNumber(totalCategories)}
                  </h2>
                </div>
                <div className="text-3xl text-purple-200">🏷️</div>
              </div>
            </div>

            {/* 3. หนังสือที่ยืม */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl shadow-xl hover:shadow-blue-500 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-100 font-medium">
                    หนังสือที่ยืม
                  </p>
                  <h2 className="text-4xl text-white font-bold mt-4">
                    {formatNumber(stats.current_borrows)}
                  </h2>
                </div>
                <div className="text-3xl text-orange-200">📤</div>
              </div>
            </div>

            {/* 4. สมาชิกทั้งหมด */}
            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl shadow-xl hover:shadow-purple-500 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100 font-medium">
                    สมาชิกทั้งหมด
                  </p>
                  <h2 className="text-4xl text-white font-bold mt-4">
                    {formatNumber(stats.total_users)}
                  </h2>
                </div>
                <div className="text-3xl text-green-200">👥</div>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="mt-8">
            {/* Row 1: User and Staff Management - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 text-center shadow-xl shadow-cyan-400">
                <div className="text-4xl text-green-600 mb-3">👥</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2 ">
                  จัดการสมาชิก
                </h2>
                <p className="text-sm text-gray-600 mb-4">จัดการข้อมูลสมาชิก</p>
                <Link href="/usersmanagement">
                  <button className="px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 hover:shadow-lg hover:shadow-pink-400 transition-colors duration-200 font-medium">
                    จัดการสมาชิก
                  </button>
                </Link>
              </div>
              <div className="bg-white rounded-xl p-6 text-center transition-shadow duration-200 shadow-xl shadow-cyan-400">
                <div className="text-4xl text-emerald-600 mb-3">👨‍💼</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  จัดการพนักงาน
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  จัดการข้อมูลพนักงาน
                </p>
                <Link href="/staffmanagement">
                  <button className="px-6 py-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 hover:shadow-lg hover:shadow-pink-400 transition-colors duration-200 font-medium">
                    จัดการพนักงาน
                  </button>
                </Link>
              </div>
            </div>

            {/* Row 2: Category, Book, and Book Copies Management - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 text-center shadow-xl shadow-cyan-400 transition-shadow duration-200">
                <div className="text-4xl text-purple-600 mb-3">🏷️</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  จัดการหมวดหมู่
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  เพิ่ม แก้ไข ลบ หมวดหมู่หนังสือ
                </p>
                <Link href="/categorymanagement">
                  <button className="px-6 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 hover:shadow-lg hover:shadow-pink-400 transition-colors duration-200 font-medium">
                    จัดการหมวดหมู่
                  </button>
                </Link>
              </div>
              <div className="bg-white rounded-xl p-6 text-center shadow-xl shadow-cyan-400 transition-shadow duration-200">
                <div className="text-4xl text-blue-600 mb-3">📚</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  จัดการหนังสือ
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  เพิ่ม แก้ไข ลบ ดูรายละเอียดหนังสือ
                </p>
                <Link href="/bookmanagement">
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 hover:shadow-lg hover:shadow-pink-400 transition-colors duration-200 font-medium">
                    จัดการหนังสือ
                  </button>
                </Link>
              </div>
              <div className="bg-white rounded-xl p-6 text-center shadow-xl shadow-cyan-400 transition-shadow duration-200">
                <div className="text-4xl text-indigo-600 mb-3">📄</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  จัดการสำเนาหนังสือ
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  เพิ่ม แก้ไข ลบ ดูรายละเอียดสำเนาหนังสือ
                </p>
                <Link href="/bookcopies">
                  <button className="px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-pink-400 transition-colors duration-200 font-medium">
                    จัดการสำเนาหนังสือ
                  </button>
                </Link>
              </div>
            </div>

            {/* Row 3: Borrow, Return, and Reports - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 text-center shadow-xl shadow-cyan-400 transition-shadow duration-200">
                <div className="text-4xl text-orange-500 mb-3">📤</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  จัดการการยืม
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  จัดการการยืมหนังสือ
                </p>
                <Link href="/borrowmanagement">
                  <button className="px-6 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 hover:shadow-lg hover:shadow-pink-400 transition-colors duration-200 font-medium">
                    จัดการการยืม
                  </button>
                </Link>
              </div>
              <div className="bg-white rounded-xl p-6 text-center shadow-xl shadow-cyan-400 transition-shadow duration-200">
                <div className="text-4xl text-red-500 mb-3">📥</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  จัดการการคืน
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  จัดการการคืนหนังสือและค่าปรับ
                </p>
                <Link href="/returnbook">
                  <button className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 hover:shadow-lg hover:shadow-pink-400 transition-colors duration-200 font-medium">
                    จัดการการคืน
                  </button>
                </Link>
              </div>
              <div className="bg-white rounded-xl p-6 text-center shadow-xl shadow-cyan-400 transition-shadow duration-200">
                <div className="text-4xl text-purple-400 mb-3">📊</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  รายงาน
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  ดูรายงานและสถิติการใช้งาน
                </p>
                <Link href="/reports">
                  <button className="px-6 py-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 hover:shadow-lg hover:shadow-pink-400 transition-colors duration-200 font-medium">
                    ดูรายงาน
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
