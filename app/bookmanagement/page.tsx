"use client";
import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SearchFilter from "@/app/components/SearchFilter";
import { useRouter } from "next/navigation";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";
import { useToast } from "@/app/hooks/useToast";
import { ToastContainer } from "@/app/components/Toast";

interface Book {
  book_id: number;
  title: string;
  author: string;
  isbn?: string;
  categorie_id: number;
  description?: string;
  publish_year?: number;
  status: boolean;
  publisher?: string;
  language?: string;
  book_image?: string;
  book_image_full_url?: string; // เพิ่มเพื่อรับ full URL จาก API
  book_limit?: number;
  reader_group?: string;
}

interface Category {
  categorie_id: number;
  name: string;
}

interface FilterValues {
  [key: string]: string | { startDate: string; endDate: string };
}

export default function BookManagementPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    book_id: 0,
    title: "",
    author: "",
    isbn: "",
    categorie_id: "",
    description: "",
    publish_year: "",
    publisher: "",
    language: "Thai",
    book_image: "",
    book_limit: "1",
    reader_group: "children",
    status: "active",
  });

  // State สำหรับการอัปโหลดรูปภาพ
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Search & Filter State ---
  const [searchFilters, setSearchFilters] = useState<FilterValues>({
    searchText: "",
    category: "",
    status: "",
    publishYear: "",
  });

  // --- Filtered Books ---
  const filteredBooks = books.filter((book) => {
    // Search by title, author, ISBN
    const text = (searchFilters.searchText as string).trim().toLowerCase();
    const textMatch =
      !text ||
      book.title.toLowerCase().includes(text) ||
      book.author.toLowerCase().includes(text) ||
      (book.isbn || "").toLowerCase().includes(text);

    // Filter by category
    const categoryMatch =
      !searchFilters.category ||
      String(book.categorie_id) === searchFilters.category;

    // Filter by status
    let statusMatch = true;
    if (searchFilters.status === "active") statusMatch = book.status === true;
    else if (searchFilters.status === "inactive")
      statusMatch = book.status === false;

    // Filter by publish year (>= ปีที่กรอก)
    let yearMatch = true;
    const year = book.publish_year || 0;
    const filterYear = searchFilters.publishYear as string;
    if (filterYear) {
      yearMatch = year >= parseInt(filterYear);
    }
    return textMatch && categoryMatch && statusMatch && yearMatch;
  });

  // Define filter fields for SearchFilter component
  const filterFields = [
    {
      key: "searchText",
      label: "ค้นหา",
      type: "text" as const,
      placeholder: "ชื่อหนังสือ, ผู้แต่ง, ISBN",
    },
    {
      key: "category",
      label: "หมวดหมู่",
      type: "select" as const,
      options: [
        { value: "", label: "ทุกหมวดหมู่" },
        ...categories.map((cat) => ({
          value: cat.categorie_id.toString(),
          label: cat.name,
        })),
      ],
    },
    {
      key: "status",
      label: "สถานะ",
      type: "select" as const,
      options: [
        { value: "", label: "ทุกสถานะ" },
        { value: "active", label: "ใช้งาน" },
        { value: "inactive", label: "ไม่ใช้งาน" },
      ],
    },
    {
      key: "publishYear",
      label: "ปีที่พิมพ์ (ตั้งแต่)",
      type: "text" as const,
      placeholder: "เช่น 2020",
    },
  ];

  // ฟังก์ชันจัดการการเลือกไฟล์รูปภาพ
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // ตรวจสอบขนาดไฟล์ (จำกัดที่ 5MB)
      if (file.size > 5 * 1024 * 1024) {
        error("ขนาดไฟล์ใหญ่เกินไป", "ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB");
        return;
      }

      // ตรวจสอบประเภทไฟล์
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        error(
          "ประเภทไฟล์ไม่รองรับ",
          "รูปภาพต้องเป็นไฟล์ประเภท JPEG, JPG, PNG, GIF, หรือ WebP เท่านั้น"
        );
        return;
      }

      setSelectedFile(file);

      // สร้าง preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ฟังก์ชันลบรูปภาพที่เลือก
  const handleImageRemove = () => {
    setSelectedFile(null);
    setImagePreview(null);
    // Reset input file
    const fileInput = document.getElementById(
      "book_image_input"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch("/api/bookmanagement");

      if (!res.ok) {
        console.error("API Error:", res.status, res.statusText);
        setBooks([]);
        return;
      }

      const data = await res.json();

      console.log("API Response:", data);

      if (Array.isArray(data)) {
        setBooks(data);
      } else if (data && Array.isArray(data.data)) {
        setBooks(data.data);
      } else if (data && Array.isArray(data.recordset)) {
        setBooks(data.recordset);
      } else if (data && Array.isArray(data.books)) {
        setBooks(data.books);
      } else if (data && data.error) {
        console.error("API Error:", data.error);
        setBooks([]);
      } else {
        console.error("Invalid response format:", data);
        console.log("Response keys:", data ? Object.keys(data) : "null");
        setBooks([]);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
      setBooks([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();

      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        console.error("Invalid categories response: not an array", data);
        setCategories([]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    }
  };

  const { toasts, removeToast, success, error } = useToast();

  // State สำหรับ Modal ยืนยันการลบหนังสือ
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    bookId: 0,
    bookTitle: "",
    isDeleting: false,
  });

  // ฟังก์ชันเปิด Modal ยืนยันการลบ
  const handleDeleteClick = (book: Book) => {
    setDeleteModal({
      isOpen: true,
      bookId: book.book_id,
      bookTitle: book.title,
      isDeleting: false,
    });
  };

  // ฟังก์ชันปิด Modal
  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      bookId: 0,
      bookTitle: "",
      isDeleting: false,
    });
  };

  // ฟังก์ชันยืนยันการลบ
  const handleDeleteConfirm = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
      const res = await fetch(`/api/bookmanagement/${deleteModal.bookId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        success(
          "ลบหนังสือสำเร็จ",
          `หนังสือ \"${deleteModal.bookTitle}\" ถูกลบออกจากระบบแล้ว`
        );
        fetchBooks();
        handleDeleteCancel();
      } else {
        error("เกิดข้อผิดพลาด", data?.error || "ไม่สามารถลบหนังสือได้");
      }
    } catch {
      error("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const saveBook = async () => {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (
      !form.title ||
      !form.author ||
      !form.categorie_id ||
      !form.book_limit ||
      !form.reader_group
    ) {
      error(
        "ข้อมูลไม่ครบถ้วน",
        "กรุณากรอกข้อมูลที่จำเป็น (ชื่อเรื่อง, ผู้แต่ง, หมวดหมู่, จำนวนจำกัด, กลุ่มผู้อ่าน)"
      );
      return;
    }

    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `/api/bookmanagement/${form.book_id}`
      : "/api/bookmanagement";

    // ตรวจสอบว่าใช่การแก้ไขหรือไม่ และมี book_id หรือไม่
    if (isEditing && (!form.book_id || form.book_id === 0)) {
      error("ไม่พบรหัสหนังสือที่จะแก้ไข");
      return;
    }

    // แปลง status เป็น string
    let statusValue = form.status;
    if (typeof form.status === "boolean") {
      statusValue = form.status ? "active" : "inactive";
    }

    try {
      setIsUploading(true);

      // สร้าง FormData สำหรับส่งข้อมูลและรูปภาพ
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("author", form.author);
      formData.append("isbn", form.isbn);
      formData.append("categorie_id", form.categorie_id);
      formData.append("description", form.description);
      formData.append("publish_year", form.publish_year);
      formData.append("publisher", form.publisher);
      formData.append("language", form.language);
      formData.append("book_limit", form.book_limit);
      formData.append("reader_group", form.reader_group);
      formData.append("status", statusValue);

      // เพิ่มรูปภาพหากมีการเลือกไฟล์ใหม่
      if (selectedFile) {
        formData.append("book_image", selectedFile);
      }

      // สำหรับการแก้ไข ให้ส่ง book_id ด้วย
      if (isEditing) {
        formData.append("book_id", form.book_id.toString());
      }

      const res = await fetch(endpoint, {
        method,
        body: formData, // ใช้ FormData แทน JSON
      });

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("ไม่ใช่ JSON:", text);
        error("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
        return;
      }

      if (res.ok) {
        success(
          isEditing ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มหนังสือสำเร็จ",
          data.book_image_url ? "รูปภาพถูกอัปโหลดเรียบร้อยแล้ว" : ""
        );
        setShowForm(false);
        resetForm();
        fetchBooks();
      } else {
        error("เกิดข้อผิดพลาด", data?.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error("Error saving book:", err);
      error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setForm({
      book_id: 0,
      title: "",
      author: "",
      isbn: "",
      categorie_id: "",
      description: "",
      publish_year: "",
      publisher: "",
      language: "Thai",
      book_image: "",
      book_limit: "1",
      reader_group: "children",
      status: "active",
    });
    setIsEditing(false);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const editBook = (book: Book) => {
    setForm({
      book_id: book.book_id,
      title: book.title,
      author: book.author,
      isbn: book.isbn || "",
      categorie_id: String(book.categorie_id),
      description: book.description || "",
      publish_year:
        book.publish_year != null ? book.publish_year.toString() : "",
      publisher: book.publisher || "",
      language: book.language || "Thai",
      book_image: book.book_image || "",
      book_limit: book.book_limit ? String(book.book_limit) : "1",
      reader_group: book.reader_group || "children",
      status:
        typeof book.status === "boolean"
          ? book.status
            ? "active"
            : "inactive"
          : book.status === "active"
          ? "active"
          : book.status === "inactive"
          ? "inactive"
          : "active",
    });

    // ถ้ามีรูปภาพเดิม ให้แสดง preview
    if (book.book_image_full_url) {
      setImagePreview(book.book_image_full_url);
    }

    setIsEditing(true);
    setShowForm(true);
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat) => cat.categorie_id === categoryId);
    return category ? category.name : `ID: ${categoryId}`;
  };

  const handleAddNewBook = () => {
    resetForm();
    setShowForm(true);
  };

  // Handle filter changes from SearchFilter component
  const handleFilterChange = (filters: FilterValues) => {
    setSearchFilters(filters);
  };

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, []);

  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      {/* Toast Notification */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Main Content */}
      <div className="flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Header Section with Better Layout */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Mobile: Stack vertically */}
            <div className="flex flex-col sm:hidden gap-3">
              <div className="text-center">
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  📚 จัดการหนังสือ
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
                  onClick={handleAddNewBook}
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
                  📚 จัดการหนังสือ
                </h1>
              </div>

              <button
                onClick={handleAddNewBook}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                <span>+</span>
                <span>เพิ่มหนังสือใหม่</span>
              </button>
            </div>
          </div>

          <SearchFilter
            fields={filterFields}
            initialValues={searchFilters}
            onFilterChange={handleFilterChange}
            resultCount={filteredBooks.length}
          />

          {/* Content Area */}
          {filteredBooks.length === 0 ? (
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  ไม่พบข้อมูลหนังสือ
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  ลองปรับตัวกรองหรือเพิ่มหนังสือใหม่
                </p>
              </div>
            </div>
          ) : (
            // Table
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-center">ลำดับ</th>
                      <th className="py-3 px-4">รูปภาพ</th>
                      <th className="py-3 px-4">ชื่อเรื่อง</th>
                      <th className="py-3 px-4">ผู้แต่ง</th>
                      <th className="py-3 px-4">ISBN</th>
                      <th className="py-3 px-4">หมวดหมู่</th>
                      <th className="py-3 px-4">ปีที่พิมพ์</th>
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBooks.filter(Boolean).map((book, index) => (
                      <tr
                        key={book.book_id}
                        className="border-b hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="py-3 px-4 text-center text-gray-600">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4">
                          {book.book_image_full_url || book.book_image ? (
                            <img
                              src={book.book_image_full_url || book.book_image}
                              alt={book.title}
                              className="w-12 h-16 object-cover rounded-md border border-gray-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/images/no-image.png"; // fallback image
                              }}
                            />
                          ) : (
                            <div className="w-12 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                              <span className="text-gray-400 text-xs">📖</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {book.title}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {book.author}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {book.isbn || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {getCategoryName(book.categorie_id)}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {book.publish_year || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {book.status ? (
                            <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
                              ใช้งาน
                            </span>
                          ) : (
                            <span className="text-red-600 bg-red-100 px-2 py-1 rounded-full text-xs font-medium">
                              ไม่ใช้งาน
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => editBook(book)}
                            className="text-blue-600 hover:text-blue-800 mx-1 p-1 rounded transition-colors duration-150"
                            title="แก้ไข"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteClick(book)}
                            className="text-red-500 hover:text-red-700 mx-1 p-1 rounded transition-colors duration-150"
                            title="ลบ"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50">
                รวมทั้งหมด {filteredBooks.length} เล่ม
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popup Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                {isEditing
                  ? `แก้ไขหนังสือ (ID: ${form.book_id})`
                  : "เพิ่มหนังสือใหม่"}
              </h3>

              {/* รูปภาพ */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  รูปภาพปกหนังสือ
                </label>

                {/* แสดงรูปภาพ Preview */}
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-40 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleImageRemove}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Input File */}
                <div className="flex items-center space-x-2">
                  <label className="flex items-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm text-gray-700">
                      {selectedFile ? "เปลี่ยนรูปภาพ" : "เลือกรูปภาพ"}
                    </span>
                    <input
                      id="book_image_input"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                <p className="text-xs text-gray-500">
                  รองรับไฟล์ JPEG, JPG, PNG, GIF, WebP (ขนาดไม่เกิน 5MB)
                </p>
              </div>

              {/* ชื่อเรื่อง */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  ชื่อเรื่อง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="กรอกชื่อหนังสือ"
                />
              </div>

              {/* ผู้แต่ง */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  ผู้แต่ง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="กรอกชื่อผู้แต่ง"
                />
              </div>

              {/* ISBN */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  ISBN
                </label>
                <input
                  type="text"
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="กรอกหมายเลข ISBN"
                />
              </div>

              {/* หมวดหมู่ */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.categorie_id}
                  onChange={(e) =>
                    setForm({ ...form, categorie_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {categories.map((category) => (
                    <option
                      key={category.categorie_id}
                      value={category.categorie_id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* คำอธิบาย */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  คำอธิบาย
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="กรอกคำอธิบายหนังสือ"
                />
              </div>

              {/* Row 1: ปีที่พิมพ์ และ สำนักพิมพ์ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    ปีที่พิมพ์
                  </label>
                  <input
                    type="number"
                    value={form.publish_year}
                    onChange={(e) =>
                      setForm({ ...form, publish_year: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น 2023"
                    min="1900"
                    max="2030"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    สำนักพิมพ์
                  </label>
                  <input
                    type="text"
                    value={form.publisher}
                    onChange={(e) =>
                      setForm({ ...form, publisher: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="กรอกชื่อสำนักพิมพ์"
                  />
                </div>
              </div>

              {/* Row 2: ภาษา และ จำนวนจำกัด */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    ภาษา
                  </label>
                  <select
                    value={form.language}
                    onChange={(e) =>
                      setForm({ ...form, language: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Thai">ไทย</option>
                    <option value="English">อังกฤษ</option>
                    <option value="Chinese">จีน</option>
                    <option value="Japanese">ญี่ปุ่น</option>
                    <option value="Korean">เกาหลี</option>
                    <option value="Other">อื่นๆ</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    จำนวนจำกัด <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.book_limit}
                    onChange={(e) =>
                      setForm({ ...form, book_limit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น 1"
                    min="1"
                  />
                </div>
              </div>

              {/* Row 3: กลุ่มผู้อ่าน และ สถานะ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    กลุ่มผู้อ่าน <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.reader_group}
                    onChange={(e) =>
                      setForm({ ...form, reader_group: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="children">เด็ก</option>
                    <option value="teens">วัยรุ่น</option>
                    <option value="adults">ผู้ใหญ่</option>
                    <option value="all">ทุกกลุ่มอายุ</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    สถานะ
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">ใช้งาน</option>
                    <option value="inactive">ไม่ใช้งาน</option>
                  </select>
                </div>
              </div>

              {/* ปุ่มจัดการ */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isUploading}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={saveBook}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUploading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>{isEditing ? "บันทึกการแก้ไข" : "เพิ่มหนังสือ"}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="ยืนยันการลบหนังสือ"
        message={`คุณต้องการลบหนังสือ "${deleteModal.bookTitle}" หรือไม่?`}
        isLoading={deleteModal.isDeleting}
      />

      <Footer />
    </div>
  );
}
