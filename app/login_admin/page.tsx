'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

type StaffJwtPayload = {
  staff_id: number;
  name: string;
  email: string;
  user_type: string;
  citizen_id: string;
  iat: number;
  exp: number;
};

export default function StaffLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/login_admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        // เก็บ token และข้อมูล staff
        localStorage.setItem('staffToken', data.token);
        localStorage.setItem('staffInfo', JSON.stringify(data.staff));
        
        setMessage('เข้าสู่ระบบสำเร็จ');

        const decoded = jwtDecode<StaffJwtPayload>(data.token);
        const role = decoded.user_type;

        // นำทางตาม role ของ staff
        if (role === 'admin') {
          router.push('/admindashboard');
        } else if (role === 'librarian') {
          router.push('/admindashboard');
        } else {
          setMessage('ไม่พบหน้าที่เหมาะสมสำหรับตำแหน่งนี้');
        }
      } else {
        setMessage(data.error || 'เกิดข้อผิดพลาด');
      }

    } catch (error) {
      console.error('Staff login error:', error);
      setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden">

        {/* ซ้าย: ฟอร์ม login */}
        <div className="md:w-1/2 p-10 bg-gray-50">
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <img src="/logo/logoWeb.png"/>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">ระบบพนักงาน</h2>
            <p className="text-gray-600">เข้าสู่ระบบจัดการห้องสมุด</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="relative">
              <div className="flex items-center border-2 border-gray-300 rounded-lg px-4 py-4 focus-within:border-indigo-500 transition-colors">
                <div className="w-5 h-5 text-gray-400 mr-3">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="อีเมลพนักงาน"
                  className="w-full focus:outline-none bg-transparent text-gray-700"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center border-2 border-gray-300 rounded-lg px-4 py-4 focus-within:border-indigo-500 transition-colors">
                <div className="w-5 h-5 text-gray-400 mr-3">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="password"
                  placeholder="รหัสผ่าน"
                  className="w-full focus:outline-none bg-transparent text-gray-700"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  กำลังเข้าสู่ระบบ...
                </div>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-lg text-center ${
              message.includes('สำเร็จ') 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
            >
              ← กลับไปหน้าหลัก
            </button>
          </div>
        </div>

        {/* ขวา: ข้อมูลระบบ */}
        <div className="md:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white p-10 flex flex-col justify-center items-center text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📚</span>
            </div>
            
            <h2 className="text-3xl font-bold mb-4">ระบบจัดการห้องสมุด</h2>
            <p className="mb-8 text-lg leading-relaxed opacity-90">
              เข้าสู่ระบบเพื่อจัดการข้อมูลสมาชิก<br />
              ควบคุมการยืม-คืนหนังสือ<br />
              และดูแลระบบห้องสมุดอย่างมีประสิทธิภาพ
            </p>

            <div className="mt-8">
              <img 
                src="/library-staff.png" 
                alt="ระบบพนักงาน" 
                className="w-40 mx-auto opacity-80"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}