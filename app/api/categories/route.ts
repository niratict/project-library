import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

// GET /api/categories - ดึงข้อมูลหมวดหมู่ทั้งหมด
export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT categorie_id, name, created_at, updated_at
      FROM categories WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);
    return NextResponse.json(result.recordset);
  } catch (err) {
    console.error('GET /api/categories error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST /api/categories - สร้างหมวดหมู่ใหม่
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'กรุณาระบุชื่อหมวดหมู่' }, { status: 400 });
  }

  try {
    const pool = await getConnection();
    
    // ตรวจสอบว่าชื่อหมวดหมู่มีอยู่แล้วหรือไม่
    const existingResult = await pool.request()
      .input('name', sql.NVarChar, name.trim())
      .query(`
        SELECT categorie_id
        FROM categories
        WHERE name = @name AND deleted_at IS NULL
      `);

    if (existingResult.recordset.length > 0) {
      return NextResponse.json({ error: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว' }, { status: 409 });
    }

    // สร้างหมวดหมู่ใหม่
    const result = await pool.request()
      .input('name', sql.NVarChar, name.trim())
      .query(`
        INSERT INTO categories (name, created_at)
        OUTPUT INSERTED.categorie_id, INSERTED.name, INSERTED.created_at
        VALUES (@name, GETDATE())
      `);

    return NextResponse.json({
      message: 'สร้างหมวดหมู่สำเร็จ',
      data: result.recordset[0]
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/categories ERROR:', err);
    return NextResponse.json({ error: 'ไม่สามารถสร้างหมวดหมู่ได้' }, { status: 500 });
  }
}