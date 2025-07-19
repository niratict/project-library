// File: /api/staff/profile/route.ts
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
            folder: "library/staff-profiles",
            public_id: `staff_profile_${Date.now()}`,
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

// Helper function สำหรับดึง staff_id จาก token/session หรือ query params
async function getStaffIdFromRequest(req: NextRequest): Promise<number> {
  // ลองดึง staff_id จาก query params ก่อน
  const { searchParams } = new URL(req.url);
  const staffIdParam = searchParams.get("staff_id");

  if (staffIdParam) {
    const staffId = parseInt(staffIdParam);
    if (!isNaN(staffId)) {
      return staffId;
    }
  }

  // ถ้าไม่มีใน query params ลองดึงจาก body สำหรับ PUT request
  try {
    const body = await req.clone().json();
    if (body.staff_id) {
      const staffId = parseInt(body.staff_id);
      if (!isNaN(staffId)) {
        return staffId;
      }
    }
  } catch (error) {
    // ไม่สามารถ parse JSON ได้ - ไม่เป็นไร
  }

  // ถ้าไม่มีทั้งใน query params และ body ให้ใช้ค่า default หรือ throw error
  // สำหรับการทดสอบ สามารถใช้ค่า default
  return 1; // หรือ staff_id ที่ต้องการทดสอบ

  // หรือถ้าต้องการให้ error
  // throw new Error("Staff ID not found");
}

