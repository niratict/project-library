// route.ts (หลัก - สำหรับ GET และ POST)
import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";
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

    // สร้าง Promise สำหรับอัปโหลดไฟล์
    const uploadPromise = new Promise<string>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "image",
            folder: "library/books", // โฟลเดอร์ใน Cloudinary
            public_id: `book_${Date.now()}`, // ตั้งชื่อไฟล์ไม่ให้ซ้ำกัน
            transformation: [
              { width: 800, height: 1200, crop: "limit" }, // จำกัดขนาดรูปภาพ
              { quality: "auto" }, // ปรับคุณภาพอัตโนมัติ
              { format: "auto" }, // เลือกรูปแบบไฟล์ที่เหมาะสม
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
    // ดึง public_id จาก URL
    const publicId = extractPublicIdFromUrl(imageUrl);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    // ไม่ throw error เพื่อไม่ให้ขัดขวางการอัปเดตข้อมูล
  }
}

// Helper function สำหรับดึง public_id จาก Cloudinary URL
function extractPublicIdFromUrl(url: string): string | null {
  try {
    const matches = url.match(/\/([^\/]+)\.(jpg|jpeg|png|gif|webp)$/);
    if (matches && matches[1]) {
      // ถ้ามี folder ใน public_id
      const pathParts = url.split("/");
      const fileNameWithExtension = pathParts[pathParts.length - 1];
      const fileName = fileNameWithExtension.split(".")[0];

      // หาตำแหน่งของโฟลเดอร์
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // ดึงข้อมูลจาก FormData
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const isbn = formData.get("isbn") as string;
    const categorie_id = formData.get("categorie_id") as string;
    const description = formData.get("description") as string;
    const publish_year = formData.get("publish_year") as string;
    const publisher = formData.get("publisher") as string;
    const language = formData.get("language") as string;
    const book_limit = formData.get("book_limit") as string;
    const reader_group = formData.get("reader_group") as string;
    const status = formData.get("status") as string;
    const imageFile = formData.get("book_image") as File | null;

    // Validation - ตรวจสอบข้อมูลที่จำเป็น
    if (
      !title ||
      !author ||
      !isbn ||
      !categorie_id ||
      !book_limit ||
      !reader_group
    ) {
      return NextResponse.json(
        {
          error:
            "ข้อมูลไม่ครบ (ต้องมี: ชื่อเรื่อง, ผู้แต่ง, ISBN, หมวดหมู่, จำนวนจำกัด, กลุ่มผู้อ่าน)",
        },
        { status: 400 }
      );
    }

    // Validate enum values
    if (language && !["Thai", "English", "Chinese"].includes(language)) {
      return NextResponse.json(
        { error: "ภาษาต้องเป็น Thai, English, หรือ Chinese" },
        { status: 400 }
      );
    }

    if (!["children", "adult", "education"].includes(reader_group)) {
      return NextResponse.json(
        { error: "กลุ่มผู้อ่านต้องเป็น children, adult, หรือ education" },
        { status: 400 }
      );
    }

    if (status && !["active", "inactive", "deleted"].includes(status)) {
      return NextResponse.json(
        { error: "สถานะต้องเป็น active, inactive, หรือ deleted" },
        { status: 400 }
      );
    }

    // ตรวจสอบและอัปโหลดรูปภาพ
    let book_image_url = null;
    if (imageFile && imageFile.size > 0) {
      // ตรวจสอบขนาดไฟล์ (จำกัดที่ 5MB)
      if (imageFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB" },
          { status: 400 }
        );
      }

      // ตรวจสอบประเภทไฟล์
      if (!isValidImageFile(imageFile)) {
        return NextResponse.json(
          {
            error:
              "รูปภาพต้องเป็นไฟล์ประเภท JPEG, JPG, PNG, GIF, หรือ WebP เท่านั้น",
          },
          { status: 400 }
        );
      }

      try {
        book_image_url = await uploadImageToCloudinary(imageFile);
      } catch (error) {
        return NextResponse.json(
          { error: "ไม่สามารถอัปโหลดรูปภาพได้" },
          { status: 500 }
        );
      }
    }

    const pool = await getConnection();

    // ตรวจสอบว่า category มีอยู่จริง
    const categoryCheck = await pool
      .request()
      .input("categorie_id", sql.Int, parseInt(categorie_id))
      .query(
        "SELECT categorie_id FROM categories WHERE categorie_id = @categorie_id AND deleted_at IS NULL"
      );

    if (categoryCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบหมวดหมู่ที่ระบุ" },
        { status: 400 }
      );
    }

    // บันทึกข้อมูลลงฐานข้อมูล
    await pool
      .request()
      .input("title", sql.NVarChar, title)
      .input("author", sql.NVarChar, author)
      .input("isbn", sql.NVarChar, isbn)
      .input("categorie_id", sql.Int, parseInt(categorie_id))
      .input("description", sql.NVarChar, description || null)
      .input(
        "publish_year",
        sql.Int,
        publish_year ? parseInt(publish_year) : null
      )
      .input("publisher", sql.NVarChar, publisher || null)
      .input("language", sql.NVarChar, language || null)
      .input("book_image", sql.NVarChar, book_image_url)
      .input("book_limit", sql.Int, parseInt(book_limit))
      .input("reader_group", sql.NVarChar, reader_group)
      .input("status", sql.NVarChar, status || "active")
      .input("created_at", sql.DateTime, new Date()).query(`
        INSERT INTO books (
          title, author, isbn, categorie_id, description, 
          publish_year, publisher, language, book_image, 
          book_limit, reader_group, status, created_at
        )
        VALUES (
          @title, @author, @isbn, @categorie_id, @description,
          @publish_year, @publisher, @language, @book_image,
          @book_limit, @reader_group, @status, @created_at
        )
      `);

    return NextResponse.json({
      message: "เพิ่มหนังสือสำเร็จ",
      book_image_url: book_image_url,
    });
  } catch (err: unknown) {
    console.error("POST /api/bookmanagement ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        b.book_id,
        b.title,
        b.author,
        b.isbn,
        b.categorie_id,
        b.description,
        b.publish_year,
        b.publisher,
        b.language,
        b.book_image,
        b.book_limit,
        b.reader_group,
        b.status,
        b.created_at,
        b.updated_at,
        c.name as category_name
      FROM books b
      LEFT JOIN categories c ON b.categorie_id = c.categorie_id
      WHERE b.deleted_at IS NULL AND (c.deleted_at IS NULL OR c.deleted_at IS NULL)
      ORDER BY b.created_at DESC
    `);

    // เนื่องจากใช้ Cloudinary แล้ว book_image จะเป็น URL เต็มอยู่แล้ว
    const booksWithImageUrl = result.recordset.map((book) => ({
      ...book,
      book_image_full_url: book.book_image, // ใช้ URL จาก Cloudinary โดยตรง
    }));

    return NextResponse.json(booksWithImageUrl);
  } catch (err: unknown) {
    console.error("GET /api/bookmanagement error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
