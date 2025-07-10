// File: /api/staff/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import bcrypt from 'bcryptjs';

// GET /api/staff - Get all staff members
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const pool = await getConnection();
    
    // Query to get staff with pagination
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT 
          staff_id, name, email, user_type, gender, date_of_birth,
          citizen_id, phone, address, profile_image, hire_date, status,
          created_at, updated_at
        FROM staffs 
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

    // Query to get total count
    const countResult = await pool.request()
      .query(`
        SELECT COUNT(*) as total
        FROM staffs 
        WHERE deleted_at IS NULL
      `);

    const total = countResult.recordset[0].total;

    return NextResponse.json({
      staff: result.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: unknown) {
    console.error('GET /api/staff ERROR:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' 
    }, { status: 500 });
  }
}

// POST /api/staff - Create new staff member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      name, 
      email, 
      password, 
      user_type, 
      gender, 
      date_of_birth, 
      citizen_id, 
      phone, 
      address, 
      profile_image,
      hire_date,
      status = 'active'
    } = body;

    // Validate required fields
    if (!name || !email || !password || !user_type || !citizen_id) {
      return NextResponse.json({ 
        error: 'กรุณาระบุข้อมูลที่จำเป็น (name, email, password, user_type, citizen_id)' 
      }, { status: 400 });
    }

    // Validate user_type
    if (!['librarian', 'admin'].includes(user_type)) {
      return NextResponse.json({ 
        error: 'user_type ต้องเป็น librarian หรือ admin เท่านั้น' 
      }, { status: 400 });
    }

    // Validate gender if provided
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ 
        error: 'gender ต้องเป็น male, female หรือ other เท่านั้น' 
      }, { status: 400 });
    }

    // Validate status
    if (!['active', 'suspended', 'deleted'].includes(status)) {
      return NextResponse.json({ 
        error: 'status ต้องเป็น active, suspended หรือ deleted เท่านั้น' 
      }, { status: 400 });
    }

    // Validate citizen_id format (13 digits)
    if (!/^\d{13}$/.test(citizen_id)) {
      return NextResponse.json({ 
        error: 'รหัสบัตรประชาชนต้องเป็นตัวเลข 13 หลัก' 
      }, { status: 400 });
    }

    const pool = await getConnection();
    
    // Check if email or citizen_id already exists
    const existingStaff = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('citizen_id', sql.VarChar, citizen_id)
      .query(`
        SELECT staff_id FROM staffs 
        WHERE (email = @email OR citizen_id = @citizen_id) AND deleted_at IS NULL
      `);

    if (existingStaff.recordset.length > 0) {
      return NextResponse.json({ 
        error: 'อีเมลหรือรหัสบัตรประชาชนนี้มีอยู่ในระบบแล้ว' 
      }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new staff member
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
      .input('hire_date', sql.Date, hire_date || null)
      .input('status', sql.NVarChar, status)
      .query(`
        INSERT INTO staffs (
          name, email, password, user_type, gender, date_of_birth, 
          citizen_id, phone, address, profile_image, hire_date, status
        )
        VALUES (
          @name, @email, @password, @user_type, @gender, @date_of_birth,
          @citizen_id, @phone, @address, @profile_image, @hire_date, @status
        )
      `);

    return NextResponse.json({ message: 'เพิ่มพนักงานสำเร็จ' }, { status: 201 });
  } catch (err: unknown) {
    console.error('POST /api/staff ERROR:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}