// =============================================================================
// /api/admindashboard/route.ts - สำหรับรายงานต่างๆ
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";

// GET /api/admindashboard - ใช้ query parameter เพื่อเลือก endpoint
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    switch (endpoint) {
      case "dashboard":
        return await GET_DASHBOARD(req);
      case "overdue":
        return await GET_OVERDUE(req);
      case "statistics":
        return await GET_STATISTICS(req);
      case "categories":
        return await GET_CATEGORIES_STATS(req);
      case "members":
        return await GET_MEMBERS_STATS(req);
      case "monthly":
        return await GET_MONTHLY_STATS(req);
      default:
        return NextResponse.json(
          { error: "กรุณาระบุ endpoint ที่ถูกต้อง" },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    console.error("GET /api/admindashboard ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการประมวลผลคำขอ" },
      { status: 500 }
    );
  }
}

// GET /api/admindashboard/dashboard - ข้อมูลสำหรับ Dashboard
async function GET_DASHBOARD(req: NextRequest) {
  try {
    const pool = await getConnection();

    // สถิติหลัก
    const stats = await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM books WHERE deleted_at IS NULL) as total_books,
          (SELECT COUNT(*) FROM book_copies WHERE deleted_at IS NULL) as total_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'available' AND deleted_at IS NULL) as available_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'borrowed' AND deleted_at IS NULL) as borrowed_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'reservations' AND deleted_at IS NULL) as reserved_copies,
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
          (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date IS NOT NULL AND return_date IS NULL AND deleted_at IS NULL) as current_borrows,
          (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date IS NULL AND deleted_at IS NULL) as current_reservations,
          (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date IS NOT NULL AND return_date IS NULL AND due_date < GETDATE() AND deleted_at IS NULL) as overdue_books,
          (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) as total_categories
      `);

    // หนังสือที่ยืมมากที่สุด
    const popularBooks = await pool.request().query(`
        SELECT TOP 10
          b.title,
          b.author,
          COUNT(bt.borrow_transactions_id) as borrow_count
        FROM books b
        INNER JOIN book_copies bc ON b.book_id = bc.book_id
        INNER JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id
        WHERE bt.borrow_date IS NOT NULL AND bt.deleted_at IS NULL
        GROUP BY b.book_id, b.title, b.author
        ORDER BY borrow_count DESC
      `);

    // กิจกรรมล่าสุด
    const recentActivity = await pool.request().query(`
        SELECT TOP 20
          bt.borrow_transactions_id,
          b.title,
          u.name as user_name,
          bt.borrow_date,
          bt.return_date,
          bt.due_date,
          s.name as staff_name,
          CASE 
            WHEN bt.return_date IS NOT NULL THEN 'returned'
            WHEN bt.borrow_date IS NOT NULL THEN 'borrowed'
            ELSE 'reserved'
          END as activity_type
        FROM borrow_transactions bt
        INNER JOIN users u ON bt.user_id = u.user_id
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        LEFT JOIN staffs s ON bt.staff_id = s.staff_id
        WHERE bt.deleted_at IS NULL
        ORDER BY bt.updated_at DESC
      `);

    return NextResponse.json({
      stats: stats.recordset[0],
      popular_books: popularBooks.recordset,
      recent_activity: recentActivity.recordset,
    });
  } catch (err: unknown) {
    console.error("GET /api/admindashboard/dashboard ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน" },
      { status: 500 }
    );
  }
}

// GET /api/admindashboard/overdue - รายงานหนังสือเกินกำหนด
async function GET_OVERDUE(req: NextRequest) {
  try {
    const pool = await getConnection();

    const overdueBooks = await pool.request().query(`
        SELECT 
          bt.borrow_transactions_id,
          b.title,
          b.author,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          bt.borrow_date,
          bt.due_date,
          DATEDIFF(day, bt.due_date, GETDATE()) as overdue_days,
          s.name as staff_name
        FROM borrow_transactions bt
        INNER JOIN users u ON bt.user_id = u.user_id
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        LEFT JOIN staffs s ON bt.staff_id = s.staff_id
        WHERE bt.borrow_date IS NOT NULL 
        AND bt.return_date IS NULL 
        AND bt.due_date < GETDATE()
        AND bt.deleted_at IS NULL
        ORDER BY bt.due_date ASC
      `);

    return NextResponse.json({
      data: overdueBooks.recordset,
      total: overdueBooks.recordset.length,
    });
  } catch (err: unknown) {
    console.error("GET /api/admindashboard/overdue ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลหนังสือเกินกำหนด" },
      { status: 500 }
    );
  }
}

// GET /api/admindashboard/statistics - สถิติเพิ่มเติม
async function GET_STATISTICS(req: NextRequest) {
  try {
    const pool = await getConnection();

    // สถิติรายละเอียดเพิ่มเติม
    const detailedStats = await pool.request().query(`
        SELECT 
          -- หนังสือทั้งหมด
          (SELECT COUNT(*) FROM books WHERE deleted_at IS NULL) as total_books,
          (SELECT COUNT(*) FROM books WHERE status = 'active' AND deleted_at IS NULL) as active_books,
          (SELECT COUNT(*) FROM books WHERE status = 'inactive' AND deleted_at IS NULL) as inactive_books,
          
          -- หมวดหมู่หนังสือทั้งหมด
          (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) as total_categories,
          
          -- หนังสือที่ยืมทั้งหมด (ทั้งที่ยืมอยู่และคืนแล้ว)
          (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date IS NOT NULL AND deleted_at IS NULL) as total_borrowed_books,
          (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date IS NOT NULL AND return_date IS NULL AND deleted_at IS NULL) as currently_borrowed_books,
          (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date IS NOT NULL AND return_date IS NOT NULL AND deleted_at IS NULL) as returned_books,
          
          -- สมาชิกทั้งหมด
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_members,
          (SELECT COUNT(*) FROM users WHERE status = 'active' AND deleted_at IS NULL) as active_members,
          (SELECT COUNT(*) FROM users WHERE status = 'suspended' AND deleted_at IS NULL) as suspended_members,
          (SELECT COUNT(*) FROM users WHERE user_type = 'citizen' AND deleted_at IS NULL) as citizen_members,
          (SELECT COUNT(*) FROM users WHERE user_type = 'educational' AND deleted_at IS NULL) as educational_members,
          
          -- สถิติเพิ่มเติม
          (SELECT COUNT(*) FROM staffs WHERE deleted_at IS NULL) as total_staff,
          (SELECT COUNT(*) FROM book_copies WHERE deleted_at IS NULL) as total_book_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'available' AND deleted_at IS NULL) as available_book_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'borrowed' AND deleted_at IS NULL) as borrowed_book_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'reservations' AND deleted_at IS NULL) as reserved_book_copies
      `);

    return NextResponse.json({
      statistics: detailedStats.recordset[0],
    });
  } catch (err: unknown) {
    console.error("GET /api/admindashboard/statistics ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ" },
      { status: 500 }
    );
  }
}

// GET /api/admindashboard/categories - สถิติหมวดหมู่หนังสือ
async function GET_CATEGORIES_STATS(req: NextRequest) {
  try {
    const pool = await getConnection();

    // สถิติหมวดหมู่หนังสือ
    const categoriesStats = await pool.request().query(`
        SELECT 
          c.categorie_id,
          c.name as category_name,
          COUNT(b.book_id) as total_books,
          COUNT(bc.book_copies_id) as total_copies,
          COUNT(CASE WHEN bc.status = 'available' THEN 1 END) as available_copies,
          COUNT(CASE WHEN bc.status = 'borrowed' THEN 1 END) as borrowed_copies,
          COUNT(CASE WHEN bc.status = 'reservations' THEN 1 END) as reserved_copies,
          COUNT(bt.borrow_transactions_id) as total_borrows
        FROM categories c
        LEFT JOIN books b ON c.categorie_id = b.categorie_id AND b.deleted_at IS NULL
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id AND bc.deleted_at IS NULL
        LEFT JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id AND bt.borrow_date IS NOT NULL AND bt.deleted_at IS NULL
        WHERE c.deleted_at IS NULL
        GROUP BY c.categorie_id, c.name
        ORDER BY total_books DESC
      `);

    return NextResponse.json({
      categories: categoriesStats.recordset,
      total_categories: categoriesStats.recordset.length,
    });
  } catch (err: unknown) {
    console.error("GET /api/admindashboard/categories ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติหมวดหมู่" },
      { status: 500 }
    );
  }
}

// GET /api/admindashboard/members - สถิติสมาชิก
async function GET_MEMBERS_STATS(req: NextRequest) {
  try {
    const pool = await getConnection();

    // สถิติสมาชิก
    const membersStats = await pool.request().query(`
        SELECT 
          -- สถิติทั่วไป
          COUNT(*) as total_members,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_members,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_members,
          COUNT(CASE WHEN user_type = 'citizen' THEN 1 END) as citizen_members,
          COUNT(CASE WHEN user_type = 'educational' THEN 1 END) as educational_members,
          COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_members,
          COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_members,
          COUNT(CASE WHEN gender = 'other' THEN 1 END) as other_gender_members
        FROM users 
        WHERE deleted_at IS NULL
      `);

    // สมาชิกที่ยืมหนังสือมากที่สุด
    const topBorrowers = await pool.request().query(`
        SELECT TOP 10
          u.user_id,
          u.name,
          u.email,
          u.user_type,
          COUNT(bt.borrow_transactions_id) as total_borrows,
          COUNT(CASE WHEN bt.return_date IS NULL THEN 1 END) as current_borrows
        FROM users u
        LEFT JOIN borrow_transactions bt ON u.user_id = bt.user_id AND bt.borrow_date IS NOT NULL AND bt.deleted_at IS NULL
        WHERE u.deleted_at IS NULL
        GROUP BY u.user_id, u.name, u.email, u.user_type
        ORDER BY total_borrows DESC
      `);

    return NextResponse.json({
      statistics: membersStats.recordset[0],
      top_borrowers: topBorrowers.recordset,
    });
  } catch (err: unknown) {
    console.error("GET /api/admindashboard/members ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติสมาชิก" },
      { status: 500 }
    );
  }
}

// GET /api/admindashboard/monthly - สถิติรายเดือน
async function GET_MONTHLY_STATS(req: NextRequest) {
  try {
    const pool = await getConnection();

    // สถิติการยืมรายเดือน (12 เดือนล่าสุด)
    const monthlyBorrows = await pool.request().query(`
        SELECT 
          YEAR(borrow_date) as year,
          MONTH(borrow_date) as month,
          DATENAME(MONTH, borrow_date) as month_name,
          COUNT(*) as total_borrows,
          COUNT(CASE WHEN return_date IS NOT NULL THEN 1 END) as returned_books,
          COUNT(CASE WHEN return_date IS NULL THEN 1 END) as not_returned_books
        FROM borrow_transactions
        WHERE borrow_date IS NOT NULL 
        AND borrow_date >= DATEADD(MONTH, -12, GETDATE())
        AND deleted_at IS NULL
        GROUP BY YEAR(borrow_date), MONTH(borrow_date), DATENAME(MONTH, borrow_date)
        ORDER BY year DESC, month DESC
      `);

    // สถิติสมาชิกใหม่รายเดือน
    const monthlyNewMembers = await pool.request().query(`
        SELECT 
          YEAR(created_at) as year,
          MONTH(created_at) as month,
          DATENAME(MONTH, created_at) as month_name,
          COUNT(*) as new_members
        FROM users
        WHERE created_at >= DATEADD(MONTH, -12, GETDATE())
        AND deleted_at IS NULL
        GROUP BY YEAR(created_at), MONTH(created_at), DATENAME(MONTH, created_at)
        ORDER BY year DESC, month DESC
      `);

    return NextResponse.json({
      monthly_borrows: monthlyBorrows.recordset,
      monthly_new_members: monthlyNewMembers.recordset,
    });
  } catch (err: unknown) {
    console.error("GET /api/admindashboard/monthly ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติรายเดือน" },
      { status: 500 }
    );
  }
}
