"use client";
import { useEffect, useState, useMemo } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SearchFilter from "@/app/components/SearchFilter";
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/app/components/Toast";
import { useToast } from "@/app/hooks/useToast";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";

interface Category {
  categorie_id: number;
  name: string;
  created_at: string;
  updated_at?: string;
}

// ประเภทของ Filter Values สำหรับ SearchFilter
interface FilterValues {
  [key: string]: string | { startDate: string; endDate: string };
}

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    categorie_id: 0,
    name: "",
  });

  // Filter state สำหรับ SearchFilter component
  const [filterValues, setFilterValues] = useState<FilterValues>({
    searchText: "",
    dateType: "created_at",
    dateRange: { startDate: "", endDate: "" },
  });

  // State สำหรับ Modal ยืนยันการลบหมวดหมู่
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    categoryId: 0,
    categoryName: "",
    isDeleting: false,
  });

  // กำหนด fields สำหรับ SearchFilter
  const filterFields = [
    {
      key: "searchText",
      label: "ค้นหาชื่อหมวดหมู่",
      type: "text" as const,
      placeholder: "ชื่อหมวดหมู่...",
      gridSpan: 1 as const,
    },
    {
      key: "dateType",
      label: "ประเภทวันที่",
      type: "select" as const,
      options: [
        { value: "created_at", label: "วันที่สร้าง" },
        { value: "updated_at", label: "วันที่แก้ไขล่าสุด" },
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

  // Toast notification hook
  const { toasts, success, error, warning, removeToast } = useToast();

  // Filtered data using useMemo for performance
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // Text search (by name)
      const searchText = (filterValues.searchText as string) || "";
      const textMatch =
        searchText === "" ||
        cat.name.toLowerCase().includes(searchText.toLowerCase());

      // Date range filter
      let dateMatch = true;
      const dateType = (filterValues.dateType as string) || "created_at";
      const dateRange = (filterValues.dateRange as {
        startDate: string;
        endDate: string;
      }) || { startDate: "", endDate: "" };

      let targetDate = cat.created_at;
      if (dateType === "updated_at") {
        targetDate = cat.updated_at || "";
      }

      if (dateRange.startDate && dateRange.endDate) {
        dateMatch =
          targetDate >= dateRange.startDate && targetDate <= dateRange.endDate;
      } else if (dateRange.startDate) {
        dateMatch = targetDate >= dateRange.startDate;
      } else if (dateRange.endDate) {
        dateMatch = targetDate <= dateRange.endDate;
      }

      return textMatch && dateMatch;
    });
  }, [categories, filterValues]);

  // Handle filter changes from SearchFilter component
  const handleFilterChange = (filters: FilterValues) => {
    setFilterValues(filters);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        console.error("Failed to fetch categories");
        error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเปิด Modal ยืนยันการลบ
  const handleDeleteClick = (category: Category) => {
    setDeleteModal({
      isOpen: true,
      categoryId: category.categorie_id,
      categoryName: category.name,
      isDeleting: false,
    });
  };

  // ฟังก์ชันปิด Modal
  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      categoryId: 0,
      categoryName: "",
      isDeleting: false,
    });
  };

  // ฟังก์ชันยืนยันการลบ
  const handleDeleteConfirm = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
      const res = await fetch(`/api/categories/${deleteModal.categoryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        success("ลบหมวดหมู่สำเร็จ", "หมวดหมู่ถูกลบออกจากระบบแล้ว");
        fetchCategories();
        handleDeleteCancel();
      } else {
        const data = await res.json();
        error("เกิดข้อผิดพลาด", data?.error || "ไม่สามารถลบหมวดหมู่ได้");
      }
    } catch {
      error("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const saveCategory = async () => {
    if (!form.name.trim()) {
      warning("กรุณาระบุชื่อหมวดหมู่");
      return;
    }
    try {
      const method = isEditing ? "PUT" : "POST";
      const endpoint = isEditing
        ? `/api/categories/${form.categorie_id}`
        : "/api/categories";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        success(isEditing ? "แก้ไขหมวดหมู่สำเร็จ" : "เพิ่มหมวดหมู่สำเร็จ");
        setShowForm(false);
        resetForm();
        fetchCategories();
      } else {
        error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error("Error saving category:", err);
      error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const editCategory = (category: Category) => {
    setForm({ categorie_id: category.categorie_id, name: category.name });
    setIsEditing(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ categorie_id: 0, name: "" });
    setIsEditing(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const formatDateDMY = (dateStr: string) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header Section with Better Layout */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Mobile: Stack vertically */}
          <div className="flex flex-col sm:hidden gap-3">
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold text-white">
                📚 จัดการหมวดหมู่หนังสือ
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
                onClick={openAddForm}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-3 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 disabled:opacity-50 text-sm font-medium flex items-center gap-1"
                disabled={loading}
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
                📚 จัดการหมวดหมู่หนังสือ
              </h1>
            </div>

            <button
              onClick={openAddForm}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              disabled={loading}
            >
              <span>+</span>
              <span>เพิ่มหมวดหมู่ใหม่</span>
            </button>
          </div>
        </div>

        {/* Search Filter Component */}
        <SearchFilter
          fields={filterFields}
          initialValues={filterValues}
          onFilterChange={handleFilterChange}
          resultCount={filteredCategories.length}
          className="mb-8"
        />

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
          </div>
        ) : (
          <>
            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-md p-6 mt-8 overflow-x-auto">
              <table className="min-w-full table-auto text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-center">ลำดับ</th>
                    <th className="py-3 px-4">ชื่อหมวดหมู่</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-gray-500"
                      >
                        ไม่มีข้อมูลหมวดหมู่
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category, index) => (
                      <tr
                        key={category.categorie_id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-center text-gray-600">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {category.name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => editCategory(category)}
                            className="text-blue-600 hover:text-blue-800 mx-1 p-1"
                            title="แก้ไข"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteClick(category)}
                            className="text-red-500 hover:text-red-700 mx-1 p-1"
                            title="ลบ"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-gray-600">
              รวมทั้งหมด {filteredCategories.length} หมวดหมู่
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {isEditing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
            </h3>
            <div className="space-y-4">
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสหมวดหมู่
                  </label>
                  <input
                    type="text"
                    value={form.categorie_id}
                    disabled
                    className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-gray-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อหมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="กรุณาระบุชื่อหมวดหมู่"
                  className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={100}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {form.name.length}/100 ตัวอักษร
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveCategory}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {isEditing ? "บันทึกการแก้ไข" : "เพิ่มหมวดหมู่"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="ยืนยันการลบหมวดหมู่"
        message="คุณต้องการลบหมวดหมู่นี้ออกจากระบบหรือไม่? (หากมีหนังสือใช้หมวดหมู่นี้อยู่จะไม่สามารถลบได้)"
        itemName={deleteModal.categoryName}
        isLoading={deleteModal.isDeleting}
        confirmText="ลบหมวดหมู่"
        cancelText="ยกเลิก"
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <Footer />
    </div>
  );
}
