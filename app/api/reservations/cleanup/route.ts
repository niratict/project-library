// =============================================================================
// /api/reservations/cleanup/route.ts - สำหรับยกเลิกการจองที่หมดอายุ
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

/// POST /api/reservations/cleanup - ยกเลิกการจองที่หมดอายุ
export async function POST(req: NextRequest) {
  try {
    const pool = await getConnection();

    // หาการจองที่เกิน 24 ชั่วโมง
    const expiredReservations = await pool.request()
      .query(`
        SELECT 
          bt.borrow_transactions_id,
          bt.book_copies_id,
          b.title,
          u.name as user_name,
          bt.created_at,
          DATEDIFF(HOUR, bt.created_at, GETDATE()) as hours_expired
        FROM borrow_transactions bt
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        INNER JOIN users u ON bt.user_id = u.user_id
        WHERE bc.status = 'reservations' 
        AND bt.borrow_date IS NULL
        AND bt.deleted_at IS NULL
        AND DATEDIFF(HOUR, bt.created_at, GETDATE()) > 24
      `);

    if (expiredReservations.recordset.length === 0) {
      return NextResponse.json({ 
        message: 'ไม่มีการจองที่หมดอายุ',
        cleaned_count: 0
      });
    }

    // เริ่ม transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ยกเลิกการจอง (soft delete)
      const transactionIds = expiredReservations.recordset.map(r => r.borrow_transactions_id);
      const bookCopyIds = expiredReservations.recordset.map(r => r.book_copies_id);

      // ต้องใช้ parameter binding แทน string concatenation
      const placeholders = transactionIds.map((_, index) => `@id${index}`).join(',');
      const request = transaction.request();
      
      transactionIds.forEach((id, index) => {
        request.input(`id${index}`, sql.Int, id);
      });

      await request.query(`
        UPDATE borrow_transactions 
        SET deleted_at = GETDATE()
        WHERE borrow_transactions_id IN (${placeholders})
      `);

      // คืนสถานะหนังสือ
      const placeholders2 = bookCopyIds.map((_, index) => `@copy_id${index}`).join(',');
      const request2 = transaction.request();
      
      bookCopyIds.forEach((id, index) => {
        request2.input(`copy_id${index}`, sql.Int, id);
      });

      await request2.query(`
        UPDATE book_copies 
        SET status = 'available', updated_at = GETDATE()
        WHERE book_copies_id IN (${placeholders2})
      `);

      await transaction.commit();

      return NextResponse.json({ 
        message: 'ยกเลิกการจองที่หมดอายุสำเร็จ',
        cleaned_count: expiredReservations.recordset.length,
        cleaned_reservations: expiredReservations.recordset.map(r => ({
          book_title: r.title,
          user_name: r.user_name,
          reservation_date: r.created_at,
          hours_expired: r.hours_expired
        }))
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (err: unknown) {
    console.error('POST /api/reservations/cleanup ERROR:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการยกเลิกการจองที่หมดอายุ' }, { status: 500 });
  }
}