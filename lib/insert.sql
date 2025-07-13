-- Mock Data for Library Database (SQL Server)
-- รองรับภาษาไทยด้วย NVARCHAR

USE librarydb_ict;
GO

-- Insert Categories (หมวดหมู่หนังสือ)
INSERT INTO categories (name) VALUES 
(N'วรรณกรรมไทย'),
(N'วรรณกรรมต่างประเทศ'),
(N'วิทยาศาสตร์และเทคโนโลยี'),
(N'ประวัติศาสตร์'),
(N'ปรัชญาและศาสนา'),
(N'การศึกษา'),
(N'ศิลปะและวัฒนธรรม'),
(N'เศรษฐศาสตร์และธุรกิจ'),
(N'การแพทย์และสุขภาพ'),
(N'กีฬาและนันทนาการ'),
(N'หนังสือเด็ก'),
(N'จิตวิทยาและการพัฒนาตนเอง'),
(N'คอมพิวเตอร์และเทคโนโลยี'),
(N'กฎหมายและการเมือง'),
(N'เกษตรกรรมและสิ่งแวดล้อม');
GO

-- Insert Books (หนังสือ)
INSERT INTO books (categorie_id, title, author, publisher, isbn, description, language, publish_year, book_limit, reader_group, status) VALUES 
-- วรรณกรรมไทย
(1, N'คู่กรรม', N'ทมยันตี', N'สำนักพิมพ์ดอกหญ้า', N'9786161832562', N'นิยายรักที่ขับเคลื่อนด้วยบุญและกรรม เรื่องราวของชายหนุ่มที่ต้องเผชิญกับวิบากกรรมจากอดีตชาติ', N'Thai', 2022, 14, N'adult', N'active'),
(1, N'ลูกผู้ชายคนสุดท้าย', N'ชาติ เกษตรสิน', N'สำนักพิมพ์อมรินทร์', N'9786167339672', N'นิยายเรื่องสั้นที่สะท้อนสังคมไทยสมัยใหม่ด้วยมุมมองที่ลึกซึ้งและเฉียบคม', N'Thai', 2021, 7, N'adult', N'active'),
(1, N'สี่แผ่นดิน', N'นายน้อย', N'สำนักพิมพ์มติชน', N'9786162876543', N'มหากาพย์ทางวรรณกรรมที่เล่าเรื่องราวความรักและความสูญเสียในช่วงสงครามโลก', N'Thai', 2020, 10, N'adult', N'active'),

-- วรรณกรรมต่างประเทศ
(2, N'พันหนึ่งราตรี', N'ไม่ทราบผู้แต่ง', N'สำนักพิมพ์แพรวดาว', N'9786123456789', N'นิทานพื้นบ้านอาหรับที่มีชื่อเสียงระดับโลก รวมเรื่องราวมหัศจรรย์ของอาลาดินและอลีบาบา', N'Thai', 2019, 21, N'adult', N'active'),
(2, N'The Great Gatsby', N'F. Scott Fitzgerald', N'Scribner', N'9780743273565', N'A classic American novel about the Jazz Age and the American Dream', N'English', 2004, 14, N'adult', N'active'),
(2, N'Pride and Prejudice', N'Jane Austen', N'Penguin Classics', N'9780141439518', N'A romantic novel about manners, upbringing, morality, and marriage in Georgian England', N'English', 2003, 10, N'adult', N'active'),

-- วิทยาศาสตร์และเทคโนโลยี
(3, N'ฟิสิกส์ที่เปลี่ยนโลก', N'ดร.สมชาย วิทยาศาสตร์', N'สำนักพิมพ์จุฬาฯ', N'9786167890123', N'หนังสือที่อธิบายทฤษฎีฟิสิกส์สมัยใหม่ในแบบที่เข้าใจง่าย', N'Thai', 2023, 7, N'education', N'active'),
(3, N'A Brief History of Time', N'Stephen Hawking', N'Bantam Books', N'9780553380163', N'A landmark volume in science writing by one of the great minds of our time', N'English', 1988, 14, N'adult', N'active'),
(3, N'เคมีในชีวิตประจำวัน', N'ดร.วิทยา เคมีชีวิต', N'สำนักพิมพ์มหาวิทยาลัยธรรมศาสตร์', N'9786161234567', N'การประยุกต์ใช้เคมีในชีวิตประจำวัน ตั้งแต่อาหารไปจนถึงเครื่องสำอาง', N'Thai', 2022, 10, N'education', N'active'),

