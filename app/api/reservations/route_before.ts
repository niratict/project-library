// /api/reservations/route.ts - สำหรับการจองหนังสือโดยผู้ใช้
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

// POST /api/reservations - สร้างการจองหนังสือใหม่ (ผู้ใช้ทำเอง)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, book_id } = body;

    // Validation
    if (!user_id || !book_id) {
      return NextResponse.json({ 
        error: 'กรุณาระบุข้อมูลที่จำเป็น (user_id, book_id)' 
      }, { status: 400 });
    }

    const pool = await getConnection();

    // ตรวจสอบว่า user มีอยู่และยังใช้งานได้
    const userCheck = await pool.request()
      .input('user_id', sql.Int, parseInt(user_id))
      .query(`
        SELECT user_id, status, user_type 
        FROM users 
        WHERE user_id = @user_id AND deleted_at IS NULL
      `);
    
    if (userCheck.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }

    if (userCheck.recordset[0].status !== 'active') {
      return NextResponse.json({ error: 'บัญชีผู้ใช้ไม่สามารถใช้งานได้' }, { status: 400 });
    }

    // ตรวจสอบข้อมูลหนังสือและกลุ่มผู้อ่าน
    const bookCheck = await pool.request()
      .input('book_id', sql.Int, parseInt(book_id))
      .query(`
        SELECT book_id, reader_group, status, book_limit, title
        FROM books 
        WHERE book_id = @book_id AND deleted_at IS NULL
      `);
    
    if (bookCheck.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบหนังสือ' }, { status: 404 });
    }

    const book = bookCheck.recordset[0];
    const user = userCheck.recordset[0];

    if (book.status !== 'active') {
      return NextResponse.json({ error: 'หนังสือไม่สามารถจองได้ในขณะนี้' }, { status: 400 });
    }

    // ตรวจสอบกลุ่มผู้อ่าน
    if (book.reader_group === 'children' && user.user_type !== 'citizen') {
      return NextResponse.json({ error: 'หนังสือสำหรับเด็กใช้ได้เฉพาะสมาชิกประชาชนทั่วไป' }, { status: 400 });
    }
    
    if (book.reader_group === 'education' && user.user_type !== 'educational') {
      return NextResponse.json({ error: 'หนังสือการศึกษาใช้ได้เฉพาะสมาชิกสถาบันการศึกษา' }, { status: 400 });
    }

    // ตรวจสอบจำนวนหนังสือที่ผู้ใช้ยืมอยู่ในปัจจุบัน (รวมการจอง)
    const currentBorrowsResult = await pool.request()
      .input('user_id', sql.Int, parseInt(user_id))
      .query(`
        SELECT COUNT(*) as current_borrows
        FROM borrow_transactions bt
        JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        WHERE bt.user_id = @user_id 
        AND bt.return_date IS NULL 
        AND bt.deleted_at IS NULL
      `);

    const currentBorrows = currentBorrowsResult.recordset[0].current_borrows;
    
    if (currentBorrows >= book.book_limit) {
      return NextResponse.json({ 
        error: `คุณยืมหนังสือเกินจำนวนที่กำหนด (${book.book_limit} เล่ม) กรุณาคืนหนังสือก่อนจองใหม่` 
      }, { status: 400 });
    }

    // ตรวจสอบว่าผู้ใช้ได้จองหนังสือเล่มนี้ไว้แล้วหรือไม่
    const existingReservation = await pool.request()
      .input('user_id', sql.Int, parseInt(user_id))
      .input('book_id', sql.Int, parseInt(book_id))
      .query(`
        SELECT bt.borrow_transactions_id
        FROM borrow_transactions bt
        JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        WHERE bt.user_id = @user_id 
        AND bc.book_id = @book_id
        AND bt.borrow_date IS NULL
        AND bt.deleted_at IS NULL
      `);

    if (existingReservation.recordset.length > 0) {
      return NextResponse.json({ error: 'คุณได้จองหนังสือเล่มนี้ไว้แล้ว' }, { status: 400 });
    }

    // หาหนังสือที่ว่างอยู่
    const availableCopyResult = await pool.request()
      .input('book_id', sql.Int, parseInt(book_id))
      .query(`
        SELECT TOP 1 book_copies_id
        FROM book_copies 
        WHERE book_id = @book_id 
        AND status = 'available' 
        AND deleted_at IS NULL
        ORDER BY book_copies_id
      `);

    if (availableCopyResult.recordset.length === 0) {
      return NextResponse.json({ error: 'หนังสือเล่มนี้ไม่ว่างในขณะนี้' }, { status: 400 });
    }

    const bookCopyId = availableCopyResult.recordset[0].book_copies_id;

    // เริ่ม transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // สร้างรายการจอง (ยังไม่มี staff_id, borrow_date, due_date)
      await transaction.request()
        .input('user_id', sql.Int, parseInt(user_id))
        .input('book_copies_id', sql.Int, bookCopyId)
        .input('created_at', sql.DateTime, new Date())
        .query(`
          INSERT INTO borrow_transactions (
            user_id, book_copies_id, staff_id, borrow_date, due_date, created_at
          )
          VALUES (
            @user_id, @book_copies_id, NULL, NULL, NULL, @created_at
          )
        `);

      // อัปเดตสถานะของ book_copy เป็น reservations
      await transaction.request()
        .input('book_copies_id', sql.Int, bookCopyId)
        .input('updated_at', sql.DateTime, new Date())
        .query(`
          UPDATE book_copies 
          SET status = 'reservations', updated_at = @updated_at
          WHERE book_copies_id = @book_copies_id
        `);

      await transaction.commit();

      return NextResponse.json({ 
        message: 'จองหนังสือสำเร็จ',
        data: {
          book_title: book.title,
          reservation_expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          note: 'กรุณามารับหนังสือภายใน 24 ชั่วโมง'
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (err: unknown) {
    console.error('POST /api/reservations ERROR:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการจองหนังสือ' }, { status: 500 });
  }
}

// GET /api/reservations - ดูรายการจองทั้งหมด
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const pool = await getConnection();
    
    let whereClause = `WHERE bt.borrow_date IS NULL 
                      AND bt.due_date IS NULL 
                      AND bt.staff_id IS NULL
                      AND bt.deleted_at IS NULL`;
    let inputs: any[] = [];

    if (user_id) {
      whereClause += ' AND bt.user_id = @user_id';
      inputs.push({ name: 'user_id', type: sql.Int, value: parseInt(user_id) });
    }

    const query = `
      SELECT 
        bt.borrow_transactions_id,
        bt.user_id,
        u.name as user_name,
        u.email as user_email,
        bt.book_copies_id,
        b.title as book_title,
        b.author,
        b.isbn,
        b.book_image,
        bt.created_at as reservation_date,
        DATEADD(HOUR, 24, bt.created_at) as expires_at,
        CASE 
          WHEN DATEDIFF(HOUR, bt.created_at, GETDATE()) > 24 THEN 'expired'
          ELSE 'active'
        END as status,
        DATEDIFF(HOUR, bt.created_at, GETDATE()) as hours_since_reservation
      FROM borrow_transactions bt
      INNER JOIN users u ON bt.user_id = u.user_id
      INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
      INNER JOIN books b ON bc.book_id = b.book_id
      ${whereClause}
      ORDER BY bt.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const request = pool.request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit);

    inputs.forEach(input => {
      request.input(input.name, input.type, input.value);
    });

    const result = await request.query(query);

    // นับจำนวนรายการทั้งหมด
    const countQuery = `
      SELECT COUNT(*) as total
      FROM borrow_transactions bt
      INNER JOIN users u ON bt.user_id = u.user_id
      INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
      INNER JOIN books b ON bc.book_id = b.book_id
      ${whereClause}
    `;

    const countRequest = pool.request();
    inputs.forEach(input => {
      countRequest.input(input.name, input.type, input.value);
    });

    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    return NextResponse.json({
      data: result.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err: unknown) {
    console.error('GET /api/reservations ERROR:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}

// DELETE /api/reservations - ยกเลิกการจอง
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reservation_id = searchParams.get('id');
    const user_id = searchParams.get('user_id');

    if (!reservation_id) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสการจอง' }, { status: 400 });
    }

    const pool = await getConnection();

    // ตรวจสอบการจอง
    let whereClause = `WHERE bt.borrow_transactions_id = @reservation_id 
                      AND bt.borrow_date IS NULL 
                      AND bt.deleted_at IS NULL`;
    
    const checkRequest = pool.request()
      .input('reservation_id', sql.Int, parseInt(reservation_id));

    if (user_id) {
      whereClause += ' AND bt.user_id = @user_id';
      checkRequest.input('user_id', sql.Int, parseInt(user_id));
    }

    const reservationCheck = await checkRequest.query(`
      SELECT bt.borrow_transactions_id, bt.book_copies_id, b.title
      FROM borrow_transactions bt
      INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
      INNER JOIN books b ON bc.book_id = b.book_id
      ${whereClause}
    `);

    if (reservationCheck.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบการจองนี้' }, { status: 404 });
    }

    const reservation = reservationCheck.recordset[0];

    // เริ่ม transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ยกเลิกการจอง (soft delete)
      await transaction.request()
        .input('reservation_id', sql.Int, parseInt(reservation_id))
        .input('deleted_at', sql.DateTime, new Date())
        .query(`
          UPDATE borrow_transactions 
          SET deleted_at = @deleted_at
          WHERE borrow_transactions_id = @reservation_id
        `);

      // คืนสถานะหนังสือ
      await transaction.request()
        .input('book_copies_id', sql.Int, reservation.book_copies_id)
        .input('updated_at', sql.DateTime, new Date())
        .query(`
          UPDATE book_copies 
          SET status = 'available', updated_at = @updated_at
          WHERE book_copies_id = @book_copies_id
        `);

      await transaction.commit();

      return NextResponse.json({ 
        message: 'ยกเลิกการจองสำเร็จ',
        data: {
          book_title: reservation.title
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (err: unknown) {
    console.error('DELETE /api/reservations ERROR:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการยกเลิกการจอง' }, { status: 500 });
  }
}