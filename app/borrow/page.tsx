"use client";
import { useState, useEffect } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

interface BorrowedBook {
  borrow_transactions_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  book_copies_id: number;
  book_title: string;
  author: string;
  isbn: string;
  book_image?: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  fine: number;
  staff_name: string;
  status: "borrowed" | "returned" | "overdue";
  overdue_days: number;
}

interface BorrowStats {
  total: number;
  borrowed: number;
  returned: number;
  overdue: number;
  totalFine: number;
}

export default function BorrowReturnPage() {
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [stats, setStats] = useState<BorrowStats>({
    total: 0,
    borrowed: 0,
    returned: 0,
    overdue: 0,
    totalFine: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ดึง user_id จาก localStorage ที่เก็บไว้ตอน login
  const getCurrentUserId = () => {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        // ถ้าไม่มี user_id ให้ redirect ไปหน้า login
        window.location.href = "/login";
        return null;
      }
      return userId;
    }
    return null;
  };

  const fetchBorrowHistory = async (
    page: number = 1,
    status: string = "all"
  ) => {
    try {
      setLoading(true);
      const userId = getCurrentUserId();

      if (!userId) {
        setError("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        return;
      }

      let url = `/api/borrow?user_id=${userId}&page=${page}&limit=10`;

      // แก้ไข status filter ให้ตรงกับ API
      if (status !== "all") {
        url += `&status=${status}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setBorrowedBooks(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);

        // คำนวณสถิติจากข้อมูลที่ได้
        const books = data.data || [];
        const newStats = {
          total: data.pagination?.total || 0,
          borrowed: books.filter(
            (book: BorrowedBook) => book.status === "borrowed"
          ).length,
          returned: books.filter(
            (book: BorrowedBook) => book.status === "returned"
          ).length,
          overdue: books.filter(
            (book: BorrowedBook) => book.status === "overdue"
          ).length,
          totalFine: books.reduce(
            (sum: number, book: BorrowedBook) => sum + (book.fine || 0),
            0
          ),
        };
        setStats(newStats);
      } else {
        if (response.status === 401) {
          // ถ้า unauthorized ให้ redirect ไปหน้า login
          localStorage.removeItem("user_id");
          localStorage.removeItem("token");
          window.location.href = "/login";
        } else {
          setError(data.error || "เกิดข้อผิดพลาดในการดึงข้อมูล");
        }
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับดึงสถิติทั้งหมด (เมื่อไม่มี filter)
  const fetchAllStats = async () => {
    try {
      const userId = getCurrentUserId();

      if (!userId) return;

      const response = await fetch(
        `/api/borrow?user_id=${userId}&page=1&limit=1000`
      );
      const data = await response.json();

      if (response.ok) {
        const allBooks = data.data || [];
        const allStats = {
          total: data.pagination?.total || 0,
          borrowed: allBooks.filter(
            (book: BorrowedBook) => book.status === "borrowed"
          ).length,
          returned: allBooks.filter(
            (book: BorrowedBook) => book.status === "returned"
          ).length,
          overdue: allBooks.filter(
            (book: BorrowedBook) => book.status === "overdue"
          ).length,
          totalFine: allBooks.reduce(
            (sum: number, book: BorrowedBook) => sum + (book.fine || 0),
            0
          ),
        };
        setStats(allStats);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchBorrowHistory(currentPage, statusFilter);

    // ดึงสถิติทั้งหมดเมื่อโหลดหน้าแรก
    if (statusFilter === "all") {
      fetchAllStats();
    }
  }, [currentPage, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "borrowed":
        return "bg-blue-500";
      case "returned":
        return "bg-green-500";
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "borrowed":
        return "กำลังยืม";
      case "returned":
        return "คืนแล้ว";
      case "overdue":
        return "เกินกำหนด";
      default:
        return "ไม่ทราบสถานะ";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="bg-gradient-to-br from-blue-50 via-pink-50 to-purple-50 min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
              <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="bg-gradient-to-br from-blue-50 via-pink-50 to-purple-50 min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-16">
              <div className="text-red-500 text-xl mb-4">เกิดข้อผิดพลาด</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={() => fetchBorrowHistory(currentPage, statusFilter)}
                className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="bg-gradient-to-br from-blue-50 via-pink-50 to-purple-50 min-h-screen p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              ประวัติการยืม
            </h1>
            <p className="text-gray-600">ติดตามรายการยืม-คืนหนังสือของคุณ</p>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {[
              { key: "all", label: "ทั้งหมด", icon: "📚" },
              { key: "borrowed", label: "กำลังยืม", icon: "📖" },
              { key: "returned", label: "คืนแล้ว", icon: "✅" },
              { key: "overdue", label: "เกินกำหนด", icon: "⏰" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => handleStatusFilter(filter.key)}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 transform hover:scale-105 ${
                  statusFilter === filter.key
                    ? "bg-pink-500 text-white shadow-lg shadow-pink-500/50"
                    : "bg-white text-gray-700 hover:bg-pink-50 shadow-md"
                }`}
              >
                <span className="mr-2">{filter.icon}</span>
                {filter.label}
              </button>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-xl shadow-green-400 p-6 text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl mb-3">📘</div>
              <h2 className="text-3xl font-bold text-gray-800">
                {stats.total}
              </h2>
              <p className="text-gray-500 font-medium">รวมการยืมทั้งหมด</p>
            </div>
            <div className="bg-white rounded-2xl shadow-xl shadow-blue-400 p-6 text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl mb-3">🕒</div>
              <h2 className="text-3xl font-bold text-blue-600">
                {stats.borrowed}
              </h2>
              <p className="text-gray-500 font-medium">กำลังยืมอยู่</p>
            </div>
            <div className="bg-white rounded-2xl shadow-xl shadow-red-400 p-6 text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl mb-3">⏰</div>
              <h2 className="text-3xl font-bold text-red-500">
                {stats.overdue}
              </h2>
              <p className="text-gray-500 font-medium">เกินกำหนด</p>
            </div>
            <div className="bg-white rounded-2xl shadow-xl shadow-orange-400 p-6 text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl mb-3">💰</div>
              <h2 className="text-3xl font-bold text-orange-600">
                {stats.totalFine}฿
              </h2>
              <p className="text-gray-500 font-medium">ค่าปรับรวม</p>
            </div>
          </div>

          {/* Books Table */}
          <div className="bg-white rounded-2xl shadow-xl shadow-pink-300 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <span className="mr-3">📋</span>
                รายการยืม-คืน
              </h2>
            </div>

            {borrowedBooks.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-gray-500 text-lg">
                  {statusFilter === "all"
                    ? "ไม่มีรายการยืมหนังสือ"
                    : statusFilter === "borrowed"
                    ? "ไม่มีหนังสือที่กำลังยืม"
                    : statusFilter === "returned"
                    ? "ไม่มีหนังสือที่คืนแล้ว"
                    : "ไม่มีหนังสือที่เกินกำหนด"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-16 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ลำดับ
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="text-center">
                          <div>รหัส</div>
                          <div>การยืม</div>
                        </div>
                      </th>
                      <th className="w-80 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ชื่อหนังสือ
                      </th>
                      <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่ยืม
                      </th>
                      <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        กำหนดคืน
                      </th>
                      <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่คืน
                      </th>
                      <th className="w-24 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ค่าปรับ
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        เจ้าหน้าที่
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {borrowedBooks.map((book, index) => (
                      <tr
                        key={book.borrow_transactions_id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-center">
                          {(currentPage - 1) * 10 + index + 1}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-center">
                          {book.borrow_transactions_id}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="flex items-center">
                            {book.book_image && (
                              <img
                                src={book.book_image}
                                alt={book.book_title}
                                className="w-8 h-10 object-cover rounded mr-3 flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div
                                className="truncate font-medium"
                                title={book.book_title}
                              >
                                {book.book_title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(book.borrow_date)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div
                            className={
                              book.status === "overdue"
                                ? "text-red-600 font-semibold"
                                : ""
                            }
                          >
                            {formatDate(book.due_date)}
                            {book.status === "overdue" &&
                              book.overdue_days > 0 && (
                                <div className="text-xs text-red-500 mt-1">
                                  เกิน {book.overdue_days} วัน
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                          {book.return_date ? (
                            formatDate(book.return_date)
                          ) : (
                            <span className="italic text-gray-400">
                              ยังไม่คืน
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-center">
                          {book.fine > 0 ? (
                            <span className="text-red-600">
                              {book.fine.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(
                              book.status
                            )}`}
                          >
                            {getStatusText(book.status)}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div
                            className="truncate"
                            title={book.staff_name || "-"}
                          >
                            {book.staff_name || "-"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mb-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors"
              >
                ← ก่อนหน้า
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === i + 1
                      ? "bg-pink-500 text-white shadow-lg shadow-pink-500/50"
                      : "bg-white shadow-md hover:bg-pink-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors"
              >
                ถัดไป →
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
