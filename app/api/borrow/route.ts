// =============================================================================
// /api/borrow/route.ts - สำหรับการยืนยันการยืมโดยเจ้าหน้าที่
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";

// ฟังก์ชันจัดการเวลาไทยใหม่ - ให้ได้เวลาไทยสำหรับบันทึกในฐานข้อมูล
const getCurrentThaiTime = () => {
  const now = new Date();
  // เพิ่ม 7 ชั่วโมงเพื่อให้ได้เวลาไทยสำหรับบันทึกในฐานข้อมูล
  const thaiTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return thaiTime;
};

const formatThaiDateTime = (date: Date) => {
  // แสดงเวลาไทยในรูปแบบ YYYY-MM-DD HH:mm:ss
  return date.toISOString().replace("T", " ").substring(0, 19);
};

const formatThaiDateTimeForDisplay = (date: Date) => {
  // สำหรับแสดงผลใน frontend (YYYY-MM-DD HH:mm:ss)
  return date.toISOString().replace("T", " ").substring(0, 19);
};

// Helper function สำหรับแปลงเวลาจาก Database - แก้ไขแล้ว
function formatDatabaseDateTime(dateFromDB: Date): string {
  if (!dateFromDB) return "";

  // เนื่องจากเวลาในฐานข้อมูลเป็นเวลาไทยอยู่แล้ว (บันทึกด้วย getCurrentThaiTime())
  // เราจึงไม่ต้องเพิ่ม +7 ชั่วโมงอีก แค่แปลงรูปแบบเท่านั้น
  return dateFromDB.toISOString().replace("T", " ").substring(0, 19);
}

