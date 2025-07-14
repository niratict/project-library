// route.ts (สำหรับ [id] - PUT และ DELETE)
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

// PUT /api/bookmanagement/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const booksId = Number(id);

  if (!booksId || isNaN(booksId)) {
    return NextResponse.json(
      { error: "รหัสหนังสือไม่ถูกต้อง" },
      { status: 400 }
    );
  }

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
    const removeImage = formData.get("remove_image") as string; // สำหรับลบรูปภาพ

    // Validation - ตรวจสอบข้อมูลที่จำเป็น
    if (!title || !author || !categorie_id || !book_limit || !reader_group) {
      return NextResponse.json(
        {
          error:
            "กรุณาระบุข้อมูลที่จำเป็น (ชื่อเรื่อง, ผู้แต่ง, หมวดหมู่, จำนวนจำกัด, กลุ่มผู้อ่าน)",
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

    const pool = await getConnection();

    // ตรวจสอบว่าหนังสือมีอยู่จริงหรือไม่ และดึงข้อมูลรูปภาพเก่า
    const checkResult = await pool.request().input("book_id", sql.Int, booksId)
      .query(`
        SELECT book_id, book_image FROM books 
        WHERE book_id = @book_id AND deleted_at IS NULL
      `);

    if (checkResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบหนังสือที่ต้องการแก้ไข" },
        { status: 404 }
      );
    }

    const oldBookImage = checkResult.recordset[0].book_image;

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

    // จัดการรูปภาพ
    let book_image_url = oldBookImage; // ใช้รูปเก่าเป็นค่าเริ่มต้น

    // ถ้าต้องการลบรูปภาพ
    if (removeImage === "true") {
      if (oldBookImage) {
        await deleteImageFromCloudinary(oldBookImage);
      }
      book_image_url = null;
    }
    // ถ้ามีรูปภาพใหม่
    else if (imageFile && imageFile.size > 0) {
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
        // อัปโหลดรูปใหม่
        book_image_url = await uploadImageToCloudinary(imageFile);

        // ลบรูปเก่าจาก Cloudinary
        if (oldBookImage) {
          await deleteImageFromCloudinary(oldBookImage);
        }
      } catch (error) {
        return NextResponse.json(
          { error: "ไม่สามารถอัปโหลดรูปภาพได้" },
          { status: 500 }
        );
      }
    }

    // อัปเดตข้อมูล
    await pool
      .request()
      .input("book_id", sql.Int, booksId)
      .input("title", sql.NVarChar, title)
      .input("author", sql.NVarChar, author)
      .input("isbn", sql.NVarChar, isbn || null)
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
      .input("updated_at", sql.DateTime, new Date()).query(`
        UPDATE books
        SET title = @title,
            author = @author,
            isbn = @isbn,
            categorie_id = @categorie_id,
            description = @description,
            publish_year = @publish_year,
            publisher = @publisher,
            language = @language,
            book_image = @book_image,
            book_limit = @book_limit,
            reader_group = @reader_group,
            status = @status,
            updated_at = @updated_at
        WHERE book_id = @book_id AND deleted_at IS NULL
      `);

    return NextResponse.json({
      message: "อัปเดตข้อมูลหนังสือสำเร็จ",
      book_image_url: book_image_url,
    });
  } catch (err) {
    console.error("PUT /api/bookmanagement/[id] ERROR:", err);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตข้อมูลได้" },
      { status: 500 }
    );
  }
}

// DELETE /api/bookmanagement/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const booksId = Number(id);

  if (!booksId || isNaN(booksId)) {
    return NextResponse.json(
      { error: "รหัสหนังสือไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  try {
    const pool = await getConnection();

    // ตรวจสอบว่าหนังสือมีอยู่จริงหรือไม่ และดึงข้อมูลรูปภาพ
    const checkResult = await pool.request().input("book_id", sql.Int, booksId)
      .query(`
        SELECT book_id, book_image FROM books 
        WHERE book_id = @book_id AND deleted_at IS NULL
      `);

    if (checkResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบหนังสือที่ต้องการลบ" },
        { status: 404 }
      );
    }

    const bookImage = checkResult.recordset[0].book_image;

    // ทำ Soft Delete - เปลี่ยนสถานะเป็น 'deleted' และตั้งค่า deleted_at
    await pool
      .request()
      .input("book_id", sql.Int, booksId)
      .input("deleted_at", sql.DateTime, new Date())
      .input("updated_at", sql.DateTime, new Date()).query(`
        UPDATE books
        SET deleted_at = @deleted_at,
            updated_at = @updated_at,
            status = 'deleted'
        WHERE book_id = @book_id AND deleted_at IS NULL
      `);

    // ลบรูปภาพจาก Cloudinary (ถ้ามี)
    if (bookImage) {
      await deleteImageFromCloudinary(bookImage);
    }

    return NextResponse.json({ message: "ลบหนังสือสำเร็จ (แบบ Soft Delete)" });
  } catch (err) {
    console.error("DELETE /api/bookmanagement/[id] ERROR:", err);
    return NextResponse.json(
      { error: "ไม่สามารถลบข้อมูลได้" },
      { status: 500 }
    );
  }
}
