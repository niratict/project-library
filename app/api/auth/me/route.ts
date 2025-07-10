// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
  try {
    // ดึง token จาก cookie
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }
    
    // ตรวจสอบ JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    const { payload } = await jwtVerify(token, secret);
    
    // ส่งข้อมูล user กลับไป
    return NextResponse.json({
      type: payload.type,
      data: {
        user_id: payload.user_id,
        staff_id: payload.staff_id,
        user_type: payload.user_type,
        name: payload.name,
        email: payload.email
      }
    });
    
  } catch (error) {
    console.error('Auth verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}