-- ประวัติศาสตร์
(4, N'ประวัติศาสตร์ไทย', N'ดร.ชาญณรงค์ ธรรมดา', N'สำนักพิมพ์ศิลปวัฒนธรรม', N'9786167345678', N'ประวัติศาสตร์ไทยตั้งแต่สมัยโบราณจนถึงปัจจุบัน', N'Thai', 2021, 14, N'education', N'active'),
(4, N'Sapiens: A Brief History of Humankind', N'Yuval Noah Harari', N'Harper', N'9780062316097', N'How Homo sapiens became the dominant species on Earth', N'English', 2015, 21, N'adult', N'active'),
(4, N'สงครามโลกครั้งที่ 2', N'ดร.อำนาจ ประวัติศาสตร์', N'สำนักพิมพ์แสงใส', N'9786161987654', N'บทวิเคราะห์สงครามโลกครั้งที่ 2 และผลกระทบต่อโลกยุคใหม่', N'Thai', 2020, 14, N'education', N'active'),

-- ปรัชญาและศาสนา
(5, N'ปรัชญาชีวิต', N'หลวงพ่อชา สุภัทโท', N'สำนักพิมพ์ธรรมสาร', N'9786161456789', N'คำสอนธรรมะเพื่อการดำเนินชีวิต', N'Thai', 2021, 21, N'adult', N'active'),
(5, N'The Art of War', N'Sun Tzu', N'Oxford University Press', N'9780199540662', N'Ancient Chinese military treatise on strategy and tactics', N'English', 2009, 14, N'adult', N'active'),
(5, N'พุทธศาสนากับสังคมไทย', N'พระธรรมปิฎก', N'สำนักพิมพ์มหามกุฏฯ', N'9786162345678', N'ศึกษาบทบาทของพุทธศาสนาในสังคมไทย', N'Thai', 2022, 10, N'adult', N'active'),

-- การศึกษา
(6, N'จิตวิทยาการเรียนรู้', N'ดร.สมหญิง การศึกษา', N'สำนักพิมพ์ครู', N'9786161567890', N'ทฤษฎีและการปฏิบัติในการจัดการเรียนรู้', N'Thai', 2023, 14, N'education', N'active'),
(6, N'Pedagogy of the Oppressed', N'Paulo Freire', N'Continuum International', N'9780826412768', N'Critical pedagogy and education for critical consciousness', N'English', 2000, 10, N'education', N'active'),
(6, N'การออกแบบหลักสูตร', N'ดร.วิไล หลักสูตร', N'สำนักพิมพ์ศึกษาศาสตร์', N'9786162456789', N'หลักการและวิธีการออกแบบหลักสูตรที่มีประสิทธิภาพ', N'Thai', 2022, 7, N'education', N'active'),

-- ศิลปะและวัฒนธรรม
(7, N'ศิลปะไทยโบราณ', N'อาจารย์มาลี ศิลปิน', N'สำนักพิมพ์ศิลปกรรม', N'9786163456789', N'ประวัติและพัฒนาการของศิลปะไทยตั้งแต่อดีตถึงปัจจุบัน', N'Thai', 2021, 10, N'adult', N'active'),
(7, N'The Story of Art', N'Ernst Gombrich', N'Phaidon Press', N'9780714832470', N'A survey of the history of art from ancient times to the modern era', N'English', 2006, 14, N'adult', N'active'),
(7, N'วัฒนธรรมไทยสี่ภาค', N'ดร.สมบูรณ์ วัฒนธรรม', N'สำนักพิมพ์ไทยวัฒนา', N'9786164567890', N'ความหลากหลายทางวัฒนธรรมในแต่ละภูมิภาคของประเทศไทย', N'Thai', 2020, 14, N'education', N'active'),

