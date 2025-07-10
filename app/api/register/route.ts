// app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import bcrypt from 'bcrypt';
import sql from 'mssql';

export async function POST(req: NextRequest) {
  try {
    const { 
      name, 
      email, 
      password, 
      user_type, 
      date_of_birth,
      citizen_id,
      gender,
      phone,
      address,
      profile_image
    } = await req.json();

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!name || !email || !password || !user_type || !citizen_id) {
      return NextResponse.json({ 
        error: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, อีเมล, รหัสผ่าน, ประเภทผู้ใช้, เลขบัตรประชาชน)' 
      }, { status: 400 });
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'รูปแบบอีเมลไม่ถูกต้อง' 
      }, { status: 400 });
    }

    // ตรวจสอบประเภทผู้ใช้
    if (!['citizen', 'educational'].includes(user_type)) {
      return NextResponse.json({ 
        error: 'ประเภทผู้ใช้ไม่ถูกต้อง' 
      }, { status: 400 });
    }

    // ตรวจสอบเพศ (ถ้ามี)
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ 
        error: 'ข้อมูลเพศไม่ถูกต้อง' 
      }, { status: 400 });
    }

    // ตรวจสอบรูปแบบเลขบัตรประชาชน (13 หลัก)
    const citizenIdRegex = /^\d{13}$/;
    if (!citizenIdRegex.test(citizen_id)) {
      return NextResponse.json({ 
        error: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก' 
      }, { status: 400 });
    }

    // ตรวจสอบความยาวรหัสผ่าน
    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' 
      }, { status: 400 });
    }

    const pool = await getConnection();
    
    // ตรวจสอบว่าอีเมลหรือเลขบัตรประชาชนซ้ำหรือไม่
    const checkExisting = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('citizen_id', sql.VarChar, citizen_id)
      .query(`
        SELECT email, citizen_id 
        FROM users 
        WHERE email = @email OR citizen_id = @citizen_id
      `);

    if (checkExisting.recordset.length > 0) {
      const existing = checkExisting.recordset[0];
      if (existing.email === email) {
        return NextResponse.json({ 
          error: 'อีเมลนี้ถูกใช้งานแล้ว' 
        }, { status: 409 });
      }
      if (existing.citizen_id === citizen_id) {
        return NextResponse.json({ 
          error: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว' 
        }, { status: 409 });
      }
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // เพิ่มข้อมูลผู้ใช้ใหม่
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('user_type', sql.NVarChar, user_type)
      .input('gender', sql.NVarChar, gender || null)
      .input('date_of_birth', sql.Date, date_of_birth || null)
      .input('citizen_id', sql.VarChar, citizen_id)
      .input('phone', sql.VarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .input('profile_image', sql.NVarChar, profile_image || null)
      .input('status', sql.NVarChar, 'active')
      .query(`
        INSERT INTO users (
          name, email, password, user_type, gender, date_of_birth, 
          citizen_id, phone, address, profile_image, status, created_at
        )
        VALUES (
          @name, @email, @password, @user_type, @gender, @date_of_birth,
          @citizen_id, @phone, @address, @profile_image, @status, GETDATE()
        )
      `);

    return NextResponse.json({ 
      message: 'ลงทะเบียนสำเร็จ',
      success: true 
    }, { status: 201 });

  } catch (err: unknown) {
    console.error('Registration error:', err);
    
    if (err instanceof Error) {
      // ตรวจสอบข้อผิดพลาดจากฐานข้อมูล
      if (err.message.includes('Violation of UNIQUE KEY constraint')) {
        if (err.message.includes('email')) {
          return NextResponse.json({ 
            error: 'อีเมลนี้ถูกใช้งานแล้ว' 
          }, { status: 409 });
        }
        if (err.message.includes('citizen_id')) {
          return NextResponse.json({ 
            error: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว' 
          }, { status: 409 });
        }
        return NextResponse.json({ 
          error: 'ข้อมูลนี้ถูกใช้งานแล้ว' 
        }, { status: 409 });
      }
      
      if (err.message.includes('CHECK constraint')) {
        return NextResponse.json({ 
          error: 'ข้อมูลไม่ถูกต้องตามเงื่อนไข' 
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}