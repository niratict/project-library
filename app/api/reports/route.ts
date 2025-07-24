// =============================================================================
// /api/reports/route.ts - รายงานครอบคลุมสำหรับระบบห้องสมุด
// =============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";

// GET /api/reports - ใช้ query parameter เพื่อเลือก endpoint
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    switch (endpoint) {
      case "dashboard":
        return await GET_DASHBOARD(req);
      case "overdue":
        return await GET_OVERDUE(req);
      case "transactions":
        return await GET_TRANSACTIONS(req);
      case "popular-books":
        return await GET_POPULAR_BOOKS(req);
      case "member-activity":
        return await GET_MEMBER_ACTIVITY(req);
      case "inventory":
        return await GET_INVENTORY(req);
      case "monthly-summary":
        return await GET_MONTHLY_SUMMARY(req);
      case "staff-performance":
        return await GET_STAFF_PERFORMANCE(req);
      default:
        return NextResponse.json(
          { error: "กรุณาระบุ endpoint ที่ถูกต้อง" },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    console.error("GET /api/reports ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการประมวลผลคำขอ" },
      { status: 500 }
    );
  }
}

// GET /api/reports/dashboard - ข้อมูลสำหรับ Dashboard
async function GET_DASHBOARD(req: NextRequest) {
  try {
    const pool = await getConnection();

    // สถิติหลักแบบครอบคลุม
    const mainStats = await pool.request().query(`
        SELECT 
          -- หนังสือและสำเนา
          (SELECT COUNT(*) FROM books WHERE deleted_at IS NULL) as total_books,
          (SELECT COUNT(*) FROM book_copies WHERE deleted_at IS NULL) as total_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'available' AND deleted_at IS NULL) as available_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'borrowed' AND deleted_at IS NULL) as borrowed_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'reservations' AND deleted_at IS NULL) as reserved_copies,
          
          -- สมาชิกและหมวดหมู่
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_members,
          (SELECT COUNT(*) FROM users WHERE status = 'active' AND deleted_at IS NULL) as active_members,
          (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) as total_categories,
          (SELECT COUNT(*) FROM staffs WHERE deleted_at IS NULL) as total_staff,
          
          -- ธุรกรรมตามสถานะ
          (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date IS NULL AND return_date IS NULL AND deleted_at IS NULL) as total_reservations,
          (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date IS NOT NULL AND return_date IS NULL AND deleted_at IS NULL) as current_borrows,
          (SELECT COUNT(*) FROM borrow_transactions WHERE return_date IS NOT NULL AND deleted_at IS NULL) as total_returns,
          (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date IS NOT NULL AND return_date IS NULL AND due_date < GETDATE() AND deleted_at IS NULL) as overdue_books,
          
          -- สถิติวันนี้
          (SELECT COUNT(*) FROM borrow_transactions WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) AND borrow_date IS NOT NULL AND deleted_at IS NULL) as today_borrows,
          (SELECT COUNT(*) FROM borrow_transactions WHERE CAST(updated_at AS DATE) = CAST(GETDATE() AS DATE) AND return_date IS NOT NULL AND deleted_at IS NULL) as today_returns,
          (SELECT COUNT(*) FROM borrow_transactions WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) AND due_date IS NULL AND return_date IS NULL AND deleted_at IS NULL) as today_reservations,
          (SELECT COUNT(*) FROM users WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) AND deleted_at IS NULL) as today_new_members
      `);

    // กิจกรรมล่าสุด 15 รายการ
    const recentActivities = await pool.request().query(`
        SELECT TOP 15
          bt.borrow_transactions_id,
          b.title,
          b.author,
          u.name as user_name,
          s.name as staff_name,
          bt.borrow_date,
          bt.return_date,
          bt.due_date,
          bt.created_at,
          bt.updated_at,
          CASE 
            WHEN bt.return_date IS NOT NULL THEN N'คืนแล้ว'
            WHEN bt.borrow_date IS NOT NULL THEN N'ยืม'
            ELSE N'จอง'
          END as activity_type,
          CASE 
            WHEN bt.return_date IS NOT NULL THEN bt.updated_at
            WHEN bt.borrow_date IS NOT NULL THEN bt.borrow_date
            ELSE bt.created_at
          END as activity_date
        FROM borrow_transactions bt
        INNER JOIN users u ON bt.user_id = u.user_id
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        LEFT JOIN staffs s ON bt.staff_id = s.staff_id
        WHERE bt.deleted_at IS NULL
        ORDER BY bt.updated_at DESC
      `);

    return NextResponse.json({
      main_stats: mainStats.recordset[0],
      recent_activities: recentActivities.recordset,
    });
  } catch (err: unknown) {
    console.error("GET /api/reports/dashboard ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน" },
      { status: 500 }
    );
  }
}

