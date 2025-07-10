// /api/borrow/return/route.ts - สำหรับการคืนหนังสือ
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

// POST /api/borrow/return - คืนหนังสือ
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      borrow_transaction_id,
      staff_id,
      fine_amount = 0 // ค่าปรับ (ถ้ามี)
    } = body;

    // Validation
    if (!borrow_transaction_id || !staff_id) {
      return NextResponse.json({ 
        error: 'กรุณาระบุข้อมูลที่จำเป็น (borrow_transaction_id, staff_id)' 
      }, { status: 400 });
    }

    const pool = await getConnection();

    // ตรวจสอบว่า staff มีอยู่และยังใช้งานได้
    const staffCheck = await pool.request()
      .input('staff_id', sql.Int, parseInt(staff_id))
      .query(`
        SELECT staff_id, status 
        FROM staffs 
        WHERE staff_id = @staff_id AND deleted_at IS NULL
      `);
    
    if (staffCheck.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบเจ้าหน้าที่' }, { status: 404 });
    }

    if (staffCheck.recordset[0].status !== 'active') {
      return NextResponse.json({ error: 'บัญชีเจ้าหน้าที่ไม่สามารถใช้งานได้' }, { status: 400 });
    }

    // ตรวจสอบรายการยืมและดึงข้อมูล
    const borrowCheck = await pool.request()
      .input('borrow_transaction_id', sql.Int, parseInt(borrow_transaction_id))
      .query(`
        SELECT 
          bt.borrow_transactions_id,
          bt.user_id,
          bt.book_copies_id,
          bt.borrow_date,
          bt.due_date,
          bt.return_date,
          bt.fine,
          u.name as user_name,
          b.title as book_title,
          b.author,
          DATEDIFF(day, bt.due_date, GETDATE()) as days_overdue
        FROM borrow_transactions bt
        INNER JOIN users u ON bt.user_id = u.user_id
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        WHERE bt.borrow_transactions_id = @borrow_transaction_id 
        AND bt.deleted_at IS NULL
      `);

    if (borrowCheck.recordset.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการยืมหนังสือ' }, { status: 404 });
    }

    const borrowRecord = borrowCheck.recordset[0];

    // ตรวจสอบว่าหนังสือถูกคืนแล้วหรือไม่
    if (borrowRecord.return_date) {
      return NextResponse.json({ 
        error: 'หนังสือเล่มนี้ถูกคืนแล้ว',
        return_date: borrowRecord.return_date 
      }, { status: 400 });
    }

    const returnDate = new Date();
    let calculatedFine = 0;

    // คำนวณค่าปรับถ้าคืนช้า (5 บาทต่อวัน)
    if (borrowRecord.days_overdue > 0) {
      calculatedFine = borrowRecord.days_overdue * 5; // 5 บาทต่อวัน
    }

    // ใช้ค่าปรับที่ส่งมา หรือคำนวณใหม่
    const finalFine = fine_amount || calculatedFine;

    // เริ่ม transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // อัปเดตรายการยืม
      await transaction.request()
        .input('borrow_transaction_id', sql.Int, parseInt(borrow_transaction_id))
        .input('return_date', sql.Date, returnDate)
        .input('fine', sql.Decimal(5,2), finalFine)
        .input('updated_at', sql.DateTime, new Date())
        .query(`
          UPDATE borrow_transactions
          SET return_date = @return_date,
              fine = @fine,
              updated_at = @updated_at
          WHERE borrow_transactions_id = @borrow_transaction_id
        `);

      // อัปเดตสถานะของ book_copy เป็น available
      await transaction.request()
        .input('book_copies_id', sql.Int, borrowRecord.book_copies_id)
        .input('updated_at', sql.DateTime, new Date())
        .query(`
          UPDATE book_copies 
          SET status = 'available', updated_at = @updated_at
          WHERE book_copies_id = @book_copies_id
        `);

      await transaction.commit();

      return NextResponse.json({ 
        message: 'คืนหนังสือสำเร็จ',
        data: {
          user_name: borrowRecord.user_name,
          book_title: borrowRecord.book_title,
          author: borrowRecord.author,
          borrow_date: borrowRecord.borrow_date,
          due_date: borrowRecord.due_date,
          return_date: returnDate.toISOString().split('T')[0],
          days_overdue: Math.max(0, borrowRecord.days_overdue),
          fine: finalFine,
          is_overdue: borrowRecord.days_overdue > 0
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (err: unknown) {
    console.error('POST /api/borrow/return ERROR:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการคืนหนังสือ' }, { status: 500 });
  }
}

// GET /api/borrow/return - ดูรายการหนังสือที่คืนแล้ว
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const pool = await getConnection();
    
    let whereClause = 'WHERE bt.deleted_at IS NULL AND bt.return_date IS NOT NULL';
    let inputs: any[] = [];

    if (user_id) {
      whereClause += ' AND bt.user_id = @user_id';
      inputs.push({ name: 'user_id', type: sql.Int, value: parseInt(user_id) });
    }

    if (date_from) {
      whereClause += ' AND bt.return_date >= @date_from';
      inputs.push({ name: 'date_from', type: sql.Date, value: new Date(date_from) });
    }

    if (date_to) {
      whereClause += ' AND bt.return_date <= @date_to';
      inputs.push({ name: 'date_to', type: sql.Date, value: new Date(date_to) });
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
        bt.borrow_date,
        bt.due_date,
        bt.return_date,
        bt.fine,
        s.name as staff_name,
        DATEDIFF(day, bt.due_date, bt.return_date) as days_late
      FROM borrow_transactions bt
      INNER JOIN users u ON bt.user_id = u.user_id
      INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
      INNER JOIN books b ON bc.book_id = b.book_id
      INNER JOIN staffs s ON bt.staff_id = s.staff_id
      ${whereClause}
      ORDER BY bt.return_date DESC
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
    console.error('GET /api/borrow/return ERROR:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}