// app/api/login_admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import bcrypt from 'bcryptjs';
import sql from 'mssql';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  
  // Validate input
  if (!email || !password) {
    return NextResponse.json(
      { error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, 
      { status: 400 }
    );
  }

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('email', sql.VarChar, email.toLowerCase().trim())
      .query(`
        SELECT 
          staff_id,
          name,
          email,
          password,
          user_type,
          status,
          citizen_id,
          phone,
          profile_image
        FROM staffs 
        WHERE email = @email 
        AND deleted_at IS NULL 
        AND status = 'active'
      `);

    const staff = result.recordset[0];
        
    if (!staff) {
      return NextResponse.json(
        { error: 'ไม่พบบัญชีพนักงาน หรือบัญชีถูกระงับ' }, 
        { status: 401 }
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, staff.password);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'รหัสผ่านไม่ถูกต้อง' }, 
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      {
        staff_id: staff.staff_id,
        name: staff.name,
        email: staff.email,
        user_type: staff.user_type,
        citizen_id: staff.citizen_id
      },
      process.env.JWT_SECRET || 'secret_key', // ใช้ environment variable
      { expiresIn: '8h' } // กำหนดเวลาหมดอายุสำหรับ staff
    );

    // Update last login time (optional)
    await pool.request()
      .input('staff_id', sql.Int, staff.staff_id)
      .query('UPDATE staffs SET updated_at = GETDATE() WHERE staff_id = @staff_id');

    return NextResponse.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      staff: {
        staff_id: staff.staff_id,
        name: staff.name,
        email: staff.email,
        user_type: staff.user_type,
        phone: staff.phone,
        profile_image: staff.profile_image
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Staff login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }, 
      { status: 500 }
    );
  }
}