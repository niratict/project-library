"use client";
import { useState, useEffect, useRef } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import {
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Save,
  Upload,
  X,
} from "lucide-react";

interface ProfileData {
  user_id: number;
  editable: {
    name: string;
    email: string;
    phone: string;
    address: string;
    profile_image: string;
    date_of_birth: string;
  };
  readonly: {
    user_type: string;
    gender: string;
    citizen_id: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

export default function ProfileUserPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Load profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        // ดึง user_id จาก localStorage
        const userIdFromStorage = localStorage.getItem("user_id");
        const currentUserId = userIdFromStorage
          ? parseInt(userIdFromStorage)
          : null;

        if (!currentUserId) {
          throw new Error("ไม่พบข้อมูล user_id กรุณาเข้าสู่ระบบใหม่");
        }

        setUserId(currentUserId);

        // เรียก API พร้อมส่ง user_id
        const response = await fetch(
          `/api/users/profile?user_id=${currentUserId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
        }

        const data = await response.json();
        setProfile(data);

        // Set form data
        setFormData({
          name: data.editable.name || "",
          email: data.editable.email || "",
          phone: data.editable.phone || "",
          address: data.editable.address || "",
          date_of_birth: data.editable.date_of_birth
            ? data.editable.date_of_birth.split("T")[0]
            : "",
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!userId) {
      setError("ไม่พบข้อมูล user_id");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("ขนาดไฟล์ต้องไม่เกิน 5MB");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formDataToSend = new FormData();
      formDataToSend.append("user_id", userId.toString());
      formDataToSend.append("profile_image", file);

      const response = await fetch("/api/users/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ไม่สามารถอัปโหลดรูปภาพได้");
      }

      const data = await response.json();

      // Update profile with new image
      if (profile) {
        setProfile({
          ...profile,
          editable: {
            ...profile.editable,
            profile_image: data.profile_image,
          },
        });
      }

      setSuccess("อัปโหลดรูปโปรไฟล์สำเร็จ");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error uploading image:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setError("ไม่พบข้อมูล user_id");
      return;
    }

    // Validate passwords if changing
    if (formData.new_password) {
      if (!formData.current_password) {
        setError("กรุณาระบุรหัสผ่านปัจจุบัน");
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        setError("รหัสผ่านใหม่ไม่ตรงกัน");
        return;
      }
      if (formData.new_password.length < 6) {
        setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");

      const updateData = {
        user_id: userId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        date_of_birth: formData.date_of_birth || null,
        profile_image: profile?.editable.profile_image || null,
      };

      // Add password fields if changing password
      if (formData.new_password) {
        Object.assign(updateData, {
          current_password: formData.current_password,
          new_password: formData.new_password,
        });
      }

      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ไม่สามารถอัปเดตโปรไฟล์ได้");
      }

      setSuccess("อัปเดตโปรไฟล์สำเร็จ");
      setShowPasswordChange(false);
      setFormData((prev) => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));

      // Refresh profile data
      window.location.reload();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์"
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "ไม่ระบุ";
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case "customer":
        return "ลูกค้า";
      case "admin":
        return "ผู้ดูแลระบบ";
      default:
        return type;
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case "male":
        return "ชาย";
      case "female":
        return "หญิง";
      case "other":
        return "อื่นๆ";
      default:
        return gender;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "ใช้งาน";
      case "inactive":
        return "ไม่ใช้งาน";
      case "banned":
        return "ถูกระงับ";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="bg-[#f0fbff] min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 bg-gray-300 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-48"></div>
                    <div className="h-4 bg-gray-300 rounded w-32"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="bg-[#f0fbff] min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                ไม่พบข้อมูลโปรไฟล์
              </h1>
              <p className="text-gray-600">กรุณาเข้าสู่ระบบใหม่</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      <main className="bg-[#f0fbff] min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <h1 className="text-2xl font-bold text-white">โปรไฟล์ของฉัน</h1>
              <p className="text-blue-100 mt-2">
                จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี
              </p>
            </div>

            {/* Alert Messages */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-6 mt-4 rounded relative">
                <span className="block sm:inline">{error}</span>
                <button
                  onClick={() => setError("")}
                  className="absolute top-0 bottom-0 right-0 px-4 py-3"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 mx-6 mt-4 rounded relative">
                <span className="block sm:inline">{success}</span>
                <button
                  onClick={() => setSuccess("")}
                  className="absolute top-0 bottom-0 right-0 px-4 py-3"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            <div className="p-6">
              {/* Profile Image Section */}
              <div className="flex items-center space-x-6 mb-8">
                <div className="relative">
                  <img
                    src={
                      profile.editable.profile_image || "/default-avatar.png"
                    }
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-200"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {uploading ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Camera size={16} />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {profile.editable.name}
                  </h2>
                  <p className="text-gray-600">{profile.editable.email}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {getUserTypeLabel(profile.readonly.user_type)} •{" "}
                    {getStatusLabel(profile.readonly.status)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Editable Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User size={16} className="inline mr-1" />
                        ชื่อ-นามสกุล *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail size={16} className="inline mr-1" />
                        อีเมล *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone size={16} className="inline mr-1" />
                        เบอร์โทรศัพท์
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        pattern="[0-9]{10}"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar size={16} className="inline mr-1" />
                        วันเกิด
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin size={16} className="inline mr-1" />
                        ที่อยู่
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Readonly Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        เลขบัตรประชาชน
                      </label>
                      <input
                        type="text"
                        value={profile.readonly.citizen_id}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        เพศ
                      </label>
                      <input
                        type="text"
                        value={getGenderLabel(profile.readonly.gender)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ประเภทผู้ใช้
                      </label>
                      <input
                        type="text"
                        value={getUserTypeLabel(profile.readonly.user_type)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        สถานะ
                      </label>
                      <input
                        type="text"
                        value={getStatusLabel(profile.readonly.status)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        วันที่สมัครสมาชิก
                      </label>
                      <input
                        type="text"
                        value={formatDate(profile.readonly.created_at)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        อัปเดตล่าสุด
                      </label>
                      <input
                        type="text"
                        value={formatDate(profile.readonly.updated_at)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Change Section */}
                <div className="mt-8 border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      เปลี่ยนรหัสผ่าน
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {showPasswordChange ? "ยกเลิก" : "เปลี่ยนรหัสผ่าน"}
                    </button>
                  </div>

                  {showPasswordChange && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Lock size={16} className="inline mr-1" />
                          รหัสผ่านปัจจุบัน
                        </label>
                        <input
                          type="password"
                          name="current_password"
                          value={formData.current_password}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Lock size={16} className="inline mr-1" />
                          รหัสผ่านใหม่
                        </label>
                        <input
                          type="password"
                          name="new_password"
                          value={formData.new_password}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Lock size={16} className="inline mr-1" />
                          ยืนยันรหัสผ่านใหม่
                        </label>
                        <input
                          type="password"
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {saving ? (
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : (
                      <Save size={20} className="mr-2" />
                    )}
                    {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
