// =============================================================================
// /api/borrow/return/[id]/route.ts - สำหรับแก้ไขค่าปรับในการคืนหนังสือ
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

// Helper function สำหรับแปลงเวลาจาก Database
function formatDatabaseDateTime(dateFromDB: Date): string {
  if (!dateFromDB) return "";
  return dateFromDB.toISOString().replace("T", " ").substring(0, 19);
}

// PUT /api/borrow/return/[id] - แก้ไขค่าปรับ
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { fine_amount } = body;
    const borrow_transaction_id = params.id;

    // Validation
    if (!borrow_transaction_id) {
      return NextResponse.json(
        { error: "กรุณาระบุ ID ของการยืม" },
        { status: 400 }
      );
    }

    if (fine_amount === undefined || fine_amount === null) {
      return NextResponse.json(
        { error: "กรุณาระบุจำนวนค่าปรับ" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าค่าปรับเป็นตัวเลขและไม่ติดลบ
    const fineValue = parseFloat(fine_amount);
    if (isNaN(fineValue) || fineValue < 0) {
      return NextResponse.json(
        { error: "ค่าปรับต้องเป็นตัวเลขและไม่ติดลบ" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const thaiTime = getCurrentThaiTime();

    // ตรวจสอบว่ามีการคืนหนังสือนี้อยู่จริง
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
          bt.fine,
          b.title,
          b.author,
          u.name as user_name,
          s.name as staff_name
        FROM borrow_transactions bt
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        INNER JOIN users u ON bt.user_id = u.user_id
        LEFT JOIN staffs s ON bt.staff_id = s.staff_id
        WHERE bt.borrow_transactions_id = @borrow_transaction_id
        AND bt.return_date IS NOT NULL
        AND bt.deleted_at IS NULL
      `);

    if (borrowCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบการคืนหนังสือนี้หรือยังไม่ได้คืน" },
        { status: 404 }
      );
    }

    const borrowRecord = borrowCheck.recordset[0];

    // อัปเดตค่าปรับ
    await pool
      .request()
      .input("borrow_transaction_id", sql.Int, parseInt(borrow_transaction_id))
      .input("fine", sql.Decimal(10, 2), fineValue)
      .input("updated_at", sql.DateTime, thaiTime)
      .query(`
        UPDATE borrow_transactions 
        SET fine = @fine,
            updated_at = @updated_at
        WHERE borrow_transactions_id = @borrow_transaction_id
      `);

    // ดึงข้อมูลที่อัปเดตแล้ว
    const updatedRecord = await pool
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
          bt.fine,
          b.title,
          b.author,
          u.name as user_name,
          s.name as staff_name
        FROM borrow_transactions bt
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        INNER JOIN users u ON bt.user_id = u.user_id
        LEFT JOIN staffs s ON bt.staff_id = s.staff_id
        WHERE bt.borrow_transactions_id = @borrow_transaction_id
      `);

    const updated = updatedRecord.recordset[0];

    return NextResponse.json({
      message: "อัปเดตค่าปรับสำเร็จ",
      data: {
        borrow_transaction_id: updated.borrow_transactions_id,
        book_title: updated.title,
        author: updated.author,
        user_name: updated.user_name,
        staff_name: updated.staff_name,
        borrow_date: updated.borrow_date
          ? formatDatabaseDateTime(updated.borrow_date)
          : null,
        due_date: updated.due_date
          ? formatDatabaseDateTime(updated.due_date)
          : null,
        return_date: updated.return_date
          ? formatDatabaseDateTime(updated.return_date)
          : null,
        old_fine: parseFloat(borrowRecord.fine || 0),
        new_fine: fineValue,
        updated_at: formatDatabaseDateTime(thaiTime),
      },
    });

  } catch (err: unknown) {
    console.error("PUT /api/borrow/return/[id] ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตค่าปรับ" },
      { status: 500 }
    );
  }
}