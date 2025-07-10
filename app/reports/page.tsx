"use client";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  BookOpen,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Activity,
  Calendar,
  UserCheck,
  BookMarked,
  Archive,
  BarChart3,
  PieChart as PieChartIcon,
  Loader2,
  RefreshCw,
  Star,
  Package,
  UserPlus,
  Award,
} from "lucide-react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation";

// --- Interface Definitions (unchanged, but some fields may not be used) ---
interface DashboardStats {
  total_books: number;
  total_copies: number;
  available_copies: number;
  borrowed_copies: number;
  reserved_copies: number;
  total_members?: number;
  active_members?: number;
  total_users?: number;
  total_staff: number;
  current_borrows: number;
  total_reservations: number;
  overdue_books: number;
  total_categories: number;
  today_borrows: number;
  today_returns: number;
  today_reservations?: number;
  today_new_members?: number;
}

interface RecentActivity {
  borrow_transactions_id: number;
  title: string;
  author: string;
  user_name: string;
  staff_name: string;
  borrow_date: string | null;
  return_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  activity_type: string;
  activity_date: string;
  // เพิ่ม property ที่ใช้ในโค้ด
  transaction_type?: string;
  book_title?: string;
  transaction_date?: string;
}

interface OverdueBook {
  borrow_transactions_id: number;
  title: string;
  author: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  user_type: string;
  borrow_date: string;
  due_date: string;
  overdue_days: number;
  staff_name: string;
  shelf_location: string;
  overdue_level: string;
  // เพิ่ม property ที่ใช้ในโค้ด
  transaction_id?: number;
  book_title?: string;
  book_author?: string;
  severity_level?: string;
}

interface PopularBook {
  book_id: number;
  title: string;
  author: string;
  publisher: string;
  category_name: string;
  total_borrows: number;
  total_returns: number;
  current_borrows: number;
  current_reservations: number;
  avg_borrow_days: number;
}

interface PopularCategory {
  categorie_id: number;
  category_name: string;
  total_borrows: number;
  unique_books_borrowed: number;
  unique_borrowers: number;
}

interface MemberActivity {
  user_id: number;
  name: string;
  email: string;
  user_type: string;
  total_transactions: number;
  total_borrows: number;
  total_returns: number;
  current_borrows: number;
  current_reservations: number;
  total_fines: number;
  last_activity: string;
}

interface InactiveMember {
  user_id: number;
  name: string;
  email: string;
  user_type: string;
  created_at: string;
  days_since_joined: number;
}

interface InventoryStats {
  categorie_id: number;
  category_name: string;
  total_books: number;
  total_copies: number;
  available_copies: number;
  borrowed_copies: number;
  reserved_copies: number;
  utilization_rate: number;
}

interface LowStockBook {
  book_id: number;
  title: string;
  author: string;
  category_name: string;
  total_copies: number;
  available_copies: number;
  borrowed_copies: number;
}

interface MonthlyActivity {
  year: number;
  month: number;
  year_month: string;
  total_reservations: number;
  total_borrows: number;
  total_returns: number;
  active_users: number;
  total_fines: number;
  new_members?: number;
  // เพิ่ม property ที่ใช้ในโค้ด
  month_name?: string;
}

interface StaffPerformance {
  staff_id: number;
  staff_name: string;
  user_type: string;
  total_transactions: number;
  total_borrows_processed: number;
  total_returns_processed: number;
  total_fines_collected: number;
  first_transaction: string;
  last_transaction: string;
  // เพิ่ม property ที่ใช้ในโค้ด
  avg_daily_transactions?: number;
  borrows_handled?: number;
  returns_handled?: number;
  reservations_handled?: number;
}

