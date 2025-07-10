// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import bcrypt from 'bcryptjs';
import sql from 'mssql';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email AND deleted_at IS NULL');

    const user = result.recordset[0];
    if (!user) {
      return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้' }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, user_type: user.user_type },
      'secret_key', // ใช้ env จริงๆ
      { expiresIn: '7d' }
    );

    return NextResponse.json({ message: 'เข้าสู่ระบบสำเร็จ', token }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }, { status: 500 });
  }
}
