"use client";
import { useState, useEffect } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import Banner from "@/app/components/Banner";

interface Book {
  book_id: number;
  title: string;
  author: string;
  isbn: string;
  categorie_id: number;
  description: string;
  publish_year: number;
  publisher: string;
  language: string;
  book_image: string;
  book_limit: number;
  reader_group: string;
  status: string;
  created_at: string;
  category_name: string;
}

export default function DashboardPage() {
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopularBooks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/bookmanagement");

        if (!response.ok) {
          throw new Error("ไม่สามารถดึงข้อมูลหนังสือได้");
        }

        const books = await response.json();

        // จำลองการจัดเรียงตามความนิยม (ใช้ book_id หรือ created_at)
        const sortedBooks = books
          .filter((book: Book) => book.status === "active")
          .sort(
            (a: Book, b: Book) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 6); // แสดงเฉพาะ 6 เล่มที่ได้รับความนิยม

        setPopularBooks(sortedBooks);
      } catch (err) {
        console.error("Error fetching books:", err);
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularBooks();
  }, []);

  const getDefaultImage = (readerGroup: string) => {
    switch (readerGroup) {
      case "children":
        return "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80";
      case "education":
        return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80";
      default:
        return "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80";
    }
  };

  const getReaderGroupIcon = (readerGroup: string) => {
    switch (readerGroup) {
      case "children":
        return "👶";
      case "adult":
        return "👨‍💼";
      case "education":
        return "🎓";
      default:
        return "📚";
    }
  };

  const getLanguageFlag = (language: string) => {
    switch (language) {
      case "Thai":
        return "🇹🇭";
      case "English":
        return "🇺🇸";
      case "Chinese":
        return "🇨🇳";
      default:
        return "🌐";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      <main className="min-h-screen p-8 font-sans">
        <div className="max-w-7xl mx-auto">
          {/* Animated Banner */}
          <div className="transform transition-all duration-500">
            <Banner />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-400 transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold opacity-90">
                    หนังสือทั้งหมด
                  </h3>
                  <p className="text-3xl font-bold mt-2">
                    {popularBooks.length}
                  </p>
                </div>
                <div className="text-5xl opacity-70">📚</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-6 rounded-2xl text-white shadow-xl shadow-pink-400 transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold opacity-90">
                    หนังสือใหม่
                  </h3>
                  <p className="text-3xl font-bold mt-2">
                    {
                      popularBooks.filter(
                        (book) =>
                          new Date(book.created_at) >
                          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length
                    }
                  </p>
                </div>
                <div className="text-5xl opacity-70">✨</div>
              </div>
            </div>
          </div>

          {/* หนังสือยอดนิยม */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-pink-400 p-8 mt-8 border border-white/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                🔥 หนังสือยอดนิยม
              </h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-ping"></div>
                <span className="text-sm text-gray-600">อัพเดตล่าสุด</span>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-gradient-to-tr from-green-200 to-green-300 p-[2px] rounded-xl">
                      <div className="bg-white rounded-[10px] overflow-hidden">
                        <div className="w-full h-48 bg-gray-300"></div>
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                          <div className="h-3 bg-gray-300 rounded w-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">😔</div>
                <p className="text-red-500 text-lg font-semibold mb-2">
                  เกิดข้อผิดพลาด
                </p>
                <p className="text-gray-600">{error}</p>
              </div>
            ) : popularBooks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-gray-500 text-lg">ยังไม่มีหนังสือในระบบ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularBooks.map((book, index) => (
                  <div
                    key={book.book_id}
                    className="group relative bg-gradient-to-tr from-pink-500 to-purple-500 p-[2px] rounded-xl transform transition-all duration-500 hover:scale-105 hover:-rotate-1"
                  >
                    <div className="absolute -top-2 -left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-10">
                      #{index + 1}
                    </div>

                    <div className="bg-white rounded-[10px] overflow-hidden shadow-sm flex flex-col h-full group-hover:shadow-xl hover:shadow-purple-400 transition-shadow duration-300">
                      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden relative">
                        <img
                          src={
                            book.book_image ||
                            getDefaultImage(book.reader_group)
                          }
                          alt={book.title}
                          className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                          {getLanguageFlag(book.language)}
                        </div>
                      </div>

                      <div className="p-4 text-sm flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-2 py-1 rounded-full">
                            {book.category_name}
                          </span>
                          <span className="text-lg" title={book.reader_group}>
                            {getReaderGroupIcon(book.reader_group)}
                          </span>
                        </div>

                        <h3 className="font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition-colors line-clamp-2">
                          {book.title}
                        </h3>

                        <p className="text-gray-500 text-xs mb-2 flex items-center">
                          <span className="mr-1">✍️</span>
                          {book.author}
                        </p>

                        {book.publisher && (
                          <p className="text-gray-500 text-xs mb-2 flex items-center">
                            <span className="mr-1">🏢</span>
                            {book.publisher}
                          </p>
                        )}

                        {book.publish_year && (
                          <p className="text-gray-500 text-xs mb-2 flex items-center">
                            <span className="mr-1">📅</span>
                            {book.publish_year}
                          </p>
                        )}

                        <p className="text-gray-600 text-xs line-clamp-3 flex-1 mb-3">
                          {book.description}
                        </p>

                        <div className="flex items-center justify-between text-xs">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            📚 {book.book_limit} เล่ม
                          </span>
                          <span className="text-gray-500">
                            ISBN: {book.isbn}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
