'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    user_type: 'citizen',
    date_of_birth: '',
    citizen_id: '',
    gender: '',
    phone: '',
    address: '',
  });

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify(form),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage('ลงทะเบียนสำเร็จ! กำลังเปลี่ยนหน้า...');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        setMessage(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg flex flex-col lg:flex-row overflow-hidden">

        {/* ซ้าย */}
        <div className="lg:w-2/5 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-8 flex flex-col justify-center items-center text-center">
          <h2 className="text-2xl font-bold mb-4">คุณเป็นสมาชิกแล้ว?</h2>
          <p className="mb-6 text-sm">
            หากท่านลงทะเบียนเรียบร้อยแล้ว สามารถเข้าใช้งานได้ง่ายๆ<br />
            โดยการกรอกข้อมูลผู้ใช้และรหัสผ่านของท่าน
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-pink-300 hover:bg-pink-400 text-white px-6 py-2 rounded-full transition-colors"
          >
            ลงชื่อเข้าใช้
          </button>
        </div>

        {/* ขวา */}
        <div className="lg:w-3/5 p-8">
          <h2 className="text-2xl font-bold text-pink-600 mb-6 text-center">ลงทะเบียนสมาชิก</h2>
          
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            {/* ชื่อ */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อ-นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="กรอกชื่อ-นามสกุล"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* อีเมล */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                อีเมล <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="example@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            {/* รหัสผ่าน */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            {/* เลขบัตรประชาชน */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เลขบัตรประชาชน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="1234567890123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                value={form.citizen_id}
                onChange={e => setForm({ ...form, citizen_id: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                required
                maxLength={13}
              />
            </div>

            {/* ประเภทผู้ใช้ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ประเภทผู้ใช้ <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                value={form.user_type}
                onChange={e => setForm({ ...form, user_type: e.target.value })}
                required
              >
                <option value="citizen">ประชาชนทั่วไป</option>
                <option value="educational">สถานศึกษา</option>
              </select>
            </div>

            {/* เพศ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">เลือกเพศ</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>

            {/* วันเกิด */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                value={form.date_of_birth}
                onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>

            {/* เบอร์โทร */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                placeholder="0812345678"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {/* ที่อยู่ */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
              <textarea
                placeholder="ที่อยู่ปัจจุบัน"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                rows={3}
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </div>

            {/* ปุ่มลงทะเบียน */}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนสมาชิก'}
              </button>
            </div>
          </form>

          {/* ข้อความแจ้งเตือน */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-center ${
              message.includes('สำเร็จ') 
                ? 'bg-green-100 text-green-700 border border-green-300' 
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              {message}
            </div>
          )}

          {/* หมายเหตุ */}
          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>
              <span className="text-red-500">*</span> ข้อมูลที่จำเป็นต้องกรอก
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}