-- เศรษฐศาสตร์และธุรกิจ
(8, N'เศรษฐศาสตร์พอเพียง', N'ดร.อนุชา เศรษฐกิจ', N'สำนักพิมพ์ธุรกิจ', N'9786165678901', N'การประยุกต์ปรัชญาเศรษฐกิจพอเพียงในการประกอบธุรกิจ', N'Thai', 2023, 21, N'adult', N'active'),
(8, N'The Wealth of Nations', N'Adam Smith', N'Modern Library', N'9780679783367', N'An inquiry into the nature and causes of the wealth of nations', N'English', 2000, 10, N'adult', N'active'),
(8, N'การตลาดยุคดิจิทัล', N'ดร.สุนีย์ การตลาด', N'สำนักพิมพ์ดิจิทัล', N'9786166789012', N'กลยุทธ์การตลาดออนไลน์สำหรับธุรกิจยุคใหม่', N'Thai', 2023, 14, N'adult', N'active'),

-- การแพทย์และสุขภาพ
(9, N'สุขภาพดีด้วยสมุนไพร', N'ดร.พิมพ์ใจ สมุนไพร', N'สำนักพิมพ์สุขภาพ', N'9786167890123', N'การใช้สมุนไพรไทยในการรักษาโรคและดูแลสุขภาพ', N'Thai', 2022, 14, N'adult', N'active'),
(9, N'Grays Anatomy', N'Henry Gray', N'Churchill Livingstone', N'9780702052309', N'The anatomical basis of clinical practice', N'English', 2016, 7, N'education', N'active'),
(9, N'โภชนาการเพื่อสุขภาพ', N'ดร.สุขใจ โภชนาการ', N'สำนักพิมพ์สุขภาพดี', N'9786168901234', N'หลักโภชนาการที่ถูกต้องสำหรับการมีสุขภาพดี', N'Thai', 2023, 21, N'adult', N'active'),

-- กีฬาและนันทนาการ
(10, N'ฟุตบอลโลก', N'สมชาย กีฬา', N'สำนักพิมพ์กีฬา', N'9786169012345', N'ประวัติศาสตร์ฟุตบอลโลกตั้งแต่อดีตจนถึงปัจจุบัน', N'Thai', 2022, 14, N'adult', N'active'),
(10, N'The Champions Mind', N'Jim Afremow', N'Rodale Books', N'9781623365387', N'How great athletes think, train, and thrive', N'English', 2014, 10, N'adult', N'active'),
(10, N'โยคะเพื่อสุขภาพ', N'ครูใหญ่ โยคะ', N'สำนักพิมพ์สุขภาพดี', N'9786170123456', N'ท่าโยคะพื้นฐานและการฝึกปฏิบัติที่ถูกต้อง', N'Thai', 2023, 21, N'adult', N'active'),

-- หนังสือเด็ก
(11, N'นิทานพื้นบ้านไทย', N'ยาย สุดใจ', N'สำนักพิมพ์เด็กดี', N'9786171234567', N'รวมนิทานพื้นบ้านไทยที่เด็กๆ ควรรู้', N'Thai', 2021, 21, N'children', N'active'),
(11, N'Harry Potter and the Philosophers Stone', N'J.K. Rowling', N'Bloomsbury', N'9780747532699', N'The first book in the Harry Potter series', N'English', 1997, 14, N'children', N'active'),
(11, N'ผจญภัยในป่าใหญ่', N'ลุงตู่ นิทาน', N'สำนักพิมพ์การ์ตูน', N'9786172345678', N'การผจญภัยของเด็กน้อยในป่าใหญ่', N'Thai', 2022, 21, N'children', N'active'),

-- จิตวิทยาและการพัฒนาตนเอง
(12, N'จิตวิทยาเชิงบวก', N'ดร.สร้อยใจ จิตวิทยา', N'สำนักพิมพ์จิตใจ', N'9786173456789', N'การพัฒนาจิตใจให้แข็งแกร่งและมีความสุข', N'Thai', 2023, 14, N'adult', N'active'),
(12, N'Atomic Habits', N'James Clear', N'Avery', N'9780735211292', N'An easy and proven way to build good habits and break bad ones', N'English', 2018, 21, N'adult', N'active'),
(12, N'การสื่อสารที่มีประสิทธิภาพ', N'ดร.พูดเก่ง สื่อสาร', N'สำนักพิมพ์สื่อสาร', N'9786174567890', N'เทคนิคการสื่อสารที่ช่วยให้ชีวิตและงานดีขึ้น', N'Thai', 2022, 14, N'adult', N'active'),

