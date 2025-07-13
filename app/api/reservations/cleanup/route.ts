// =============================================================================
// /api/reservations/cleanup/route.ts - สำหรับยกเลิกการจองที่หมดอายุ
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";

// ฟังก์ชันจัดการเวลาไทย - ให้สอดคล้องกับ route.ts หลัก
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

/// POST /api/reservations/cleanup - ยกเลิกการจองที่หมดอายุ
export async function POST(req: NextRequest) {
  try {
    const pool = await getConnection();
    const currentThaiTime = getCurrentThaiTime();

    // หาการจองที่เกิน 24 ชั่วโมง (1440 นาที) - ใช้เวลาไทย
    const expiredReservations = await pool
      .request()
      .input("current_time", sql.DateTime, currentThaiTime).query(`
        SELECT 
          bt.borrow_transactions_id,
          bt.book_copies_id,
          b.title,
          u.name as user_name,
          bt.created_at,
          DATEDIFF(HOUR, bt.created_at, @current_time) as hours_expired,
          DATEDIFF(MINUTE, bt.created_at, @current_time) as minutes_expired
        FROM borrow_transactions bt
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        INNER JOIN users u ON bt.user_id = u.user_id
        WHERE bc.status = 'reservations' 
        AND bt.borrow_date IS NULL
        AND bt.deleted_at IS NULL
        AND DATEDIFF(MINUTE, bt.created_at, @current_time) > 1440
      `);

    if (expiredReservations.recordset.length === 0) {
      return NextResponse.json({
        message: "ไม่มีการจองที่หมดอายุ",
        cleaned_count: 0,
        current_thai_time: formatThaiDateTimeForDisplay(currentThaiTime),
        timezone: "Asia/Bangkok (UTC+7)",
      });
    }

    // เริ่ม transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ยกเลิกการจอง (soft delete) - ใช้เวลาไทย
      const transactionIds = expiredReservations.recordset.map(
        (r) => r.borrow_transactions_id
      );
      const bookCopyIds = expiredReservations.recordset.map(
        (r) => r.book_copies_id
      );

      // ปรับปรุงให้ใช้ parameter binding อย่างถูกต้อง
      if (transactionIds.length > 0) {
        const placeholders = transactionIds
          .map((_, index) => `@id${index}`)
          .join(",");
        const request = transaction.request();

        // เพิ่ม current time สำหรับ deleted_at
        request.input("deleted_at", sql.DateTime, currentThaiTime);

        transactionIds.forEach((id, index) => {
          request.input(`id${index}`, sql.Int, id);
        });

        await request.query(`
          UPDATE borrow_transactions 
          SET deleted_at = @deleted_at
          WHERE borrow_transactions_id IN (${placeholders})
        `);

        // คืนสถานะหนังสือ - ใช้เวลาไทย
        const placeholders2 = bookCopyIds
          .map((_, index) => `@copy_id${index}`)
          .join(",");
        const request2 = transaction.request();

        request2.input("updated_at", sql.DateTime, currentThaiTime);

        bookCopyIds.forEach((id, index) => {
          request2.input(`copy_id${index}`, sql.Int, id);
        });

        await request2.query(`
          UPDATE book_copies 
          SET status = 'available', updated_at = @updated_at
          WHERE book_copies_id IN (${placeholders2})
        `);
      }

      await transaction.commit();

      // จัดรูปแบบข้อมูลสำหรับ response
      const cleanedReservations = expiredReservations.recordset.map((r) => {
        const reservationTime = new Date(r.created_at);
        return {
          book_title: r.title,
          user_name: r.user_name,
          reservation_date: formatThaiDateTimeForDisplay(reservationTime),
          hours_expired: r.hours_expired,
          minutes_expired: r.minutes_expired,
        };
      });

      return NextResponse.json({
        message: "ยกเลิกการจองที่หมดอายุสำเร็จ",
        cleaned_count: expiredReservations.recordset.length,
        cleaned_reservations: cleanedReservations,
        cleanup_time: formatThaiDateTimeForDisplay(currentThaiTime),
        timezone: "Asia/Bangkok (UTC+7)",
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (err: unknown) {
    console.error("POST /api/reservations/cleanup ERROR:", err);
    return NextResponse.json(
      {
        error: "เกิดข้อผิดพลาดในการยกเลิกการจองที่หมดอายุ",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// เพิ่ม GET endpoint สำหรับดูการจองที่หมดอายุก่อนลบ
export async function GET(req: NextRequest) {
  try {
    const pool = await getConnection();
    const currentThaiTime = getCurrentThaiTime();

    // ดูการจองที่หมดอายุโดยไม่ลบ
    const expiredReservations = await pool
      .request()
      .input("current_time", sql.DateTime, currentThaiTime).query(`
        SELECT 
          bt.borrow_transactions_id,
          bt.book_copies_id,
          b.title,
          u.name as user_name,
          bt.created_at,
          DATEDIFF(HOUR, bt.created_at, @current_time) as hours_expired,
          DATEDIFF(MINUTE, bt.created_at, @current_time) as minutes_expired
        FROM borrow_transactions bt
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        INNER JOIN users u ON bt.user_id = u.user_id
        WHERE bc.status = 'reservations' 
        AND bt.borrow_date IS NULL
        AND bt.deleted_at IS NULL
        AND DATEDIFF(MINUTE, bt.created_at, @current_time) > 1440
        ORDER BY bt.created_at ASC
      `);

    const expiredList = expiredReservations.recordset.map((r) => {
      const reservationTime = new Date(r.created_at);
      return {
        borrow_transactions_id: r.borrow_transactions_id,
        book_title: r.title,
        user_name: r.user_name,
        reservation_date: formatThaiDateTimeForDisplay(reservationTime),
        hours_expired: r.hours_expired,
        minutes_expired: r.minutes_expired,
      };
    });

    return NextResponse.json({
      message: "รายการจองที่หมดอายุ",
      expired_count: expiredReservations.recordset.length,
      expired_reservations: expiredList,
      current_thai_time: formatThaiDateTimeForDisplay(currentThaiTime),
      timezone: "Asia/Bangkok (UTC+7)",
    });
  } catch (err: unknown) {
    console.error("GET /api/reservations/cleanup ERROR:", err);
    return NextResponse.json(
      {
        error: "เกิดข้อผิดพลาดในการดึงข้อมูลการจองที่หมดอายุ",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
