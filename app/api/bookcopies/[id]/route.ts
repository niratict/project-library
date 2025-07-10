import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

// PUT /api/bookcopies/[id] - แก้ไขสำเนาหนังสือ
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const book_copies_id = parseInt(params.id);
    const body = await req.json();
    const { status, shelf_location } = body;

    // Validation
    if (!book_copies_id || isNaN(book_copies_id)) {
      return NextResponse.json({ 
        error: 'รหัสสำเนาหนังสือไม่ถูกต้อง' 
      }, { status: 400 });
    }

    // Validate enum values
    if (status && !['available', 'reservations', 'borrowed'].includes(status)) {
      return NextResponse.json({ 
        error: 'สถานะต้องเป็น available, reservations, หรือ borrowed' 
      }, { status: 400 });
    }

    const pool = await getConnection();

    // ตรวจสอบว่าสำเนาหนังสือมีอยู่จริง
    const existingCopy = await pool.request()
      .input('book_copies_id', sql.Int, book_copies_id)
      .query(`
        SELECT bc.*, bt.borrow_transactions_id
        FROM book_copies bc
        LEFT JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id 
          AND bt.return_date IS NULL AND bt.deleted_at IS NULL
        WHERE bc.book_copies_id = @book_copies_id AND bc.deleted_at IS NULL
      `);

    if (existingCopy.recordset.length === 0) {
      return NextResponse.json({ 
        error: 'ไม่พบสำเนาหนังสือที่ระบุ' 
      }, { status: 404 });
    }

    const currentCopy = existingCopy.recordset[0];

    // ตรวจสอบว่าสามารถเปลี่ยนสถานะได้หรือไม่
    if (currentCopy.status === 'borrowed' && status !== 'borrowed' && currentCopy.borrow_transactions_id) {
      return NextResponse.json({ 
        error: 'ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากหนังสือกำลังถูกยืมอยู่' 
      }, { status: 400 });
    }

    // อัปเดตข้อมูล
    const updateResult = await pool.request()
      .input('book_copies_id', sql.Int, book_copies_id)
      .input('status', sql.NVarChar, status || currentCopy.status)
      .input('shelf_location', sql.NVarChar, shelf_location !== undefined ? shelf_location : currentCopy.shelf_location)
      .input('updated_at', sql.DateTime, new Date())
      .query(`
        UPDATE book_copies 
        SET 
          status = @status,
          shelf_location = @shelf_location,
          updated_at = @updated_at
        OUTPUT INSERTED.*
        WHERE book_copies_id = @book_copies_id AND deleted_at IS NULL
      `);

    if (updateResult.recordset.length === 0) {
      return NextResponse.json({ 
        error: 'ไม่สามารถแก้ไขข้อมูลได้' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'แก้ไขข้อมูลสำเนาหนังสือสำเร็จ',
      data: updateResult.recordset[0]
    });

  } catch (err: unknown) {
    console.error('PUT /api/bookcopies/[id] ERROR:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}

// DELETE /api/bookcopies/[id] - ลบสำเนาหนังสือ (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const book_copies_id = parseInt(params.id);

    // Validation
    if (!book_copies_id || isNaN(book_copies_id)) {
      return NextResponse.json({ 
        error: 'รหัสสำเนาหนังสือไม่ถูกต้อง' 
      }, { status: 400 });
    }

    const pool = await getConnection();

    // ตรวจสอบว่าสำเนาหนังสือมีอยู่จริงและไม่ถูกยืม
    const existingCopy = await pool.request()
      .input('book_copies_id', sql.Int, book_copies_id)
      .query(`
        SELECT bc.*, bt.borrow_transactions_id
        FROM book_copies bc
        LEFT JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id 
          AND bt.return_date IS NULL AND bt.deleted_at IS NULL
        WHERE bc.book_copies_id = @book_copies_id AND bc.deleted_at IS NULL
      `);

    if (existingCopy.recordset.length === 0) {
      return NextResponse.json({ 
        error: 'ไม่พบสำเนาหนังสือที่ระบุ' 
      }, { status: 404 });
    }

    const currentCopy = existingCopy.recordset[0];

    // ตรวจสอบว่าหนังสือไม่ถูกยืมอยู่
    if (currentCopy.status === 'borrowed' || currentCopy.borrow_transactions_id) {
      return NextResponse.json({ 
        error: 'ไม่สามารถลบได้ เนื่องจากหนังสือกำลังถูกยืมอยู่' 
      }, { status: 400 });
    }

    // Soft delete
    const deleteResult = await pool.request()
      .input('book_copies_id', sql.Int, book_copies_id)
      .input('deleted_at', sql.DateTime, new Date())
      .query(`
        UPDATE book_copies 
        SET deleted_at = @deleted_at
        WHERE book_copies_id = @book_copies_id AND deleted_at IS NULL
      `);

    if (deleteResult.rowsAffected[0] === 0) {
      return NextResponse.json({ 
        error: 'ไม่สามารถลบข้อมูลได้' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'ลบสำเนาหนังสือสำเร็จ' 
    });

  } catch (err: unknown) {
    console.error('DELETE /api/bookcopies/[id] ERROR:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}

// GET /api/bookcopies/[id] - ดึงข้อมูลสำเนาหนังสือตาม ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const book_copies_id = parseInt(params.id);

    // Validation
    if (!book_copies_id || isNaN(book_copies_id)) {
      return NextResponse.json({ 
        error: 'รหัสสำเนาหนังสือไม่ถูกต้อง' 
      }, { status: 400 });
    }

    const pool = await getConnection();

    const result = await pool.request()
      .input('book_copies_id', sql.Int, book_copies_id)
      .query(`
        SELECT 
          bc.*,
          b.title,
          b.author,
          b.isbn,
          b.book_limit,
          c.name as category_name,
          -- ข้อมูลการยืม (ถ้ามี)
          bt.borrow_transactions_id,
          bt.user_id,
          bt.borrow_date,
          bt.due_date,
          bt.return_date,
          u.name as borrower_name
        FROM book_copies bc
        LEFT JOIN books b ON bc.book_id = b.book_id
        LEFT JOIN categories c ON b.categorie_id = c.categorie_id
        LEFT JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id 
          AND bt.return_date IS NULL AND bt.deleted_at IS NULL
        LEFT JOIN users u ON bt.user_id = u.user_id
        WHERE bc.book_copies_id = @book_copies_id AND bc.deleted_at IS NULL
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ 
        error: 'ไม่พบสำเนาหนังสือที่ระบุ' 
      }, { status: 404 });
    }

    return NextResponse.json({
      data: result.recordset[0]
    });

  } catch (err: unknown) {
    console.error('GET /api/bookcopies/[id] ERROR:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}