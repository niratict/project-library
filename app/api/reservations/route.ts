// /api/reservations/route.ts - แก้ไขการจัดการเวลาไทยให้ถูกต้อง
import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";

// ฟังก์ชันจัดการเวลาไทยใหม่ - เรียบง่ายและถูกต้อง
const getCurrentThaiTime = () => {
  const now = new Date();
  // เพิ่ม 7 ชั่วโมงเพื่อให้ได้เวลาไทย
  const thaiTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return thaiTime;
};

const formatThaiDateTime = (date: Date) => {
  // แปลงเป็นเวลาไทยแล้วแสดงผล
  const thaiTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return thaiTime.toISOString().replace("T", " ").substring(0, 19);
};

const formatThaiDateTimeForDisplay = (date: Date) => {
  // สำหรับแสดงผลใน frontend
  const thaiTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return thaiTime.toISOString();
};

// POST /api/reservations - สร้างการจองหนังสือใหม่
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, book_id } = body;

    // Validation
    if (!user_id || !book_id) {
      return NextResponse.json(
        {
          error: "กรุณาระบุข้อมูลที่จำเป็น (user_id, book_id)",
        },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // ตรวจสอบว่า user มีอยู่และยังใช้งานได้
    const userCheck = await pool
      .request()
      .input("user_id", sql.Int, parseInt(user_id)).query(`
        SELECT user_id, status, user_type 
        FROM users 
        WHERE user_id = @user_id AND deleted_at IS NULL
      `);

    if (userCheck.recordset.length === 0) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    if (userCheck.recordset[0].status !== "active") {
      return NextResponse.json(
        { error: "บัญชีผู้ใช้ไม่สามารถใช้งานได้" },
        { status: 400 }
      );
    }

    // ตรวจสอบข้อมูลหนังสือและกลุ่มผู้อ่าน
    const bookCheck = await pool
      .request()
      .input("book_id", sql.Int, parseInt(book_id)).query(`
        SELECT book_id, reader_group, status, book_limit, title
        FROM books 
        WHERE book_id = @book_id AND deleted_at IS NULL
      `);

    if (bookCheck.recordset.length === 0) {
      return NextResponse.json({ error: "ไม่พบหนังสือ" }, { status: 404 });
    }

    const book = bookCheck.recordset[0];
    const user = userCheck.recordset[0];

    if (book.status !== "active") {
      return NextResponse.json(
        { error: "หนังสือไม่สามารถจองได้ในขณะนี้" },
        { status: 400 }
      );
    }

    // ตรวจสอบกลุ่มผู้อ่าน
    if (book.reader_group === "children" && user.user_type !== "citizen") {
      return NextResponse.json(
        { error: "หนังสือสำหรับเด็กใช้ได้เฉพาะสมาชิกประชาชนทั่วไป" },
        { status: 400 }
      );
    }

    if (book.reader_group === "education" && user.user_type !== "educational") {
      return NextResponse.json(
        { error: "หนังสือการศึกษาใช้ได้เฉพาะสมาชิกสถาบันการศึกษา" },
        { status: 400 }
      );
    }

    // ตรวจสอบจำนวนหนังสือที่ผู้ใช้ยืมอยู่ในปัจจุบัน
    const currentBorrowsResult = await pool
      .request()
      .input("user_id", sql.Int, parseInt(user_id)).query(`
        SELECT COUNT(*) as current_borrows
        FROM borrow_transactions bt
        JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        WHERE bt.user_id = @user_id 
        AND bt.return_date IS NULL 
        AND bt.deleted_at IS NULL
      `);

    const currentBorrows = currentBorrowsResult.recordset[0].current_borrows;

    if (currentBorrows >= book.book_limit) {
      return NextResponse.json(
        {
          error: `คุณยืมหนังสือเกินจำนวนที่กำหนด (${book.book_limit} เล่ม) กรุณาคืนหนังสือก่อนจองใหม่`,
        },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าผู้ใช้ได้จองหนังสือเล่มนี้ไว้แล้วหรือไม่
    const existingReservation = await pool
      .request()
      .input("user_id", sql.Int, parseInt(user_id))
      .input("book_id", sql.Int, parseInt(book_id)).query(`
        SELECT bt.borrow_transactions_id
        FROM borrow_transactions bt
        JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        WHERE bt.user_id = @user_id 
        AND bc.book_id = @book_id
        AND bt.borrow_date IS NULL
        AND bt.deleted_at IS NULL
      `);

    if (existingReservation.recordset.length > 0) {
      return NextResponse.json(
        { error: "คุณได้จองหนังสือเล่มนี้ไว้แล้ว" },
        { status: 400 }
      );
    }

    // หาหนังสือที่ว่างอยู่
    const availableCopyResult = await pool
      .request()
      .input("book_id", sql.Int, parseInt(book_id)).query(`
        SELECT TOP 1 book_copies_id
        FROM book_copies 
        WHERE book_id = @book_id 
        AND status = 'available' 
        AND deleted_at IS NULL
        ORDER BY book_copies_id
      `);

    if (availableCopyResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "หนังสือเล่มนี้ไม่ว่างในขณะนี้" },
        { status: 400 }
      );
    }

    const bookCopyId = availableCopyResult.recordset[0].book_copies_id;

    // เริ่ม transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ใช้เวลา UTC สำหรับบันทึกในฐานข้อมูล
      const currentTime = new Date();

      await transaction
        .request()
        .input("user_id", sql.Int, parseInt(user_id))
        .input("book_copies_id", sql.Int, bookCopyId)
        .input("created_at", sql.DateTime, currentTime).query(`
          INSERT INTO borrow_transactions (
            user_id, book_copies_id, staff_id, borrow_date, due_date, created_at
          )
          VALUES (
            @user_id, @book_copies_id, NULL, NULL, NULL, @created_at
          )
        `);

      // อัปเดตสถานะของ book_copy เป็น reservations
      await transaction
        .request()
        .input("book_copies_id", sql.Int, bookCopyId)
        .input("updated_at", sql.DateTime, currentTime).query(`
          UPDATE book_copies 
          SET status = 'reservations', updated_at = @updated_at
          WHERE book_copies_id = @book_copies_id
        `);

      await transaction.commit();

      // คำนวณเวลาหมดอายุ (24 ชั่วโมงจากเวลาปัจจุบัน)
      const expiresAt = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
      const currentThaiTime = getCurrentThaiTime();

      return NextResponse.json({
        message: "จองหนังสือสำเร็จ",
        data: {
          book_title: book.title,
          reservation_time: formatThaiDateTimeForDisplay(currentTime),
          reservation_time_thai: formatThaiDateTime(currentTime),
          expires_at: formatThaiDateTimeForDisplay(expiresAt),
          expires_at_thai: formatThaiDateTime(expiresAt),
          current_thai_time: formatThaiDateTimeForDisplay(currentThaiTime),
          note: "กรุณามารับหนังสือภายใน 24 ชั่วโมง",
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (err: unknown) {
    console.error("POST /api/reservations ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการจองหนังสือ" },
      { status: 500 }
    );
  }
}

// GET /api/reservations - ดูรายการจองทั้งหมด
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const pool = await getConnection();

    let whereClause = `WHERE bt.borrow_date IS NULL 
                      AND bt.due_date IS NULL 
                      AND bt.staff_id IS NULL
                      AND bt.deleted_at IS NULL`;
    let inputs: any[] = [];

    if (user_id) {
      whereClause += " AND bt.user_id = @user_id";
      inputs.push({ name: "user_id", type: sql.Int, value: parseInt(user_id) });
    }

    const currentTime = new Date();

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
          WHEN DATEDIFF(MINUTE, bt.created_at, @current_time) > 1440 THEN 'expired'
          ELSE 'active'
        END as status,
        DATEDIFF(HOUR, bt.created_at, @current_time) as hours_since_reservation,
        DATEDIFF(MINUTE, bt.created_at, @current_time) as minutes_since_reservation
      FROM borrow_transactions bt
      INNER JOIN users u ON bt.user_id = u.user_id
      INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
      INNER JOIN books b ON bc.book_id = b.book_id
      ${whereClause}
      ORDER BY bt.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const request = pool
      .request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .input("current_time", sql.DateTime, currentTime);

    inputs.forEach((input) => {
      request.input(input.name, input.type, input.value);
    });

    const result = await request.query(query);

    // เพิ่มข้อมูลเวลาไทยที่ถูกต้อง
    const processedData = result.recordset.map((row) => {
      const reservationTime = new Date(row.reservation_date);
      const expiresTime = new Date(row.expires_at);
      const currentDateTime = new Date();

      // คำนวณเวลาที่ผ่านไป (เป็นนาที)
      const minutesPassed = Math.floor(
        (currentDateTime.getTime() - reservationTime.getTime()) / (1000 * 60)
      );
      const hoursPassed = Math.floor(minutesPassed / 60);
      const remainingMinutes = minutesPassed % 60;

      // คำนวณเวลาที่เหลือ
      const minutesLeft = Math.max(0, 24 * 60 - minutesPassed);
      const hoursLeft = Math.floor(minutesLeft / 60);
      const minsLeft = minutesLeft % 60;

      return {
        ...row,
        reservation_date_thai: formatThaiDateTime(reservationTime),
        expires_at_thai: formatThaiDateTime(expiresTime),
        current_thai_time: formatThaiDateTime(currentDateTime),
        reservation_date_iso: formatThaiDateTimeForDisplay(reservationTime),
        expires_at_iso: formatThaiDateTimeForDisplay(expiresTime),
        current_thai_time_iso: formatThaiDateTimeForDisplay(currentDateTime),
        accurate_hours_passed: hoursPassed,
        accurate_minutes_passed: remainingMinutes,
        hours_left: hoursLeft,
        minutes_left: minsLeft,
        status: minutesPassed > 24 * 60 ? "expired" : "active",
      };
    });

    // นับจำนวนรายการทั้งหมด
    const countQuery = `
      SELECT COUNT(*) as total
      FROM borrow_transactions bt
      INNER JOIN users u ON bt.user_id = u.user_id
      INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
      INNER JOIN books b ON bc.book_id = b.book_id
      ${whereClause}
    `;

    const countRequest = pool
      .request()
      .input("current_time", sql.DateTime, currentTime);

    inputs.forEach((input) => {
      countRequest.input(input.name, input.type, input.value);
    });

    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    return NextResponse.json({
      data: processedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      server_info: {
        current_thai_time: formatThaiDateTime(currentTime),
        current_thai_time_iso: formatThaiDateTimeForDisplay(currentTime),
        timezone: "Asia/Bangkok (UTC+7)",
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/reservations ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// DELETE /api/reservations - ยกเลิกการจอง
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reservation_id = searchParams.get("id");
    const user_id = searchParams.get("user_id");

    if (!reservation_id) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสการจอง" },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // ตรวจสอบการจอง
    let whereClause = `WHERE bt.borrow_transactions_id = @reservation_id 
                      AND bt.borrow_date IS NULL 
                      AND bt.deleted_at IS NULL`;

    const checkRequest = pool
      .request()
      .input("reservation_id", sql.Int, parseInt(reservation_id));

    if (user_id) {
      whereClause += " AND bt.user_id = @user_id";
      checkRequest.input("user_id", sql.Int, parseInt(user_id));
    }

    const reservationCheck = await checkRequest.query(`
      SELECT bt.borrow_transactions_id, bt.book_copies_id, b.title
      FROM borrow_transactions bt
      INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
      INNER JOIN books b ON bc.book_id = b.book_id
      ${whereClause}
    `);

    if (reservationCheck.recordset.length === 0) {
      return NextResponse.json({ error: "ไม่พบการจองนี้" }, { status: 404 });
    }

    const reservation = reservationCheck.recordset[0];

    // เริ่ม transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const currentTime = new Date();

      // ยกเลิกการจอง (soft delete)
      await transaction
        .request()
        .input("reservation_id", sql.Int, parseInt(reservation_id))
        .input("deleted_at", sql.DateTime, currentTime).query(`
          UPDATE borrow_transactions 
          SET deleted_at = @deleted_at
          WHERE borrow_transactions_id = @reservation_id
        `);

      // คืนสถานะหนังสือ
      await transaction
        .request()
        .input("book_copies_id", sql.Int, reservation.book_copies_id)
        .input("updated_at", sql.DateTime, currentTime).query(`
          UPDATE book_copies 
          SET status = 'available', updated_at = @updated_at
          WHERE book_copies_id = @book_copies_id
        `);

      await transaction.commit();

      return NextResponse.json({
        message: "ยกเลิกการจองสำเร็จ",
        data: {
          book_title: reservation.title,
          cancelled_at: formatThaiDateTimeForDisplay(currentTime),
          cancelled_at_thai: formatThaiDateTime(currentTime),
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (err: unknown) {
    console.error("DELETE /api/reservations ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการยกเลิกการจอง" },
      { status: 500 }
    );
  }
}
