"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SearchFilter from "@/app/components/SearchFilter";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";
import ConfirmModal from "@/app/components/ConfirmModal";

interface StaffJwtPayload {
  staff_id: string | number;
  // ...fields อื่นๆ...
}

interface ReturnRecord {
  borrow_transactions_id: number;
  title: string;
  returner: string;
  user_id: number;
  book_copies_id: number;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  fine: number;
  author?: string;
  isbn?: string;
  staff_name?: string;
  days_late?: number;
}

interface AddReturnForm {
  borrow_transaction_id: string;
  staff_id: string;
  fine_amount: string;
}

interface EditReturnForm {
  fine_amount: string;
}

// ฟังก์ชันแปลงวันที่เป็นรูปแบบ 18-06-2025
function formatDateDMY(dateStr: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

// ฟังก์ชันคำนวณจำนวนวันที่เกินกำหนด
function calculateOverdueDays(due_date: string): number {
  const today = new Date();
  const due = new Date(due_date);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// ฟังก์ชันคำนวณค่าปรับ (5 บาทต่อวัน)
function calculateFine(due_date: string): number {
  const overdueDays = calculateOverdueDays(due_date);
  return overdueDays * 5;
}

export default function ReturnManagementPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [returnList, setReturnList] = useState<ReturnRecord[]>([]);

  // Form states
  const [addForm, setAddForm] = useState<AddReturnForm>({
    borrow_transaction_id: "",
    staff_id: "1", // Default staff ID
    fine_amount: "",
  });

  const [editForm, setEditForm] = useState<EditReturnForm>({
    fine_amount: "",
  });

  // Filter values state for SearchFilter component
  const [filterValues, setFilterValues] = useState({
    searchText: "",
    dateType: "return_date",
    dateRange: { startDate: "", endDate: "" },
    status: "",
  });

  // Staff ID state
  const [staffId, setStaffId] = useState<string>("");

  // Timer ref for success message
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (success || error) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 3000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [success, error]);

  // State สำหรับ Modal ยืนยันการลบ
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    returnId: 0,
    bookTitle: "",
    isDeleting: false,
  });

  const [returnConfirmModal, setReturnConfirmModal] = useState({
    isOpen: false,
    returnRecord: null as ReturnRecord | null,
    isProcessing: false,
  });

  // Format datetime for display
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("th-TH");
  };

  // Define filter fields for SearchFilter component
  const filterFields = [
    {
      key: "searchText",
      label: "ค้นหา",
      type: "text" as const,
      placeholder: "ชื่อหนังสือ หรือ ผู้คืน",
      gridSpan: 1 as const,
    },
    {
      key: "status",
      label: "สถานะการคืน",
      type: "select" as const,
      options: [
        { value: "", label: "ทุกสถานะ" },
        { value: "returned", label: "คืนแล้ว" },
        { value: "not_returned", label: "ยังไม่คืน" },
        { value: "overdue", label: "เกินกำหนด" },
      ],
      gridSpan: 1 as const,
    },
    {
      key: "dateType",
      label: "ประเภทวันที่",
      type: "select" as const,
      options: [
        { value: "return_date", label: "วันที่คืน" },
        { value: "borrow_date", label: "วันที่ยืม" },
        { value: "due_date", label: "กำหนดคืน" },
      ],
      gridSpan: 1 as const,
    },
    {
      key: "dateRange",
      label: "ช่วงวันที่",
      type: "dateRange" as const,
      gridSpan: 2 as const,
    },
  ];

  const router = useRouter();

  useEffect(() => {
    // ดึง staff_id จาก JWT token
    const staffToken = localStorage.getItem("staffToken");
    if (staffToken) {
      try {
        const decoded = jwtDecode<StaffJwtPayload>(staffToken);
        setStaffId(decoded.staff_id.toString());
      } catch (error) {
        console.error("Error decoding token:", error);
        alert("กรุณาเข้าสู่ระบบใหม่");
        router.push("/staff-login");
      }
    } else {
      alert("กรุณาเข้าสู่ระบบใหม่");
      router.push("/staff-login");
    }
  }, [router]);

  // Load data from API
  const fetchReturnData = async () => {
    try {
      setDataLoading(true);
      setError("");

      const response = await fetch("/api/borrow/return");

      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดข้อมูลได้");
      }

      const data = await response.json();

      // คำนวณค่าปรับสำหรับรายการที่ยังไม่คืน
      const updatedList = data.map((item: ReturnRecord) => {
        if (!item.return_date) {
          const calculatedFine = calculateFine(item.due_date);
          return { ...item, fine: calculatedFine };
        }
        return item;
      });

      setReturnList(updatedList);
    } catch (err) {
      console.error("Error fetching return data:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
      );
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnData();
  }, []);

  // Filtered data using useMemo for performance
  const filteredReturns = useMemo(() => {
    return returnList.filter((record) => {
      // Text search (title or returner)
      const textMatch =
        !filterValues.searchText ||
        record.title
          .toLowerCase()
          .includes(filterValues.searchText.toLowerCase()) ||
        record.returner
          .toLowerCase()
          .includes(filterValues.searchText.toLowerCase());

      // Status filter
      let statusMatch = true;
      if (filterValues.status === "returned") {
        statusMatch = record.return_date !== null;
      } else if (filterValues.status === "not_returned") {
        statusMatch = record.return_date === null;
      } else if (filterValues.status === "overdue") {
        statusMatch =
          record.return_date === null &&
          calculateOverdueDays(record.due_date) > 0;
      }

      // Date range filter
      let dateMatch = true;
      let targetDate = record.return_date || record.due_date;
      if (filterValues.dateType === "borrow_date")
        targetDate = record.borrow_date;
      else if (filterValues.dateType === "due_date")
        targetDate = record.due_date;

      const dateRange = filterValues.dateRange as {
        startDate: string;
        endDate: string;
      };
      if (dateRange.startDate && dateRange.endDate) {
        dateMatch =
          targetDate >= dateRange.startDate && targetDate <= dateRange.endDate;
      } else if (dateRange.startDate) {
        dateMatch = targetDate >= dateRange.startDate;
      } else if (dateRange.endDate) {
        dateMatch = targetDate <= dateRange.endDate;
      }

      return textMatch && statusMatch && dateMatch;
    });
  }, [returnList, filterValues]);

  const totalReturns = filteredReturns.length;
  const returnedBooks = filteredReturns.filter(
    (r) => r.return_date !== null
  ).length;
  const overdueBooks = filteredReturns.filter(
    (r) => r.return_date === null && calculateOverdueDays(r.due_date) > 0
  ).length;
  const totalFines = filteredReturns.reduce((sum, r) => sum + r.fine, 0);

  // Handle filter change from SearchFilter component
  const handleFilterChange = (newFilters: any) => {
    setFilterValues(newFilters);
  };

  // Handle return book
  const handleReturnBook = async (record: ReturnRecord) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/borrow/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          borrow_transaction_id: record.borrow_transactions_id,
          staff_id: staffId, // ใช้ staffId ที่ดึงมาจริง
          fine_amount: record.fine,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาดในการคืนหนังสือ");
      }

      // Refresh data after successful return
      await fetchReturnData();

      setSuccess(`คืนหนังสือ "${record.title}" สำเร็จ`);
    } catch (err) {
      console.error("Error returning book:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการคืนหนังสือ"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle add new return
  const handleAddReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/borrow/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          borrow_transaction_id: parseInt(addForm.borrow_transaction_id),
          staff_id: staffId, // ใช้ staffId ที่ดึงมาจริง
          fine_amount: addForm.fine_amount
            ? parseFloat(addForm.fine_amount)
            : 0,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาดในการคืนหนังสือ");
      }

      setSuccess("เพิ่มรายการคืนหนังสือสำเร็จ");
      setShowAddModal(false);
      setAddForm({ borrow_transaction_id: "", staff_id: "1", fine_amount: "" });

      // Refresh data after successful addition
      await fetchReturnData();
    } catch (err) {
      console.error("Error adding return:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเพิ่มรายการคืน"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle edit return
  const handleEditReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/borrow/return/${selectedReturn.borrow_transactions_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fine_amount: parseFloat(editForm.fine_amount),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
      }

      // Refresh data after successful update
      await fetchReturnData();

      setSuccess("อัปเดตข้อมูลสำเร็จ");
      setShowEditModal(false);
      setEditForm({ fine_amount: "" });
    } catch (err) {
      console.error("Error editing return:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปเดตข้อมูล"
      );
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเปิด Modal ยืนยันการรับคืน
  const handleReturnClick = (record: ReturnRecord) => {
    setReturnConfirmModal({
      isOpen: true,
      returnRecord: record,
      isProcessing: false,
    });
  };

  // ฟังก์ชันปิด Modal รับคืน
  const handleReturnCancel = () => {
    setReturnConfirmModal({
      isOpen: false,
      returnRecord: null,
      isProcessing: false,
    });
  };

  // ฟังก์ชันยืนยันการรับคืน
  const handleReturnConfirm = async () => {
    if (!returnConfirmModal.returnRecord) return;

    setReturnConfirmModal((prev) => ({ ...prev, isProcessing: true }));
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/borrow/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          borrow_transaction_id:
            returnConfirmModal.returnRecord.borrow_transactions_id,
          staff_id: staffId,
          fine_amount: returnConfirmModal.returnRecord.fine,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาดในการคืนหนังสือ");
      }

      await fetchReturnData();
      setSuccess(
        `รับคืนหนังสือ "${returnConfirmModal.returnRecord.title}" สำเร็จ`
      );
      handleReturnCancel();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการคืนหนังสือ"
      );
    } finally {
      setReturnConfirmModal((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // ฟังก์ชันเปิด Modal ยืนยันการลบ
  const handleDeleteClick = (record: ReturnRecord) => {
    setDeleteModal({
      isOpen: true,
      returnId: record.borrow_transactions_id,
      bookTitle: record.title,
      isDeleting: false,
    });
  };

  // ฟังก์ชันปิด Modal
  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      returnId: 0,
      bookTitle: "",
      isDeleting: false,
    });
  };

  // ฟังก์ชันยืนยันการลบ
  const handleDeleteConfirm = async () => {
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        `/api/borrow/return/${deleteModal.returnId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("เกิดข้อผิดพลาดในการลบข้อมูล");
      }
      await fetchReturnData();
      setSuccess("ลบรายการคืนหนังสือสำเร็จ");
      handleDeleteCancel();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบข้อมูล"
      );
    } finally {
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // Show loading state
  if (dataLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Alert Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="relative flex items-center justify-center mb-4 min-h-[80px]">
          <button
            onClick={() => router.push("/admindashboard")}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-sm bg-gray-100 hover:bg-gradient-to-r from-purple-500 to-pink-500 text-black px-4 py-2 rounded-full transition duration-200"
          >
            🔙 กลับแดชบอร์ด
          </button>

          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-bold text-white">จัดการการคืน</h1>
            <p className="text-sm text-gray-300">
              จัดการการคืนหนังสือและการคำนวณค่าปรับ
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 disabled:opacity-50 text-sm font-medium"
          >
            + เพิ่มรายการคืนใหม่
          </button>
        </div>

        {/* Search Filter Component */}
        <SearchFilter
          fields={filterFields}
          initialValues={filterValues}
          onFilterChange={handleFilterChange}
          resultCount={totalReturns}
          className="mb-6"
        />

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow p-4 text-center">
            <p className="text-sm text-white">รายการทั้งหมด</p>
            <h2 className="text-xl text-white font-bold">{totalReturns}</h2>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow p-4 text-center">
            <p className="text-sm text-white">คืนแล้ว</p>
            <h2 className="text-xl text-white font-bold">{returnedBooks}</h2>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg shadow p-4 text-center">
            <p className="text-sm text-white">เกินกำหนด</p>
            <h2 className="text-xl text-white font-bold">{overdueBooks}</h2>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow p-4 text-center">
            <p className="text-sm text-white">ค่าปรับรวม</p>
            <h2 className="text-xl text-white font-bold">{totalFines}฿</h2>
          </div>
        </div>
        {/* Return Table */}
        <div className="mt-6 bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-100 text-left text-gray-600">
              <tr>
                <th className="py-3 px-4 w-16">ลำดับ</th>
                <th className="py-3 px-4 w-1/4 min-w-[200px]">ชื่อหนังสือ</th>
                <th className="py-3 px-4 w-32">ผู้ยืม</th>
                <th className="py-3 px-4 w-32">วันที่ยืม</th>
                <th className="py-3 px-4 w-32">กำหนดคืน</th>
                <th className="py-3 px-4 w-24">ค่าปรับ</th>
                <th className="py-3 px-4 w-24">สถานะ</th>
                <th className="py-3 px-4 w-40 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.length > 0 ? (
                filteredReturns.map((record, index) => {
                  const isOverdue =
                    !record.return_date &&
                    calculateOverdueDays(record.due_date) > 0;
                  const isReturned = record.return_date !== null;

                  return (
                    <tr
                      key={record.borrow_transactions_id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-center">{index + 1}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div
                          className="truncate max-w-[200px]"
                          title={record.title}
                        >
                          {record.title}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className="truncate max-w-[120px]"
                          title={record.returner}
                        >
                          {record.returner}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex flex-col">
                          <span>{formatDateDMY(record.borrow_date)}</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(record.borrow_date).toLocaleTimeString(
                              "th-TH",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex flex-col">
                          <span
                            className={
                              isOverdue ? "text-red-600 font-semibold" : ""
                            }
                          >
                            {formatDateDMY(record.due_date)}
                          </span>
                          <span
                            className={`text-xs ${
                              isOverdue ? "text-red-500" : "text-gray-500"
                            }`}
                          >
                            {new Date(record.due_date).toLocaleTimeString(
                              "th-TH",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.fine > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-red-500 font-semibold">
                              {record.fine}
                            </span>
                            <span className="text-xs text-gray-500">บาท</span>
                          </div>
                        ) : (
                          <span className="text-green-500 font-medium text-xs">
                            ไม่มีค่าปรับ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isReturned ? (
                          <span className="inline-block px-2 py-1 text-xs text-white bg-green-500 rounded-full">
                            คืนแล้ว
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-block px-2 py-1 text-xs text-white bg-red-500 rounded-full">
                            เกินกำหนด
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs text-white bg-yellow-500 rounded-full">
                            ยังไม่คืน
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-wrap gap-1 justify-end">
                          <button
                            onClick={() => {
                              setSelectedReturn(record);
                              setShowDetailModal(true);
                            }}
                            className="text-xs border px-2 py-1 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                          >
                            ดู
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReturn(record);
                              setEditForm({
                                fine_amount: record.fine.toString(),
                              });
                              setShowEditModal(true);
                            }}
                            className="text-xs border px-2 py-1 text-yellow-700 rounded hover:bg-yellow-100 transition-colors"
                          >
                            แก้ไข
                          </button>
                          {!isReturned && (
                            <button
                              onClick={() => handleReturnClick(record)}
                              disabled={loading}
                              className="text-xs border px-2 py-1 text-green-600 rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
                            >
                              รับคืน
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(record)}
                            disabled={loading}
                            className="text-xs border px-2 py-1 text-red-600 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded w-full max-w-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">เพิ่มรายการคืนใหม่</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✖
                </button>
              </div>

              <form onSubmit={handleAddReturn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสรายการยืม
                  </label>
                  <input
                    type="number"
                    value={addForm.borrow_transaction_id}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        borrow_transaction_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสเจ้าหน้าที่
                  </label>
                  <input
                    type="number"
                    value={addForm.staff_id}
                    onChange={(e) =>
                      setAddForm({ ...addForm, staff_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค่าปรับ (บาท) - ปล่อยว่างเพื่อคำนวณอัตโนมัติ
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addForm.fine_amount}
                    onChange={(e) =>
                      setAddForm({ ...addForm, fine_amount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="ระบบจะคำนวณอัตโนมัติ"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "กำลังเพิ่ม..." : "เพิ่มรายการคืน"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedReturn && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">รายละเอียดการคืน</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✖
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-bold text-gray-700">ชื่อหนังสือ</p>
                  <p className="text-sm text-gray-900">
                    {selectedReturn.title}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-700">ผู้ยืม</p>
                  <p className="text-sm text-gray-900">
                    {selectedReturn.returner}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-700">วันที่ยืม</p>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(selectedReturn.borrow_date)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-700">กำหนดคืน</p>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(selectedReturn.due_date)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-700">วันที่คืน</p>
                  <p className="text-sm text-gray-900">
                    {selectedReturn.return_date
                      ? formatDateDMY(selectedReturn.return_date)
                      : "ยังไม่คืน"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-700">ค่าปรับ</p>
                  <p className="text-sm text-gray-900">
                    {selectedReturn.fine} บาท
                  </p>
                </div>

                {selectedReturn.author && (
                  <div>
                    <p className="text-sm font-bold text-gray-700">ผู้แต่ง</p>
                    <p className="text-sm text-gray-900">
                      {selectedReturn.author}
                    </p>
                  </div>
                )}

                {selectedReturn.isbn && (
                  <div>
                    <p className="text-sm font-bold text-gray-700">ISBN</p>
                    <p className="text-sm text-gray-900">
                      {selectedReturn.isbn}
                    </p>
                  </div>
                )}

                {selectedReturn.staff_name && (
                  <div>
                    <p className="text-sm font-bold text-gray-700">
                      เจ้าหน้าที่ที่รับคืน
                    </p>
                    <p className="text-sm text-gray-900">
                      {selectedReturn.staff_name}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold text-gray-700">สถานะ</p>
                  <p className="text-sm">
                    {selectedReturn.return_date ? (
                      <span className="inline-block px-2 py-1 text-xs text-white bg-green-500 rounded">
                        คืนแล้ว
                      </span>
                    ) : calculateOverdueDays(selectedReturn.due_date) > 0 ? (
                      <span className="inline-block px-2 py-1 text-xs text-white bg-red-500 rounded">
                        เกินกำหนด
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs text-white bg-yellow-500 rounded">
                        ยังไม่คืน
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  ปิด
                </button>

                {!selectedReturn.return_date && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleReturnClick(selectedReturn);
                    }}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    รับคืนหนังสือ
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setEditForm({
                      fine_amount: selectedReturn.fine.toString(),
                    });
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  แก้ไขค่าปรับ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedReturn && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">แก้ไขค่าปรับ</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✖
                </button>
              </div>

              <form onSubmit={handleEditReturn} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    หนังสือ:{" "}
                    <span className="font-bold">{selectedReturn.title}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    ผู้ยืม: {selectedReturn.returner}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค่าปรับ (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.fine_amount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fine_amount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {loading ? "กำลังอัปเดต..." : "อัปเดตค่าปรับ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Return Confirmation Modal */}
        <ConfirmModal
          isOpen={returnConfirmModal.isOpen}
          onClose={handleReturnCancel}
          onConfirm={handleReturnConfirm}
          title="ยืนยันการรับคืนหนังสือ"
          message="คุณต้องการรับคืนหนังสือเข้าสู่ระบบหรือไม่?"
          itemName={returnConfirmModal.returnRecord?.title || ""}
          isLoading={returnConfirmModal.isProcessing}
          confirmText="รับคืนหนังสือ"
          cancelText="ยกเลิก"
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="ยืนยันการลบรายการคืนหนังสือ"
          message="คุณต้องการลบรายการคืนหนังสือออกจากระบบหรือไม่?"
          itemName={deleteModal.bookTitle}
          isLoading={deleteModal.isDeleting}
          confirmText="ลบรายการคืน"
          cancelText="ยกเลิก"
        />
      </div>
      <Footer />
    </main>
  );
}
