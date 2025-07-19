"use client";
import { useEffect, useState, useMemo } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SearchFilter from "@/app/components/SearchFilter"; // import Component ที่สร้างขึ้น
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/app/components/Toast";
import { useToast } from "@/app/hooks/useToast";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";
import CustomDropdown from "@/app/components/CustomDropdown";

interface User {
  user_id: number;
  name: string;
  email: string;
  user_type: string;
  gender?: string;
  date_of_birth?: string;
  citizen_id: string;
  phone?: string;
  address?: string;
  profile_image?: string;
  status: string; // active, suspended, deleted
  created_at?: string;
  updated_at?: string;
}

function calculateAge(dateString: string): string {
  const birthDate = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return isNaN(age) ? "-" : `${age} ปี`;
}

function formatDateDMY(dateStr: string) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    user_id: 0,
    name: "",
    email: "",
    password: "",
    user_type: "citizen",
    gender: "",
    date_of_birth: "",
    citizen_id: "",
    phone: "",
    address: "",
    profile_image: "",
    status: "active",
  });

  // เพิ่ม state สำหรับ Modal ยืนยันการลบ
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    userId: 0,
    userName: "",
    isDeleting: false,
  });

  // Toast notification hook
  const { toasts, success, error, warning, removeToast } = useToast();

  // --- ใช้ state แบบง่ายสำหรับเก็บค่า filter ---
  const [searchFilters, setSearchFilters] = useState({
    searchText: "",
    status: "",
    userType: "",
    registerDateRange: { startDate: "", endDate: "" },
  });

  // --- กำหนดฟิลด์สำหรับ SearchFilter Component ---
  const filterFields = [
    {
      key: "searchText",
      label: "ค้นหา",
      type: "text" as const,
      placeholder: "ชื่อ, อีเมล",
      gridSpan: 1 as const,
    },
    {
      key: "status",
      label: "สถานะ",
      type: "select" as const,
      options: [
        { value: "", label: "ทุกสถานะ" },
        { value: "active", label: "ใช้งาน" },
        { value: "suspended", label: "ระงับ" },
        { value: "deleted", label: "ลบแล้ว" },
      ],
      gridSpan: 1 as const,
    },
    {
      key: "userType",
      label: "ประเภทสมาชิก",
      type: "select" as const,
      options: [
        { value: "", label: "ทุกประเภท" },
        { value: "citizen", label: "ทั่วไป" },
        { value: "educational", label: "สถานศึกษา" },
        { value: "librarian", label: "บรรณารักษ์" },
        { value: "admin", label: "ผู้ดูแล" },
      ],
      gridSpan: 1 as const,
    },
    {
      key: "registerDateRange",
      label: "วันที่สมัคร",
      type: "dateRange" as const,
      gridSpan: 2 as const, // ให้ช่วงวันที่ใช้พื้นที่ 2 คอลัมน์
    },
  ];

  // --- ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลง Filter ---
  const handleFilterChange = (newFilters: any) => {
    setSearchFilters(newFilters);
  };

  // --- ฟังก์ชันสำหรับกรองข้อมูลผู้ใช้ ---
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // ค้นหาจากชื่อหรืออีเมล
      const textMatch =
        !searchFilters.searchText ||
        user.name
          .toLowerCase()
          .includes(searchFilters.searchText.toLowerCase()) ||
        user.email
          .toLowerCase()
          .includes(searchFilters.searchText.toLowerCase());

      // กรองตามสถานะ
      let statusMatch = true;
      if (searchFilters.status === "active")
        statusMatch = user.status === "active";
      else if (searchFilters.status === "suspended")
        statusMatch = user.status === "suspended";
      else if (searchFilters.status === "deleted")
        statusMatch = user.status === "deleted";

      // กรองตามประเภทผู้ใช้
      const typeMatch =
        !searchFilters.userType || user.user_type === searchFilters.userType;

      // กรองตามช่วงวันที่สมัคร
      let dateMatch = true;
      if (searchFilters.registerDateRange.startDate && user.created_at) {
        dateMatch =
          user.created_at >= searchFilters.registerDateRange.startDate;
      }
      if (
        dateMatch &&
        searchFilters.registerDateRange.endDate &&
        user.created_at
      ) {
        dateMatch = user.created_at <= searchFilters.registerDateRange.endDate;
      }

      return textMatch && statusMatch && typeMatch && dateMatch;
    });
  }, [users, searchFilters]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันเปิด Modal ยืนยันการลบ
  const handleDeleteClick = (user: User) => {
    setDeleteModal({
      isOpen: true,
      userId: user.user_id,
      userName: user.name,
      isDeleting: false,
    });
  };

  // ฟังก์ชันปิด Modal
  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      userId: 0,
      userName: "",
      isDeleting: false,
    });
  };

  // ฟังก์ชันยืนยันการลบ
  const handleDeleteConfirm = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));

      const res = await fetch(`/api/users/${deleteModal.userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        success("ลบผู้ใช้สำเร็จ", "ข้อมูลผู้ใช้ถูกลบออกจากระบบแล้ว");
        fetchUsers();
        handleDeleteCancel(); // ปิด Modal
      } else {
        const data = await res.json();
        error("เกิดข้อผิดพลาด", data?.error || "ไม่สามารถลบผู้ใช้ได้");
      }
    } catch (err) {
      error("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const deleteUser = async (user: User) => {
    // เปิด Modal แทนการใช้ confirm()
    setDeleteModal({
      isOpen: true,
      userId: user.user_id,
      userName: user.name,
      isDeleting: false,
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      error("ข้อมูลไม่ครบ", "กรุณากรอกชื่อ-นามสกุล");
      return false;
    }

    if (!form.email.trim()) {
      error("ข้อมูลไม่ครบ", "กรุณากรอกอีเมล");
      return false;
    }

    if (!isEditing && !form.password.trim()) {
      error("ข้อมูลไม่ครบ", "กรุณากรอกรหัสผ่าน");
      return false;
    }

    if (!form.citizen_id.trim()) {
      error("ข้อมูลไม่ครบ", "กรุณากรอกรหัสบัตรประชาชน");
      return false;
    }

    if (!/^\d{13}$/.test(form.citizen_id)) {
      error("ข้อมูลไม่ถูกต้อง", "รหัสบัตรประชาชนต้องเป็นตัวเลข 13 หลัก");
      return false;
    }

    if (!["citizen", "educational"].includes(form.user_type)) {
      error(
        "ข้อมูลไม่ถูกต้อง",
        "ประเภทสมาชิกต้องเป็น 'ทั่วไป' หรือ 'สถานศึกษา'"
      );
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      error("ข้อมูลไม่ถูกต้อง", "รูปแบบอีเมลไม่ถูกต้อง");
      return false;
    }

    if (form.phone && !/^[0-9]{10}$/.test(form.phone.replace(/[-\s]/g, ""))) {
      warning("ข้อมูลไม่ถูกต้อง", "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก");
      return false;
    }

    return true;
  };

  const saveUser = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const method = isEditing ? "PUT" : "POST";
      const endpoint = isEditing ? `/api/users/${form.user_id}` : "/api/users";
      const sendData = { ...form };

      if (isEditing) {
        delete (sendData as Record<string, unknown>).password;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendData),
      });

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("ไม่ใช่ JSON:", text);
        error("เกิดข้อผิดพลาด", "เซิร์ฟเวอร์ตอบกลับข้อมูลไม่ถูกต้อง");
        return;
      }

      if (res.ok) {
        success(
          isEditing ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มผู้ใช้สำเร็จ",
          isEditing
            ? "ข้อมูลผู้ใช้ถูกอัพเดตแล้ว"
            : "ผู้ใช้ใหม่ถูกเพิ่มเข้าระบบแล้ว"
        );
        setShowForm(false);
        setForm({
          user_id: 0,
          name: "",
          email: "",
          password: "",
          user_type: "citizen",
          gender: "",
          date_of_birth: "",
          citizen_id: "",
          phone: "",
          address: "",
          profile_image: "",
          status: "active",
        });
        fetchUsers();
      } else {
        error("เกิดข้อผิดพลาด", data?.error || "ไม่สามารถบันทึกข้อมูลได้");
      }
    } catch (err) {
      error("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  const editUser = (user: User) => {
    setForm({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      password: "",
      user_type: user.user_type,
      gender: user.gender || "",
      date_of_birth: user.date_of_birth || "",
      citizen_id: user.citizen_id,
      phone: user.phone || "",
      address: user.address || "",
      profile_image: user.profile_image || "",
      status: user.status || "active",
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setForm({
      user_id: 0,
      name: "",
      email: "",
      password: "",
      user_type: "citizen",
      gender: "",
      date_of_birth: "",
      citizen_id: "",
      phone: "",
      address: "",
      profile_image: "",
      status: "active",
    });
    setIsEditing(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const router = useRouter();

  // ฟังก์ชันรีเซ็ตฟอร์ม
  const resetForm = () => {
    setForm({
      user_id: 0,
      name: "",
      email: "",
      password: "",
      user_type: "citizen",
      gender: "",
      date_of_birth: "",
      citizen_id: "",
      phone: "",
      address: "",
      profile_image: "",
      status: "active",
    });
    setIsEditing(false);
  };

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
                👤 จัดการผู้ใช้
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
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-3 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 disabled:opacity-50 text-sm font-medium flex items-center gap-1"
                disabled={isLoading}
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
                👤 จัดการผู้ใช้
              </h1>
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              disabled={isLoading}
            >
              <span>+</span>
              <span>เพิ่มผู้ใช้ใหม่</span>
            </button>
          </div>
        </div>

        {/* ใช้ SearchFilter Component แทนส่วน Search & Filter เดิม */}
        <SearchFilter
          fields={filterFields}
          initialValues={searchFilters}
          onFilterChange={handleFilterChange}
          resultCount={filteredUsers.length}
          className="mb-6 shadow-xl shadow-cyan-400"
        />

        {/* ตารางแสดงข้อมูลผู้ใช้ */}
        <div className="bg-white rounded-xl p-6 mt-8 overflow-x-aut shadow-xl shadow-cyan-400">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-2 text-gray-600">กำลังโหลด...</span>
            </div>
          ) : (
            <table className="min-w-full table-auto text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-center">ลำดับ</th>
                  <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                  <th className="py-3 px-4">อีเมล</th>
                  <th className="py-3 px-4">วันเกิด</th>
                  <th className="py-3 px-4">ประเภทสมาชิก</th>
                  <th className="py-3 px-4">เพศ</th>
                  <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                  <th className="py-3 px-4">วันที่สมัคร</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user, index) => (
                  <tr key={user.user_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-center text-gray-600">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{user.email}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {user.date_of_birth
                        ? calculateAge(user.date_of_birth)
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {user.user_type === "citizen"
                        ? "ทั่วไป"
                        : user.user_type === "librarian"
                        ? "บรรณารักษ์"
                        : user.user_type === "admin"
                        ? "ผู้ดูแล"
                        : user.user_type === "educational"
                        ? "สถานศึกษา"
                        : "ไม่ทราบ"}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {user.gender || "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {user.phone || "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {user.created_at
                        ? formatDateDMY(user.created_at.split("T")[0])
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {user.status === "active" ? (
                        <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">
                          ใช้งาน
                        </span>
                      ) : user.status === "suspended" ? (
                        <span className="text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs">
                          ระงับ
                        </span>
                      ) : (
                        <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs">
                          ลบแล้ว
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => editUser(user)}
                        className="text-blue-600 hover:underline mx-1 disabled:opacity-50"
                        disabled={isLoading}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteUser(user)} // ส่ง user object แทน user_id
                        className="text-red-500 hover:underline mx-1 disabled:opacity-50"
                        disabled={isLoading}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* แสดงจำนวนผู้ใช้ทั้งหมด */}
        <div className="text-sm text-gray-600 bg-white p-3 rounded-lg shadow-sm">
          รวมทั้งหมด {filteredUsers.length} คน
        </div>
      </div>

      {/* Popup เพิ่ม/แก้ไขผู้ใช้ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {isEditing ? "แก้ไขข้อมูลผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมล *
                </label>
                <input
                  type="email"
                  placeholder="อีเมล"
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสผ่าน *
                  </label>
                  <input
                    type="password"
                    placeholder="รหัสผ่าน"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสบัตรประชาชน *
                </label>
                <input
                  type="text"
                  placeholder="รหัสบัตรประชาชน 13 หลัก"
                  maxLength={13}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.citizen_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      citizen_id: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภทผู้ใช้ *
                </label>
                <CustomDropdown
                  options={[
                    { value: "citizen", label: "ทั่วไป" },
                    { value: "educational", label: "สถานศึกษา" },
                  ]}
                  value={form.user_type}
                  onChange={(value) => setForm({ ...form, user_type: value })}
                  placeholder="เลือกประเภทผู้ใช้"
                  disabled={isLoading}
                  zIndex={1001}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เพศ
                </label>
                <CustomDropdown
                  options={[
                    { value: "male", label: "ชาย" },
                    { value: "female", label: "หญิง" },
                    { value: "other", label: "อื่นๆ" },
                  ]}
                  value={form.gender}
                  onChange={(value) => setForm({ ...form, gender: value })}
                  placeholder="เลือกเพศ"
                  disabled={isLoading}
                  zIndex={1001}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันเกิด
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.date_of_birth}
                  onChange={(e) =>
                    setForm({ ...form, date_of_birth: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  placeholder="เบอร์โทรศัพท์"
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ที่อยู่
                </label>
                <textarea
                  placeholder="ที่อยู่"
                  rows={3}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleCloseForm}
                disabled={isLoading}
                className="text-gray-600 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveUser}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-md hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึก"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="ยืนยันการลบผู้ใช้"
        message="คุณต้องการลบผู้ใช้นี้ออกจากระบบหรือไม่?"
        itemName={deleteModal.userName}
        isLoading={deleteModal.isDeleting}
        confirmText="ลบผู้ใช้"
        cancelText="ยกเลิก"
      />

      <Footer />
    </div>
  );
}
