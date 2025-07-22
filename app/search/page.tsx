"use client";
import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  user_id: number;
  email: string;
  user_type: string;
  iat: number;
  exp: number;
}

// แก้ไข interface Book ให้ตรงกับข้อมูลจาก API
interface Book {
  book_id: number;
  title: string;
  author: string;
  isbn: string;
  categorie_id: number;
  category_name?: string;
  description?: string;
  book_image?: string; // รูปภาพ path
  book_image_full_url?: string; // รูปภาพ full URL
  reader_group: string;
  status: string;
  book_limit: number;
  publish_year?: number;
  publisher?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
}

interface BookCopy {
  book_copies_id: number;
  book_id: number;
  copy_number: number;
  shelf_location: string;
  status: "available" | "borrowed" | "reservations" | "maintenance";
}

// เพิ่ม interface สำหรับ Category
interface Category {
  categorie_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function BookSearchPage() {
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // เพิ่ม state สำหรับ categories
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search states
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedBookCopies, setSelectedBookCopies] = useState<BookCopy[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // จำนวนหนังสือต่อหน้า

  // Reservation states
  const [reserving, setReserving] = useState<number | null>(null);
  const [reservationMessage, setReservationMessage] = useState<string | null>(
    null
  );

  // เพิ่ม state สำหรับแจ้งเตือนจำนวนการจอง
  const [reservationCount, setReservationCount] = useState(0);
  const [showReservationAlert, setShowReservationAlert] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setUser(decoded);
      } catch {
        console.error("Token ผิดหรือหมดอายุ");
        localStorage.removeItem("token");
      }
    }
  }, []);

  useEffect(() => {
    fetchBooks();
    fetchBookCopies();
    fetchCategories(); // เพิ่มการเรียก API categories
    if (user) {
      fetchUserReservationCount(); // เรียกดูจำนวนการจองปัจจุบัน
    }
  }, [user]);

  // Reset to first page when search filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, status]);

  // เพิ่มฟังก์ชัน fetchUserReservationCount
  const fetchUserReservationCount = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/reservations/user/${user.user_id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReservationCount(data.data?.length || 0);
      }
    } catch (err) {
      console.error("Error fetching reservation count:", err);
    }
  };

  // เพิ่มฟังก์ชัน fetchCategories
  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      // ไม่ต้อง setError เพราะไม่ critical มาก
    }
  };

  const getCategoryName = (book: Book) => {
    if (book.category_name) {
      return book.category_name;
    }
    if (book.categorie_id) {
      const category = categories.find(
        (cat) => cat.categorie_id === book.categorie_id
      );
      return category ? category.name : `หมวดหมู่ ID: ${book.categorie_id}`;
    }
    return "ไม่ระบุหมวดหมู่";
  };

  const fetchBooks = async () => {
    try {
      const response = await fetch("/api/bookmanagement"); // เปลี่ยน endpoint
      if (!response.ok) {
        throw new Error("Failed to fetch books");
      }
      const data = await response.json();
      console.log("Books data:", data); // Debug
      setBooks(data || []); // /api/bookmanagement ไม่ได้ wrap ใน data
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลหนังสือได้");
      console.error("Error fetching books:", err);
    }
  };

  const fetchBookCopies = async () => {
    try {
      const response = await fetch("/api/bookcopies/all");
      if (!response.ok) {
        throw new Error("Failed to fetch book copies");
      }
      const data = await response.json();
      setBookCopies(data.data || []);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลสำเนาหนังสือได้");
      console.error("Error fetching book copies:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    const copies = bookCopies.filter((copy) => copy.book_id === book.book_id);
    setSelectedBookCopies(copies);
    setReservationMessage(null);
  };

  const handleReservation = async (bookId: number, copyId: number) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนจองหนังสือ");
      return;
    }

    setReserving(copyId);
    setReservationMessage(null);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          user_id: user.user_id,
          book_id: bookId,
          book_copies_id: copyId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setReservationMessage(
          `จองสำเนา #${copyId} สำเร็จ! ${data.data.note || ""}`
        );

        // Update local state immediately
        setSelectedBookCopies((prev) =>
          prev.map((copy) =>
            copy.book_copies_id === copyId
              ? { ...copy, status: "reservations" as const }
              : copy
          )
        );

        setBookCopies((prev) =>
          prev.map((copy) =>
            copy.book_copies_id === copyId
              ? { ...copy, status: "reservations" as const }
              : copy
          )
        );

        // อัปเดตจำนวนการจอง และแสดงการแจ้งเตือน
        const newCount = reservationCount + 1;
        setReservationCount(newCount);
        setShowReservationAlert(true);

        // ส่งข้อมูลไปยัง Header component (ถ้ามี context หรือ prop drilling)
        // หรือใช้ localStorage เพื่อให้ Header อ่านได้
        localStorage.setItem("userReservationCount", newCount.toString());

        // แสดงการกระพิบที่ header (ใช้ custom event)
        window.dispatchEvent(
          new CustomEvent("reservationUpdated", {
            detail: { count: newCount },
          })
        );

        // Auto hide message after 3 seconds
        setTimeout(() => {
          setReservationMessage(null);
          setShowReservationAlert(false);
        }, 3000);
      } else {
        setReservationMessage(`${data.error}`);
      }
    } catch (err) {
      setReservationMessage("เกิดข้อผิดพลาดในการจองหนังสือ");
      console.error("Error making reservation:", err);
    } finally {
      setReserving(null);
    }
  };

  // ฟังก์ชันกรองหนังสือตามประเภทผู้ใช้
  const getFilteredBooksByUserType = (books: Book[]) => {
    if (!user) return books;

    // Admin และ Librarian เห็นหนังสือทั้งหมด
    if (["admin", "librarian"].includes(user.user_type)) {
      return books;
    }

    // Citizen เห็นเฉพาะหนังสือที่เหมาะสำหรับ citizen (ไม่ใช่ education)
    if (user.user_type === "citizen") {
      return books.filter((book) => book.reader_group !== "education");
    }

    // Educational เห็นเฉพาะหนังสือของ education
    if (user.user_type === "educational") {
      return books.filter((book) => book.reader_group === "education");
    }

    return books;
  };

  const filteredBooks = getFilteredBooksByUserType(books).filter((book) => {
    const matchesQuery =
      query === "" ||
      book.title.toLowerCase().includes(query.toLowerCase()) ||
      book.author.toLowerCase().includes(query.toLowerCase()) ||
      book.isbn.includes(query);

    // เปรียบเทียบทั้งชื่อหมวดหมู่และ ID
    let matchesCategory = true;
    if (category !== "") {
      matchesCategory =
        book.category_name === category ||
        book.categorie_id === parseInt(category) ||
        getCategoryName(book) === category;
    }

    let matchesStatus = true;
    if (status !== "") {
      const bookCopiesForBook = bookCopies.filter(
        (copy) => copy.book_id === book.book_id
      );
      if (status === "available") {
        matchesStatus = bookCopiesForBook.some(
          (copy) => copy.status === "available"
        );
      } else if (status === "borrowed") {
        matchesStatus = bookCopiesForBook.some(
          (copy) => copy.status === "borrowed"
        );
      } else if (status === "reserved") {
        matchesStatus = bookCopiesForBook.some(
          (copy) => copy.status === "reservations"
        );
      }
    }

    return matchesQuery && matchesCategory && matchesStatus;
  });

  // Pagination calculations
  const totalItems = filteredBooks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const getBookStatus = (bookId: number) => {
    const bookCopiesForBook = bookCopies.filter(
      (copy) => copy.book_id === bookId
    );
    if (bookCopiesForBook.length === 0) return "ไม่มีข้อมูล";

    const availableCount = bookCopiesForBook.filter(
      (copy) => copy.status === "available"
    ).length;
    const borrowedCount = bookCopiesForBook.filter(
      (copy) => copy.status === "borrowed"
    ).length;
    const reservedCount = bookCopiesForBook.filter(
      (copy) => copy.status === "reservations"
    ).length;

    if (availableCount > 0) return "available";
    if (reservedCount > 0) return "reserved";
    if (borrowedCount > 0) return "borrowed";
    return "unavailable";
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "พร้อมให้ยืม";
      case "borrowed":
        return "ถูกยืมแล้ว";
      case "reservations":
        return "ถูกจอง";
      case "reserved":
        return "ถูกจอง";
      case "maintenance":
        return "ซ่อมบำรุง";
      default:
        return "ยังไม่มีสำเนาหนังสือ";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700";
      case "borrowed":
        return "bg-red-100 text-red-700";
      case "reservations":
        return "bg-yellow-100 text-yellow-700";
      case "reserved":
        return "bg-yellow-100 text-yellow-700";
      case "maintenance":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const canUserAccessBook = (book: Book) => {
    if (!user) return false;

    if (["admin", "librarian"].includes(user.user_type)) {
      return true;
    }

    if (book.reader_group === "children" && user.user_type !== "citizen") {
      return false;
    }

    if (book.reader_group === "education" && user.user_type !== "educational") {
      return false;
    }

    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
            >
              ลองใหม่
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />

      {/* แสดงการแจ้งเตือนการจองสำเร็จแบบกระพิบ */}
      {showReservationAlert && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl border-2 border-green-300">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-bold">จองสำเร็จ!</p>
                <p className="text-sm">
                  การจองของคุณ: {reservationCount} รายการ
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* แสดงข้อมูลประเภทผู้ใช้และจำนวนหนังสือที่แสดง */}
        {user && (
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {user.user_type === "citizen"
                    ? "👤"
                    : user.user_type === "educational"
                    ? "🎓"
                    : user.user_type === "librarian"
                    ? "📚"
                    : "🔧"}
                </span>
                <div>
                  <p className="text-sm text-gray-600">
                    สวัสดี{" "}
                    {user.user_type === "citizen"
                      ? "สมาชิกทั่วไป (ประชาชน)"
                      : user.user_type === "educational"
                      ? "สมาชิกสถาบันการศึกษา"
                      : user.user_type === "librarian"
                      ? "บรรณารักษ์"
                      : "ผู้ดูแลระบบ"}
                  </p>
                  <p className="text-xs text-gray-500">
                    แสดงหนังสือที่เหมาะสำหรับคุณ:{" "}
                    {user.user_type === "citizen"
                      ? "หนังสือทั่วไป"
                      : user.user_type === "educational"
                      ? "หนังสือสถาบันการศึกษา"
                      : "หนังสือทั้งหมด"}
                  </p>
                </div>
              </div>
              {reservationCount > 0 && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {reservationCount}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-amber-900 leading-tight">
                      คุณได้ทำการจองหนังสือแล้ว {reservationCount} รายการ
                    </div>
                    <div className="text-xs text-amber-700 mt-0.5">
                      ดูรายการจองได้ที่{" "}
                      <a
                        href="/reservations"
                        className="font-medium underline decoration-amber-400 underline-offset-2 hover:text-amber-800 hover:decoration-amber-600 transition-colors"
                      >
                        เมนู "ประวัติการจอง"
                      </a>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-amber-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-xl shadow-purple-500 space-y-4">
          <h2 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
            <span className="text-purple-500 text-xl">🔍</span> ค้นหาหนังสือ
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="🔎 ชื่อหนังสือ, ผู้แต่ง, ISBN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">📚 ทุกหมวดหมู่</option>
              {categories.map((cat) => (
                <option key={`category-${cat.categorie_id}`} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">📋 ทุกสถานะ</option>
              <option value="available">พร้อมให้ยืม</option>
              <option value="borrowed">ถูกยืมแล้ว</option>
              <option value="reserved">ถูกจอง</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          {/* Search Results Info and Items Per Page Selector */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                พบ {totalItems} รายการ (หน้า {currentPage} จาก {totalPages})
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">แสดง:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) =>
                    handleItemsPerPageChange(Number(e.target.value))
                  }
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value={6}>6 รายการ</option>
                  <option value={9}>9 รายการ</option>
                  <option value={12}>12 รายการ</option>
                  <option value={18}>18 รายการ</option>
                  <option value={24}>24 รายการ</option>
                </select>
              </div>
            </div>

            {totalItems > 0 && (
              <div className="text-sm text-gray-600">
                แสดง {startIndex + 1}-{Math.min(endIndex, totalItems)} จาก{" "}
                {totalItems} รายการ
              </div>
            )}
          </div>

          {/* Books Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentBooks.map((book) => {
              const bookStatus = getBookStatus(book.book_id);
              const userCanAccess = canUserAccessBook(book);

              return (
                <div
                  key={`book-${book.book_id}`}
                  className={`group rounded-2xl overflow-hidden shadow-lg bg-white border border-gray-100 hover:shadow-2xl hover:shadow-purple-500 transition-all duration-500 transform hover:-translate-y-2 ${
                    !userCanAccess ? "opacity-60" : ""
                  }`}
                >
                  {/* Image Container with Gradient Overlay */}
                  <div className="relative h-56 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getStatusColor(
                          bookStatus
                        )} shadow-lg`}
                      >
                        {getStatusText(bookStatus)}
                      </span>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700 backdrop-blur-sm shadow-lg">
                        {getCategoryName(book)}
                      </span>
                    </div>

                    {/* Book Image */}
                    <div className="h-full w-full flex items-center justify-center p-4">
                      {book.book_image_full_url || book.book_image ? (
                        <img
                          src={book.book_image_full_url || book.book_image}
                          alt={book.title}
                          className="max-h-full max-w-full object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.parentElement!.innerHTML = `
                    <div class="flex flex-col items-center justify-center text-gray-400 group-hover:text-purple-400 transition-colors duration-300">
                      <span class="text-6xl mb-2">📚</span>
                      <span class="text-sm font-medium">ไม่มีรูปภาพ</span>
                    </div>
                  `;
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-purple-400 transition-colors duration-300">
                          <span className="text-6xl mb-2">📚</span>
                          <span className="text-sm font-medium">
                            ไม่มีรูปภาพ
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-gray-800 line-clamp-2 group-hover:text-purple-600 transition-colors duration-300">
                        {book.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="flex items-center">
                          <span className="text-blue-500 mr-1">✍️</span>
                          <span className="truncate">{book.author}</span>
                        </span>
                      </div>
                    </div>

                    {/* ISBN */}
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="text-green-500 mr-1">📖</span>
                      <span>ISBN: {book.isbn}</span>
                    </div>

                    {/* Access Restriction Warning */}
                    {book.reader_group === "education" && !userCanAccess && (
                      <div className="flex items-center p-2 bg-red-50 border border-red-200 rounded-lg">
                        <span className="text-red-500 mr-2">⚠️</span>
                        <p className="text-red-600 text-xs">
                          หนังสือนี้สงวนไว้สำหรับกลุ่มสมาชิกเฉพาะ
                          (สถาบันการศึกษา)
                        </p>
                      </div>
                    )}

                    {/* Action Button */}
                    {!(book.reader_group === "education" && !userCanAccess) && (
                      <div className="pt-2">
                        <button
                          onClick={() => handleBookSelect(book)}
                          className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 active:scale-95"
                        >
                          <span className="flex items-center justify-center space-x-2">
                            <span>📋</span>
                            <span>ดูรายละเอียด</span>
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-400/10 to-purple-400/10 rounded-full transform -translate-x-6 translate-y-6 group-hover:scale-150 transition-transform duration-500"></div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 border border-gray-300"
                }`}
              >
                <span>←</span>
                <span className="hidden sm:inline">ก่อนหน้า</span>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-2">
                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      typeof page === "number" && handlePageChange(page)
                    }
                    disabled={page === "..."}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors duration-200 ${
                      page === currentPage
                        ? "bg-purple-500 text-white shadow-xl"
                        : page === "..."
                        ? "text-gray-400 cursor-default"
                        : "bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 border border-gray-300"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 border border-gray-300"
                }`}
              >
                <span className="hidden sm:inline">ถัดไป</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* No Results Message */}
          {totalItems === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                ไม่พบหนังสือที่ค้นหา
              </h3>
              <p className="text-gray-500">
                ลองปรับเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Popup Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedBook.title}
              </h2>
              <button
                onClick={() => setSelectedBook(null)}
                className="text-gray-500 hover:text-red-500 text-2xl"
              >
                ✖
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  {selectedBook.book_image_full_url ||
                  selectedBook.book_image ? (
                    <img
                      src={
                        selectedBook.book_image_full_url ||
                        selectedBook.book_image
                      }
                      alt={selectedBook.title}
                      className="w-48 h-72 object-contain rounded shadow-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.parentElement!.innerHTML =
                          '<div class="w-48 h-72 bg-gray-200 rounded flex items-center justify-center text-6xl">📚</div>';
                      }}
                    />
                  ) : (
                    <div className="w-48 h-72 bg-gray-200 rounded flex items-center justify-center text-6xl">
                      📚
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                    <p>
                      <strong>ผู้แต่ง:</strong> {selectedBook.author}
                    </p>
                    <p>
                      <strong>ISBN:</strong> {selectedBook.isbn}
                    </p>
                    <p>
                      <strong>หมวดหมู่:</strong> {getCategoryName(selectedBook)}
                    </p>
                    <p>
                      <strong>กลุ่มผู้อ่าน:</strong>{" "}
                      {selectedBook.reader_group === "children"
                        ? "เด็ก"
                        : selectedBook.reader_group === "education"
                        ? "สถาบันการศึกษา"
                        : "ผู้ใหญ่"}
                    </p>
                  </div>
                  {selectedBook.description && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <strong>คำอธิบาย:</strong>
                      <p className="mt-2 text-gray-600">
                        {selectedBook.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reservation Message */}
              {reservationMessage && (
                <div
                  className={`p-4 rounded-lg font-medium ${
                    reservationMessage.includes("สำเร็จ")
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-red-100 text-red-700 border border-red-200"
                  }`}
                >
                  {reservationMessage}
                </div>
              )}

              {/* Book Copies Cards */}
              {user &&
                ["admin", "librarian", "citizen", "educational"].includes(
                  user.user_type
                ) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      สำเนาหนังสือทั้งหมด ({selectedBookCopies.length} เล่ม)
                    </h3>

                    {/* แสดงข้อมูลหมวดหมู่ของหนังสือ */}
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-700">
                        <div>
                          <strong>หมวดหมู่:</strong>
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {getCategoryName(selectedBook)}
                          </span>
                        </div>
                        <div>
                          <strong>กลุ่มผู้อ่าน:</strong>
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {selectedBook.reader_group === "children"
                              ? "เด็ก"
                              : selectedBook.reader_group === "education"
                              ? "สถาบันการศึกษา"
                              : "ผู้ใหญ่"}
                          </span>
                        </div>
                        <div>
                          <strong>สถานะโดยรวม:</strong>
                          <span
                            className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(
                              getBookStatus(selectedBook.book_id)
                            )}`}
                          >
                            {getStatusText(getBookStatus(selectedBook.book_id))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedBookCopies.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {selectedBookCopies.map((copy) => (
                          <div
                            key={`copy-${copy.book_copies_id}`}
                            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    copy.status
                                  )}`}
                                >
                                  {getStatusText(copy.status)}
                                </span>
                              </div>

                              <div className="text-sm text-gray-600 space-y-1">
                                <p>📍 ชั้นวาง: {copy.shelf_location}</p>
                                <p>
                                  📚 หมวดหมู่: {getCategoryName(selectedBook)}
                                </p>
                                <p>
                                  👥 กลุ่มผู้อ่าน:{" "}
                                  {selectedBook.reader_group === "children"
                                    ? "เด็ก"
                                    : selectedBook.reader_group === "education"
                                    ? "สถาบันการศึกษา"
                                    : "ผู้ใหญ่"}
                                </p>
                              </div>

                              {copy.status === "available" &&
                                canUserAccessBook(selectedBook) && (
                                  <button
                                    onClick={() =>
                                      handleReservation(
                                        selectedBook.book_id,
                                        copy.book_copies_id
                                      )
                                    }
                                    disabled={reserving === copy.book_copies_id}
                                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                                      reserving === copy.book_copies_id
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-sm"
                                    }`}
                                  >
                                    {reserving === copy.book_copies_id
                                      ? "กำลังจอง..."
                                      : "จองเลย"}
                                  </button>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>ไม่มีข้อมูลสำเนาหนังสือ</p>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
