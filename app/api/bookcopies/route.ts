import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

// POST /api/bookcopies - สร้างสำเนาหนังสือใหม่
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      book_id, 
      status, 
      shelf_location,
      quantity = 1 // จำนวนสำเนาที่ต้องการสร้าง (default = 1)
    } = body;

    // Validation - ตรวจสอบข้อมูลที่จำเป็น
    if (!book_id) {
      return NextResponse.json({ 
        error: 'กรุณาระบุรหัสหนังสือ' 
      }, { status: 400 });
    }

    // Validate enum values
    if (status && !['available', 'reservations', 'borrowed'].includes(status)) {
      return NextResponse.json({ 
        error: 'สถานะต้องเป็น available, reservations, หรือ borrowed' 
      }, { status: 400 });
    }

    // Validate quantity
    if (quantity <= 0 || quantity > 100) {
      return NextResponse.json({ 
        error: 'จำนวนสำเนาต้องอยู่ระหว่าง 1-100 เล่ม' 
      }, { status: 400 });
    }

    const pool = await getConnection();
    
    // ตรวจสอบว่าหนังสือมีอยู่จริง
    const bookCheck = await pool.request()
      .input('book_id', sql.Int, parseInt(book_id))
      .query(`
        SELECT book_id, title, book_limit 
        FROM books 
        WHERE book_id = @book_id AND deleted_at IS NULL AND status = 'active'
      `);
    
    if (bookCheck.recordset.length === 0) {
      return NextResponse.json({ 
        error: 'ไม่พบหนังสือที่ระบุ หรือหนังสือไม่อยู่ในสถานะ active' 
      }, { status: 400 });
    }

    const book = bookCheck.recordset[0];

    // ตรวจสอบจำนวนสำเนาปัจจุบัน
    const currentCopiesResult = await pool.request()
      .input('book_id', sql.Int, parseInt(book_id))
      .query(`
        SELECT COUNT(*) as total_copies 
        FROM book_copies 
        WHERE book_id = @book_id AND deleted_at IS NULL
      `);

    const currentCopies = currentCopiesResult.recordset[0].total_copies;
    
    // ตรวจสอบว่าไม่เกินจำนวนจำกัด
    if (currentCopies + quantity > book.book_limit) {
      return NextResponse.json({ 
        error: `ไม่สามารถเพิ่มสำเนาได้ (ปัจจุบัน: ${currentCopies}, ต้องการเพิ่ม: ${quantity}, จำกัด: ${book.book_limit})` 
      }, { status: 400 });
    }

    // สร้างสำเนาหนังสือ
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const createdCopies = [];
      
      for (let i = 0; i < quantity; i++) {
        const result = await transaction.request()
          .input('book_id', sql.Int, parseInt(book_id))
          .input('status', sql.NVarChar, status || 'available')
          .input('shelf_location', sql.NVarChar, shelf_location || null)
          .input('created_at', sql.DateTime, new Date())
          .query(`
            INSERT INTO book_copies (book_id, status, shelf_location, created_at)
            OUTPUT INSERTED.book_copies_id, INSERTED.book_id, INSERTED.status, INSERTED.shelf_location
            VALUES (@book_id, @status, @shelf_location, @created_at)
          `);
        
        createdCopies.push(result.recordset[0]);
      }

      await transaction.commit();

      return NextResponse.json({ 
        message: `เพิ่มสำเนาหนังสือสำเร็จ ${quantity} เล่ม`,
        data: {
          book_title: book.title,
          created_copies: createdCopies,
          total_copies_now: currentCopies + quantity,
          book_limit: book.book_limit
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (err: unknown) {
    console.error('POST /api/bookcopies ERROR:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}

// GET /api/bookcopies - ดึงข้อมูลสำเนาหนังสือทั้งหมด
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const book_id = searchParams.get('book_id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

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

    // Query หลัก
    let request = pool.request();
    conditions.forEach(condition => {
      request.input(condition.name, condition.type, condition.value);
    });
    
    const result = await request
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
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
        ${whereClause}
        ORDER BY bc.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
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
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: result.recordset,
      pagination: {
        current_page: page,
        per_page: limit,
        total: total,
        total_pages: totalPages,
        has_more: page < totalPages
      }
    });

  } catch (err: unknown) {
    console.error('GET /api/bookcopies error:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาด' 
    }, { status: 500 });
  }
}