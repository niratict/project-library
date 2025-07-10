// File: /api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
import bcrypt from 'bcryptjs';

// GET /api/users/[id] - Get user by ID
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { params } = await context;
  const userId = Number(params.id);
  if (!userId || isNaN(userId)) {
    return NextResponse.json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          user_id, name, email, user_type, gender, date_of_birth,
          citizen_id, phone, address, profile_image, status,
          created_at, updated_at
        FROM users 
        WHERE user_id = @user_id AND deleted_at IS NULL
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    return NextResponse.json(result.recordset[0]);
  } catch (err) {
    console.error('GET /api/users/[id] ERROR:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
    }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const userId = Number(params.id);
  if (!userId || isNaN(userId)) {
    return NextResponse.json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
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
      status 
    } = body;

    // Validate required fields
    if (!name || !email || !user_type || !citizen_id) {
      return NextResponse.json({ 
        error: 'กรุณาระบุข้อมูลที่จำเป็น (name, email, user_type, citizen_id)' 
      }, { status: 400 });
    }

    // Validate user_type
    if (!['citizen', 'educational'].includes(user_type)) {
      return NextResponse.json({ 
        error: 'user_type ต้องเป็น citizen หรือ educational เท่านั้น' 
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
    
    // Check if user exists
    const existingUser = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`SELECT user_id FROM users WHERE user_id = @user_id AND deleted_at IS NULL`);

    if (existingUser.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // Check if email or citizen_id already exists (exclude current user)
    const duplicateCheck = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('citizen_id', sql.VarChar, citizen_id)
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT user_id FROM users 
        WHERE (email = @email OR citizen_id = @citizen_id) 
        AND user_id != @user_id 
        AND deleted_at IS NULL
      `);

    if (duplicateCheck.recordset.length > 0) {
      return NextResponse.json({ 
        error: 'อีเมลหรือรหัสบัตรประชาชนนี้มีอยู่ในระบบแล้ว' 
      }, { status: 409 });
    }

    // Prepare update query
    let updateQuery = `
      UPDATE users
      SET name = @name,
          email = @email,
          user_type = @user_type,
          gender = @gender,
          date_of_birth = @date_of_birth,
          citizen_id = @citizen_id,
          phone = @phone,
          address = @address,
          profile_image = @profile_image,
          status = @status,
          updated_at = @updated_at
    `;

    const request = pool.request()
      .input('user_id', sql.Int, userId)
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('user_type', sql.NVarChar, user_type)
      .input('gender', sql.NVarChar, gender || null)
      .input('date_of_birth', sql.Date, date_of_birth || null)
      .input('citizen_id', sql.VarChar, citizen_id)
      .input('phone', sql.VarChar, phone || null)
      .input('address', sql.NVarChar, address || null)
      .input('profile_image', sql.NVarChar, profile_image || null)
      .input('status', sql.NVarChar, status || 'active')
      .input('updated_at', sql.DateTime, new Date());

    // Handle password update if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += `, password = @password`;
      request.input('password', sql.NVarChar, hashedPassword);
    }

    updateQuery += ` WHERE user_id = @user_id AND deleted_at IS NULL`;

    await request.query(updateQuery);

    return NextResponse.json({ message: 'อัปเดตข้อมูลสำเร็จ' });
  } catch (err) {
    console.error('PUT /api/users/[id] ERROR:', err);
    return NextResponse.json({ 
      error: 'ไม่สามารถอัปเดตข้อมูลได้' 
    }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Soft delete user
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const userId = Number(params.id);
  if (!userId || isNaN(userId)) {
    return NextResponse.json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const pool = await getConnection();
    
    // Check if user exists
    const existingUser = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`SELECT user_id FROM users WHERE user_id = @user_id AND deleted_at IS NULL`);

    if (existingUser.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // Soft delete user
    await pool.request()
      .input('user_id', sql.Int, userId)
      .input('deleted_at', sql.DateTime, new Date())
      .input('status', sql.NVarChar, 'deleted')
      .query(`
        UPDATE users
        SET deleted_at = @deleted_at,
            status = @status,
            updated_at = @deleted_at
        WHERE user_id = @user_id AND deleted_at IS NULL
      `);

    return NextResponse.json({ message: 'ลบข้อมูลสำเร็จ (แบบ Soft Delete)' });
  } catch (err) {
    console.error('DELETE /api/users/[id] ERROR:', err);
    return NextResponse.json({ 
      error: 'ไม่สามารถลบข้อมูลได้' 
    }, { status: 500 });
  }
}