// =============================================================================
// /api/borrow/return/route.ts - สำหรับการคืนหนังสือ
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

// POST /api/borrow/return - คืนหนังสือ
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { borrow_transaction_id, staff_id, fine_amount = 0 } = body;

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
    const thaiTime = getCurrentThaiTime();

    // ตรวจสอบว่า staff มีอยู่และยังใช้งานได้
    const staffCheck = await pool
      .request()
      .input("staff_id", sql.Int, parseInt(staff_id)).query(`
        SELECT staff_id, status, name 
        FROM staffs 
        WHERE staff_id = @staff_id AND deleted_at IS NULL
      `);

    if (
      staffCheck.recordset.length === 0 ||
      staffCheck.recordset[0].status !== "active"
    ) {
      return NextResponse.json(
        { error: "ไม่พบเจ้าหน้าที่หรือบัญชีไม่สามารถใช้งานได้" },
        { status: 400 }
      );
    }

    // ตรวจสอบการยืม
    const borrowCheck = await pool
      .request()
      .input("borrow_transaction_id", sql.Int, parseInt(borrow_transaction_id))
      .query(`
        SELECT 
          bt.borrow_transactions_id,
          bt.user_id,
          bt.book_copies_id,
          bt.borrow_date,
          bt.due_date,
          bt.return_date,
          b.title,
          b.author,
          u.name as user_name,
          CASE 
            WHEN bt.due_date < GETDATE() THEN DATEDIFF(day, bt.due_date, GETDATE())
            ELSE 0
          END as overdue_days
        FROM borrow_transactions bt
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        INNER JOIN users u ON bt.user_id = u.user_id
        WHERE bt.borrow_transactions_id = @borrow_transaction_id
        AND bt.borrow_date IS NOT NULL
        AND bt.return_date IS NULL
        AND bt.deleted_at IS NULL
      `);

    if (borrowCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบการยืมนี้หรือได้คืนแล้ว" },
        { status: 404 }
      );
    }

    const borrowRecord = borrowCheck.recordset[0];

    // เริ่ม transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // อัปเดตการคืนหนังสือ
      await transaction
        .request()
        .input(
          "borrow_transaction_id",
          sql.Int,
          parseInt(borrow_transaction_id)
        )
        .input("return_date", sql.DateTime, thaiTime)
        .input("fine", sql.Decimal(10, 2), parseFloat(fine_amount))
        .input("updated_at", sql.DateTime, thaiTime).query(`
          UPDATE borrow_transactions 
          SET return_date = @return_date,
              fine = @fine,
              updated_at = @updated_at
          WHERE borrow_transactions_id = @borrow_transaction_id
        `);

      // คืนสถานะหนังสือ
      await transaction
        .request()
        .input("book_copies_id", sql.Int, borrowRecord.book_copies_id)
        .input("updated_at", sql.DateTime, thaiTime).query(`
          UPDATE book_copies 
          SET status = 'available', updated_at = @updated_at
          WHERE book_copies_id = @book_copies_id
        `);

      await transaction.commit();

      return NextResponse.json({
        message: "คืนหนังสือสำเร็จ",
        data: {
          book_title: borrowRecord.title,
          user_name: borrowRecord.user_name,
          borrow_date: borrowRecord.borrow_date
            ? formatDatabaseDateTime(borrowRecord.borrow_date)
            : null,
          due_date: borrowRecord.due_date
            ? formatDatabaseDateTime(borrowRecord.due_date)
            : null,
          return_date: formatThaiDateTimeForDisplay(thaiTime),
          overdue_days: borrowRecord.overdue_days,
          fine_amount: parseFloat(fine_amount),
          staff_name: staffCheck.recordset[0].name,
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (err: unknown) {
    console.error("POST /api/borrow/return ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการคืนหนังสือ" },
      { status: 500 }
    );
  }
}

// GET /api/borrow/return - ดึงข้อมูลการคืนทั้งหมด
export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        bt.borrow_transactions_id,
        b.title,
        u.name as returner,
        bt.user_id,
        bt.book_copies_id,
        bt.borrow_date,
        bt.due_date,
        bt.return_date,
        bt.fine,
        b.author,
        b.isbn,
        s.name as staff_name
      FROM borrow_transactions bt
      INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
      INNER JOIN books b ON bc.book_id = b.book_id
      INNER JOIN users u ON bt.user_id = u.user_id
      INNER JOIN staffs s ON bt.staff_id = s.staff_id
      WHERE bt.return_date IS NULL
        AND bt.borrow_date IS NOT NULL
        AND bt.due_date IS NOT NULL
        AND s.name IS NOT NULL
      ORDER BY bt.borrow_transactions_id DESC
    `);

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

    return NextResponse.json(formattedData);
  } catch (err) {
    console.error("GET /api/borrow/return ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

