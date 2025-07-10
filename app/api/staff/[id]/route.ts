// File: /api/staff/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import bcrypt from 'bcryptjs';

// GET /api/staff/[id] - Get staff member by ID
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { params } = await context;
  const staffId = Number(params.id);
  if (!staffId || isNaN(staffId)) {
    return NextResponse.json({ error: 'รหัสพนักงานไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('staff_id', sql.Int, staffId)
      .query(`
        SELECT 
          staff_id, name, email, user_type, gender, date_of_birth,
          citizen_id, phone, address, profile_image, hire_date, status,
          created_at, updated_at
        FROM staffs 
        WHERE staff_id = @staff_id AND deleted_at IS NULL
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 });
    }

    return NextResponse.json(result.recordset[0]);
  } catch (err) {
    console.error('GET /api/staff/[id] ERROR:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
    }, { status: 500 });
  }
}

// PUT /api/staff/[id] - Update staff member
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const staffId = Number(params.id);
  if (!staffId || isNaN(staffId)) {
    return NextResponse.json({ error: 'รหัสพนักงานไม่ถูกต้อง' }, { status: 400 });
  }

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
      status 
    } = body;

    // Validate required fields
    if (!name || !email || !user_type || !citizen_id) {
      return NextResponse.json({ 
        error: 'กรุณาระบุข้อมูลที่จำเป็น (name, email, user_type, citizen_id)' 
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
    if (status && !['active', 'suspended', 'deleted'].includes(status)) {
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
    
    // Check if staff exists
    const existingStaff = await pool.request()
      .input('staff_id', sql.Int, staffId)
      .query(`SELECT staff_id FROM staffs WHERE staff_id = @staff_id AND deleted_at IS NULL`);

    if (existingStaff.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 });
    }

    // Check if email or citizen_id already exists (exclude current staff)
    const duplicateCheck = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('citizen_id', sql.VarChar, citizen_id)
      .input('staff_id', sql.Int, staffId)
      .query(`
        SELECT staff_id FROM staffs 
        WHERE (email = @email OR citizen_id = @citizen_id) 
        AND staff_id != @staff_id 
        AND deleted_at IS NULL
      `);

    if (duplicateCheck.recordset.length > 0) {
      return NextResponse.json({ 
        error: 'อีเมลหรือรหัสบัตรประชาชนนี้มีอยู่ในระบบแล้ว' 
      }, { status: 409 });
    }

    // Prepare update query
    let updateQuery = `
      UPDATE staffs
      SET name = @name,
          email = @email,
          user_type = @user_type,
          gender = @gender,
          date_of_birth = @date_of_birth,
          citizen_id = @citizen_id,
          phone = @phone,
          address = @address,
          profile_image = @profile_image,
          hire_date = @hire_date,
          status = @status,
          updated_at = @updated_at
    `;

    const request = pool.request()
      .input('staff_id', sql.Int, staffId)
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('user_type', sql.NVarChar, user_type)
      .input('gender', sql.NVarChar, gender || null)
      .input('date_of_birth', sql.Date, date_of_birth || null)
      .input('citizen_id', sql.VarChar, citizen_id)
      .input('phone', sql.VarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .input('profile_image', sql.NVarChar, profile_image || null)
      .input('hire_date', sql.Date, hire_date || null)
      .input('status', sql.NVarChar, status || 'active')
      .input('updated_at', sql.DateTime, new Date());

    // Handle password update if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += `, password = @password`;
      request.input('password', sql.NVarChar, hashedPassword);
    }

    updateQuery += ` WHERE staff_id = @staff_id AND deleted_at IS NULL`;

    await request.query(updateQuery);

    return NextResponse.json({ message: 'อัปเดตข้อมูลสำเร็จ' });
  } catch (err) {
    console.error('PUT /api/staff/[id] ERROR:', err);
    return NextResponse.json({ 
      error: 'ไม่สามารถอัปเดตข้อมูลได้' 
    }, { status: 500 });
  }
}

// DELETE /api/staff/[id] - Soft delete staff member
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const staffId = Number(params.id);
  if (!staffId || isNaN(staffId)) {
    return NextResponse.json({ error: 'รหัสพนักงานไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const pool = await getConnection();
    
    // Check if staff exists
    const existingStaff = await pool.request()
      .input('staff_id', sql.Int, staffId)
      .query(`SELECT staff_id FROM staffs WHERE staff_id = @staff_id AND deleted_at IS NULL`);

    if (existingStaff.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 });
    }

    // Soft delete staff
    await pool.request()
      .input('staff_id', sql.Int, staffId)
      .input('deleted_at', sql.DateTime, new Date())
      .input('status', sql.NVarChar, 'deleted')
      .query(`
        UPDATE staffs
        SET deleted_at = @deleted_at,
            status = @status,
            updated_at = @deleted_at
        WHERE staff_id = @staff_id AND deleted_at IS NULL
      `);

    return NextResponse.json({ message: 'ลบข้อมูลสำเร็จ (แบบ Soft Delete)' });
  } catch (err) {
    console.error('DELETE /api/staff/[id] ERROR:', err);
    return NextResponse.json({ 
      error: 'ไม่สามารถลบข้อมูลได้' 
    }, { status: 500 });
  }
}