// GET /api/reports/overdue - รายงานหนังสือเกินกำหนด
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
          u.user_type,
          bt.borrow_date,
          bt.due_date,
          DATEDIFF(day, bt.due_date, GETDATE()) as overdue_days,
          s.name as staff_name,
          bc.shelf_location,
          CASE 
            WHEN DATEDIFF(day, bt.due_date, GETDATE()) <= 7 THEN 'ใกล้กำหนด'
            WHEN DATEDIFF(day, bt.due_date, GETDATE()) <= 30 THEN 'เกินกำหนด'
            ELSE 'เกินกำหนดมาก'
          END as overdue_level
        FROM borrow_transactions bt
        INNER JOIN users u ON bt.user_id = u.user_id
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        LEFT JOIN staffs s ON bt.staff_id = s.staff_id
        WHERE bt.borrow_date IS NOT NULL 
        AND bt.return_date IS NULL 
        AND bt.due_date < GETDATE()
        AND bt.deleted_at IS NULL
        ORDER BY overdue_days DESC
      `);

    return NextResponse.json({
      overdue_books: overdueBooks.recordset,
      summary: {
        total_overdue: overdueBooks.recordset.length,
        critical_overdue: overdueBooks.recordset.filter(
          (book: any) => book.overdue_days > 30
        ).length,
        moderate_overdue: overdueBooks.recordset.filter(
          (book: any) => book.overdue_days > 7 && book.overdue_days <= 30
        ).length,
        minor_overdue: overdueBooks.recordset.filter(
          (book: any) => book.overdue_days <= 7
        ).length,
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/reports/overdue ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลหนังสือเกินกำหนด" },
      { status: 500 }
    );
  }
}

// GET /api/reports/transactions - รายงานธุรกรรมทั้งหมด
async function GET_TRANSACTIONS(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status"); // reservation, borrowed, returned
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const pool = await getConnection();

    let whereClause = "WHERE bt.deleted_at IS NULL";
    let orderClause = "ORDER BY bt.updated_at DESC";

    // Filter by status
    if (status === "reservation") {
      whereClause += " AND bt.borrow_date IS NULL AND bt.return_date IS NULL";
    } else if (status === "borrowed") {
      whereClause +=
        " AND bt.borrow_date IS NOT NULL AND bt.return_date IS NULL";
    } else if (status === "returned") {
      whereClause += " AND bt.return_date IS NOT NULL";
    }

    // Filter by date range
    if (startDate && endDate) {
      whereClause += ` AND bt.created_at BETWEEN '${startDate}' AND '${endDate}'`;
    }

    const transactions = await pool.request().query(`
        SELECT TOP ${limit}
          bt.borrow_transactions_id,
          b.title,
          b.author,
          c.name as category_name,
          u.name as user_name,
          u.email as user_email,
          u.user_type,
          s.name as staff_name,
          bt.borrow_date,
          bt.due_date,
          bt.return_date,
          bt.fine,
          bt.created_at,
          bt.updated_at,
          bc.shelf_location,
          CASE 
            WHEN bt.return_date IS NOT NULL THEN 'คืนแล้ว'
            WHEN bt.borrow_date IS NOT NULL THEN 'ยืม'
            ELSE 'จอง'
          END as transaction_status,
          CASE 
            WHEN bt.return_date IS NOT NULL THEN DATEDIFF(day, bt.borrow_date, bt.return_date)
            WHEN bt.borrow_date IS NOT NULL THEN DATEDIFF(day, bt.borrow_date, GETDATE())
            ELSE NULL
          END as days_borrowed
        FROM borrow_transactions bt
        INNER JOIN users u ON bt.user_id = u.user_id
        INNER JOIN book_copies bc ON bt.book_copies_id = bc.book_copies_id
        INNER JOIN books b ON bc.book_id = b.book_id
        INNER JOIN categories c ON b.categorie_id = c.categorie_id
        LEFT JOIN staffs s ON bt.staff_id = s.staff_id
        ${whereClause}
        ${orderClause}
      `);

    return NextResponse.json({
      transactions: transactions.recordset,
      total: transactions.recordset.length,
      filters: { status, startDate, endDate, limit },
    });
  } catch (err: unknown) {
    console.error("GET /api/reports/transactions ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลธุรกรรม" },
      { status: 500 }
    );
  }
}

// GET /api/reports/popular-books - หนังสือยอดนิยมและสถิติ
async function GET_POPULAR_BOOKS(req: NextRequest) {
  try {
    const pool = await getConnection();

    // หนังสือที่ยืมมากที่สุด
    const popularBooks = await pool.request().query(`
        SELECT TOP 20
          b.book_id,
          b.title,
          b.author,
          b.publisher,
          c.name as category_name,
          COUNT(bt.borrow_transactions_id) as total_borrows,
          COUNT(CASE WHEN bt.return_date IS NOT NULL THEN 1 END) as total_returns,
          COUNT(CASE WHEN bt.return_date IS NULL AND bt.borrow_date IS NOT NULL THEN 1 END) as current_borrows,
          COUNT(CASE WHEN bt.borrow_date IS NULL THEN 1 END) as current_reservations,
          AVG(CASE WHEN bt.return_date IS NOT NULL THEN DATEDIFF(day, bt.borrow_date, bt.return_date) END) as avg_borrow_days
        FROM books b
        INNER JOIN categories c ON b.categorie_id = c.categorie_id
        INNER JOIN book_copies bc ON b.book_id = bc.book_id
        LEFT JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id AND bt.deleted_at IS NULL
        WHERE b.deleted_at IS NULL
        GROUP BY b.book_id, b.title, b.author, b.publisher, c.name
        HAVING COUNT(bt.borrow_transactions_id) > 0
        ORDER BY total_borrows DESC
      `);

    // หมวดหมู่ที่ได้รับความนิยม
    const popularCategories = await pool.request().query(`
        SELECT 
          c.categorie_id,
          c.name as category_name,
          COUNT(bt.borrow_transactions_id) as total_borrows,
          COUNT(DISTINCT b.book_id) as unique_books_borrowed,
          COUNT(DISTINCT bt.user_id) as unique_borrowers
        FROM categories c
        INNER JOIN books b ON c.categorie_id = b.categorie_id
        INNER JOIN book_copies bc ON b.book_id = bc.book_id
        INNER JOIN borrow_transactions bt ON bc.book_copies_id = bt.book_copies_id
        WHERE bt.borrow_date IS NOT NULL AND bt.deleted_at IS NULL AND c.deleted_at IS NULL
        GROUP BY c.categorie_id, c.name
        ORDER BY total_borrows DESC
      `);

    return NextResponse.json({
      popular_books: popularBooks.recordset,
      popular_categories: popularCategories.recordset,
    });
  } catch (err: unknown) {
    console.error("GET /api/reports/popular-books ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลหนังสือยอดนิยม" },
      { status: 500 }
    );
  }
}

// GET /api/reports/member-activity - กิจกรรมสมาชิก
async function GET_MEMBER_ACTIVITY(req: NextRequest) {
  try {
    const pool = await getConnection();

    // สมาชิกที่ยืมหนังสือมากที่สุด
    const topBorrowers = await pool.request().query(`
        SELECT TOP 15
          u.user_id,
          u.name,
          u.email,
          u.user_type,
          COUNT(bt.borrow_transactions_id) as total_transactions,
          COUNT(CASE WHEN bt.borrow_date IS NOT NULL THEN 1 END) as total_borrows,
          COUNT(CASE WHEN bt.return_date IS NOT NULL THEN 1 END) as total_returns,
          COUNT(CASE WHEN bt.return_date IS NULL AND bt.borrow_date IS NOT NULL THEN 1 END) as current_borrows,
          COUNT(CASE WHEN bt.borrow_date IS NULL THEN 1 END) as current_reservations,
          SUM(ISNULL(bt.fine, 0)) as total_fines,
          MAX(bt.created_at) as last_activity
        FROM users u
        LEFT JOIN borrow_transactions bt ON u.user_id = bt.user_id AND bt.deleted_at IS NULL
        WHERE u.deleted_at IS NULL AND u.status = 'active'
        GROUP BY u.user_id, u.name, u.email, u.user_type
        ORDER BY total_transactions DESC
      `);

    // สมาชิกที่ไม่ได้ใช้บริการ
    const inactiveMembers = await pool.request().query(`
        SELECT 
          u.user_id,
          u.name,
          u.email,
          u.user_type,
          u.created_at,
          DATEDIFF(day, u.created_at, GETDATE()) as days_since_joined
        FROM users u
        LEFT JOIN borrow_transactions bt ON u.user_id = bt.user_id AND bt.deleted_at IS NULL
        WHERE u.deleted_at IS NULL 
        AND u.status = 'active'
        AND bt.user_id IS NULL
        ORDER BY u.created_at DESC
      `);

    return NextResponse.json({
      top_borrowers: topBorrowers.recordset,
      inactive_members: inactiveMembers.recordset,
      member_summary: {
        total_active_borrowers: topBorrowers.recordset.filter(
          (m: any) => m.total_borrows > 0
        ).length,
        total_inactive_members: inactiveMembers.recordset.length,
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/reports/member-activity ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรมสมาชิก" },
      { status: 500 }
    );
  }
}

// GET /api/reports/inventory - รายงานสินค้าคงคลัง
async function GET_INVENTORY(req: NextRequest) {
  try {
    const pool = await getConnection();

    // สถิติสินค้าคงคลังตามหมวดหมู่ (แก้ไข utilization_rate)
    const inventoryByCategory = await pool.request().query(`
        SELECT 
          c.categorie_id,
          c.name as category_name,
          COUNT(b.book_id) as total_books,
          COUNT(bc.book_copies_id) as total_copies,
          COUNT(CASE WHEN bc.status = 'available' THEN 1 END) as available_copies,
          COUNT(CASE WHEN bc.status = 'borrowed' THEN 1 END) as borrowed_copies,
          COUNT(CASE WHEN bc.status = 'reservations' THEN 1 END) as reserved_copies,
          CASE 
            WHEN COUNT(bc.book_copies_id) = 0 THEN 0
            ELSE ROUND(
              CAST(COUNT(CASE WHEN bc.status = 'borrowed' THEN 1 END) AS FLOAT) / 
              CAST(COUNT(bc.book_copies_id) AS FLOAT) * 100, 2
            )
          END as utilization_rate
        FROM categories c
        LEFT JOIN books b ON c.categorie_id = b.categorie_id AND b.deleted_at IS NULL
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id AND bc.deleted_at IS NULL
        WHERE c.deleted_at IS NULL
        GROUP BY c.categorie_id, c.name
        ORDER BY total_copies DESC
      `);

    // หนังสือที่มีสำเนาน้อย
    const lowStockBooks = await pool.request().query(`
        SELECT 
          b.book_id,
          b.title,
          b.author,
          c.name as category_name,
          COUNT(bc.book_copies_id) as total_copies,
          COUNT(CASE WHEN bc.status = 'available' THEN 1 END) as available_copies,
          COUNT(CASE WHEN bc.status = 'borrowed' THEN 1 END) as borrowed_copies
        FROM books b
        INNER JOIN categories c ON b.categorie_id = c.categorie_id
        LEFT JOIN book_copies bc ON b.book_id = bc.book_id AND bc.deleted_at IS NULL
        WHERE b.deleted_at IS NULL
        GROUP BY b.book_id, b.title, b.author, c.name
        ORDER BY total_copies ASC
      `);

    return NextResponse.json({
      inventory_by_category: inventoryByCategory.recordset,
      low_stock_books: lowStockBooks.recordset,
    });
  } catch (err: unknown) {
    console.error("GET /api/reports/inventory ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลสินค้าคงคลัง" },
      { status: 500 }
    );
  }
}

// GET /api/reports/monthly-summary - สรุปรายเดือน
async function GET_MONTHLY_SUMMARY(req: NextRequest) {
  try {
    const pool = await getConnection();

    // สถิติ 12 เดือนล่าสุด
    const monthlyStats = await pool.request().query(`
        SELECT 
          YEAR(activity_date) as year,
          MONTH(activity_date) as month,
          CONCAT(YEAR(activity_date), '-', FORMAT(MONTH(activity_date), '00')) as year_month,
          COUNT(CASE WHEN activity_type = 'reservation' THEN 1 END) as total_reservations,
          COUNT(CASE WHEN activity_type = 'borrow' THEN 1 END) as total_borrows,
          COUNT(CASE WHEN activity_type = 'return' THEN 1 END) as total_returns,
          COUNT(DISTINCT user_id) as active_users,
          SUM(ISNULL(fine, 0)) as total_fines
        FROM (
          SELECT 
            bt.user_id,
            bt.fine,
            bt.created_at as activity_date,
            'reservation' as activity_type
          FROM borrow_transactions bt
          WHERE bt.borrow_date IS NULL AND bt.return_date IS NULL AND bt.deleted_at IS NULL
          
          UNION ALL
          
          SELECT 
            bt.user_id,
            bt.fine,
            bt.borrow_date as activity_date,
            'borrow' as activity_type
          FROM borrow_transactions bt
          WHERE bt.borrow_date IS NOT NULL AND bt.deleted_at IS NULL
          
          UNION ALL
          
          SELECT 
            bt.user_id,
            bt.fine,
            bt.return_date as activity_date,
            'return' as activity_type
          FROM borrow_transactions bt
          WHERE bt.return_date IS NOT NULL AND bt.deleted_at IS NULL
        ) activities
        WHERE activity_date >= DATEADD(MONTH, -12, GETDATE())
        GROUP BY YEAR(activity_date), MONTH(activity_date)
        ORDER BY year DESC, month DESC
      `);

    // สมาชิกใหม่รายเดือน
    const monthlyNewMembers = await pool.request().query(`
        SELECT 
          YEAR(created_at) as year,
          MONTH(created_at) as month,
          CONCAT(YEAR(created_at), '-', FORMAT(MONTH(created_at), '00')) as year_month,
          COUNT(*) as new_members,
          COUNT(CASE WHEN user_type = 'citizen' THEN 1 END) as new_citizens,
          COUNT(CASE WHEN user_type = 'educational' THEN 1 END) as new_educational
        FROM users
        WHERE created_at >= DATEADD(MONTH, -12, GETDATE())
        AND deleted_at IS NULL
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY year DESC, month DESC
      `);

    return NextResponse.json({
      monthly_activity: monthlyStats.recordset,
      monthly_new_members: monthlyNewMembers.recordset,
    });
  } catch (err: unknown) {
    console.error("GET /api/reports/monthly-summary ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลสรุปรายเดือน" },
      { status: 500 }
    );
  }
}

// GET /api/reports/staff-performance - ประสิทธิภาพเจ้าหน้าที่
async function GET_STAFF_PERFORMANCE(req: NextRequest) {
  try {
    const pool = await getConnection();

    // ประสิทธิภาพเจ้าหน้าที่
    const staffPerformance = await pool.request().query(`
        SELECT 
          s.staff_id,
          s.name as staff_name,
          s.user_type,
          COUNT(bt.borrow_transactions_id) as total_transactions,
          COUNT(CASE WHEN bt.borrow_date IS NOT NULL THEN 1 END) as total_borrows_processed,
          COUNT(CASE WHEN bt.return_date IS NOT NULL THEN 1 END) as total_returns_processed,
          SUM(ISNULL(bt.fine, 0)) as total_fines_collected,
          MIN(bt.created_at) as first_transaction,
          MAX(bt.updated_at) as last_transaction
        FROM staffs s
        LEFT JOIN borrow_transactions bt ON s.staff_id = bt.staff_id AND bt.deleted_at IS NULL
        WHERE s.deleted_at IS NULL AND s.status = 'active'
        GROUP BY s.staff_id, s.name, s.user_type
        ORDER BY total_transactions DESC
      `);

    return NextResponse.json({
      staff_performance: staffPerformance.recordset,
    });
  } catch (err: unknown) {
    console.error("GET /api/reports/staff-performance ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลประสิทธิภาพเจ้าหน้าที่" },
      { status: 500 }
    );
  }
}
