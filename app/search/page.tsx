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

  // Reservation states
  const [reserving, setReserving] = useState<number | null>(null);
  const [reservationMessage, setReservationMessage] = useState<string | null>(
    null
  );

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
  }, []);

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
      const response = await fetch("/api/bookcopies");
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

        // Auto hide message after 2 seconds
        setTimeout(() => {
          setReservationMessage(null);
        }, 2000);
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

  const filteredBooks = books.filter((book) => {
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
        return "ไม่ทราบสถานะ";
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

  // ลบฟังก์ชัน getUniqueCategories เก่า และใช้ categories จาก API แทน

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
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
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
              {/* ใช้ categories จาก API แทน */}
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
          <p className="text-sm text-gray-600 mb-3">
            พบ {filteredBooks.length} รายการ
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => {
              const bookStatus = getBookStatus(book.book_id);
              const userCanAccess = canUserAccessBook(book);

              return (
                <div
                  key={`book-${book.book_id}`}
                  className={`rounded-2xl overflow-hidden shadow-lg bg-white border border-white hover:shadow-4xl hover:shadow-pink-500 transition duration-300 ${
                    !userCanAccess ? "opacity-60" : ""
                  }`}
                >
                  <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-400 text-4xl">
                    {book.book_image_full_url || book.book_image ? (
                      <img
                        src={book.book_image_full_url || book.book_image}
                        alt={book.title}
                        className="object-cover h-full w-full"
                        onError={(e) => {
                          // ถ้าโหลดรูปไม่ได้ให้แสดงไอคอน
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.parentElement!.innerHTML =
                            '<span class="text-4xl">📚</span>';
                        }}
                      />
                    ) : (
                      <span>📚</span>
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800">
                        {book.title}
                      </h3>
                    </div>

                    <p className="text-gray-500 text-sm">👤 {book.author}</p>
                    <p className="text-gray-500 text-sm">ISBN: {book.isbn}</p>

                    {!userCanAccess && (
                      <p className="text-red-500 text-xs">
                        {book.reader_group === "children"
                          ? "สำหรับสมาชิกประชาชนทั่วไปเท่านั้น"
                          : "สำหรับสมาชิกสถาบันการศึกษาเท่านั้น"}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm pt-2 mt-4">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {getCategoryName(book)}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(
                            bookStatus
                          )}`}
                        >
                          {getStatusText(bookStatus)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleBookSelect(book)}
                        className="bg-gradient-to-r from-blue-500 to-blue-200 text-white shadow px-8 py-2 rounded-full hover:from-purple-300 hover:to-pink-200 transition-colors duration-300"
                      >
                        รายละเอียด
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                        // ถ้าโหลดรูปไม่ได้ให้แสดงไอคอน
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
                      <strong>กลุ่มผู้อ่าน:</strong> {selectedBook.reader_group}
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
                            {selectedBook.reader_group}
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
                                <span className="font-semibold text-gray-800">
                                  รหัสสำเนา {copy.book_copies_id}
                                </span>
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
                                  👥 กลุ่มผู้อ่าน: {selectedBook.reader_group}
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
