"use client";
import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SearchFilter from "@/app/components/SearchFilter";
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/app/components/Toast";
import { useToast } from "@/app/hooks/useToast";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";
import CustomDropdown from '@/app/components/CustomDropdown';

interface BookCopy {
  book_copies_id: number;
  book_id: number;
  status: "available" | "reservations" | "borrowed";
  shelf_location?: string;
  created_at: string;
  updated_at: string;
  title: string;
  author: string;
  isbn?: string;
  book_limit: number;
  category_name: string;
  borrow_transactions_id?: number;
  user_id?: number;
  borrow_date?: string;
  due_date?: string;
  return_date?: string;
  borrower_name?: string;
}

interface Book {
  book_id: number;
  title: string;
  author: string;
  book_limit: number;
  status: string;
}

interface FilterValues {
  [key: string]: string | { startDate: string; endDate: string };
}

interface PaginationInfo {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

export default function BookCopiesManagementPage() {
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    has_more: false,
  });
  const [form, setForm] = useState({
    book_copies_id: 0,
    book_id: "",
    status: "available" as BookCopy["status"],
    shelf_location: "",
    quantity: 1,
  });

  // Search & Filter State
  const [searchFilters, setSearchFilters] = useState<FilterValues>({
    searchText: "",
    book_id: "",
    status: "",
    shelf_location: "",
  });

  const router = useRouter();

  // Define filter fields for SearchFilter component
  const filterFields = [
    {
      key: "searchText",
      label: "ค้นหา",
      type: "text" as const,
      placeholder: "ชื่อหนังสือ, ผู้แต่ง, ISBN",
    },
    {
      key: "book_id",
      label: "หนังสือ",
      type: "select" as const,
      options: [
        { value: "", label: "ทุกหนังสือ" },
        ...books.map((book) => ({
          value: book.book_id.toString(),
          label: `${book.title} - ${book.author}`,
        })),
      ],
    },
    {
      key: "status",
      label: "สถานะ",
      type: "select" as const,
      options: [
        { value: "", label: "ทุกสถานะ" },
        { value: "available", label: "พร้อมใช้งาน" },
        { value: "borrowed", label: "ถูกยืม" },
        { value: "reservations", label: "ถูกจอง" },
      ],
    },
    {
      key: "shelf_location",
      label: "ตำแหน่งชั้นหนังสือ",
      type: "text" as const,
      placeholder: "เช่น A1, B2",
    },
  ];

  // Toast notification hook
  const { toasts, success, error, warning, removeToast } = useToast();

  // เพิ่ม state สำหรับ Modal ยืนยันการลบ
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    bookCopyId: 0,
    bookTitle: "",
    isDeleting: false,
  });

  const fetchBookCopies = async (page: number = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.per_page.toString(),
      });

      // Add filter parameters
      if (searchFilters.book_id) {
        params.append("book_id", searchFilters.book_id as string);
      }
      if (searchFilters.status) {
        params.append("status", searchFilters.status as string);
      }

      const res = await fetch(`/api/bookcopies?${params}`);

      if (!res.ok) {
        console.error("API Error:", res.status, res.statusText);
        setBookCopies([]);
        return;
      }

      const data = await res.json();
      console.log("BookCopies API Response:", data);

      if (data && Array.isArray(data.data)) {
        setBookCopies(data.data);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        console.error("Invalid response format:", data);
        setBookCopies([]);
      }
    } catch (error) {
      console.error("Error fetching book copies:", error);
      setBookCopies([]);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch("/api/books");

      if (!res.ok) {
        console.error("Books API Error:", res.status, res.statusText);
        setBooks([]);
        return;
      }

      const data = await res.json();
      console.log("Books API Response:", data);

      if (data && Array.isArray(data.data)) {
        setBooks(data.data.filter((book: Book) => book.status === "active"));
      } else {
        console.error("Invalid books response format:", data);
        setBooks([]);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
      setBooks([]);
    }
  };

  // ฟังก์ชันเปิด Modal ยืนยันการลบ
  const handleDeleteClick = (copy: BookCopy) => {
    setDeleteModal({
      isOpen: true,
      bookCopyId: copy.book_copies_id,
      bookTitle: copy.title,
      isDeleting: false,
    });
  };

  // ฟังก์ชันปิด Modal
  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      bookCopyId: 0,
      bookTitle: "",
      isDeleting: false,
    });
  };

  // ฟังก์ชันยืนยันการลบ
  const handleDeleteConfirm = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
      const res = await fetch(`/api/bookcopies/${deleteModal.bookCopyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        success(
          "ลบสำเนาหนังสือสำเร็จ",
          "ข้อมูลสำเนาหนังสือถูกลบออกจากระบบแล้ว"
        );
        fetchBookCopies(pagination.current_page);
        handleDeleteCancel();
      } else {
        const data = await res.json();
        error("เกิดข้อผิดพลาด", data?.error || "ไม่สามารถลบสำเนาหนังสือได้");
      }
    } catch {
      error("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const saveBookCopy = async () => {
    // Validation
    if (!form.book_id) {
      warning("กรุณาเลือกหนังสือ");
      return;
    }

    if (isEditing) {
      // Update existing copy
      try {
        const res = await fetch(`/api/bookcopies/${form.book_copies_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: form.status,
            shelf_location: form.shelf_location || null,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          success("แก้ไขข้อมูลสำเร็จ");
          setShowForm(false);
          resetForm();
          fetchBookCopies(pagination.current_page);
        } else {
          error(data?.error || "เกิดข้อผิดพลาด");
        }
      } catch (err) {
        console.error("Error updating book copy:", err);
        error("เกิดข้อผิดพลาดในการแก้ไข");
      }
    } else {
      // Create new copies
      try {
        const res = await fetch("/api/bookcopies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            book_id: parseInt(form.book_id),
            status: form.status,
            shelf_location: form.shelf_location || null,
            quantity: form.quantity,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          success(`เพิ่มสำเนาหนังสือสำเร็จ ${form.quantity} เล่ม`);
          setShowForm(false);
          resetForm();
          fetchBookCopies(pagination.current_page);
        } else {
          error(data?.error || "เกิดข้อผิดพลาด");
        }
      } catch (err) {
        console.error("Error creating book copies:", err);
        error("เกิดข้อผิดพลาดในการเพิ่มสำเนาหนังสือ");
      }
    }
  };

  const resetForm = () => {
    setForm({
      book_copies_id: 0,
      book_id: "",
      status: "available",
      shelf_location: "",
      quantity: 1,
    });
    setIsEditing(false);
  };

  const editBookCopy = (bookCopy: BookCopy) => {
    setForm({
      book_copies_id: bookCopy.book_copies_id,
      book_id: bookCopy.book_id.toString(),
      status: bookCopy.status,
      shelf_location: bookCopy.shelf_location || "",
      quantity: 1,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleAddNewBookCopy = () => {
    resetForm();
    setShowForm(true);
  };

  const handleFilterChange = (filters: FilterValues) => {
    setSearchFilters(filters);
  };

  const handlePageChange = (page: number) => {
    fetchBookCopies(page);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "พร้อมใช้งาน";
      case "borrowed":
        return "ถูกยืม";
      case "reservations":
        return "ถูกจอง";
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "available":
        return "text-green-600 bg-green-100";
      case "borrowed":
        return "text-red-600 bg-red-100";
      case "reservations":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Filter book copies based on search text
  const filteredBookCopies = bookCopies.filter((copy) => {
    const text = (searchFilters.searchText as string).trim().toLowerCase();
    const textMatch =
      !text ||
      copy.title.toLowerCase().includes(text) ||
      copy.author.toLowerCase().includes(text) ||
      (copy.isbn || "").toLowerCase().includes(text) ||
      copy.book_copies_id.toString().includes(text);

    const locationMatch =
      !searchFilters.shelf_location ||
      (copy.shelf_location || "")
        .toLowerCase()
        .includes((searchFilters.shelf_location as string).toLowerCase());

    return textMatch && locationMatch;
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    fetchBookCopies(1);
  }, [searchFilters.book_id, searchFilters.status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      {/* Main Content */}
      <div className="flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Header Section with Better Layout */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Mobile: Stack vertically */}
            <div className="flex flex-col sm:hidden gap-3">
              <div className="text-center">
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  📖 จัดการสำเนาหนังสือ
                </h1>
              </div>
              <div className="flex justify-between items-center">
                <button
                  onClick={() => router.push("/admindashboard")}
                  className="bg-gray-100 hover:bg-gradient-to-r from-purple-500 to-pink-500 text-black hover:text-white px-3 py-2 rounded-full transition duration-200 text-sm font-medium flex items-center gap-1"
                >
                  <span>🔙</span>
                  <span>กลับ</span>
                </button>
                <button
                  onClick={handleAddNewBookCopy}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-3 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 disabled:opacity-50 text-sm font-medium flex items-center gap-1"
                >
                  <span>+</span>
                  <span>เพิ่ม</span>
                </button>
              </div>
            </div>

            {/* Desktop: Horizontal layout */}
            <div className="hidden sm:flex sm:items-center sm:justify-between">
              <button
                onClick={() => router.push("/admindashboard")}
                className="bg-gray-100 hover:bg-gradient-to-r from-purple-500 to-pink-500 text-black hover:text-white px-4 py-2 rounded-full transition duration-200 text-sm font-medium flex items-center gap-2"
              >
                <span>🔙</span>
                <span>กลับแดชบอร์ด</span>
              </button>

              <div className="text-center flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  📖 จัดการสำเนาหนังสือ
                </h1>
              </div>

              <button
                onClick={handleAddNewBookCopy}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                <span>+</span>
                <span>เพิ่มสำเนาหนังสือ</span>
              </button>
            </div>
          </div>

          <SearchFilter
            fields={filterFields}
            initialValues={searchFilters}
            onFilterChange={handleFilterChange}
            resultCount={filteredBookCopies.length}
            className="mb-8 shadow-xl shadow-cyan-400"
          />

          {/* Content Area */}
          {filteredBookCopies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="bg-white rounded-xl shadow-md p-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  ไม่พบข้อมูลสำเนาหนังสือ
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  ลองปรับตัวกรองหรือเพิ่มสำเนาหนังสือใหม่
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="bg-white rounded-xl shadow-xl shadow-cyan-400 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-center">ลำดับ</th>
                        <th className="py-3 px-4">ชื่อหนังสือ</th>
                        <th className="py-3 px-4">รหัสสำเนา</th>
                        <th className="py-3 px-4">ผู้แต่ง</th>
                        <th className="py-3 px-4">หมวดหมู่</th>
                        <th className="py-3 px-4">สถานะ</th>
                        <th className="py-3 px-4">ตำแหน่งชั้น</th>
                        <th className="py-3 px-4">ผู้ยืม</th>
                        <th className="py-3 px-4">วันครบกำหนด</th>
                        <th className="py-3 px-4">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredBookCopies.map((copy, index) => {
                        // สร้าง unique key จากหลายค่า
                        const uniqueKey = `${copy.book_copies_id}-${copy.book_id}-${index}`;

                        return (
                          <tr
                            key={uniqueKey}
                            className="border-b hover:bg-gray-50 transition-colors duration-150"
                          >
                            <td className="py-3 px-4 text-center text-gray-600 font-mono">
                              {(pagination.current_page - 1) *
                                pagination.per_page +
                                index +
                                1}
                            </td>
                            <td className="py-3 px-4 text-gray-700 font-medium">
                              {copy.title}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {copy.book_copies_id}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {copy.author}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {copy.category_name || "-"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(
                                  copy.status
                                )}`}
                              >
                                {getStatusLabel(copy.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {copy.shelf_location || "-"}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {copy.borrower_name || "-"}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {copy.due_date
                                ? new Date(copy.due_date).toLocaleDateString(
                                    "th-TH"
                                  )
                                : "-"}
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => editBookCopy(copy)}
                                className="text-blue-600 hover:text-blue-800 mx-1 p-1 rounded transition-colors duration-150"
                                title="แก้ไข"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteClick(copy)}
                                className="text-red-500 hover:text-red-700 mx-1 p-1 rounded transition-colors duration-150"
                                title="ลบ"
                                disabled={copy.status === "borrowed"}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      แสดง{" "}
                      {(pagination.current_page - 1) * pagination.per_page + 1}{" "}
                      ถึง{" "}
                      {Math.min(
                        pagination.current_page * pagination.per_page,
                        pagination.total
                      )}{" "}
                      จาก {pagination.total} รายการ
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          handlePageChange(pagination.current_page - 1)
                        }
                        disabled={pagination.current_page <= 1}
                        className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        ← ก่อนหน้า
                      </button>
                      <span className="px-3 py-1 text-sm bg-purple-100 rounded">
                        หน้า {pagination.current_page} จาก{" "}
                        {pagination.total_pages}
                      </span>
                      <button
                        onClick={() =>
                          handlePageChange(pagination.current_page + 1)
                        }
                        disabled={!pagination.has_more}
                        className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        ถัดไป →
                      </button>
                    </div>
                  </div>
                )}

                <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50">
                  รวมทั้งหมด {filteredBookCopies.length} รายการ
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      import CustomDropdown from './components/CustomDropdown';
      {/* Popup Form - ใช้ CustomDropdown แทน select */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <h3 className="text-lg font-bold mb-4">
              {isEditing
                ? `แก้ไขสำเนาหนังสือ #${form.book_copies_id}`
                : "เพิ่มสำเนาหนังสือใหม่"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dropdown สำหรับเลือกหนังสือ */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เลือกหนังสือ *
                </label>
                <CustomDropdown
                  options={books.map((book) => ({
                    value: book.book_id,
                    label: `${book.title} - ${book.author} (จำกัด: ${book.book_limit})`,
                  }))}
                  value={form.book_id}
                  onChange={(value) => setForm({ ...form, book_id: value })}
                  placeholder="เลือกหนังสือ *"
                  disabled={isEditing}
                  required={true}
                  searchable={true}
                  className="w-full"
                  zIndex={1000}
                />
              </div>

              {/* Dropdown สำหรับเลือกสถานะ */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  สถานะ
                </label>
                <CustomDropdown
                  options={[
                    { value: "available", label: "พร้อมใช้งาน" },
                    { value: "reservations", label: "ถูกจอง" },
                    { value: "borrowed", label: "ถูกยืม" },
                  ]}
                  value={form.status}
                  onChange={(value) => setForm({ ...form, status: value })}
                  placeholder="เลือกสถานะ"
                  className="w-full"
                  zIndex={999}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ตำแหน่งชั้นหนังสือ
                </label>
                <input
                  type="text"
                  placeholder="ตำแหน่งชั้นหนังสือ (เช่น A1, B2)"
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.shelf_location}
                  onChange={(e) =>
                    setForm({ ...form, shelf_location: e.target.value })
                  }
                />
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    จำนวนสำเนาที่ต้องการเพิ่ม
                  </label>
                  <input
                    type="number"
                    placeholder="จำนวนสำเนาที่ต้องการเพิ่ม"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    min="1"
                    max="100"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-600 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveBookCopy}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-md hover:from-blue-600 hover:to-purple-700"
              >
                {isEditing ? "อัปเดต" : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mt-20">
        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="ยืนยันการลบสำเนาหนังสือ"
          message="คุณต้องการลบสำเนาหนังสือนี้ออกจากระบบหรือไม่?"
          itemName={deleteModal.bookTitle}
          isLoading={deleteModal.isDeleting}
          confirmText="ลบสำเนา"
          cancelText="ยกเลิก"
        />

        <Footer />
      </div>
    </div>
  );
}