-- คอมพิวเตอร์และเทคโนโลยี
(13, N'Python สำหรับผู้เริ่มต้น', N'ดร.โค้ด เขียนโปรแกรม', N'สำนักพิมพ์เทคโนโลยี', N'9786175678901', N'เรียนรู้การเขียนโปรแกรม Python ตั้งแต่เริ่มต้น', N'Thai', 2023, 14, N'education', N'active'),
(13, N'Clean Code', N'Robert C. Martin', N'Prentice Hall', N'9780132350884', N'A handbook of agile software craftsmanship', N'English', 2008, 10, N'education', N'active'),
(13, N'ปัญญาประดิษฐ์ในชีวิตจริง', N'ดร.สมาร์ท เทคโนโลยี', N'สำนักพิมพ์ดิจิทัล', N'9786176789012', N'การประยุกต์ใช้ AI ในชีวิตประจำวันและธุรกิจ', N'Thai', 2023, 21, N'adult', N'active'),

-- กฎหมายและการเมือง
(14, N'กฎหมายแพ่งและพาณิชย์', N'ดร.ยุติธรรม กฎหมาย', N'สำนักพิมพ์กฎหมาย', N'9786177890123', N'หลักกฎหมายแพ่งและพาณิชย์ที่ประชาชนควรรู้', N'Thai', 2022, 14, N'adult', N'active'),
(14, N'The Social Contract', N'Jean-Jacques Rousseau', N'Penguin Classics', N'9780140442014', N'Principles of political right', N'English', 2006, 10, N'adult', N'active'),
(14, N'ระบบการเมืองไทย', N'ดร.ประชาธิปไตย การเมือง', N'สำนักพิมพ์การเมือง', N'9786178901234', N'วิวัฒนาการของระบบการเมืองไทย', N'Thai', 2021, 14, N'education', N'active'),

-- เกษตรกรรมและสิ่งแวดล้อม
(15, N'เกษตรอินทรีย์', N'ดร.ปลูก เกษตร', N'สำนักพิมพ์เกษตรกรรม', N'9786179012345', N'หลักการและวิธีการทำเกษตรอินทรีย์', N'Thai', 2023, 21, N'adult', N'active'),
(15, N'Silent Spring', N'Rachel Carson', N'Houghton Mifflin', N'9780618249060', N'The environmental impact of pesticides', N'English', 2002, 10, N'adult', N'active'),
(15, N'การอนุรักษ์สิ่งแวดล้อม', N'ดร.เขียว สิ่งแวดล้อม', N'สำนักพิมพ์สิ่งแวดล้อม', N'9786180123456', N'วิธีการอนุรักษ์และฟื้นฟูสิ่งแวดล้อม', N'Thai', 2022, 14, N'adult', N'active');
GO

-- Insert Sample Users (ผู้ใช้ตัวอย่าง) $2b$10$dhR8ozNKda6zK0AWYARHYuKKMqTylFzKBDl75KW4WtIwEOG0luGa. = 123456
INSERT INTO users (name, email, password, user_type, gender, date_of_birth, citizen_id, phone, address, status) VALUES 
(N'สมศักดิ์ ใจดี', N'somsak@email.com', N'$2b$10$dhR8ozNKda6zK0AWYARHYuKKMqTylFzKBDl75KW4WtIwEOG0luGa.', N'citizen', N'male', '1985-03-15', N'1234567890123', N'0812345678', N'123 ถนนสุขุมวิท เขตวัฒนา กรุงเทพฯ 10110', N'active'),
(N'สมใจ รักหนังสือ', N'somjai@email.com', N'$2b$10$dhR8ozNKda6zK0AWYARHYuKKMqTylFzKBDl75KW4WtIwEOG0luGa.', N'citizen', N'female', '1990-07-22', N'2345678901234', N'0823456789', N'456 ถนนรัชดาภิเษก เขตห้วยขวาง กรุงเทพฯ 10310', N'active'),
(N'ดร.อนุชา เรียนรู้', N'anucha@university.ac.th', N'$2b$10$dhR8ozNKda6zK0AWYARHYuKKMqTylFzKBDl75KW4WtIwEOG0luGa.', N'educational', N'male', '1978-11-08', N'3456789012345', N'0834567890', N'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี', N'active'),
(N'ครูสมหญิง การศึกษา', N'somying@school.ac.th', N'$2b$10$dhR8ozNKda6zK0AWYARHYuKKMqTylFzKBDl75KW4WtIwEOG0luGa.', N'educational', N'female', '1982-05-30', N'4567890123456', N'0845678901', N'โรงเรียนมัธยมเทคโนโลยีกรุงเทพ', N'active'),
(N'น้องมิน นักอ่าน', N'min@email.com', N'$2b$10$dhR8ozNKda6zK0AWYARHYuKKMqTylFzKBDl75KW4WtIwEOG0luGa.', N'citizen', N'female', '2000-12-01', N'5678901234567', N'0856789012', N'789 ถนนพหลโยธิน เขตจตุจักร กรุงเทพฯ 10900', N'active');
GO

