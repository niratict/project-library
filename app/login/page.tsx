"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

type MyJwtPayload = {
  user_type: string;
  email: string;
  user_id: number;
  iat: number;
  exp: number;
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        // เก็บ token ใน localStorage
        localStorage.setItem("token", data.token);

        // decode token เพื่อเอา user_id
        const decoded = jwtDecode<MyJwtPayload>(data.token);

        // เก็บ user_id ใน localStorage
        localStorage.setItem("user_id", decoded.user_id.toString());

        setMessage("เข้าสู่ระบบสำเร็จ");

        const role = decoded.user_type;

        if (role === "admin" || role === "librarian") {
          router.push("/admindashboard");
        } else if (role === "citizen" || role === "educational") {
          router.push("/dashboard");
        } else {
          setMessage("ไม่พบหน้าที่เหมาะสมสำหรับผู้ใช้ประเภทนี้");
        }
      } else {
        setMessage(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg flex flex-col md:flex-row overflow-hidden">
        {/* ซ้าย: ฟอร์ม login */}
        <div className="md:w-1/2 p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
            ระบบลงชื่อเข้าใช้
          </h2>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="flex items-center border border-gray-900 rounded px-3 py-4">
              <span className="mr-2">👤</span>
              <input
                type="email"
                placeholder="อีเมล"
                className="w-full focus:outline-none"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="flex items-center border border-gray-900 rounded px-3 py-4">
              <span className="mr-2">🔒</span>
              <input
                type="password"
                placeholder="รหัสผ่าน"
                className="w-full focus:outline-none"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-5 rounded-full"
            >
              ลงชื่อเข้าใช้
            </button>
          </form>
          {message && (
            <p className="mt-4 text-center text-red-600">{message}</p>
          )}
        </div>

        {/* ขวา: แนะนำสมัคร */}
        <div className="md:w-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-10 flex flex-col justify-center items-center text-center">
          <h2 className="text-2xl font-bold mb-4">ยังไม่ได้เป็นสมาชิก?</h2>
          <p className="mb-6">
            ท่านสามารถลงทะเบียนเพื่อเป็นสมาชิก โดยการกรอก
            <br />
            ข้อมูลอีเมล ชื่อผู้ใช้ และรหัสผ่านของท่าน
          </p>
          <button
            onClick={() => router.push("/register")}
            className="bg-pink-300 hover:bg-pink-400 text-white px-6 py-2 rounded-full"
          >
            ลงทะเบียน
          </button>
          <img src="/26095322.png" alt="สมัคร" className="w-32 mt-6" />
        </div>
      </div>
    </div>
  );
}