// POST /api/borrow - ยืนยันการยืมจากการจอง
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { borrow_transaction_id, staff_id, borrow_days = 14 } = body;

    // Validation
    if (!borrow_transaction_id || !staff_id) {
      return NextResponse.json(
        {
          error: "กรุณาระบุข้อมูลที่จำเป็น (borrow_transaction_id, staff_id)",
        },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // ตรวจสอบว่า staff มีอยู่และยังใช้งานได้
    const staffCheck = await pool
      .request()
      .input("staff_id", sql.Int, parseInt(staff_id)).query(`
        SELECT staff_id, status, name 
        FROM staffs 
        WHERE staff_id = @staff_id AND deleted_at IS NULL
      `);

    if (staffCheck.recordset.length === 0) {
      return NextResponse.json({ error: "ไม่พบเจ้าหน้าที่" }, { status: 404 });
    }

    if (staffCheck.recordset[0].status !== "active") {
      return NextResponse.json(
        { error: "บัญชีเจ้าหน้าที่ไม่สามารถใช้งานได้" },
        { status: 400 }
      );
    }

    // ตรวจสอบการจอง
    const reservationCheck = await pool
      .request()
      .input("borrow_transaction_id", sql.Int, parseInt(borrow_transaction_id))
      .query(`
        SELECT 
          bt.borrow_transactions_id,
          bt.user_id,
          bt.book_copies_id,
          bt.created_at,
          b.title,
          b.author,
          u.name as user_name,
          bc.status as copy_status,
          DATEDIFF(HOUR, bt.created_at, GETDATE()) as hours_since_reservation
        FROM borrow_transactions bt
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        INNER JOIN users u ON bt.user_id = u.user_id
        WHERE bt.borrow_transactions_id = @borrow_transaction_id
        AND bt.borrow_date IS NULL
        AND bt.due_date IS NULL
        AND bt.staff_id IS NULL
        AND bt.deleted_at IS NULL
      `);

    if (reservationCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบการจองนี้หรือได้ดำเนินการแล้ว" },
        { status: 404 }
      );
    }

    const reservation = reservationCheck.recordset[0];

    // ตรวจสอบว่าการจองหมดอายุหรือไม่
    if (reservation.hours_since_reservation > 24) {
      return NextResponse.json(
        {
          error: "การจองหมดอายุแล้ว (เกิน 24 ชั่วโมง)",
          hours_since_reservation: reservation.hours_since_reservation,
        },
        { status: 400 }
      );
    }

    // คำนวณวันที่ยืมและกำหนดคืน (เวลาไทย)
    const borrowDate = getCurrentThaiTime();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(borrowDate.getDate() + parseInt(borrow_days));

    // เริ่ม transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ยืนยันการยืม (ใช้ sql.DateTime แทน sql.Date)
      await transaction
        .request()
        .input(
          "borrow_transaction_id",
          sql.Int,
          parseInt(borrow_transaction_id)
        )
        .input("borrow_date", sql.DateTime, borrowDate)
        .input("due_date", sql.DateTime, dueDate)
        .input("staff_id", sql.Int, parseInt(staff_id))
        .input("updated_at", sql.DateTime, getCurrentThaiTime()).query(`
          UPDATE borrow_transactions 
          SET borrow_date = @borrow_date,
              due_date = @due_date,
              staff_id = @staff_id,
              updated_at = @updated_at
          WHERE borrow_transactions_id = @borrow_transaction_id
        `);

      // อัปเดตสถานะของ book_copy เป็น borrowed
      await transaction
        .request()
        .input("book_copies_id", sql.Int, reservation.book_copies_id)
        .input("updated_at", sql.DateTime, getCurrentThaiTime()).query(`
          UPDATE book_copies 
          SET status = 'borrowed', updated_at = @updated_at
          WHERE book_copies_id = @book_copies_id
        `);

      await transaction.commit();

      return NextResponse.json({
        message: "ยืนยันการยืมสำเร็จ",
        data: {
          book_title: reservation.title,
          user_name: reservation.user_name,
          borrow_date: formatThaiDateTimeForDisplay(borrowDate),
          due_date: formatThaiDateTimeForDisplay(dueDate),
          borrow_days: borrow_days,
          staff_name: staffCheck.recordset[0].name,
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (err: unknown) {
    console.error("POST /api/borrow ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการยืนยันการยืม" },
      { status: 500 }
    );
  }
}

// GET /api/borrow - ดูรายการยืมทั้งหมด
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const status = searchParams.get("status"); // 'borrowed' or 'returned'
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const pool = await getConnection();

    let whereClause = `WHERE bt.borrow_date IS NOT NULL 
                      AND bt.deleted_at IS NULL`;
    let inputs: any[] = [];

    if (user_id) {
      whereClause += " AND bt.user_id = @user_id";
      inputs.push({ name: "user_id", type: sql.Int, value: parseInt(user_id) });
    }

    if (status === "borrowed") {
      whereClause += " AND bt.return_date IS NULL AND bt.due_date >= GETDATE()";
    } else if (status === "returned") {
      whereClause += " AND bt.return_date IS NOT NULL";
    } else if (status === "overdue") {
      whereClause += " AND bt.return_date IS NULL AND bt.due_date < GETDATE()";
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
        bt.borrow_date,
        bt.due_date,
        bt.return_date,
        bt.fine,
        s.name as staff_name,
        CASE 
          WHEN bt.return_date IS NULL AND bt.due_date < GETDATE() THEN 'overdue'
          WHEN bt.return_date IS NULL THEN 'borrowed'
          ELSE 'returned'
        END as status,
        CASE 
          WHEN bt.return_date IS NULL AND bt.due_date < GETDATE() 
          THEN DATEDIFF(day, bt.due_date, GETDATE())
          ELSE 0
        END as overdue_days
      FROM borrow_transactions bt
      INNER JOIN users u ON bt.user_id = u.user_id
      INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
      INNER JOIN books b ON bc.book_id = b.book_id
      LEFT JOIN staffs s ON bt.staff_id = s.staff_id
      ${whereClause}
      ORDER BY bt.borrow_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const request = pool
      .request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit);

    inputs.forEach((input) => {
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
      LEFT JOIN staffs s ON bt.staff_id = s.staff_id
      ${whereClause}
    `;

    const countRequest = pool.request();
    inputs.forEach((input) => {
      countRequest.input(input.name, input.type, input.value);
    });

    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // แปลงรูปแบบเวลาสำหรับแสดงผล - ใช้ฟังก์ชันที่แก้ไขแล้ว
    const formattedData = result.recordset.map((row) => ({
      ...row,
      borrow_date: row.borrow_date
        ? formatDatabaseDateTime(row.borrow_date)
        : null,
      due_date: row.due_date ? formatDatabaseDateTime(row.due_date) : null,
      return_date: row.return_date
        ? formatDatabaseDateTime(row.return_date)
        : null,
    }));

    return NextResponse.json({
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/borrow ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}
