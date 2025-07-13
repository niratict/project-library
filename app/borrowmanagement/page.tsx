"use client";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import React, { useState, useMemo, useEffect } from "react";
import SearchFilter from "@/app/components/SearchFilter";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

interface BorrowRecord {
  borrow_transactions_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  book_copies_id: number;
  book_title: string;
  author: string;
  isbn: string;
  book_image?: string;
  borrow_date: string | null;
  due_date: string | null;
  return_date: string | null;
  fine: number | null;
  notes: string | null;
  staff_name: string | null;
  status: "borrowed" | "returned" | "overdue" | "reserved" | "expired";
  overdue_days: number;
  created_at?: string;
  reservation_date?: string;
  expires_at?: string;
  hours_since_reservation?: number;
}

interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface FilterValues {
  [key: string]: string | { startDate: string; endDate: string };
}

interface StaffJwtPayload {
  staff_id: number;
  // เพิ่ม field อื่นๆ ถ้ามีใน JWT payload
}

interface CleanupResult {
  message: string;
  cleaned_count: number;
  cleaned_reservations?: Array<{
    book_title: string;
    user_name: string;
    reservation_date: string;
    hours_expired: number;
  }>;
}

export default function BorrowManagementPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowRecord | null>(
    null
  );
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [reservedRecords, setReservedRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(
    null
  );

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // เพิ่ม function จัดการ toast
  const addToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // States for confirm borrow modal
  const [borrowDays, setBorrowDays] = useState<number>(14);

  // Search and Filter States
  const [filters, setFilters] = useState<FilterValues>({
    searchText: "",
    status: "",
    dateType: "borrow_date",
    dateRange: { startDate: "", endDate: "" },
  });

  const [activeTab, setActiveTab] = useState<"borrowed" | "reserved">(
    "borrowed"
  );

  const router = useRouter();

  useEffect(() => {
    // ดึงข้อมูล staff จาก localStorage
    const staffToken = localStorage.getItem("staffToken");
    const staffInfo = localStorage.getItem("staffInfo");

    if (staffToken && staffInfo) {
      try {
        const parsed = JSON.parse(staffInfo);
        setStaffId(parsed.staff_id);
      } catch (error) {
        console.error("Error parsing staff info:", error);
        // ถ้าไม่สามารถ parse ได้ ให้ redirect กลับไปหน้า login
        router.push("/staff-login");
      }
    } else {
      // ถ้าไม่มี token หรือ staffInfo ให้ redirect กลับไปหน้า login
      alert("กรุณาเข้าสู่ระบบใหม่");
      router.push("/staff-login");
    }
  }, [router]);

  // หรือถ้าคุณต้องการใช้ JWT token แทน คุณสามารถทำแบบนี้:
  useEffect(() => {
    const staffToken = localStorage.getItem("staffToken");

    if (staffToken) {
      try {
        const decoded = jwtDecode<StaffJwtPayload>(staffToken);
        setStaffId(decoded.staff_id);
      } catch (error) {
        console.error("Error decoding token:", error);
        router.push("/staff-login");
      }
    } else {
      alert("กรุณาเข้าสู่ระบบใหม่");
      router.push("/staff-login");
    }
  }, [router]);

  // Fetch borrowed records
  const fetchBorrowRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/borrow?status=borrowed&limit=100");
      const data = await response.json();

      if (response.ok) {
        setBorrowRecords(data.data || []);
      } else {
        setError(data.error || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  // Fetch reserved records (reservations that haven't been confirmed)
  const fetchReservedRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/reservations?status=pending&limit=100"
      );
      const data = await response.json();

      if (response.ok) {
        // Transform reservation data to match BorrowRecord interface
        const transformedData =
          data.data?.map((reservation: any) => ({
            borrow_transactions_id: reservation.borrow_transactions_id,
            user_id: reservation.user_id,
            user_name: reservation.user_name,
            user_email: reservation.user_email,
            book_copies_id: reservation.book_copies_id,
            book_title: reservation.book_title,
            author: reservation.author,
            isbn: reservation.isbn,
            book_image: reservation.book_image,
            borrow_date: null,
            due_date: null,
            return_date: null,
            fine: null,
            notes: null,
            staff_name: null,
            status: reservation.status === "expired" ? "expired" : "reserved",
            overdue_days: 0,
            created_at: reservation.created_at,
            reservation_date: reservation.reservation_date,
            expires_at: reservation.expires_at,
            hours_since_reservation: reservation.hours_since_reservation,
          })) || [];

        setReservedRecords(transformedData);
      } else {
        setError(data.error || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  // Cleanup expired reservations
  const cleanupExpiredReservations = async () => {
    setCleanupLoading(true);
    try {
      const response = await fetch("/api/reservations/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setCleanupResult(data);
        setShowCleanupModal(true);
        // Refresh reserved records after cleanup
        await fetchReservedRecords();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setCleanupLoading(false);
    }
  };

  // Load data on component mount and tab change
  useEffect(() => {
    if (activeTab === "borrowed") {
      fetchBorrowRecords();
    } else {
      fetchReservedRecords();
    }
  }, [activeTab]);

  // Confirm borrow function
  const confirmBorrow = async (borrowTransactionId: number) => {
    if (!staffId) {
      addToast("ไม่พบข้อมูล staff กรุณาเข้าสู่ระบบใหม่", "error");
      return;
    }

    try {
      const response = await fetch("/api/borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          borrow_transaction_id: borrowTransactionId,
          staff_id: staffId,
          borrow_days: borrowDays,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addToast(
          `ยืนยันการยืมสำเร็จ - ${data.data.book_title} สำหรับ ${data.data.user_name}`,
          "success"
        );
        setShowConfirmModal(false);
        setSelectedBorrow(null);
        fetchReservedRecords();
      } else {
        addToast(`เกิดข้อผิดพลาด: ${data.error}`, "error");
      }
    } catch (err) {
      addToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  // Filter fields configuration
  const filterFields = [
    {
      key: "searchText",
      label: "ค้นหา",
      type: "text" as const,
      placeholder: "ชื่อหนังสือ หรือ ผู้ยืม",
      gridSpan: 2 as const,
    },
    {
      key: "status",
      label: "สถานะ",
      type: "select" as const,
      options: [
        { value: "", label: "ทุกสถานะ" },
        { value: "borrowed", label: "กำลังยืม" },
        { value: "overdue", label: "เกินกำหนด" },
        { value: "returned", label: "คืนแล้ว" },
        { value: "reserved", label: "จอง" },
        { value: "expired", label: "หมดอายุ" },
      ],
    },
    {
      key: "dateType",
      label: "ประเภทวันที่",
      type: "select" as const,
      options: [
        { value: "borrow_date", label: "วันที่ยืม" },
        { value: "due_date", label: "กำหนดคืน" },
      ],
    },
    {
      key: "dateRange",
      label: "ช่วงวันที่",
      type: "dateRange" as const,
      gridSpan: 2 as const,
    },
  ];

  // Get current data based on active tab
  const currentData =
    activeTab === "borrowed" ? borrowRecords : reservedRecords;

  // Filtered data using useMemo for performance
  const filteredRecords = useMemo(() => {
    return currentData.filter((record) => {
      // Text search (title or borrower)
      const searchText = (filters.searchText as string) || "";
      const textMatch =
        searchText === "" ||
        record.book_title.toLowerCase().includes(searchText.toLowerCase()) ||
        record.user_name.toLowerCase().includes(searchText.toLowerCase());

      // Status filter
      const status = (filters.status as string) || "";
      const statusMatch = status === "" || record.status === status;

      // Date range filter
      let dateMatch = true;
      const dateRange = filters.dateRange as {
        startDate: string;
        endDate: string;
      };
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        const dateType = (filters.dateType as string) || "borrow_date";
        let targetDate = "";

        if (dateType === "borrow_date" && record.borrow_date) {
          targetDate = record.borrow_date;
        } else if (dateType === "due_date" && record.due_date) {
          targetDate = record.due_date;
        }

        if (targetDate) {
          dateMatch =
            targetDate >= dateRange.startDate &&
            targetDate <= dateRange.endDate;
        }
      }

      return textMatch && statusMatch && dateMatch;
    });
  }, [currentData, filters]);

  const totalRecords = filteredRecords.length;
  const totalOverdues = filteredRecords.filter(
    (r) => r.status === "overdue"
  ).length;
  const totalBorrowed = filteredRecords.filter(
    (r) => r.status === "borrowed"
  ).length;
  const totalReserved = filteredRecords.filter(
    (r) => r.status === "reserved"
  ).length;
  const totalExpired = filteredRecords.filter(
    (r) => r.status === "expired"
  ).length;

  // Handle filter changes
  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("th-TH");
  };

  // Format datetime for display
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("th-TH");
  };

  // Handle tab change
  const handleTabChange = (tab: "borrowed" | "reserved") => {
    setActiveTab(tab);
    setFilters({
      searchText: "",
      status: "",
      dateType: "borrow_date",
      dateRange: { startDate: "", endDate: "" },
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-white">กำลังโหลดข้อมูล...</div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="relative flex items-center justify-center mb-4 min-h-[80px]">
          <button
            onClick={() => router.push("/admindashboard")}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-sm bg-gray-100 hover:bg-gradient-to-r from-purple-500 to-pink-500 text-black px-4 py-2 rounded-full transition duration-200"
          >
            🔙 กลับแดชบอร์ด
          </button>

          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-bold text-white">จัดการการยืม</h1>
            <p className="text-sm text-gray-300">
              จัดการรายการยืม และยืนยันการจอง
            </p>
          </div>

          {/* Cleanup Button */}
          {activeTab === "reserved" && totalExpired > 0 && (
            <button
              onClick={cleanupExpiredReservations}
              disabled={cleanupLoading}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full transition duration-200 disabled:opacity-50"
            >
              {cleanupLoading
                ? "กำลังล้างข้อมูล..."
                : `ล้างการจองหมดอายุ (${totalExpired})`}
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-white rounded-lg p-2">
          <button
            onClick={() => handleTabChange("borrowed")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === "borrowed"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            รายการยืม ({borrowRecords.length})
          </button>
          <button
            onClick={() => handleTabChange("reserved")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === "reserved"
                ? "bg-orange-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            รายการจอง ({reservedRecords.length})
          </button>
        </div>

        {/* Search and Filter Section */}
        <SearchFilter
          fields={filterFields}
          initialValues={filters}
          onFilterChange={handleFilterChange}
          resultCount={totalRecords}
          className="mb-6"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow p-4 text-center">
            <p className="text-sm text-white">รายการทั้งหมด</p>
            <h2 className="text-2xl font-bold text-white">{totalRecords}</h2>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow p-4 text-center">
            <p className="text-sm text-white">กำลังยืม</p>
            <h2 className="text-2xl font-bold text-white">{totalBorrowed}</h2>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-lg shadow p-4 text-center">
            <p className="text-sm text-white">เกินกำหนด</p>
            <h2 className="text-2xl font-bold text-white">{totalOverdues}</h2>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-700 rounded-lg shadow p-4 text-center">
            <p className="text-sm text-white">รายการจอง</p>
            <h2 className="text-2xl font-bold text-white">{totalReserved}</h2>
          </div>
          <div className="bg-gradient-to-r from-gray-500 to-gray-700 rounded-lg shadow p-4 text-center">
            <p className="text-sm text-white">หมดอายุ</p>
            <h2 className="text-2xl font-bold text-white">{totalExpired}</h2>
          </div>
        </div>

        {/* Records Table */}
        <div className="mt-6 bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-100 text-left text-gray-600">
              <tr>
                <th className="py-3 px-4">ลำดับ</th>
                <th className="py-3 px-4">ชื่อหนังสือ</th>
                <th className="py-3 px-4">ผู้ยืม</th>
                <th className="py-3 px-4">วันที่ยืม</th>
                <th className="py-3 px-4">กำหนดคืน</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr
                    key={record.borrow_transactions_id}
                    className={`border-b hover:bg-gray-50 ${
                      record.status === "expired" ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {record.book_title}
                      <div className="text-xs text-gray-500">
                        {record.author}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {record.user_name}
                      <div className="text-xs text-gray-500">
                        {record.user_email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {formatDateTime(record.borrow_date)}
                      {record.reservation_date && (
                        <div className="text-xs text-gray-500">
                          จอง: {formatDateTime(record.reservation_date)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {formatDateTime(record.due_date)}
                      {record.overdue_days > 0 && (
                        <div className="text-xs text-red-600">
                          เกิน {record.overdue_days} วัน
                        </div>
                      )}
                      {record.expires_at && (
                        <div className="text-xs text-orange-600">
                          หมดอายุ: {formatDateTime(record.expires_at)}
                        </div>
                      )}
                      {record.hours_since_reservation && (
                        <div className="text-xs text-gray-500">
                          {record.hours_since_reservation} ชั่วโมงที่แล้ว
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {record.status === "borrowed" && (
                        <span className="px-3 py-1 text-xs text-white bg-blue-600 rounded-full">
                          กำลังยืม
                        </span>
                      )}
                      {record.status === "overdue" && (
                        <span className="px-3 py-1 text-xs text-white bg-red-500 rounded-full">
                          เกินกำหนด
                        </span>
                      )}
                      {record.status === "reserved" && (
                        <span className="px-3 py-1 text-xs text-white bg-yellow-500 rounded-full">
                          จอง
                        </span>
                      )}
                      {record.status === "expired" && (
                        <span className="px-3 py-1 text-xs text-white bg-gray-500 rounded-full">
                          หมดอายุ
                        </span>
                      )}
                      {record.status === "returned" && (
                        <span className="px-3 py-1 text-xs text-white bg-green-500 rounded-full">
                          คืนแล้ว
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {record.status === "reserved" && (
                        <button
                          onClick={() => {
                            setSelectedBorrow(record);
                            setShowConfirmModal(true);
                          }}
                          className="text-sm border px-2 py-1 rounded text-green-600 transition hover:bg-green-100"
                        >
                          ยืนยันการยืม
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedBorrow(record);
                          setShowDetailModal(true);
                        }}
                        className="text-sm border px-2 py-1 text-blue-600 rounded transition hover:bg-blue-100"
                      >
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cleanup Result Modal */}
        {showCleanupModal && cleanupResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">ผลการล้างข้อมูล</h2>
                <button
                  onClick={() => setShowCleanupModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✖
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {cleanupResult.cleaned_count}
                  </div>
                  <div className="text-sm text-gray-600">
                    รายการที่ถูกยกเลิก
                  </div>
                </div>

                <div className="text-sm text-gray-700">
                  {cleanupResult.message}
                </div>

                {cleanupResult.cleaned_reservations &&
                  cleanupResult.cleaned_reservations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm">
                        รายการที่ถูกยกเลิก:
                      </h3>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {cleanupResult.cleaned_reservations.map(
                          (item, index) => (
                            <div
                              key={index}
                              className="text-xs bg-gray-50 p-2 rounded"
                            >
                              <div className="font-medium">
                                {item.book_title}
                              </div>
                              <div className="text-gray-500">
                                ผู้จอง: {item.user_name} | หมดอายุ:{" "}
                                {item.hours_expired} ชั่วโมง
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowCleanupModal(false)}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Borrow Modal */}
        {showConfirmModal && selectedBorrow && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-green-500">📚</span>
                    ยืนยันการยืม
                  </h3>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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

              {/* Content */}
              <div className="px-6 py-4">
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">
                    ยืนยันการยืมหนังสือสำหรับผู้ใช้นี้
                  </p>
                </div>

                {/* Book and User Info */}
                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          หนังสือ
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {selectedBorrow.book_title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          โดย {selectedBorrow.author}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          ผู้ยืม
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {selectedBorrow.user_name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {selectedBorrow.user_email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Borrow Days Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      จำนวนวันที่ให้ยืม
                    </label>
                    <input
                      type="number"
                      value={borrowDays}
                      onChange={(e) =>
                        setBorrowDays(parseInt(e.target.value) || 14)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      min="1"
                      max="30"
                    />
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        กำหนดคืน:{" "}
                        {new Date(
                          Date.now() + borrowDays * 24 * 60 * 60 * 1000
                        ).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() =>
                    confirmBorrow(selectedBorrow.borrow_transactions_id)
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  ยืนยันการยืม
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedBorrow && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">รายละเอียด</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✖
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">หนังสือ:</p>
                  <p className="text-sm text-gray-700">
                    {selectedBorrow.book_title}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">ผู้แต่ง:</p>
                  <p className="text-sm text-gray-700">
                    {selectedBorrow.author}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">ผู้ยืม:</p>
                  <p className="text-sm text-gray-700">
                    {selectedBorrow.user_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">อีเมล:</p>
                  <p className="text-sm text-gray-700">
                    {selectedBorrow.user_email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">วันที่ยืม:</p>
                  <p className="text-sm text-gray-700">
                    {formatDateTime(selectedBorrow.borrow_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">กำหนดคืน:</p>
                  <p className="text-sm text-gray-700">
                    {formatDateTime(selectedBorrow.due_date)}
                  </p>
                </div>
                {selectedBorrow.staff_name && (
                  <div>
                    <p className="text-sm font-medium">เจ้าหน้าที่:</p>
                    <p className="text-sm text-gray-700">
                      {selectedBorrow.staff_name}
                    </p>
                  </div>
                )}
                {selectedBorrow.fine && selectedBorrow.fine > 0 && (
                  <div>
                    <p className="text-sm font-medium">ค่าปรับ:</p>
                    <p className="text-sm text-red-600">
                      {selectedBorrow.fine} บาท
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${
                toast.type === "success"
                  ? "bg-green-500 text-white"
                  : toast.type === "error"
                  ? "bg-red-500 text-white"
                  : "bg-blue-500 text-white"
              }`}
            >
              <div className="text-sm font-medium">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
          ))}
        </div>
      )}

      <Footer />
    </main>
  );
}