-- Insert Sample Staffs (เจ้าหน้าที่ตัวอย่าง)
INSERT INTO staffs (name, email, password, user_type, gender, date_of_birth, citizen_id, phone, address, hire_date, status) VALUES 
(N'ดร.วิไล บรรณารักษ์', N'wilai@library.gov.th', N'$2b$10$dhR8ozNKda6zK0AWYARHYuKKMqTylFzKBDl75KW4WtIwEOG0luGa.', N'librarian', N'female', '1975-08-15', N'6789012345678', N'0867890123', N'ห้องสมุดแห่งชาติ กรุงเทพฯ', '2010-06-01', N'active'),
(N'คุณสมชาย ผู้อำนวยการ', N'somchai@library.gov.th', N'$2b$10$dhR8ozNKda6zK0AWYARHYuKKMqTylFzKBDl75KW4WtIwEOG0luGa.', N'admin', N'male', '1970-03-20', N'7890123456789', N'0878901234', N'ห้องสมุดแห่งชาติ กรุงเทพฯ', '2005-01-15', N'active'),
(N'นางสาววรรณี ช่วยเหลือ', N'wannee@library.gov.th', N'$2b$10$dhR8ozNKda6zK0AWYARHYuKKMqTylFzKBDl75KW4WtIwEOG0luGa.', N'librarian', N'female', '1988-12-10', N'8901234567890', N'0889012345', N'ห้องสมุดแห่งชาติ กรุงเทพฯ', '2015-09-01', N'active');
GO

-- Insert Book Copies (สำเนาหนังสือ)
-- สร้างหลายสำเนาสำหรับแต่ละหนังสือ
INSERT INTO book_copies (book_id, status, shelf_location) VALUES 
-- หนังสือ ID 1-5
(1, N'available', N'A1-001'), (1, N'available', N'A1-002'), (1, N'borrowed', N'A1-003'),
(2, N'available', N'A1-004'), (2, N'available', N'A1-005'),
(3, N'available', N'A1-006'), (3, N'available', N'A1-007'), (3, N'available', N'A1-008'),
(4, N'available', N'A2-001'), (4, N'available', N'A2-002'), (4, N'reservations', N'A2-003'),
(5, N'available', N'A2-004'), (5, N'available', N'A2-005'),

-- หนังสือ ID 6-10
(6, N'available', N'A2-006'), (6, N'available', N'A2-007'), (6, N'borrowed', N'A2-008'),
(7, N'available', N'B1-001'), (7, N'available', N'B1-002'),
(8, N'available', N'B1-003'), (8, N'available', N'B1-004'),
(9, N'available', N'B1-005'), (9, N'available', N'B1-006'), (9, N'available', N'B1-007'),
(10, N'available', N'B2-001'), (10, N'available', N'B2-002'),

-- หนังสือ ID 11-15
(11, N'available', N'B2-003'), (11, N'available', N'B2-004'), (11, N'borrowed', N'B2-005'),
(12, N'available', N'C1-001'), (12, N'available', N'C1-002'),
(13, N'available', N'C1-003'), (13, N'available', N'C1-004'),
(14, N'available', N'C1-005'), (14, N'available', N'C1-006'),
(15, N'available', N'C2-001'), (15, N'available', N'C2-002'),

-- หนังสือที่เหลือ
(16, N'available', N'C2-003'), (16, N'available', N'C2-004'),
(17, N'available', N'D1-001'), (17, N'available', N'D1-002'),
(18, N'available', N'D1-003'), (18, N'available', N'D1-004'),
(19, N'available', N'D2-001'), (19, N'available', N'D2-002'),
(20, N'available', N'D2-003'), (20, N'available', N'D2-004');
GO

