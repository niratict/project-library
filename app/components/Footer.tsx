export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-200 text-sm mt-12 rounded-xl">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-gray-700">
        {/* คอลัมน์ 1 */}
        <div>
          <h3 className="font-semibold text-white mb-1">ห้องสมุดประชาชน</h3>
          <p>แหล่งความรู้และการเรียนรู้สำหรับชุมชน</p>
        </div>

        {/* คอลัมน์ 2 */}
        <div>
          <h3 className="font-semibold text-white mb-1">ติดต่อเรา</h3>
          <p>โทร: 02-123-4567</p>
          <p>อีเมล: Group1@publiclibrary.th</p>
          <p>เวลาทำการ: 08:00–20:00 น.</p>
        </div>

        {/* คอลัมน์ 3 */}
        <div>
          <h3 className="font-semibold text-white mb-1">ลิงก์ที่เป็นประโยชน์</h3>
          <p>นโยบายการใช้งาน</p>
          <p>คำถามที่พบบ่อย</p>
          <p>ข้อมูลส่วนบุคคล</p>
        </div>
      </div>

      <div className="text-center py-4 text-gray-400 text-xs">
        © 2568 ห้องสมุดประชาชน สงวนสิทธิ์
      </div>
    </footer>
  );
}
