"use client";
import { useState, useEffect } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";
import { useToast } from "@/app/hooks/useToast";
import { ToastContainer } from "@/app/components/Toast";

interface Reservation {
  borrow_transactions_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  book_copies_id: number;
  book_title: string;
  author: string;
  isbn: string;
  book_image?: string;
  reservation_date: string;
  expires_at: string;
  status: "active" | "expired";
  hours_left: number;
  minutes_left: number;
  accurate_hours_passed: number;
  accurate_minutes_passed: number;
}

interface ReservationStats {
  total: number;
  active: number;
  expired: number;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<ReservationStats>({
    total: 0,
    active: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Toast hook
  const { toasts, removeToast, success, error: showError } = useToast();

  // ดึง user_id จาก localStorage
  const getCurrentUserId = () => {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        window.location.href = "/login";
        return null;
      }
      return userId;
    }
    return null;
  };

  const fetchReservations = async (page: number = 1) => {
    try {
      setLoading(true);
      const userId = getCurrentUserId();

      if (!userId) {
        setError("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        return;
      }

      const url = `/api/reservations?user_id=${userId}&page=${page}&limit=10`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setReservations(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);

        // คำนวณสถิติ
        const reservationData = data.data || [];
        const newStats = {
          total: data.pagination?.total || 0,
          active: reservationData.filter(
            (reservation: Reservation) => reservation.status === "active"
          ).length,
          expired: reservationData.filter(
            (reservation: Reservation) => reservation.status === "expired"
          ).length,
        };
        setStats(newStats);
      } else {
        if (response.status === 401) {
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

  const handleCancelReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const confirmCancelReservation = async () => {
    if (!selectedReservation) return;

    try {
      setIsDeleting(true);
      const userId = getCurrentUserId();
      if (!userId) return;

      const response = await fetch(
        `/api/reservations?id=${selectedReservation.borrow_transactions_id}&user_id=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setIsModalOpen(false);
        setSelectedReservation(null);

        // แสดง success toast
        success(
          "ยกเลิกการจองสำเร็จ",
          `ยกเลิกการจองหนังสือ "${selectedReservation.book_title}" เรียบร้อยแล้ว`,
          4000
        );

        // รีเฟรชข้อมูล
        fetchReservations(currentPage);
      } else {
        // แสดง error toast
        showError(
          "เกิดข้อผิดพลาด",
          data.error || "ไม่สามารถยกเลิกการจองได้ กรุณาลองใหม่อีกครั้ง"
        );
      }
    } catch (err) {
      // แสดง error toast
      showError(
        "เกิดข้อผิดพลาด",
        "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const closeModal = () => {
    if (!isDeleting) {
      setIsModalOpen(false);
      setSelectedReservation(null);
    }
  };

  useEffect(() => {
    fetchReservations(currentPage);
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatTimeLeft = (hours: number, minutes: number) => {
    if (hours <= 0 && minutes <= 0) {
      return "หมดเวลา";
    }
    return `${hours} ชั่วโมง ${minutes} นาที`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "expired":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "ใช้งานได้";
      case "expired":
        return "หมดอายุ";
      default:
        return "ไม่ทราบสถานะ";
    }
  };

  const getUrgencyColor = (hoursLeft: number, minutesLeft: number) => {
    const totalMinutesLeft = hoursLeft * 60 + minutesLeft;
    if (totalMinutesLeft <= 0) return "text-red-600";
    if (totalMinutesLeft <= 120) return "text-red-500"; // น้อยกว่า 2 ชั่วโมง
    if (totalMinutesLeft <= 360) return "text-orange-500"; // น้อยกว่า 6 ชั่วโมง
    return "text-green-600";
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
                onClick={() => fetchReservations(currentPage)}
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
              รายการจองหนังสือ
            </h1>
            <p className="text-gray-600">ตรวจสอบสถานะการจองหนังสือของคุณ</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/20 p-6 text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl mb-3">📋</div>
              <h2 className="text-3xl font-bold text-gray-800">
                {stats.total}
              </h2>
              <p className="text-gray-500 font-medium">รวมการจองทั้งหมด</p>
            </div>
            <div className="bg-white rounded-2xl shadow-xl shadow-green-500/20 p-6 text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-3xl font-bold text-green-600">
                {stats.active}
              </h2>
              <p className="text-gray-500 font-medium">การจองที่ใช้งานได้</p>
            </div>
            <div className="bg-white rounded-2xl shadow-xl shadow-red-500/20 p-6 text-center transform hover:scale-105 transition-all duration-300">
              <div className="text-5xl mb-3">⏰</div>
              <h2 className="text-3xl font-bold text-red-500">
                {stats.expired}
              </h2>
              <p className="text-gray-500 font-medium">การจองที่หมดอายุ</p>
            </div>
          </div>

          {/* Reservations Table */}
          <div className="bg-white rounded-2xl shadow-2xl shadow-pink-500/30 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <span className="mr-3">📚</span>
                รายการจองหนังสือ
              </h2>
            </div>

            {reservations.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📖</div>
                <p className="text-gray-500 text-lg">ไม่มีรายการจองหนังสือ</p>
                <p className="text-gray-400 text-sm mt-2">
                  คุณยังไม่ได้จองหนังสือเล่มใดไว้
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ลำดับ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ชื่อหนังสือ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่จอง
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        หมดอายุ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        เวลาที่เหลือ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        การจัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reservations.map((reservation, index) => (
                      <tr
                        key={reservation.borrow_transactions_id}
                        className={`hover:bg-gray-50 transition-colors ${
                          reservation.status === "expired" ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {(currentPage - 1) * 10 + index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          <div className="flex items-center">
                            {reservation.book_image && (
                              <img
                                src={reservation.book_image}
                                alt={reservation.book_title}
                                className="w-8 h-10 object-cover rounded mr-3"
                              />
                            )}
                            <div>
                              <div className="max-w-xs truncate font-semibold">
                                {reservation.book_title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {reservation.author}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(reservation.reservation_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(reservation.expires_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div
                            className={`font-semibold ${getUrgencyColor(
                              reservation.hours_left,
                              reservation.minutes_left
                            )}`}
                          >
                            {formatTimeLeft(
                              reservation.hours_left,
                              reservation.minutes_left
                            )}
                          </div>
                          {reservation.status === "active" &&
                            reservation.hours_left <= 2 && (
                              <div className="text-xs text-red-500 mt-1">
                                🔔 ใกล้หมดเวลา!
                              </div>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(
                              reservation.status
                            )}`}
                          >
                            {getStatusText(reservation.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {reservation.status === "active" ? (
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() =>
                                  handleCancelReservation(reservation)
                                }
                                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs"
                              >
                                ยกเลิก
                              </button>
                              <div className="text-xs text-gray-500">
                                มารับภายใน 24 ชม.
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              การจองหมดอายุแล้ว
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Important Notice */}
          <div className="bg-gradient-to-r from-orange-100 to-red-100 border-l-4 border-orange-500 p-6 rounded-lg mb-8">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-orange-800">
                  ข้อควรระวัง
                </h3>
                <p className="text-orange-700 mt-1">
                  การจองหนังสือจะมีอายุ 24 ชั่วโมง
                  กรุณามารับหนังสือที่ห้องสมุดก่อนหมดเวลา
                  หากไม่มารับการจองจะถูกยกเลิกโดยอัตโนมัติ
                </p>
              </div>
            </div>
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

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmCancelReservation}
        title="ยืนยันการยกเลิกการจอง"
        message="คุณต้องการยกเลิกการจองหนังสือนี้หรือไม่?"
        itemName={selectedReservation?.book_title}
        isLoading={isDeleting}
        confirmText="ยกเลิกการจอง"
        cancelText="ไม่ยกเลิก"
      />
    </div>
  );
}
