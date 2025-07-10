import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

// GET /api/bookcopies/stats - สถิติสำเนาหนังสือ
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const book_id = searchParams.get('book_id');

    const pool = await getConnection();

    if (book_id) {
      // สถิติของหนังสือเล่มนั้น ๆ
      const stats = await pool.request()
        .input('book_id', sql.Int, parseInt(book_id))
        .query(`
          SELECT 
            b.book_id,
            b.title,
            b.author,
            b.book_limit,
            COUNT(bc.book_copies_id) as total_copies,
            SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END) as available_copies,
            SUM(CASE WHEN bc.status = 'borrowed' THEN 1 ELSE 0 END) as borrowed_copies,
            SUM(CASE WHEN bc.status = 'reservations' THEN 1 ELSE 0 END) as reserved_copies,
            -- สถิติการยืม
            (SELECT COUNT(*) FROM borrow_transactions bt
             JOIN book_copies bc2 ON bt.book_copies_id = bc2.book_copies_id
             WHERE bc2.book_id = b.book_id AND bt.deleted_at IS NULL) as total_borrows,
            (SELECT COUNT(*) FROM borrow_transactions bt
             JOIN book_copies bc2 ON bt.book_copies_id = bc2.book_copies_id
             WHERE bc2.book_id = b.book_id AND bt.return_date IS NOT NULL AND bt.deleted_at IS NULL) as completed_borrows,
            (SELECT COUNT(*) FROM borrow_transactions bt
             JOIN book_copies bc2 ON bt.book_copies_id = bc2.book_copies_id
             WHERE bc2.book_id = b.book_id AND bt.return_date IS NULL AND bt.deleted_at IS NULL) as active_borrows,
            -- สถิติการเกินกำหนด
            (SELECT COUNT(*) FROM borrow_transactions bt
             JOIN book_copies bc2 ON bt.book_copies_id = bc2.book_copies_id
             WHERE bc2.book_id = b.book_id AND bt.return_date IS NULL 
             AND bt.due_date < GETDATE() AND bt.deleted_at IS NULL) as overdue_borrows
          FROM books b
          LEFT JOIN book_copies bc ON b.book_id = bc.book_id AND bc.deleted_at IS NULL
          WHERE b.book_id = @book_id AND b.deleted_at IS NULL
          GROUP BY b.book_id, b.title, b.author, b.book_limit
        `);

      if (stats.recordset.length === 0) {
        return NextResponse.json({ 
          error: 'ไม่พบหนังสือที่ระบุ' 
        }, { status: 404 });
      }

      // รายละเอียดสำเนาแต่ละเล่ม
      const copies = await pool.request()
        .input('book_id', sql.Int, parseInt(book_id))
        .query(`
          SELECT 
            bc.*,
            bt.borrow_transactions_id,
            bt.user_id,
            bt.borrow_date,
            bt.due_date,
            bt.fine,
            u.name as borrower_name,
            CASE 
              WHEN bt.return_date IS NULL AND bt.due_date < GETDATE() THEN 'overdue'
              WHEN bt.return_date IS NULL THEN 'borrowed'
              ELSE bc.status
            END as actual_status
          FROM book_copies bc
          LEFT JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id 
            AND bt.return_date IS NULL AND bt.deleted_at IS NULL
          LEFT JOIN users u ON bt.user_id = u.user_id
          WHERE bc.book_id = @book_id AND bc.deleted_at IS NULL
          ORDER BY bc.book_copies_id
        `);

      return NextResponse.json({
        book_stats: stats.recordset[0],
        copies: copies.recordset
      });

    } else {
      // สถิติรวมทั้งหมด
      const overallStats = await pool.request().query(`
        SELECT 
          COUNT(DISTINCT b.book_id) as total_books,
          COUNT(bc.book_copies_id) as total_copies,
          SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END) as available_copies,
          SUM(CASE WHEN bc.status = 'borrowed' THEN 1 ELSE 0 END) as borrowed_copies,
          SUM(CASE WHEN bc.status = 'reservations' THEN 1 ELSE 0 END) as reserved_copies,
          -- สถิติการยืม
          (SELECT COUNT(*) FROM borrow_transactions WHERE deleted_at IS NULL) as total_borrows,
          (SELECT COUNT(*) FROM borrow_transactions WHERE return_date IS NOT NULL AND deleted_at IS NULL) as completed_borrows,
          (SELECT COUNT(*) FROM borrow_transactions WHERE return_date IS NULL AND deleted_at IS NULL) as active_borrows,
          (SELECT COUNT(*) FROM borrow_transactions WHERE return_date IS NULL AND due_date < GETDATE() AND deleted_at IS NULL) as overdue_borrows
        FROM books b
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id AND bc.deleted_at IS NULL
        WHERE b.deleted_at IS NULL
      `);

      // สถิติตามหมวดหมู่
      const categoryStats = await pool.request().query(`
        SELECT 
          c.categorie_id,
          c.name as category_name,
          COUNT(DISTINCT b.book_id) as total_books,
          COUNT(bc.book_copies_id) as total_copies,
          SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END) as available_copies,
          SUM(CASE WHEN bc.status = 'borrowed' THEN 1 ELSE 0 END) as borrowed_copies,
          SUM(CASE WHEN bc.status = 'reservations' THEN 1 ELSE 0 END) as reserved_copies
        FROM categories c
        LEFT JOIN books b ON c.categorie_id = b.categorie_id AND b.deleted_at IS NULL
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id AND bc.deleted_at IS NULL
        WHERE c.deleted_at IS NULL
        GROUP BY c.categorie_id, c.name
        ORDER BY c.name
      `);

      // หนังสือที่ยืมมากที่สุด (Top 10)
      const popularBooks = await pool.request().query(`
        SELECT TOP 10
          b.book_id,
          b.title,
          b.author,
          COUNT(bt.borrow_transactions_id) as total_borrows,
          COUNT(CASE WHEN bt.return_date IS NULL THEN 1 END) as active_borrows
        FROM books b
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id AND bc.deleted_at IS NULL
        LEFT JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id AND bt.deleted_at IS NULL
        WHERE b.deleted_at IS NULL
        GROUP BY b.book_id, b.title, b.author
        HAVING COUNT(bt.borrow_transactions_id) > 0
        ORDER BY total_borrows DESC, active_borrows DESC
      `);

      // สถิติรายเดือน (6 เดือนล่าสุด)
      const monthlyStats = await pool.request().query(`
        SELECT 
          FORMAT(bt.borrow_date, 'yyyy-MM') as month,
          COUNT(*) as total_borrows,
          COUNT(CASE WHEN bt.return_date IS NOT NULL THEN 1 END) as returned_borrows,
          COUNT(CASE WHEN bt.return_date IS NULL AND bt.due_date < GETDATE() THEN 1 END) as overdue_borrows
        FROM borrow_transactions bt
        WHERE bt.borrow_date >= DATEADD(month, -6, GETDATE())
          AND bt.deleted_at IS NULL
        GROUP BY FORMAT(bt.borrow_date, 'yyyy-MM')
        ORDER BY month DESC
      `);

      // สถิติผู้ใช้ที่ยืมมากที่สุด (Top 10)
      const topBorrowers = await pool.request().query(`
        SELECT TOP 10
          u.user_id,
          u.name,
          u.email,
          COUNT(bt.borrow_transactions_id) as total_borrows,
          COUNT(CASE WHEN bt.return_date IS NULL THEN 1 END) as active_borrows,
          COUNT(CASE WHEN bt.return_date IS NULL AND bt.due_date < GETDATE() THEN 1 END) as overdue_borrows
        FROM users u
        JOIN borrow_transactions bt ON u.user_id = bt.user_id
        WHERE bt.deleted_at IS NULL AND u.deleted_at IS NULL
        GROUP BY u.user_id, u.name, u.email
        ORDER BY total_borrows DESC, active_borrows DESC
      `);

      // สถิติค่าปรับ
      const fineStats = await pool.request().query(`
        SELECT 
          COUNT(CASE WHEN bt.fine > 0 THEN 1 END) as transactions_with_fine,
          ISNULL(SUM(bt.fine), 0) as total_fine_amount,
          ISNULL(AVG(bt.fine), 0) as average_fine,
          ISNULL(MAX(bt.fine), 0) as max_fine,
          COUNT(CASE WHEN bt.return_date IS NULL AND bt.due_date < GETDATE() THEN 1 END) as current_overdue
        FROM borrow_transactions bt
        WHERE bt.deleted_at IS NULL
      `);

      // สถิติตามประเภทผู้อ่าน
      const readerGroupStats = await pool.request().query(`
        SELECT 
          b.reader_group,
          COUNT(DISTINCT b.book_id) as total_books,
          COUNT(bc.book_copies_id) as total_copies,
          SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END) as available_copies,
          COUNT(bt.borrow_transactions_id) as total_borrows
        FROM books b
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id AND bc.deleted_at IS NULL
        LEFT JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id AND bt.deleted_at IS NULL
        WHERE b.deleted_at IS NULL
        GROUP BY b.reader_group
        ORDER BY b.reader_group
      `);

      return NextResponse.json({
        overall_stats: overallStats.recordset[0],
        category_stats: categoryStats.recordset,
        popular_books: popularBooks.recordset,
        monthly_stats: monthlyStats.recordset,
        top_borrowers: topBorrowers.recordset,
        fine_stats: fineStats.recordset[0],
        reader_group_stats: readerGroupStats.recordset
      });
    }

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}