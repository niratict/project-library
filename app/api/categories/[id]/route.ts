import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

// GET /api/categories/[id] - ดึงข้อมูลหมวดหมู่ตาม ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const categoryId = Number(params.id);
  if (!categoryId) {
    return NextResponse.json({ error: 'ไม่พบรหัสหมวดหมู่' }, { status: 400 });
  }

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('categorie_id', sql.Int, categoryId)
      .query(`
        SELECT categorie_id, name, created_at, updated_at
        FROM categories
        WHERE categorie_id = @categorie_id AND deleted_at IS NULL
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลหมวดหมู่' }, { status: 404 });
    }

    return NextResponse.json(result.recordset[0]);
  } catch (err) {
    console.error('GET /api/categories/[id] ERROR:', err);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลได้' }, { status: 500 });
  }
}

// PUT /api/categories/[id] - อัปเดตข้อมูลหมวดหมู่
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const categoryId = Number(params.id);
  if (!categoryId) {
    return NextResponse.json({ error: 'ไม่พบรหัสหมวดหมู่' }, { status: 400 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'กรุณาระบุชื่อหมวดหมู่' }, { status: 400 });
  }

  try {
    const pool = await getConnection();
    
    // ตรวจสอบว่าหมวดหมู่มีอยู่จริง
    const existingCategory = await pool.request()
      .input('categorie_id', sql.Int, categoryId)
      .query(`
        SELECT categorie_id
        FROM categories
        WHERE categorie_id = @categorie_id AND deleted_at IS NULL
      `);

    if (existingCategory.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลหมวดหมู่' }, { status: 404 });
    }

    // ตรวจสอบว่าชื่อหมวดหมู่ใหม่ซ้ำกับที่มีอยู่หรือไม่ (ยกเว้นตัวเอง)
    const duplicateResult = await pool.request()
      .input('name', sql.NVarChar, name.trim())
      .input('categorie_id', sql.Int, categoryId)
      .query(`
        SELECT categorie_id
        FROM categories
        WHERE name = @name AND categorie_id != @categorie_id AND deleted_at IS NULL
      `);

    if (duplicateResult.recordset.length > 0) {
      return NextResponse.json({ error: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว' }, { status: 409 });
    }

    // อัปเดตข้อมูล
    const result = await pool.request()
      .input('categorie_id', sql.Int, categoryId)
      .input('name', sql.NVarChar, name.trim())
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE categories
        SET name = @name,
            updated_at = @updated_at
        OUTPUT INSERTED.categorie_id, INSERTED.name, INSERTED.updated_at
        WHERE categorie_id = @categorie_id AND deleted_at IS NULL
      `);

    return NextResponse.json({
      message: 'อัปเดตข้อมูลหมวดหมู่สำเร็จ',
      data: result.recordset[0]
    });
  } catch (err) {
    console.error('PUT /api/categories/[id] ERROR:', err);
    return NextResponse.json({ error: 'ไม่สามารถอัปเดตข้อมูลได้' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] - ลบหมวดหมู่ (Soft Delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const categoryId = Number(params.id);
  if (!categoryId) {
    return NextResponse.json({ error: 'ไม่พบรหัสหมวดหมู่' }, { status: 400 });
  }

  try {
    const pool = await getConnection();
    
    // ตรวจสอบว่าหมวดหมู่มีอยู่จริง
    const existingCategory = await pool.request()
      .input('categorie_id', sql.Int, categoryId)
      .query(`
        SELECT categorie_id
        FROM categories
        WHERE categorie_id = @categorie_id AND deleted_at IS NULL
      `);

    if (existingCategory.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลหมวดหมู่' }, { status: 404 });
    }

    // ตรวจสอบว่ามีหนังสือใช้หมวดหมู่นี้อยู่หรือไม่
    const booksUsingCategory = await pool.request()
      .input('categorie_id', sql.Int, categoryId)
      .query(`
        SELECT COUNT(*) as count
        FROM books
        WHERE categorie_id = @categorie_id AND deleted_at IS NULL
      `);

    if (booksUsingCategory.recordset[0].count > 0) {
      return NextResponse.json({ 
        error: 'ไม่สามารถลบหมวดหมู่ได้ เนื่องจากมีหนังสือใช้หมวดหมู่นี้อยู่' 
      }, { status: 409 });
    }

    // ทำ Soft Delete
    await pool.request()
      .input('categorie_id', sql.Int, categoryId)
      .input('deleted_at', sql.DateTime, new Date())
      .query(`
        UPDATE categories
        SET deleted_at = @deleted_at
        WHERE categorie_id = @categorie_id AND deleted_at IS NULL
      `);

    return NextResponse.json({ message: 'ลบหมวดหมู่สำเร็จ' });
  } catch (err) {
    console.error('DELETE /api/categories/[id] ERROR:', err);
    return NextResponse.json({ error: 'ไม่สามารถลบข้อมูลได้' }, { status: 500 });
  }
}