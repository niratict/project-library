import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';
// GET /api/bookcopies/all - ดึงข้อมูลสำเนาหนังสือทั้งหมดไม่มี pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const book_id = searchParams.get('book_id');
    const status = searchParams.get('status');

    const pool = await getConnection();
    
    // สร้าง WHERE clause แบบ dynamic
    let whereClause = 'WHERE bc.deleted_at IS NULL';
    const conditions = [];
    
    if (book_id) {
      whereClause += ' AND bc.book_id = @book_id';
      conditions.push({ name: 'book_id', type: sql.Int, value: parseInt(book_id) });
    }
    
    if (status) {
      whereClause += ' AND bc.status = @status';
      conditions.push({ name: 'status', type: sql.NVarChar, value: status });
    }

    // Query หลัก - ไม่มี pagination
    let request = pool.request();
    conditions.forEach(condition => {
      request.input(condition.name, condition.type, condition.value);
    });
    
    const result = await request.query(`
      SELECT 
        bc.*,
        b.title,
        b.author,
        b.isbn,
        b.book_limit,
        c.name as category_name,
        -- ข้อมูลการยืมปัจจุบัน (ถ้ามี)
        (SELECT TOP 1 bt.borrow_transactions_id 
         FROM borrow_transactions bt 
         WHERE bt.book_copies_id = bc.book_copies_id 
         AND bt.return_date IS NULL AND bt.deleted_at IS NULL
         ORDER BY bt.created_at DESC) as borrow_transactions_id,
        (SELECT TOP 1 bt.user_id 
         FROM borrow_transactions bt 
         WHERE bt.book_copies_id = bc.book_copies_id 
         AND bt.return_date IS NULL AND bt.deleted_at IS NULL
         ORDER BY bt.created_at DESC) as user_id,
        (SELECT TOP 1 bt.borrow_date 
         FROM borrow_transactions bt 
         WHERE bt.book_copies_id = bc.book_copies_id 
         AND bt.return_date IS NULL AND bt.deleted_at IS NULL
         ORDER BY bt.created_at DESC) as borrow_date,
        (SELECT TOP 1 bt.due_date 
         FROM borrow_transactions bt 
         WHERE bt.book_copies_id = bc.book_copies_id 
         AND bt.return_date IS NULL AND bt.deleted_at IS NULL
         ORDER BY bt.created_at DESC) as due_date,
        (SELECT TOP 1 u.name 
         FROM borrow_transactions bt 
         LEFT JOIN users u ON bt.user_id = u.user_id
         WHERE bt.book_copies_id = bc.book_copies_id 
         AND bt.return_date IS NULL AND bt.deleted_at IS NULL
         ORDER BY bt.created_at DESC) as borrower_name
      FROM book_copies bc
      LEFT JOIN books b ON bc.book_id = b.book_id
      LEFT JOIN categories c ON b.categorie_id = c.categorie_id
      ${whereClause}
      ORDER BY bc.created_at DESC
    `);

    // นับจำนวนทั้งหมด
    let countRequest = pool.request();
    conditions.forEach(condition => {
      countRequest.input(condition.name, condition.type, condition.value);
    });
    
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total
      FROM book_copies bc
      LEFT JOIN books b ON bc.book_id = b.book_id
      ${whereClause}
    `);

    const total = countResult.recordset[0].total;

    return NextResponse.json({
      data: result.recordset,
      total: total,
      message: `พบข้อมูลสำเนาหนังสือทั้งหมด ${total} รายการ`
    });

  } catch (err: unknown) {
    console.error('GET /api/bookcopies/all error:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาด' 
    }, { status: 500 });
  }
}