// GET /api/staff/profile - Get current staff profile
export async function GET(req: NextRequest) {
  try {
    const staffId = await getStaffIdFromRequest(req);

    if (!staffId) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลเจ้าหน้าที่ กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }

    const pool = await getConnection();
    const result = await pool.request().input("staff_id", sql.Int, staffId)
      .query(`
        SELECT 
          staff_id, 
          name, 
          email, 
          user_type, 
          gender, 
          date_of_birth,
          citizen_id, 
          phone, 
          address, 
          profile_image, 
          hire_date,
          status,
          created_at, 
          updated_at
        FROM staffs 
        WHERE staff_id = @staff_id AND deleted_at IS NULL
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลเจ้าหน้าที่" },
        { status: 404 }
      );
    }

    const staff = result.recordset[0];

    // จัดรูปแบบข้อมูลที่ส่งกลับ
    const profileData = {
      staff_id: staff.staff_id,
      // ข้อมูลที่สามารถแก้ไขได้
      editable: {
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        address: staff.address,
        profile_image: staff.profile_image,
        date_of_birth: staff.date_of_birth,
      },
      // ข้อมูลที่แสดงผลเท่านั้น (ไม่สามารถแก้ไขได้)
      readonly: {
        user_type: staff.user_type,
        citizen_id: staff.citizen_id,
        gender: staff.gender,
        hire_date: staff.hire_date,
        status: staff.status,
        created_at: staff.created_at,
        updated_at: staff.updated_at,
      },
    };

    return NextResponse.json(profileData);
  } catch (err) {
    console.error("GET /api/staff/profile ERROR:", err);
    return NextResponse.json(
      {
        error: "เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/staff/profile - Update current staff profile
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // ดึง staff_id จาก body หรือ query params
    let staffId: number;

    // ลองดึงจาก body ก่อน
    if (body.staff_id) {
      staffId = parseInt(body.staff_id);
    } else {
      // ถ้าไม่มีใน body ลองดึงจาก query params
      const { searchParams } = new URL(req.url);
      const staffIdParam = searchParams.get("staff_id");
      staffId = staffIdParam ? parseInt(staffIdParam) : 0;
    }

    if (!staffId || isNaN(staffId)) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลเจ้าหน้าที่ กรุณาระบุ staff_id" },
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

    // Validate date of birth (must be at least 18 years old)
    if (date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      if (age < 18) {
        return NextResponse.json(
          {
            error: "อายุต้องไม่น้อยกว่า 18 ปี",
          },
          { status: 400 }
        );
      }
    }

    const pool = await getConnection();

    // Check if staff exists
    const existingStaff = await pool
      .request()
      .input("staff_id", sql.Int, staffId).query(`
        SELECT staff_id, password, profile_image 
        FROM staffs 
        WHERE staff_id = @staff_id AND deleted_at IS NULL
      `);

    if (existingStaff.recordset.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลเจ้าหน้าที่" },
        { status: 404 }
      );
    }

    const currentStaff = existingStaff.recordset[0];

    // Check if email already exists (exclude current staff)
    const duplicateCheck = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("staff_id", sql.Int, staffId).query(`
        SELECT staff_id FROM staffs 
        WHERE email = @email 
        AND staff_id != @staff_id 
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
        currentStaff.password
      );
      if (!isValidPassword) {
        return NextResponse.json(
          {
            error: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
          },
          { status: 400 }
        );
      }

      // Validate new password strength (stricter for staff)
      if (new_password.length < 8) {
        return NextResponse.json(
          {
            error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร",
          },
          { status: 400 }
        );
      }

      // Check password complexity for staff
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(new_password)) {
        return NextResponse.json(
          {
            error:
              "รหัสผ่านต้องมีตัวอักษรพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ",
          },
          { status: 400 }
        );
      }

      hashedPassword = await bcrypt.hash(new_password, 12);
    }

    // Handle profile image deletion if old image exists and new image is different
    if (
      currentStaff.profile_image &&
      profile_image !== currentStaff.profile_image
    ) {
      await deleteImageFromCloudinary(currentStaff.profile_image);
    }

    // Prepare update query
    let updateQuery = `
      UPDATE staffs
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
      .input("staff_id", sql.Int, staffId)
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

    updateQuery += ` WHERE staff_id = @staff_id AND deleted_at IS NULL`;

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
    console.error("PUT /api/staff/profile ERROR:", err);
    return NextResponse.json(
      {
        error: "ไม่สามารถอัปเดตโปรไฟล์ได้",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/staff/profile - Upload staff profile image
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("profile_image") as File;
    const staffIdFormData = formData.get("staff_id") as string;

    // ดึง staff_id จาก form data หรือ query params
    let staffId: number;

    if (staffIdFormData) {
      staffId = parseInt(staffIdFormData);
    } else {
      const { searchParams } = new URL(req.url);
      const staffIdParam = searchParams.get("staff_id");
      staffId = staffIdParam ? parseInt(staffIdParam) : 0;
    }

    if (!staffId || isNaN(staffId)) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลเจ้าหน้าที่ กรุณาระบุ staff_id" },
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

    // Validate file size (3MB for staff profiles - smaller than user)
    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "ขนาดไฟล์ต้องไม่เกิน 3MB",
        },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Get current profile image to delete if exists
    const currentStaff = await pool
      .request()
      .input("staff_id", sql.Int, staffId).query(`
        SELECT profile_image 
        FROM staffs 
        WHERE staff_id = @staff_id AND deleted_at IS NULL
      `);

    if (currentStaff.recordset.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลเจ้าหน้าที่" },
        { status: 404 }
      );
    }

    // Upload new image to Cloudinary
    const imageUrl = await uploadImageToCloudinary(file);

    // Delete old image if exists
    const oldImage = currentStaff.recordset[0].profile_image;
    if (oldImage) {
      await deleteImageFromCloudinary(oldImage);
    }

    // Update profile image in database
    await pool
      .request()
      .input("staff_id", sql.Int, staffId)
      .input("profile_image", sql.NVarChar, imageUrl)
      .input("updated_at", sql.DateTime, new Date()).query(`
        UPDATE staffs
        SET profile_image = @profile_image,
            updated_at = @updated_at
        WHERE staff_id = @staff_id AND deleted_at IS NULL
      `);

    return NextResponse.json({
      message: "อัปโหลดรูปโปรไฟล์สำเร็จ",
      profile_image: imageUrl,
    });
  } catch (err) {
    console.error("POST /api/staff/profile ERROR:", err);
    return NextResponse.json(
      {
        error: "ไม่สามารถอัปโหลดรูปภาพได้",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
