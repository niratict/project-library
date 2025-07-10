"use client";
import { useEffect, useState, useMemo } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SearchFilter from "@/app/components/SearchFilter";
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/app/components/Toast";
import { useToast } from "@/app/hooks/useToast";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";

interface Staff {
  staff_id: number;
  name: string;
  email: string;
  user_type: string;
  gender?: string;
  date_of_birth?: string;
  citizen_id: string;
  phone?: string;
  address?: string;
  profile_image?: string;
  hire_date?: string;
  status: string;
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

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    staff_id: 0,
    name: "",
    email: "",
    password: "",
    user_type: "librarian",
    gender: "",
    date_of_birth: "",
    citizen_id: "",
    phone: "",
    address: "",
    profile_image: "",
    hire_date: "",
    status: "active",
  });

  // Toast notification hook
  const { toasts, success, error, warning, removeToast } = useToast();

  // State สำหรับ filter
  const [searchFilters, setSearchFilters] = useState({
    searchText: "",
    status: "",
    userType: "",
    hireDateRange: { startDate: "", endDate: "" },
  });

  // State สำหรับ DeleteConfirmModal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    staffId: 0,
    staffName: "",
    isDeleting: false,
  });

  // กำหนดฟิลด์สำหรับ SearchFilter Component
  const filterFields = [
    {
      key: "searchText",
      label: "ค้นหา",
      type: "text" as const,
      placeholder: "ชื่อ, อีเมล, รหัสบัตรประชาชน",
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
      label: "ประเภทพนักงาน",
      type: "select" as const,
      options: [
        { value: "", label: "ทุกประเภท" },
        { value: "librarian", label: "บรรณารักษ์" },
        { value: "admin", label: "ผู้ดูแลระบบ" },
      ],
      gridSpan: 1 as const,
    },
    {
      key: "hireDateRange",
      label: "วันที่เริ่มงาน",
      type: "dateRange" as const,
      gridSpan: 2 as const,
    },
  ];

  // ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลง Filter
  const handleFilterChange = (newFilters: any) => {
    setSearchFilters(newFilters);
  };

  // ฟังก์ชันสำหรับกรองข้อมูลพนักงาน
  const filteredStaff = useMemo(() => {
    return staff.filter((staffMember) => {
      // ค้นหาจากชื่อ, อีเมล, หรือรหัสบัตรประชาชน
      const textMatch =
        !searchFilters.searchText ||
        staffMember.name
          .toLowerCase()
          .includes(searchFilters.searchText.toLowerCase()) ||
        staffMember.email
          .toLowerCase()
          .includes(searchFilters.searchText.toLowerCase()) ||
        staffMember.citizen_id.includes(searchFilters.searchText);

      // กรองตามสถานะ
      let statusMatch = true;
      if (searchFilters.status === "active")
        statusMatch = staffMember.status === "active";
      else if (searchFilters.status === "suspended")
        statusMatch = staffMember.status === "suspended";
      else if (searchFilters.status === "deleted")
        statusMatch = staffMember.status === "deleted";

      // กรองตามประเภทพนักงาน
      const typeMatch =
        !searchFilters.userType ||
        staffMember.user_type === searchFilters.userType;

      // กรองตามช่วงวันที่เริ่มงาน
      let dateMatch = true;
      if (searchFilters.hireDateRange.startDate && staffMember.hire_date) {
        dateMatch =
          staffMember.hire_date >= searchFilters.hireDateRange.startDate;
      }
      if (
        dateMatch &&
        searchFilters.hireDateRange.endDate &&
        staffMember.hire_date
      ) {
        dateMatch =
          staffMember.hire_date <= searchFilters.hireDateRange.endDate;
      }

      return textMatch && statusMatch && typeMatch && dateMatch;
    });
  }, [staff, searchFilters]);

  // ดึงข้อมูลพนักงาน
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      setStaff(data.staff || []);
    } catch (err) {
      console.error("Error fetching staff:", err);
      error("เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน");
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเปิด Modal ยืนยันการลบ
  const handleDeleteClick = (staff: Staff) => {
    setDeleteModal({
      isOpen: true,
      staffId: staff.staff_id,
      staffName: staff.name,
      isDeleting: false,
    });
  };

  // ฟังก์ชันปิด Modal
  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      staffId: 0,
      staffName: "",
      isDeleting: false,
    });
  };

  // ฟังก์ชันยืนยันการลบ
  const handleDeleteConfirm = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
      const res = await fetch(`/api/staff/${deleteModal.staffId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        success("ลบพนักงานสำเร็จ", "ข้อมูลพนักงานถูกลบออกจากระบบแล้ว");
        fetchStaff();
        handleDeleteCancel();
      } else {
        const data = await res.json();
        error("เกิดข้อผิดพลาด", data?.error || "ไม่สามารถลบพนักงานได้");
      }
    } catch {
      error("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // บันทึกข้อมูลพนักงาน
  const saveStaff = async () => {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (
      !form.name ||
      !form.email ||
      (!isEditing && !form.password) ||
      !form.user_type ||
      !form.citizen_id
    ) {
      warning(
        "กรุณากรอกข้อมูลที่จำเป็น (ชื่อ, อีเมล, รหัสผ่าน, ประเภทพนักงาน, รหัสบัตรประชาชน)"
      );
      return;
    }

    // ตรวจสอบรูปแบบรหัสบัตรประชาชน
    if (!/^\d{13}$/.test(form.citizen_id)) {
      warning("รหัสบัตรประชาชนต้องเป็นตัวเลข 13 หลัก");
      return;
    }

    // ตรวจสอบประเภทพนักงาน
    if (!["librarian", "admin"].includes(form.user_type)) {
      warning("ประเภทพนักงานต้องเป็น 'บรรณารักษ์' หรือ 'ผู้ดูแลระบบ'");
      return;
    }

    setLoading(true);
    try {
      const method = isEditing ? "PUT" : "POST";
      const endpoint = isEditing ? `/api/staff/${form.staff_id}` : "/api/staff";

      // เตรียมข้อมูลที่จะส่ง
      const sendData = { ...form };
      if (isEditing && !form.password) {
        delete (sendData as any).password;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendData),
      });

      const data = await res.json();

      if (res.ok) {
        success(
          isEditing ? "แก้ไขข้อมูลพนักงานสำเร็จ" : "เพิ่มพนักงานใหม่สำเร็จ"
        );
        setShowForm(false);
        resetForm();
        fetchStaff();
      } else {
        error(data?.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error("Error saving staff:", err);
      error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // รีเซ็ตฟอร์ม
  const resetForm = () => {
    setForm({
      staff_id: 0,
      name: "",
      email: "",
      password: "",
      user_type: "librarian",
      gender: "",
      date_of_birth: "",
      citizen_id: "",
      phone: "",
      address: "",
      profile_image: "",
      hire_date: "",
      status: "active",
    });
    setIsEditing(false);
  };

  // แก้ไขพนักงาน
  const editStaff = (staffMember: Staff) => {
    setForm({
      staff_id: staffMember.staff_id,
      name: staffMember.name,
      email: staffMember.email,
      password: "",
      user_type: staffMember.user_type,
      gender: staffMember.gender || "",
      date_of_birth: staffMember.date_of_birth || "",
      citizen_id: staffMember.citizen_id,
      phone: staffMember.phone || "",
      address: staffMember.address || "",
      profile_image: staffMember.profile_image || "",
      hire_date: staffMember.hire_date || "",
      status: staffMember.status || "active",
    });
    setIsEditing(true);
    setShowForm(true);
  };

  // เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อ component โหลด
  useEffect(() => {
    fetchStaff();
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
                👥 จัดการพนักงาน
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
                👥 จัดการพนักงาน
              </h1>
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              disabled={loading}
            >
              <span>+</span>
              <span>เพิ่มพนักงานใหม่</span>
            </button>
          </div>
        </div>

        {/* SearchFilter Component */}
        <SearchFilter
          fields={filterFields}
          initialValues={searchFilters}
          onFilterChange={handleFilterChange}
          resultCount={filteredStaff.length}
          className="mb-6"
        />

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-white mt-2">กำลังโหลด...</p>
          </div>
        )}

        {/* ตารางแสดงข้อมูลพนักงาน */}
        <div className="bg-white rounded-xl shadow-md p-6 mt-8 overflow-x-auto">
          <table className="min-w-full table-auto text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center">ลำดับ</th>
                <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                <th className="py-3 px-4">อีเมล</th>
                <th className="py-3 px-4">ประเภทพนักงาน</th>
                <th className="py-3 px-4">เพศ</th>
                <th className="py-3 px-4">วันเกิด</th>
                <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                <th className="py-3 px-4">วันที่เริ่มงาน</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStaff.map((staffMember, index) => (
                <tr
                  key={staffMember.staff_id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-center text-gray-600">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {staffMember.name}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {staffMember.email}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {staffMember.user_type === "librarian"
                      ? "บรรณารักษ์"
                      : "ผู้ดูแลระบบ"}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {staffMember.gender === "male"
                      ? "ชาย"
                      : staffMember.gender === "female"
                      ? "หญิง"
                      : staffMember.gender === "other"
                      ? "อื่นๆ"
                      : "-"}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {staffMember.date_of_birth ? (
                      <div>
                        {formatDateDMY(staffMember.date_of_birth.split("T")[0])}
                        <br />
                        <small className="text-gray-500">
                          ({calculateAge(staffMember.date_of_birth)})
                        </small>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {staffMember.phone || "-"}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {staffMember.hire_date
                      ? formatDateDMY(staffMember.hire_date.split("T")[0])
                      : "-"}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {staffMember.status === "active" ? (
                      <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">
                        ใช้งาน
                      </span>
                    ) : staffMember.status === "suspended" ? (
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
                      onClick={() => editStaff(staffMember)}
                      disabled={loading}
                      className="text-blue-600 hover:underline mx-1 disabled:opacity-50"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteClick(staffMember)}
                      disabled={loading}
                      className="text-red-500 hover:underline mx-1 disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStaff.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              ไม่พบข้อมูลพนักงาน
            </div>
          )}
        </div>

        {/* แสดงจำนวนพนักงานทั้งหมด */}
        <div className="text-sm text-gray-600 bg-white p-3 rounded-lg shadow-sm">
          รวมทั้งหมด {filteredStaff.length} คน
        </div>
      </div>

      {/* Popup เพิ่ม/แก้ไขพนักงาน */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {isEditing ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่าน {!isEditing && "*"}
                </label>
                <input
                  type="password"
                  placeholder={
                    isEditing ? "เว้นว่างไว้หากไม่ต้องการเปลี่ยน" : "รหัสผ่าน"
                  }
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภทพนักงาน *
                </label>
                <select
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.user_type}
                  onChange={(e) =>
                    setForm({ ...form, user_type: e.target.value })
                  }
                >
                  <option value="librarian">บรรณารักษ์</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>

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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เพศ
                </label>
                <select
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">เลือกเพศ</option>
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </select>
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันที่เริ่มงาน
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.hire_date}
                  onChange={(e) =>
                    setForm({ ...form, hire_date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  สถานะ
                </label>
                <select
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">ใช้งาน</option>
                  <option value="suspended">ระงับ</option>
                  <option value="deleted">ลบแล้ว</option>
                </select>
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
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowForm(false)}
                disabled={loading}
                className="text-gray-600 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveStaff}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-md hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "บันทึก"}
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
        title="ยืนยันการลบพนักงาน"
        message="คุณต้องการลบพนักงานนี้ออกจากระบบหรือไม่?"
        itemName={deleteModal.staffName}
        isLoading={deleteModal.isDeleting}
        confirmText="ลบพนักงาน"
        cancelText="ยกเลิก"
      />

      <Footer />
    </div>
  );
}
