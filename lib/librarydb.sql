-- สร้างฐานข้อมูล (ถ้ายังไม่มี)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'librarydb')
BEGIN
  CREATE DATABASE librarydb;
END;
GO

-- เลือกใช้ฐานข้อมูล
USE librarydb;
GO

-- Users Table
CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(50) NOT NULL,
    password NVARCHAR(100) NOT NULL,
    user_type NVARCHAR(20) NOT NULL CHECK (user_type IN ('citizen', 'educational')),
    gender NVARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    citizen_id VARCHAR(13) NOT NULL,
    phone VARCHAR(20),
    address NVARCHAR(255),
    profile_image NVARCHAR(50),
    status NVARCHAR(10) NOT NULL CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME,
    deleted_at DATETIME
);
GO

-- Staffs Table
CREATE TABLE staffs (
    staff_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(50) NOT NULL,
    password NVARCHAR(100) NOT NULL,
    user_type NVARCHAR(20) NOT NULL CHECK (user_type IN ('librarian', 'admin')),
    gender NVARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    citizen_id VARCHAR(13) NOT NULL,
    phone VARCHAR(20),
    address NVARCHAR(255),
    profile_image NVARCHAR(50),
    hire_date DATE,
    status NVARCHAR(10) NOT NULL CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME,
    deleted_at DATETIME
);
GO

-- Categories Table
CREATE TABLE categories (
    categorie_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME,
    deleted_at DATETIME
);
GO

-- Books Table
CREATE TABLE books (
    book_id INT IDENTITY(1,1) PRIMARY KEY,
    categorie_id INT NOT NULL FOREIGN KEY REFERENCES categories(categorie_id),
    title NVARCHAR(255) NOT NULL,
    author NVARCHAR(255) NOT NULL,
    publisher NVARCHAR(255),
    isbn NVARCHAR(20) NOT NULL,
    description NVARCHAR(MAX), -- เปลี่ยนจาก TEXT เป็น NVARCHAR(MAX)
    language NVARCHAR(20) CHECK (language IN ('Thai', 'English', 'Chinese')),
    publish_year INT,
    book_image NVARCHAR(50),
    book_limit INT NOT NULL,
    reader_group NVARCHAR(20) NOT NULL CHECK (reader_group IN ('children', 'adult', 'education')),
    status NVARCHAR(10) NOT NULL CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME,
    deleted_at DATETIME
);
GO

-- Book Copies Table
CREATE TABLE book_copies (
    book_copies_id INT IDENTITY(1,1) PRIMARY KEY,
    book_id INT NOT NULL FOREIGN KEY REFERENCES books(book_id),
    status NVARCHAR(20) NOT NULL CHECK (status IN ('available', 'reservations', 'borrowed')),
    shelf_location NVARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME,
    deleted_at DATETIME
);
GO

-- Borrow Transactions Table
CREATE TABLE borrow_transactions (
    borrow_transactions_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(user_id),
    book_copies_id INT NOT NULL FOREIGN KEY REFERENCES book_copies(book_copies_id),
    borrow_date DATE,
    due_date DATE,
    return_date DATE,
    fine DECIMAL(5,2),
    staff_id INT FOREIGN KEY REFERENCES staffs(staff_id),
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME,
    deleted_at DATETIME
);
GO
