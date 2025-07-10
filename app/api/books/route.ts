import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import sql from 'mssql';

// GET /api/books - ดึงข้อมูลหนังสือทั้งหมด
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const pool = await getConnection();
    
    let whereClause = 'WHERE deleted_at IS NULL';
    
    if (!includeInactive) {
      whereClause += ` AND status = '${status}'`;
    }

    const result = await pool.request()
      .query(`
        SELECT 
          book_id,
          title,
          author,
          publisher,
          isbn,
          description,
          language,
          publish_year,
          book_image,
          book_limit,
          reader_group,
          status,
          categorie_id,
          created_at,
          updated_at
        FROM books
        ${whereClause}
        ORDER BY created_at DESC
      `);

    return NextResponse.json({
      data: result.recordset,
      total: result.recordset.length
    });

  } catch (err: unknown) {
    console.error('GET /api/books error:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลหนังสือ' 
    }, { status: 500 });
  }
}