// --- Main Component ---
export default function LibraryReportsDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardData, setDashboardData] = useState<{
    stats: DashboardStats;
    recent_activity: RecentActivity[];
  } | null>(null);
  const [overdueBooks, setOverdueBooks] = useState<OverdueBook[]>([]);
  const [popularBooks, setPopularBooks] = useState<PopularBook[]>([]);
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([]);
  const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([]);
  const [inactiveMembers, setInactiveMembers] = useState<InactiveMember[]>([]);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats[]>([]);
  const [lowStockBooks, setLowStockBooks] = useState<LowStockBook[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyActivity[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // --- Fetch Helper ---
  const fetchData = async (endpoint: string, params: Record<string, string> = {}) => {
    try {
      const queryParams = new URLSearchParams({ endpoint, ...params });
      const response = await fetch(`/api/reports?${queryParams}`);
      if (!response.ok) throw new Error(`Failed to fetch ${endpoint} data`);
      return await response.json();
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      throw err;
    }
  };

  // --- Loaders (map API keys to state shape) ---
  const loadDashboardData = async () => {
    const data = await fetchData("dashboard");
    setDashboardData({
      stats: {
        ...data.main_stats,
        // API ใช้ total_members, active_members, total_staff, ... (บาง field อาจไม่มี)
        total_users: data.main_stats.total_members ?? data.main_stats.total_users ?? 0,
        today_reservations: data.main_stats.today_reservations ?? 0,
      },
      recent_activity: (data.recent_activities || []).map((a: any) => ({
        ...a,
        transaction_type:
          a.activity_type === "คืนแล้ว"
            ? "return"
            : a.activity_type === "ยืม"
            ? "borrow"
            : "reservation",
        book_title: a.title,
        transaction_date: a.activity_date,
      })),
    });
  };

  const loadOverdueData = async () => {
    const data = await fetchData("overdue");
    setOverdueBooks(
      (data.overdue_books || []).map((b: any) => ({
        transaction_id: b.borrow_transactions_id,
        book_title: b.title,
        book_author: b.author,
        user_name: b.user_name,
        user_email: b.user_email,
        user_phone: b.user_phone,
        borrow_date: b.borrow_date,
        due_date: b.due_date,
        overdue_days: b.overdue_days,
        severity_level:
          b.overdue_level === "เกินกำหนดมาก"
            ? "high"
            : b.overdue_level === "เกินกำหนด"
            ? "medium"
            : "low",
        staff_name: b.staff_name,
      }))
    );
  };

  const loadPopularBooksData = async () => {
    const data = await fetchData("popular-books");
    setPopularBooks(data.popular_books || []);
    setPopularCategories(data.popular_categories || []);
  };

  const loadMemberActivityData = async () => {
    const data = await fetchData("member-activity");
    setMemberActivity(data.top_borrowers || []);
    setInactiveMembers(data.inactive_members || []);
  };

  const loadInventoryData = async () => {
    const data = await fetchData("inventory");
    setInventoryStats(data.inventory_by_category || []);
    setLowStockBooks(data.low_stock_books || []);
  };

  const loadMonthlyData = async () => {
    const data = await fetchData("monthly-summary");
    // รวม new_members จาก monthly_new_members เข้า monthly_activity
    const newMembersMap: Record<string, number> = {};
    (data.monthly_new_members || []).forEach((m: any) => {
      newMembersMap[m.year_month] = m.new_members;
    });
    setMonthlyData(
      (data.monthly_activity || []).map((m: any) => ({
        ...m,
        month_name: m.year_month,
        new_members: newMembersMap[m.year_month] || 0,
      }))
    );
  };

  const loadStaffPerformanceData = async () => {
    const data = await fetchData("staff-performance");
    setStaffPerformance(
      (data.staff_performance || []).map((s: any) => ({
        ...s,
        avg_daily_transactions: s.total_transactions / 30,
        borrows_handled: s.total_borrows_processed,
        returns_handled: s.total_returns_processed,
        reservations_handled: 0 // ไม่มีใน API
      }))
    );
  };

  // --- Load All Data ---
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadDashboardData(),
        loadOverdueData(),
        loadPopularBooksData(),
        loadMemberActivityData(),
        loadInventoryData(),
        loadMonthlyData(),
        loadStaffPerformanceData(),
      ]);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line
  }, []);

  // --- UI Components (unchanged) ---
  const COLORS = [
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div
      className={`bg-gradient-to-br ${color} p-6 rounded-2xl text-white shadow-xl transform hover:scale-105 transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium opacity-90">{title}</h3>
          <p className="text-3xl font-bold mt-2">{value?.toLocaleString()}</p>
          {subtitle && <p className="text-sm opacity-80 mt-1">{subtitle}</p>}
        </div>
        <Icon className="w-8 h-8 opacity-80" />
      </div>
    </div>
  );

  const TabButton = ({ id, title, icon: Icon, isActive, onClick }: any) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg"
          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{title}</span>
    </button>
  );

  // --- Render ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-400 mx-auto mb-4" />
            <p className="text-slate-300 text-lg">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={loadAllData}
              className="bg-violet-600 hover:bg-violet-700 px-6 py-3 rounded-xl text-white font-medium transition-colors"
            >
              <RefreshCw className="w-5 h-5 inline mr-2" />
              ลองใหม่
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 relative">
            {/* ปุ่มกลับแดชบอร์ด */}
            <button
              onClick={() => router.push("/admindashboard")}
              className="absolute left-0 top-1/2 -translate-y-1/2 text-sm bg-gray-100 hover:bg-gradient-to-r from-purple-500 to-pink-500 text-black px-4 py-2 rounded-full transition duration-200"
            >
              🔙 กลับแดชบอร์ด
            </button>
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2 text-center">
                📊 รายงานห้องสมุด
              </h1>
              <p className="text-slate-400 text-center">
                ข้อมูลสถิติและรายงานการดำเนินงานห้องสมุด
              </p>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <button
                onClick={loadAllData}
                className="bg-violet-600 hover:bg-violet-700 px-6 py-3 rounded-xl text-white font-medium transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>รีเฟรช</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3">
              <TabButton
                id="dashboard"
                title="ภาพรวม"
                icon={BarChart3}
                isActive={activeTab === "dashboard"}
                onClick={setActiveTab}
              />
              <TabButton
                id="overdue"
                title="หนังสือเกินกำหนด"
                icon={AlertTriangle}
                isActive={activeTab === "overdue"}
                onClick={setActiveTab}
              />
              <TabButton
                id="popular"
                title="หนังสือยอดนิยม"
                icon={Star}
                isActive={activeTab === "popular"}
                onClick={setActiveTab}
              />
              <TabButton
                id="members"
                title="กิจกรรมสมาชิก"
                icon={Users}
                isActive={activeTab === "members"}
                onClick={setActiveTab}
              />
              <TabButton
                id="inventory"
                title="สินค้าคงคลัง"
                icon={Package}
                isActive={activeTab === "inventory"}
                onClick={setActiveTab}
              />
              <TabButton
                id="monthly"
                title="สรุปรายเดือน"
                icon={Calendar}
                isActive={activeTab === "monthly"}
                onClick={setActiveTab}
              />
              <TabButton
                id="staff"
                title="ประสิทธิภาพเจ้าหน้าที่"
                icon={Award}
                isActive={activeTab === "staff"}
                onClick={setActiveTab}
              />
            </div>
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && dashboardData?.stats && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="หนังสือทั้งหมด"
                  value={dashboardData.stats.total_books}
                  icon={BookOpen}
                  color="from-violet-500 to-purple-600"
                  subtitle={`${dashboardData.stats.total_copies} สำเนา`}
                />
                <StatCard
                  title="สมาชิกทั้งหมด"
                  value={dashboardData.stats.total_users}
                  icon={Users}
                  color="from-blue-500 to-cyan-600"
                  subtitle={`${dashboardData.stats.total_staff} เจ้าหน้าที่`}
                />
                <StatCard
                  title="หนังสือพร้อมให้ยืม"
                  value={dashboardData.stats.available_copies}
                  icon={BookMarked}
                  color="from-green-500 to-emerald-600"
                  subtitle={`${dashboardData.stats.borrowed_copies} ถูกยืม`}
                />
                <StatCard
                  title="หนังสือเกินกำหนด"
                  value={dashboardData.stats.overdue_books}
                  icon={AlertTriangle}
                  color="from-red-500 to-pink-600"
                  subtitle={`${dashboardData.stats.total_reservations} จอง`}
                />
              </div>

              {/* Today's Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="การยืมวันนี้"
                  value={dashboardData.stats.today_borrows}
                  icon={BookOpen}
                  color="from-cyan-500 to-blue-600"
                  subtitle="รายการใหม่"
                />
                <StatCard
                  title="การคืนวันนี้"
                  value={dashboardData.stats.today_returns}
                  icon={UserCheck}
                  color="from-emerald-500 to-green-600"
                  subtitle="หนังสือที่คืน"
                />
                <StatCard
                  title="การจองวันนี้"
                  value={dashboardData.stats.today_reservations}
                  icon={Calendar}
                  color="from-orange-500 to-yellow-600"
                  subtitle="คำขอใหม่"
                />
              </div>

              {/* Recent Activity */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Activity className="w-6 h-6 mr-2 text-green-400" />
                  กิจกรรมล่าสุด
                </h3>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {dashboardData.recent_activity
                    .slice(0, 15)
                    .map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-4 p-3 bg-slate-700/30 rounded-lg"
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            activity.transaction_type === "return"
                              ? "bg-green-400"
                              : activity.transaction_type === "borrow"
                              ? "bg-blue-400"
                              : "bg-yellow-400"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {activity.book_title}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {activity.user_name} •{" "}
                            {activity.transaction_type === "return"
                              ? "คืนแล้ว"
                              : activity.transaction_type === "borrow"
                              ? "ยืม"
                              : "จอง"}{" "}
                            • {activity.staff_name}
                          </p>
                        </div>
                        <div className="text-slate-400 text-xs">
                          {activity.transaction_date
                            ? new Date(activity.transaction_date).toLocaleDateString("th-TH")
                            : "-"}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Overdue Tab */}
          {activeTab === "overdue" && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Clock className="w-6 h-6 mr-2 text-red-400" />
                หนังสือเกินกำหนด ({overdueBooks.length} รายการ)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300">
                        ชื่อหนังสือ
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300">
                        ผู้ยืม
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300">
                        วันที่ยืม
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300">
                        วันที่ครบกำหนด
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300">
                        เกินกำหนด
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300">
                        ระดับ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueBooks.map((book) => (
                      <tr
                        key={book.transaction_id}
                        className="border-b border-slate-800 hover:bg-slate-700/30"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-white font-medium">
                              {book.book_title}
                            </p>
                            <p className="text-slate-400 text-xs">
                              {book.book_author}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-white">{book.user_name}</p>
                            <p className="text-slate-400 text-xs">
                              {book.user_email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {new Date(book.borrow_date).toLocaleDateString(
                            "th-TH"
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {new Date(book.due_date).toLocaleDateString("th-TH")}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs">
                            {book.overdue_days} วัน
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              book.severity_level === "high"
                                ? "bg-red-500/20 text-red-300"
                                : book.severity_level === "medium"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : "bg-orange-500/20 text-orange-300"
                            }`}
                          >
                            {book.severity_level === "high"
                              ? "สูง"
                              : book.severity_level === "medium"
                              ? "กลาง"
                              : "ต่ำ"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Popular Books Tab */}
          {activeTab === "popular" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Popular Books Chart */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-2 text-violet-400" />
                    หนังสือยอดนิยม
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={popularBooks.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis
                          dataKey="title"
                          stroke="#94a3b8"
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                          }}
                        />
                        <Bar
                          dataKey="total_borrows"
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Popular Categories */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <PieChartIcon className="w-6 h-6 mr-2 text-pink-400" />
                    หมวดหมู่ยอดนิยม
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={popularCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ category_name, total_borrows }: any) =>
                            `${category_name} (${total_borrows})`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="total_borrows"
                        >
                          {popularCategories.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Members Activity Tab */}
          {activeTab === "members" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Active Members */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Users className="w-6 h-6 mr-2 text-green-400" />
                    สมาชิกที่ใช้งานมากที่สุด
                  </h3>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {memberActivity.slice(0, 10).map((member, index) => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {member.name}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {member.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-semibold">
                            {member.total_borrows} ครั้ง
                          </p>
                          <p className="text-slate-400 text-sm">
                            กำลังยืม: {member.current_borrows}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inactive Members */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <UserPlus className="w-6 h-6 mr-2 text-orange-400" />
                    สมาชิกที่ไม่ได้ใช้งาน
                  </h3>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {inactiveMembers.slice(0, 10).map((member, index) => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {member.name}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {member.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-orange-400 font-semibold">
                            {member.days_since_joined} วัน
                          </p>
                          <p className="text-slate-400 text-sm">
                            {new Date(
                              member.created_at
                            ).toLocaleDateString("th-TH")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === "inventory" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inventory Stats by Category */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Package className="w-6 h-6 mr-2 text-blue-400" />
                    สต็อกตามหมวดหมู่
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventoryStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis
                          dataKey="category_name"
                          stroke="#94a3b8"
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="total_copies"
                          fill="#8b5cf6"
                          name="สำเนาทั้งหมด"
                        />
                        <Bar
                          dataKey="available_copies"
                          fill="#10b981"
                          name="พร้อมให้ยืม"
                        />
                        <Bar
                          dataKey="borrowed_copies"
                          fill="#f59e0b"
                          name="ถูกยืม"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Utilization Rate */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-2 text-green-400" />
                    อัตราการใช้งาน
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={inventoryStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis
                          dataKey="category_name"
                          stroke="#94a3b8"
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="utilization_rate"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Low Stock Books */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2 text-red-400" />
                  หนังสือที่มีสำเนาน้อย ({lowStockBooks.length} รายการ)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-300">
                          ชื่อหนังสือ
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          ผู้แต่ง
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          หมวดหมู่
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          สำเนาทั้งหมด
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          พร้อมให้ยืม
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          ถูกยืม
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockBooks.map((book) => (
                        <tr
                          key={book.book_id}
                          className="border-b border-slate-800 hover:bg-slate-700/30"
                        >
                          <td className="py-3 px-4 text-white font-medium">
                            {book.title}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {book.author}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {book.category_name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs">
                              {book.total_copies}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                book.available_copies === 0
                                  ? "bg-red-500/20 text-red-300"
                                  : book.available_copies <= 2
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : "bg-green-500/20 text-green-300"
                              }`}
                            >
                              {book.available_copies}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                book.borrowed_copies >= 8
                                  ? "bg-red-500/20 text-red-300"
                                  : book.borrowed_copies >= 5
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : "bg-green-500/20 text-green-300"
                              }`}
                            >
                              {book.borrowed_copies}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Summary Tab */}
          {activeTab === "monthly" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Activity Chart */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Calendar className="w-6 h-6 mr-2 text-blue-400" />
                    กิจกรรมรายเดือน
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis
                          dataKey="month_name"
                          stroke="#94a3b8"
                          fontSize={12}
                        />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="total_borrows"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          name="การยืม"
                        />
                        <Line
                          type="monotone"
                          dataKey="total_returns"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="การคืน"
                        />
                        <Line
                          type="monotone"
                          dataKey="total_reservations"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          name="การจอง"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* New Members Chart */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <UserPlus className="w-6 h-6 mr-2 text-green-400" />
                    สมาชิกใหม่รายเดือน
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis
                          dataKey="month_name"
                          stroke="#94a3b8"
                          fontSize={12}
                        />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="new_members"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Monthly Stats Table */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2 text-purple-400" />
                  สถิติรายเดือน
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-300">
                          เดือน
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          การยืม
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          การคืน
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          การจอง
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          สมาชิกใหม่
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          สมาชิกที่ใช้งาน
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((month) => (
                        <tr
                          key={`${month.year}-${month.month}`}
                          className="border-b border-slate-800 hover:bg-slate-700/30"
                        >
                          <td className="py-3 px-4 text-white font-medium">
                            {month.month_name} {month.year}
                          </td>
                          <td className="py-3 px-4 text-violet-400">
                            {month.total_borrows?.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-green-400">
                            {month.total_returns?.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-yellow-400">
                            {month.total_reservations?.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-blue-400">
                            {month.new_members?.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-cyan-400">
                            {month.active_users?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Staff Performance Tab */}
          {activeTab === "staff" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Staff Performance Chart */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Award className="w-6 h-6 mr-2 text-yellow-400" />
                    ประสิทธิภาพเจ้าหน้าที่
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffPerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis
                          dataKey="staff_name"
                          stroke="#94a3b8"
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="total_transactions"
                          fill="#8b5cf6"
                          name="ธุรกรรมทั้งหมด"
                        />
                        <Bar
                          dataKey="avg_daily_transactions"
                          fill="#10b981"
                          name="เฉลี่ยต่อวัน"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Staff Activity Breakdown */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Activity className="w-6 h-6 mr-2 text-cyan-400" />
                    กิจกรรมเจ้าหน้าที่
                  </h3>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {staffPerformance.map((staff, index) => (
                      <div
                        key={staff.staff_id}
                        className="p-4 bg-slate-700/30 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">
                            {staff.staff_name}
                          </h4>
                          <span className="text-cyan-400 font-semibold">
                            {staff.total_transactions} ธุรกรรม
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400">การยืม</p>
                            <p className="text-violet-400 font-medium">
                              {staff.borrows_handled}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">การคืน</p>
                            <p className="text-green-400 font-medium">
                              {staff.returns_handled}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">การจอง</p>
                            <p className="text-yellow-400 font-medium">
                              {staff.reservations_handled}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Staff Performance Table */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Users className="w-6 h-6 mr-2 text-purple-400" />
                  รายละเอียดประสิทธิภาพเจ้าหน้าที่
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-300">
                          ชื่อเจ้าหน้าที่
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          ธุรกรรมทั้งหมด
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          การยืม
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          การคืน
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          การจอง
                        </th>
                        <th className="text-left py-3 px-4 text-slate-300">
                          เฉลี่ยต่อวัน
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPerformance.map((staff) => (
                        <tr
                          key={staff.staff_id}
                          className="border-b border-slate-800 hover:bg-slate-700/30"
                        >
                          <td className="py-3 px-4 text-white font-medium">
                            {staff.staff_name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs">
                              {staff.total_transactions}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-violet-400">
                            {staff.borrows_handled}
                          </td>
                          <td className="py-3 px-4 text-green-400">
                            {staff.returns_handled}
                          </td>
                          <td className="py-3 px-4 text-yellow-400">
                            {staff.reservations_handled}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full text-xs">
                              {staff.avg_daily_transactions?.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