-- Insert Sample Borrow Transactions (ตัวอย่างการยืม-คืน)
INSERT INTO borrow_transactions (user_id, book_copies_id, borrow_date, due_date, return_date, fine, staff_id) VALUES 
-- การยืมที่คืนแล้ว (กรณีที่ 3: การคืน)
(1, 1, '2024-01-15 10:30:00', '2024-02-15 23:59:59', '2024-02-10 14:20:00', 0.00, 1),
(2, 2, '2024-01-20 09:15:00', '2024-02-20 23:59:59', '2024-02-18 16:45:00', 0.00, 2),
(3, 3, '2024-02-01 11:00:00', '2024-03-01 23:59:59', '2024-03-05 10:30:00', 20.00, 1),
(4, 5, '2024-01-10 13:45:00', '2024-02-10 23:59:59', '2024-02-08 11:30:00', 0.00, 3),
(5, 7, '2024-01-25 16:20:00', '2024-02-25 23:59:59', '2024-03-01 09:45:00', 30.00, 2),
(1, 9, '2024-02-05 08:15:00', '2024-03-05 23:59:59', '2024-03-04 15:30:00', 0.00, 1),
(2, 12, '2024-02-12 14:30:00', '2024-03-12 23:59:59', '2024-03-10 10:15:00', 0.00, 3),

-- การยืมที่ยังไม่คืน (กรณีที่ 2: การยืม)
(4, 3, '2024-02-10 14:30:00', '2024-03-10 23:59:59', NULL, NULL, 2),
(5, 8, '2024-02-15 16:00:00', '2024-03-15 23:59:59', NULL, NULL, 1),
(1, 15, '2024-02-20 10:00:00', '2024-03-20 23:59:59', NULL, NULL, 3),
(3, 18, '2024-02-22 11:30:00', '2024-03-22 23:59:59', NULL, NULL, 1),
(2, 21, '2024-02-25 13:45:00', '2024-03-25 23:59:59', NULL, NULL, 2),
(4, 24, '2024-02-28 09:20:00', '2024-03-28 23:59:59', NULL, NULL, 3),

-- การจอง (กรณีที่ 1: การจอง)
(2, 11, NULL, NULL, NULL, NULL, NULL),
(3, 25, NULL, NULL, NULL, NULL, NULL),
(5, 28, NULL, NULL, NULL, NULL, NULL),
(1, 31, NULL, NULL, NULL, NULL, NULL),
(4, 34, NULL, NULL, NULL, NULL, NULL),
(2, 37, NULL, NULL, NULL, NULL, NULL),
(5, 40, NULL, NULL, NULL, NULL, NULL),

-- การยืมที่เกินกำหนด (สำหรับทดสอบการคำนวณค่าปรับ)
(1, 4, '2024-01-05 10:00:00', '2024-02-05 23:59:59', NULL, NULL, 1), -- เกินกำหนด 5 วัน
(3, 6, '2024-01-30 14:30:00', '2024-02-28 23:59:59', NULL, NULL, 2), -- เกินกำหนด 12 วัน

-- การยืมที่มีประวัติการจองก่อนหน้า (workflow: จอง -> ยืม -> คืน)
(4, 10, '2024-01-15 09:30:00', '2024-02-15 23:59:59', '2024-02-13 16:45:00', 0.00, 1),
(5, 13, '2024-01-20 11:15:00', '2024-02-20 23:59:59', '2024-02-19 14:20:00', 0.00, 2),
(1, 16, '2024-01-25 13:00:00', '2024-02-25 23:59:59', '2024-02-23 10:30:00', 0.00, 3),

-- การยืมหนังสือหลายเล่มของผู้ใช้คนเดียวกัน
(1, 19, '2024-02-01 10:30:00', '2024-03-01 23:59:59', '2024-02-28 15:45:00', 0.00, 1),
(1, 22, '2024-02-03 14:15:00', '2024-03-03 23:59:59', NULL, NULL, 2),
(2, 26, '2024-02-05 09:45:00', '2024-03-05 23:59:59', NULL, NULL, 1),
(2, 29, '2024-02-07 16:30:00', '2024-03-07 23:59:59', '2024-03-06 11:20:00', 0.00, 3),

-- การจองหนังสือยอดนิยม (หลายคนจองเล่มเดียวกัน)
(3, 32, NULL, NULL, NULL, NULL, NULL),
(4, 35, NULL, NULL, NULL, NULL, NULL),
(5, 38, NULL, NULL, NULL, NULL, NULL);
GO