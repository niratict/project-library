// File: /api/users/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

// กำหนดค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function สำหรับอัปโหลดรูปภาพไปยัง Cloudinary
async function uploadImageToCloudinary(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadPromise = new Promise<string>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "image",
            folder: "library/profiles",
            public_id: `profile_${Date.now()}`,
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto" },
              { format: "auto" },
            ],
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(error);
            } else if (result) {
              resolve(result.secure_url);
            } else {
              reject(new Error("ไม่สามารถอัปโหลดรูปภาพได้"));
            }
          }
        )
        .end(buffer);
    });

    return await uploadPromise;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw new Error("ไม่สามารถอัปโหลดรูปภาพได้");
  }
}

// Helper function สำหรับลบรูปภาพจาก Cloudinary
async function deleteImageFromCloudinary(imageUrl: string): Promise<void> {
  try {
    const publicId = extractPublicIdFromUrl(imageUrl);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
  }
}

// Helper function สำหรับดึง public_id จาก Cloudinary URL
function extractPublicIdFromUrl(url: string): string | null {
  try {
    const matches = url.match(/\/([^\/]+)\.(jpg|jpeg|png|gif|webp)$/);
    if (matches && matches[1]) {
      const pathParts = url.split("/");
      const fileNameWithExtension = pathParts[pathParts.length - 1];
      const fileName = fileNameWithExtension.split(".")[0];

      const folderIndex = pathParts.findIndex((part) => part === "library");
      if (folderIndex !== -1) {
        const folderPath = pathParts.slice(folderIndex, -1).join("/");
        return `${folderPath}/${fileName}`;
      }

      return fileName;
    }
    return null;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
}

// Helper function สำหรับตรวจสอบประเภทไฟล์
function isValidImageFile(file: File): boolean {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  return allowedTypes.includes(file.type);
}

// Helper function สำหรับดึง user_id จาก token/session หรือ query params
async function getUserIdFromRequest(req: NextRequest): Promise<number> {
  // ลองดึง user_id จาก query params ก่อน
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("user_id");

  if (userIdParam) {
    const userId = parseInt(userIdParam);
    if (!isNaN(userId)) {
      return userId;
    }
  }

  // ถ้าไม่มีใน query params ลองดึงจาก body สำหรับ PUT request
  try {
    const body = await req.clone().json();
    if (body.user_id) {
      const userId = parseInt(body.user_id);
      if (!isNaN(userId)) {
        return userId;
      }
    }
  } catch (error) {
    // ไม่สามารถ parse JSON ได้ - ไม่เป็นไร
  }

  // ถ้าไม่มีทั้งใน query params และ body ให้ใช้ค่า default หรือ throw error
  // สำหรับการทดสอบ สามารถใช้ค่า default
  return 1; // หรือ user_id ที่ต้องการทดสอบ

  // หรือถ้าต้องการให้ error
  // throw new Error("User ID not found");
}

// GET /api/users/profile - Get current user profile
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }

    const pool = await getConnection();
    const result = await pool.request().input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          user_id, 
          name, 
          email, 
          user_type, 
          gender, 
          date_of_birth,
          citizen_id, 
          phone, 
          address, 
          profile_image, 
          status,
          created_at, 
          updated_at
        FROM users 
        WHERE user_id = @user_id AND deleted_at IS NULL
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 404 });
    }

    const user = result.recordset[0];

    // จัดรูปแบบข้อมูลที่ส่งกลับ
    const profileData = {
      user_id: user.user_id,
      // ข้อมูลที่สามารถแก้ไขได้
      editable: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        profile_image: user.profile_image,
        date_of_birth: user.date_of_birth,
      },
      // ข้อมูลที่แสดงผลเท่านั้น (ไม่สามารถแก้ไขได้)
      readonly: {
        user_type: user.user_type,
        gender: user.gender,
        citizen_id: user.citizen_id,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };

    return NextResponse.json(profileData);
  } catch (err) {
    console.error("GET /api/users/profile ERROR:", err);
    return NextResponse.json(
      {
        error: "เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/users/profile - Update current user profile
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // ดึง user_id จาก body หรือ query params
    let userId: number;

    // ลองดึงจาก body ก่อน
    if (body.user_id) {
      userId = parseInt(body.user_id);
    } else {
      // ถ้าไม่มีใน body ลองดึงจาก query params
      const { searchParams } = new URL(req.url);
      const userIdParam = searchParams.get("user_id");
      userId = userIdParam ? parseInt(userIdParam) : 0;
    }

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลผู้ใช้ กรุณาระบุ user_id" },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      phone,
      address,
      profile_image,
      date_of_birth,
      current_password,
      new_password,
    } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        {
          error: "กรุณาระบุชื่อและอีเมล",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: "รูปแบบอีเมลไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (phone && !/^[0-9]{10}$/.test(phone.replace(/[-\s]/g, ""))) {
      return NextResponse.json(
        {
          error: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก",
        },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Check if user exists
    const existingUser = await pool.request().input("user_id", sql.Int, userId)
      .query(`
        SELECT user_id, password, profile_image 
        FROM users 
        WHERE user_id = @user_id AND deleted_at IS NULL
      `);

    if (existingUser.recordset.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 404 });
    }

    const currentUser = existingUser.recordset[0];

    // Check if email already exists (exclude current user)
    const duplicateCheck = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("user_id", sql.Int, userId).query(`
        SELECT user_id FROM users 
        WHERE email = @email 
        AND user_id != @user_id 
        AND deleted_at IS NULL
      `);

    if (duplicateCheck.recordset.length > 0) {
      return NextResponse.json(
        {
          error: "อีเมลนี้มีอยู่ในระบบแล้ว",
        },
        { status: 409 }
      );
    }

    // Handle password change if provided
    let hashedPassword = null;
    if (new_password) {
      if (!current_password) {
        return NextResponse.json(
          {
            error: "กรุณาระบุรหัสผ่านปัจจุบัน",
          },
          { status: 400 }
        );
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        current_password,
        currentUser.password
      );
      if (!isValidPassword) {
        return NextResponse.json(
          {
            error: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
          },
          { status: 400 }
        );
      }

      // Validate new password strength
      if (new_password.length < 6) {
        return NextResponse.json(
          {
            error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร",
          },
          { status: 400 }
        );
      }

      hashedPassword = await bcrypt.hash(new_password, 10);
    }

    // Handle profile image deletion if old image exists and new image is different
    if (
      currentUser.profile_image &&
      profile_image !== currentUser.profile_image
    ) {
      await deleteImageFromCloudinary(currentUser.profile_image);
    }

    // Prepare update query
    let updateQuery = `
      UPDATE users
      SET name = @name,
          email = @email,
          phone = @phone,
          address = @address,
          profile_image = @profile_image,
          date_of_birth = @date_of_birth,
          updated_at = @updated_at
    `;

    const request = pool
      .request()
      .input("user_id", sql.Int, userId)
      .input("name", sql.NVarChar, name.trim())
      .input("email", sql.NVarChar, email.trim().toLowerCase())
      .input("phone", sql.VarChar, phone || null)
      .input("address", sql.NVarChar, address || null)
      .input("profile_image", sql.NVarChar, profile_image || null)
      .input("date_of_birth", sql.Date, date_of_birth || null)
      .input("updated_at", sql.DateTime, new Date());

    // Add password update if provided
    if (hashedPassword) {
      updateQuery += `, password = @password`;
      request.input("password", sql.NVarChar, hashedPassword);
    }

    updateQuery += ` WHERE user_id = @user_id AND deleted_at IS NULL`;

    await request.query(updateQuery);

    return NextResponse.json({
      message: "อัปเดตโปรไฟล์สำเร็จ",
      updated_fields: {
        name,
        email,
        phone,
        address,
        profile_image,
        date_of_birth,
        password_changed: !!hashedPassword,
      },
    });
  } catch (err) {
    console.error("PUT /api/users/profile ERROR:", err);
    return NextResponse.json(
      {
        error: "ไม่สามารถอัปเดตโปรไฟล์ได้",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/users/profile - Upload profile image
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("profile_image") as File;
    const userIdFormData = formData.get("user_id") as string;

    // ดึง user_id จาก form data หรือ query params
    let userId: number;

    if (userIdFormData) {
      userId = parseInt(userIdFormData);
    } else {
      const { searchParams } = new URL(req.url);
      const userIdParam = searchParams.get("user_id");
      userId = userIdParam ? parseInt(userIdParam) : 0;
    }

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลผู้ใช้ กรุณาระบุ user_id" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "กรุณาเลือกไฟล์รูปภาพ" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidImageFile(file)) {
      return NextResponse.json(
        {
          error: "รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF, WebP)",
        },
        { status: 400 }
      );
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "ขนาดไฟล์ต้องไม่เกิน 5MB",
        },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Get current profile image to delete if exists
    const currentUser = await pool.request().input("user_id", sql.Int, userId)
      .query(`
        SELECT profile_image 
        FROM users 
        WHERE user_id = @user_id AND deleted_at IS NULL
      `);

    if (currentUser.recordset.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 404 });
    }

    // Upload new image to Cloudinary
    const imageUrl = await uploadImageToCloudinary(file);

    // Delete old image if exists
    const oldImage = currentUser.recordset[0].profile_image;
    if (oldImage) {
      await deleteImageFromCloudinary(oldImage);
    }

    // Update profile image in database
    await pool
      .request()
      .input("user_id", sql.Int, userId)
      .input("profile_image", sql.NVarChar, imageUrl)
      .input("updated_at", sql.DateTime, new Date()).query(`
        UPDATE users
        SET profile_image = @profile_image,
            updated_at = @updated_at
        WHERE user_id = @user_id AND deleted_at IS NULL
      `);

    return NextResponse.json({
      message: "อัปโหลดรูปโปรไฟล์สำเร็จ",
      profile_image: imageUrl,
    });
  } catch (err) {
    console.error("POST /api/users/profile ERROR:", err);
    return NextResponse.json(
      {
        error: "ไม่สามารถอัปโหลดรูปภาพได้",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
