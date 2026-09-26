require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const cors = require("cors");
const { BlobServiceClient } = require("@azure/storage-blob");
const sql = require("mssql");
// const cron = require('node-cron');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const PDFDocument = require('pdfkit');
const PERMIT_SYNC_INSTANCE_ID = `${process.env.HOSTNAME || process.env.COMPUTERNAME || 'unknown-host'}:${process.pid}:${crypto.randomUUID()}`;

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Choose multer storage mode: memory for Azure uploads, disk for local storage
const useAzureStorage = !!process.env.AZURE_STORAGE_CONNECTION_STRING;
const useAzureStorage_1 = !!process.env.AZURE_STORAGE_CONNECTION_STRING_1;
const memoryStorage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-_]/g, "_");
    cb(null, `${Date.now()}-${file.fieldname}-${safeName}`);
  },
});

const upload = multer({
  storage: useAzureStorage ? memoryStorage : diskStorage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

const uploadExcel = multer({
  storage: useAzureStorage ? memoryStorage : diskStorage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

const app = express();
const otpStore = {};
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "ymail.com",
  "rediffmail.com", "rediff.com", "hotmail.com", "outlook.com", "live.com",
  "msn.com", "icloud.com", "me.com", "aol.com", "protonmail.com", "proton.me",
  "mail.com", "zoho.com",
]);
const isValidEmail = (value) =>
  EMAIL_REGEX.test(String(value || "").trim().toLowerCase());
const isBusinessEmail = (value) => {
  const domain = String(value || "").trim().toLowerCase().split("@")[1];
  return Boolean(domain) && !FREE_EMAIL_DOMAINS.has(domain);
};
const getSqlConfig = () => ({
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  options: {
    encrypt: process.env.AZURE_SQL_ENCRYPT !== "false",
    trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === "true",
  },
});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR));

app.post("/api/credentials/request-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const credentialType = String(req.body.credentialType || "").trim().toLowerCase();
    const role = String(req.body.role || "").trim().toUpperCase();
    if (!["officer", "contractor"].includes(credentialType)) {
      return res.status(400).json({ success: false, message: "Invalid credential type." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }
    if (credentialType === "officer" && role === "ADMIN" && !isBusinessEmail(email)) {
      return res.status(400).json({ success: false, message: "ADMIN must use a business email address." });
    }

    const otp = generateOtp();
    const otpKey = `credentials:${credentialType}:${email}`;
    otpStore[otpKey] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    await transporter.sendMail({
      from: '"IOCL_Utility_App" <ioclcbe4149@gmail.com>',
      to: email,
      subject: `${credentialType === "officer" ? "Officer" : "Contractor"} Email Verification OTP`,
      text: `Your email verification OTP is ${otp}. It is valid for 5 minutes.`,
      html: `<p>Your email verification OTP is:</p><p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p><p>This OTP is valid for 5 minutes.</p>`,
    });

    return res.json({ success: true, message: "OTP sent to the email address." });
  } catch (error) {
    console.error("Credential OTP request failed:", error);
    return res.status(500).json({ success: false, message: "Unable to send OTP." });
  }
});

app.post("/api/credentials/verify-otp", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const credentialType = String(req.body.credentialType || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();
  const otpKey = `credentials:${credentialType}:${email}`;
  const storedEntry = otpStore[otpKey];

  if (!["officer", "contractor"].includes(credentialType) || !isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: "Enter a valid email address and six-digit OTP." });
  }
  if (!storedEntry || Date.now() > storedEntry.expiresAt) {
    delete otpStore[otpKey];
    return res.status(400).json({ success: false, message: "OTP expired or not requested." });
  }
  if (storedEntry.otp !== otp) {
    return res.status(401).json({ success: false, message: "Invalid OTP." });
  }

  delete otpStore[otpKey];
  return res.json({ success: true, message: "Email verified successfully." });
});

app.post("/api/admin/request-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const role = String(req.body.role || "").trim().toUpperCase();
    const locationCode = String(req.body.locationCode || "").trim();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email address is required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const config = getSqlConfig();
    if (!config.server || !config.database || !config.user || !config.password) {
      return res.status(500).json({
        success: false,
        message: "Database configuration is missing. Please set AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USER and AZURE_SQL_PASSWORD.",
      });
    }

    await sql.connect(config);
    const request = new sql.Request();
    request.input("email", sql.NVarChar, email);
    request.input("role", sql.NVarChar, role);
    request.input("locationCode", sql.NVarChar, locationCode);
    let sql_query=''
    if (role=='CONTRACTOR'){
      sql_query = `
        SELECT CONTRACTOR_NAME
        FROM ContractorCredentials
        WHERE LOWER(LTRIM(RTRIM(MAIL_ID))) = @email
          AND (LOCATION_CODE = @locationCode)
      `;
    }else{
      sql_query = `
        SELECT [ROLE], [STATUS]
        FROM OfficerCredentials
        WHERE LOWER(LTRIM(RTRIM(MAIL_ID))) = @email
          AND (LOCATION_CODE = @locationCode)
      `;
    }
    const result = await request.query(sql_query);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "The Email Address is not registered or associated with the Role opted for the location selected.",
      });
    }
    if (role!='CONTRACTOR' && String(result.recordset[0].STATUS || "ACTIVE").toUpperCase() === "INACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your officer status is INACTIVE. Ask the location Admin or Super Admin to validate your email and make your status ACTIVE.",
      });
    }
    const otp = generateOtp();
    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      role: role!='CONTRACTOR'? String(result.recordset[0].ROLE).toUpperCase() : "CONTRACTOR",
    };

    const mailOptions = {
      from: '"IOCL_Utility_App" <ioclcbe4149@gmail.com>',
      to: email,
      subject: "Admin OTP Verification",
      text: `Your OTP for admin verification is ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h3 style="margin-bottom: 12px; color: #1a73e8;">Admin Verification OTP</h3>
          <p>Your OTP is:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 16px 0;">${otp}</p>
          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({
      success: true,
      message: "OTP sent to the registered officer email address.",
    });
  } catch (error) {
    console.error("OTP request failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/verify-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email address and OTP are required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const storedEntry = otpStore[email];
    if (!storedEntry) {
      return res.status(400).json({ success: false, message: "OTP expired or not requested." });
    }

    if (Date.now() > storedEntry.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ success: false, message: "OTP expired." });
    }

    if (storedEntry.otp !== otp) {
      return res.status(401).json({ success: false, message: "Invalid OTP." });
    }

    delete otpStore[email];
    return res.status(200).json({
      success: true,
      message: "Admin verified successfully.",
      userType: "admin",
      role: storedEntry.role,
    });
  } catch (error) {
    console.error("OTP verification failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/utility-locations/register/request-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: "Admin email is required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid admin email address." });
    }

    const otp = generateOtp();
    const otpKey = `register:${email}`;
    otpStore[otpKey] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    await transporter.sendMail({
      from: '"IOCL_Utility_App" <ioclcbe4149@gmail.com>',
      to: email,
      subject: "Location Registration OTP",
      text: `Your OTP for location registration is ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h3 style="margin-bottom: 12px; color: #1a73e8;">Location Registration OTP</h3>
          <p>Your OTP is:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 16px 0;">${otp}</p>
          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to the admin email for registration verification.",
    });
  } catch (error) {
    console.error("Location registration OTP request failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/utility-locations/register/verify-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email address and OTP are required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid admin email address." });
    }

    const otpKey = `register:${email}`;
    const storedEntry = otpStore[otpKey];
    if (!storedEntry) {
      return res.status(400).json({ success: false, message: "OTP expired or not requested." });
    }

    if (Date.now() > storedEntry.expiresAt) {
      delete otpStore[otpKey];
      return res.status(400).json({ success: false, message: "OTP expired." });
    }

    if (storedEntry.otp !== otp) {
      return res.status(401).json({ success: false, message: "Invalid OTP." });
    }

    delete otpStore[otpKey];
    return res.status(200).json({
      success: true,
      message: "Admin email verified successfully. You can proceed with registration.",
    });
  } catch (error) {
    console.error("Location registration OTP verification failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/upload-temp-pass",
  upload.fields([
    { name: "request_letter", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
    { name: "driving_licence_front", maxCount: 1 },
    { name: "driving_licence_back", maxCount: 1 },
    { name: "additional_doc", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const bodyData = req.body || {};
      const files = req.files || {};

      const getFileUrl = (fieldName) => {
        const file = files[fieldName]?.[0];
        return file ? `uploads/${file.filename}` : null;
      };

      const filePaths = {
        request_letter: getFileUrl("request_letter"),
        id_proof: getFileUrl("id_proof"),
        driving_licence_front: getFileUrl("driving_licence_front"),
        driving_licence_back: getFileUrl("driving_licence_back"),
        additional_doc: getFileUrl("additional_doc"),
      };

      if (useAzureStorage) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(
          process.env.AZURE_STORAGE_CONNECTION_STRING
        );
        const containerName = process.env.AZURE_STORAGE_CONTAINER || "uploads";
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists({ access: 'container' });

        for (const field of [
          "request_letter",
          "id_proof",
          "driving_licence_front",
          "driving_licence_back",
          "additional_doc",
        ]) {
          const file = files[field]?.[0];
          if (!file) continue;
          const safeName = file.originalname.replace(/[^a-zA-Z0-9.-_]/g, "_");
          const blobName = `${Date.now()}-${field}-${safeName}`;
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: { blobContentType: file.mimetype },
          });
          filePaths[field] = blockBlobClient.url;
        }
      }

      const sqlConfig = {
        user: process.env.AZURE_SQL_USER,
        password: process.env.AZURE_SQL_PASSWORD,
        server: process.env.AZURE_SQL_SERVER,
        database: process.env.AZURE_SQL_DATABASE,
        options: {
          encrypt: process.env.AZURE_SQL_ENCRYPT !== "false",
          trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === "true",
        },
      };

      await sql.connect(sqlConfig);
      const request = new sql.Request();
      request.input('location_code', sql.NVarChar, bodyData['location_code'] || null);
      request.input('vendor', sql.NVarChar, bodyData['vendor'] || null);
      request.input('crew_type', sql.NVarChar, bodyData['crew_type'] || null);
      request.input('crew_name', sql.NVarChar, bodyData['crew_name'] || null);
      request.input('tt_no', sql.NVarChar, bodyData['tt_no'] || null);
      request.input('mobile_no', sql.NVarChar, bodyData['mobile_no'] || null);
      request.input('govt_id', sql.NVarChar, bodyData['govt_id'] || null);
      request.input('driving_licence_no', sql.NVarChar, bodyData['driving_licence_no'] || null);
      request.input('request_from', sql.Date, new Date(bodyData['request_from']) || null);
      request.input('request_to', sql.Date, new Date(bodyData['request_to']) || null);
      request.input('request_letter_path', sql.NVarChar, filePaths.request_letter || null);
      request.input('id_proof_path', sql.NVarChar, filePaths.id_proof || null);
      request.input('driving_licence_front_path', sql.NVarChar, filePaths.driving_licence_front || null);
      request.input('driving_licence_back_path', sql.NVarChar, filePaths.driving_licence_back || null);
      request.input('additional_doc_path', sql.NVarChar, filePaths.additional_doc || null);
      request.input('approval_history', sql.NVarChar(sql.MAX), bodyData['approval_history'] || null);
      
      const insertSql = `INSERT INTO dbo.temp_pass_records (
        location_code, vendor, crew_type, crew_name, tt_no,
        mobile_no, govt_id, driving_licence_no, request_from, request_to,
        request_letter_path, id_proof_path, driving_licence_front_path,
        driving_licence_back_path, additional_doc_path, approval_history, created_at
      ) VALUES (@location_code, @vendor, @crew_type, @crew_name, @tt_no,
        @mobile_no, @govt_id, @driving_licence_no, @request_from, @request_to,
        @request_letter_path, @id_proof_path, @driving_licence_front_path,
        @driving_licence_back_path, @additional_doc_path, @approval_history,
        SYSUTCDATETIME());`;
      await request.query(insertSql)
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.get("/", (req, res) => {
  res.send(
    "API server is running"
  );
});

const sqlConfig = getSqlConfig();

app.post("/api/records/:id/approve", async (req, res) => {
  try {
    const recordId = Number(req.params.id);
    if (!recordId) {
      return res.status(400).json({ error: "Invalid record id." });
    }
    const todayLabel = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
    await sql.connect(sqlConfig);

    const existingRequest = new sql.Request();
    existingRequest.input("id", sql.Int, recordId);
    const existingResult = await existingRequest.query(
      "SELECT approval_history FROM dbo.temp_pass_records WHERE id = @id"
    );
    const existingHistory = existingResult.recordset?.[0]?.approval_history || "";
    const dates = existingHistory
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!dates.includes(todayLabel)) {
      dates.push(todayLabel);
    }
    const updatedHistory = dates.join(",");
    const updateRequest = new sql.Request();
    updateRequest.input("id", sql.Int, recordId);
    updateRequest.input("approval_history", sql.NVarChar(sql.MAX), updatedHistory);
    await updateRequest.query(
      "UPDATE dbo.temp_pass_records SET approval_history = @approval_history WHERE id = @id"
    );
    return res.status(200).json({ success: true, approval_history: updatedHistory });
  } catch (error) {
    console.error("Approval update error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/temp_pass_records", (req, res) => {
  (async () => {
    try {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      const { location_code, vendor, tt_no, up_to_date, requestFrom, requestTill } = req.query;
      const sqlConfig = {
        user: process.env.AZURE_SQL_USER,
        password: process.env.AZURE_SQL_PASSWORD,
        server: process.env.AZURE_SQL_SERVER,
        database: process.env.AZURE_SQL_DATABASE,
        options: {
          encrypt: process.env.AZURE_SQL_ENCRYPT !== "false",
          trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === "true",
        },
      };
      
      let whereClauses = [];
      let query = "SELECT * FROM temp_pass_records";

      if (requestFrom) {
      whereClauses.push(`request_from >= '${requestFrom.replace(/'/g, "''")}'`)
      }

      if (requestTill) {
      whereClauses.push(`request_to <= '${requestTill.replace(/'/g, "''")}'`)
      }

      if (up_to_date) {
      whereClauses.push(`request_to >= '${up_to_date.replace(/'/g, "''")}'`)
      }

      if (location_code) {
        whereClauses.push(`location_code = '${location_code.replace(/'/g, "''")}'`);
      }
      if (vendor) {
        whereClauses.push(`vendor = '${vendor.replace(/'/g, "''")}'`);
      }
      if (tt_no) {
        whereClauses.push(`tt_no = '${tt_no.replace(/'/g, "''")}'`);
      }
      
      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }
      
      query += " ORDER BY id DESC";
      
      await sql.connect(sqlConfig);
      const result = await sql.query(query);
      
      res.json(result.recordset);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
});

const xlsx = require('xlsx');
const { log } = require("console");

const sanitizeValue = (val) => {
  if (val === undefined || val === null) return null;
  
  const cleaned = String(val).trim();
  const lower = cleaned.toLowerCase();
  
  // If the string is empty or contains garbage text fallbacks, turn it into a real null
  if (lower === '' || lower === 'null' || lower === 'nil' || lower === '0') {
    return null;
  }
  
  return cleaned;
};

const normalizeOfficerEmpId = (value, role) => {
  const empId = sanitizeValue(value)?.toLowerCase();
  return empId && role !== 'SECURITY' ? empId.padStart(8, '0') : empId;
};

const isValidMobile = (value) => /^\d{10}$/.test(String(value || '').trim());
const isValidAadhaar = (value) => /^\d{12}$/.test(String(value || '').trim());
const bulkValidationResponse = (errors, res) => {
  if (errors.length === 0) return false;
  return res.status(400).json({
    success: false,
    message: `Bulk upload validation failed:\n${errors.slice(0, 20).join('\n')}${errors.length > 20 ? '\nMore validation errors were found.' : ''}`,
  });
};

// Using a dedicated multer uploadExcel middleware for the incoming Excel file
app.post('/api/upload-ttcrew-excel', uploadExcel.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const workbook = req.file.buffer
      ? xlsx.read(req.file.buffer, { type: 'buffer' })
      : xlsx.readFile(req.file.path);

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ success: false, message: "Excel file contains no sheets" });
    }

    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!Array.isArray(sheetData) || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: "Excel sheet is empty or invalid" });
    }

    const validationErrors = [];
    sheetData.forEach((row, index) => {
      const rowNumber = index + 2;
      const mobile = sanitizeValue(row['MOBILE NO']);
      if (!isValidMobile(mobile)) validationErrors.push(`Row ${rowNumber}: MOBILE NO must contain exactly 10 digits.`);
    });
    if (bulkValidationResponse(validationErrors, res)) return;

    const pool = await sql.connect(sqlConfig);
    let count = 0
    let responseText = "";
    for (const row of sheetData) {
        try{
            const locationCode = sanitizeValue(row['LOCATION CODE']);
                const crewName     = sanitizeValue(row['CREW NAME']);
                const vendor       = sanitizeValue(row['VENDOR']);
                const crewType     = sanitizeValue(row['CREW TYPE']);
                const ttNo         = sanitizeValue(row['TT NO']);
                const mobile         = sanitizeValue(row['MOBILE NO']);
                const govtID         = sanitizeValue(row['GOVT ID']);
                const drivingLicence = sanitizeValue(row['DRIVING LICENCE']);

                await pool.request()
                .input('locationCode', sql.VarChar, locationCode)
                .input('crewName', sql.VarChar, crewName)
                .input('vendor', sql.VarChar, vendor)
                .input('crewType', sql.VarChar, crewType)
                .input('ttNo', sql.VarChar, ttNo)
                .input('mobile', sql.VarChar, mobile)
                .input('govtID', sql.VarChar, govtID)
                .input('drivingLicence', sql.VarChar, drivingLicence)
                .query(`
                INSERT INTO VendorMasterRecord (LOCATION_CODE, CREW_NAME, VENDOR, CREW_TYPE, TT_NO, MOBILE_NO, GOVT_ID, DRIVING_LICENCE)
                VALUES (@locationCode, @crewName, @vendor, @crewType, @ttNo, @mobile, @govtID, @drivingLicence)
                `)
    }
    catch (err) {
    // Check if the error is specifically a unique constraint violation
    if (err.number === 2627 || err.number === 2601) {
        count = count + 1
        responseText = `${err.message}`
      console.warn(`Skipping duplicate row. Identifier already exists. Detail: ${err.message}`);
      continue; // This skips the current bad row and moves to the next Excel row safely!
    }
    
    // If it's a different error (e.g., connection drop, bad data type), you might want to throw it
    throw err; 
  }
    }
    
    res.status(200).json({ 
      success: true, 
      message: `${count!=sheetData.length?`Successfully imported ${sheetData.length - count} records into Azure SQL!`:""}\n${count>0?`Upload failed for ${count} records due to ${responseText}`:""}`
    });

  } catch (error) {
    console.error("Excel import failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/ttcrew-master-data", (req, res) => {
  (async () => {
    try {
      await sql.connect(sqlConfig);
      const result = await sql.query("SELECT * FROM VendorMasterRecord");
      res.json(result.recordset);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
});

app.post("/api/upload-master",
  async (req, res) => {
    try {
      const bodyData = req.body || {};

      const sqlConfig = {
        user: process.env.AZURE_SQL_USER,
        password: process.env.AZURE_SQL_PASSWORD,
        server: process.env.AZURE_SQL_SERVER,
        database: process.env.AZURE_SQL_DATABASE,
        options: {
          encrypt: process.env.AZURE_SQL_ENCRYPT !== "false",
          trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === "true",
        },
      };
      await sql.connect(sqlConfig);
      const request = new sql.Request();
      request.input('location_code', sql.NVarChar, bodyData['location_code'] || null);
      request.input('vendor', sql.NVarChar, bodyData['vendor'] || null);
      request.input('crew_type', sql.NVarChar, bodyData['crew_type'] || null);
      request.input('crew_name', sql.NVarChar, bodyData['crew_name'] || null);
      request.input('tt_no', sql.NVarChar, bodyData['tt_no'] || null);
      request.input('mobile_no', sql.NVarChar, bodyData['mobile_no'] || null);
      request.input('govt_id', sql.NVarChar, bodyData['govt_id'] || null);
      request.input('driving_licence_no', sql.NVarChar, bodyData['driving_licence_no'] || null);
      
      const insertSql = `INSERT INTO dbo.VendorMasterRecord (
        LOCATION_CODE, CREW_NAME, VENDOR, CREW_TYPE, TT_NO, MOBILE_NO, GOVT_ID, DRIVING_LICENCE
      ) VALUES (@location_code, @crew_name, @vendor, @crew_type, @tt_no,
        @mobile_no, @govt_id, @driving_licence_no)`;
      await request.query(insertSql)
      
      return res.json({ success: true});
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.post('/api/upload-labour-excel', uploadExcel.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const workbook = req.file.buffer
      ? xlsx.read(req.file.buffer, { type: 'buffer' })
      : xlsx.readFile(req.file.path);

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ success: false, message: "Excel file contains no sheets" });
    }

    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!Array.isArray(sheetData) || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: "Excel sheet is empty or invalid" });
    }

    const validationErrors = [];
    sheetData.forEach((row, index) => {
      const rowNumber = index + 2;
      const mobile = sanitizeValue(row['MOBILE NO']);
      const aadhaar = sanitizeValue(row['AADHAAR NO']);
      if (!isValidMobile(mobile)) validationErrors.push(`Row ${rowNumber}: MOBILE NO must contain exactly 10 digits.`);
      if (!isValidAadhaar(aadhaar)) validationErrors.push(`Row ${rowNumber}: AADHAAR NO must contain exactly 12 digits.`);
    });
    if (bulkValidationResponse(validationErrors, res)) return;

    const pool = await sql.connect(sqlConfig);
    let count = 0
    let responseText = "";
    for (const row of sheetData) {
        try{
            const locationCode = sanitizeValue(row['LOCATION CODE']);
                const labourName     = sanitizeValue(row['WORKER NAME']);
                const contractor       = sanitizeValue(row['CONTRACTOR']);
                const mobile         = sanitizeValue(row['MOBILE NO']);
                const aadhaar         = sanitizeValue(row['AADHAAR NO']);
                const address = sanitizeValue(row['ADDRESS']);

                await pool.request()
                .input('locationCode', sql.VarChar, locationCode)
                .input('labourName', sql.VarChar, labourName)
                .input('contractor', sql.VarChar, contractor)
                .input('mobile', sql.VarChar, mobile)
                .input('aadhaar', sql.VarChar, aadhaar)
                .input('address', sql.VarChar, address)
                .query(`
                INSERT INTO LabourMasterRecord (LOCATION_CODE, LABOUR_NAME, CONTRACTOR, MOBILE_NO, AADHAAR_NO, ADDRESS)
                VALUES (@locationCode, @labourName, @contractor, @mobile, @aadhaar, @address)
                `)
    }
    catch (err) {
    // Check if the error is specifically a unique constraint violation
    if (err.number === 2627 || err.number === 2601) {
        count = count + 1
        responseText = `${err.message}`
      console.warn(`Skipping duplicate row. Identifier already exists. Detail: ${err.message}`);
      continue; // This skips the current bad row and moves to the next Excel row safely!
    }
    
    // If it's a different error (e.g., connection drop, bad data type), you might want to throw it
    throw err; 
  }
    }
    

    res.status(200).json({ 
      success: true, 
      message: `${count!=sheetData.length?`Successfully imported ${sheetData.length - count} records into Azure SQL!`:""}\n${count>0?`Upload failed for ${count} records due to ${responseText}`:""}`
    });

  } catch (error) {
    console.error("Excel import failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload-labour-single",
  async (req, res) => {
    try {
      const bodyData = req.body || {};

      const sqlConfig = {
        user: process.env.AZURE_SQL_USER,
        password: process.env.AZURE_SQL_PASSWORD,
        server: process.env.AZURE_SQL_SERVER,
        database: process.env.AZURE_SQL_DATABASE,
        options: {
          encrypt: process.env.AZURE_SQL_ENCRYPT !== "false",
          trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === "true",
        },
      };
      await sql.connect(sqlConfig);
      const request = new sql.Request();
      request.input('locationCode', sql.NVarChar, bodyData['locationCode'] || null);
      request.input('contractor', sql.NVarChar, bodyData['contractor'] || null);
      request.input('labourName', sql.NVarChar, bodyData['labourName'] || null);
      request.input('mobileNo', sql.NVarChar, bodyData['mobileNo'] || null);
      request.input('aadhaarNo', sql.NVarChar, bodyData['aadhaarNo'] || null);
      request.input('address', sql.NVarChar, bodyData['address'] || null);
      
      const insertSql = `INSERT INTO dbo.LabourMasterRecord (
        LOCATION_CODE, LABOUR_NAME, CONTRACTOR, MOBILE_NO, AADHAAR_NO, ADDRESS
      ) VALUES (@locationCode, @labourName, @contractor, @mobileNo, @aadhaarNo,
        @address)`;
      await request.query(insertSql)
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.get("/api/labour-master-data", (req, res) => {
  (async () => {
    try {
        const { location_code, contractor } = req.query;
        let whereClauses = [];
      let query = "SELECT * FROM LabourMasterRecord";
      if (location_code) {
      whereClauses.push(`LOCATION_CODE = '${location_code.replace(/'/g, "''")}'`)
      }
      if (contractor) {
      whereClauses.push(`CONTRACTOR = '${contractor.replace(/'/g, "''")}'`)
      }
      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }

      await sql.connect(sqlConfig);
      const result = await sql.query(query);
      res.json(result.recordset);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
});

app.post('/api/upload-contractor-excel', uploadExcel.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const workbook = req.file.buffer
      ? xlsx.read(req.file.buffer, { type: 'buffer' })
      : xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ success: false, message: "Excel file contains no sheets" });
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!Array.isArray(sheetData) || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: "Excel sheet is empty or invalid" });
    }

    const validationErrors = [];
    sheetData.forEach((row, index) => {
      const rowNumber = index + 2;
      const mailID = sanitizeValue(row['MAIL ID']);
      const mobile = sanitizeValue(row['MOBILE NO']);
      if (!isValidEmail(mailID)) validationErrors.push(`Row ${rowNumber}: MAIL ID must be a valid email address.`);
      if (!isValidMobile(mobile)) validationErrors.push(`Row ${rowNumber}: MOBILE NO must contain exactly 10 digits.`);
    });
    if (bulkValidationResponse(validationErrors, res)) return;

    const pool = await sql.connect(sqlConfig);
    let duplicateCount = 0;
    for (const row of sheetData) {
      try {
        await pool.request()
          .input('locationCode', sql.NVarChar, sanitizeValue(row['LOCATION CODE']))
          .input('contractorName', sql.NVarChar, sanitizeValue(row['CONTRACTOR NAME'])?.toUpperCase())
          .input('mailID', sql.NVarChar, sanitizeValue(row['MAIL ID'])?.toLowerCase())
          .input('mobileNo', sql.NVarChar, sanitizeValue(row['MOBILE NO']))
          .query(`
            INSERT INTO dbo.ContractorCredentials (LOCATION_CODE, CONTRACTOR_NAME, MAIL_ID, MOBILE_NO)
            VALUES (@locationCode, @contractorName, @mailID, @mobileNo)
          `);
      } catch (error) {
        if (error.number === 2627 || error.number === 2601) {
          duplicateCount += 1;
          continue;
        }
        throw error;
      }
    }
    return res.json({
      success: true,
      message: `Successfully imported ${sheetData.length - duplicateCount} contractor records${duplicateCount ? `; skipped ${duplicateCount} duplicate records` : ''}.`,
    });
  } catch (error) {
    console.error("Contractor Excel import failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload-contractor-single",
  async (req, res) => {
    try {
      const bodyData = req.body || {};
      const mailID = String(bodyData['mailID'] || '').trim().toLowerCase();
      if (!isValidEmail(mailID)) {
        return res.status(400).json({ error: "Please provide a valid contractor email address." });
      }

      const sqlConfig = {
        user: process.env.AZURE_SQL_USER,
        password: process.env.AZURE_SQL_PASSWORD,
        server: process.env.AZURE_SQL_SERVER,
        database: process.env.AZURE_SQL_DATABASE,
        options: {
          encrypt: process.env.AZURE_SQL_ENCRYPT !== "false",
          trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === "true",
        },
      };
      await sql.connect(sqlConfig);
      const request = new sql.Request();
      request.input('locationCode', sql.NVarChar, bodyData['locationCode'] || null);
      request.input('contractorName', sql.NVarChar, bodyData['contractorName'].toUpperCase() || null);
      request.input('mailID', sql.NVarChar, mailID);
      request.input('mobileNo', sql.NVarChar, bodyData['mobileNo'] || null);
      
      const insertSql = `INSERT INTO dbo.ContractorCredentials (
        LOCATION_CODE, CONTRACTOR_NAME, MAIL_ID, MOBILE_NO) 
        VALUES (@locationCode, @contractorName, @mailID, @mobileNo)`;
      await request.query(insertSql)
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.get("/api/contractor-master-data", (req, res) => {
  (async () => {
    try {
      await sql.connect(sqlConfig);
      const locationCode = String(req.query.locationCode || "").trim();
      const request = new sql.Request();
      request.input("locationCode", sql.NVarChar, locationCode);
      const result = await request.query(`
        SELECT * FROM ContractorCredentials
        WHERE (@locationCode = '' OR LOCATION_CODE = @locationCode)
      `);
      res.json(result.recordset);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
});

app.patch("/api/contractor-master-data/:id", async (req, res) => {
  try {
    if (String(req.get("x-user-role") || "").toUpperCase() !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only a super user can edit contractor records." });
    }

    const id = Number(req.params.id);
    const locationCode = String(req.body?.locationCode || "").trim();
    const contractorName = String(req.body?.contractorName || "").trim().toUpperCase();
    const mailID = String(req.body?.mailID || "").trim().toLowerCase();
    const mobileNo = String(req.body?.mobileNo || "").trim();
    if (!Number.isInteger(id) || id <= 0 || !locationCode || !contractorName || !isValidEmail(mailID) || !/^\d{10}$/.test(mobileNo)) {
      return res.status(400).json({ error: "Enter valid contractor details." });
    }

    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input("id", sql.Int, id);
    request.input("locationCode", sql.NVarChar, locationCode);
    request.input("contractorName", sql.NVarChar, contractorName);
    request.input("mailID", sql.NVarChar, mailID);
    request.input("mobileNo", sql.NVarChar, mobileNo);
    const result = await request.query(`
      UPDATE dbo.ContractorCredentials
      SET CONTRACTOR_NAME = @contractorName, MAIL_ID = @mailID, MOBILE_NO = @mobileNo
      WHERE ID = @id AND LOCATION_CODE = @locationCode
    `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Contractor record not found for this location." });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Contractor update error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/contractor-master-data/:id", async (req, res) => {
  try {
    if (String(req.get("x-user-role") || "").toUpperCase() !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only a super user can delete contractor records." });
    }

    const id = Number(req.params.id);
    const locationCode = String(req.body?.locationCode || "").trim();
    if (!Number.isInteger(id) || id <= 0 || !locationCode) {
      return res.status(400).json({ error: "Invalid contractor record or location." });
    }

    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input("id", sql.Int, id);
    request.input("locationCode", sql.NVarChar, locationCode);
    const result = await request.query(
      "DELETE FROM dbo.ContractorCredentials WHERE ID = @id AND LOCATION_CODE = @locationCode",
    );
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Contractor record not found for this location." });
    }
    return res.json({ success: true, id });
  } catch (error) {
    console.error("Contractor delete error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.patch("/api/labour-master-data/:id", async (req, res) => {
  try {
    if (String(req.get("x-user-role") || "").toUpperCase() !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only a super user can edit worker records." });
    }

    const id = Number(req.params.id);
    const locationCode = String(req.body?.locationCode || "").trim();
    const contractor = String(req.body?.contractor || "").trim().toUpperCase();
    const labourName = String(req.body?.labourName || "").trim().toUpperCase();
    const mobileNo = String(req.body?.mobileNo || "").trim();
    const aadhaarNo = String(req.body?.aadhaarNo || "").trim().toUpperCase();
    const address = String(req.body?.address || "").trim();
    if (!Number.isInteger(id) || id <= 0 || !locationCode || !contractor || !labourName || !/^\d{10}$/.test(mobileNo) || !aadhaarNo || !address) {
      return res.status(400).json({ error: "Enter valid worker details." });
    }

    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input("id", sql.Int, id);
    request.input("locationCode", sql.NVarChar, locationCode);
    request.input("contractor", sql.NVarChar, contractor);
    request.input("labourName", sql.NVarChar, labourName);
    request.input("mobileNo", sql.NVarChar, mobileNo);
    request.input("aadhaarNo", sql.NVarChar, aadhaarNo);
    request.input("address", sql.NVarChar, address);
    const result = await request.query(`
      UPDATE dbo.LabourMasterRecord
      SET LABOUR_NAME = @labourName, CONTRACTOR = @contractor,
          MOBILE_NO = @mobileNo, AADHAAR_NO = @aadhaarNo, ADDRESS = @address
      WHERE ID = @id AND LOCATION_CODE = @locationCode
    `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Worker record not found for this location." });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Worker update error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/labour-master-data/:id", async (req, res) => {
  try {
    if (String(req.get("x-user-role") || "").toUpperCase() !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only a super user can delete worker records." });
    }

    const id = Number(req.params.id);
    const locationCode = String(req.body?.locationCode || "").trim();
    if (!Number.isInteger(id) || id <= 0 || !locationCode) {
      return res.status(400).json({ error: "Invalid worker record or location." });
    }

    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input("id", sql.Int, id);
    request.input("locationCode", sql.NVarChar, locationCode);
    const result = await request.query(
      "DELETE FROM dbo.LabourMasterRecord WHERE ID = @id AND LOCATION_CODE = @locationCode",
    );
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Worker record not found for this location." });
    }
    return res.json({ success: true, id });
  } catch (error) {
    console.error("Worker delete error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/locations-master", (req, res) => {
  (async () => {
    try {
      await sql.connect(sqlConfig);
      const result = await sql.query("SELECT * FROM LocationMasterDatabase");
      res.json(result.recordset);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
});

app.get("/api/utility-locations", (req, res) => {
  (async () => {
    try {
      await sql.connect(sqlConfig);
      const result = await sql.query("SELECT ID, STATE_OFFICE, LOCATION_NAME, LOCATION_CODE, ADMIN_MAIL_ID FROM IOCLUtilityCredentials Where ACTIVE='Y'");
      res.json(result.recordset);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
});

app.post("/api/utility-locations/register", async (req, res) => {
  try {
    const stateOffice = String(req.body.stateOffice || "").trim();
    const locationName = String(req.body.locationName || "").trim();
    const locationCode = String(req.body.locationCode || "").trim();
    const passcode = String(req.body.passcode || "").trim();
    const adminMailId = String(req.body.adminMailId || "").trim().toLowerCase();

    if (!stateOffice || !locationName || !locationCode || !passcode || !adminMailId) {
      return res.status(400).json({ success: false, message: "All location registration fields are required." });
    }
    if (!isValidEmail(adminMailId)) {
      return res.status(400).json({ success: false, message: "Enter a valid admin email address." });
    }

    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input("stateOffice", sql.NVarChar, stateOffice);
    request.input("locationName", sql.NVarChar, locationName);
    request.input("locationCode", sql.NVarChar, locationCode);
    request.input("passcode", sql.NVarChar, passcode);
    request.input("adminMailId", sql.NVarChar, adminMailId);
    const existing = await request.query(`
      SELECT TOP 1 ID
      FROM IOCLUtilityCredentials
      WHERE LOCATION_CODE = @locationCode OR LOCATION_NAME = @locationName
    `);

    if (existing.recordset?.length) {
      return res.status(409).json({ success: false, message: "A location with this name or code already exists." });
    }

    await request.query(`
      INSERT INTO IOCLUtilityCredentials
        (STATE_OFFICE, LOCATION_NAME, PASSCODE, LOCATION_CODE, ADMIN_MAIL_ID, ACTIVE)
      VALUES (@stateOffice, @locationName, @passcode, @locationCode, @adminMailId, 'Y')
    `);
    return res.status(201).json({ success: true, message: "Location registered successfully." });
  } catch (error) {
    console.error("Location registration error:", error);
    return res.status(500).json({ success: false, message: "Unable to register the location." });
  }
});

app.post("/api/utility-locations/change/request-otp", async (req, res) => {
  try {
    const locationName = String(req.body.locationName || "").trim();
    const currentEmail = String(req.body.currentEmail || "").trim().toLowerCase();
    if (!locationName || !currentEmail) {
      return res.status(400).json({ success: false, message: "Location and current admin email are required." });
    }
    if (!isValidEmail(currentEmail)) {
      return res.status(400).json({ success: false, message: "Enter a valid current admin email address." });
    }

    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input("locationName", sql.NVarChar, locationName);
    request.input("currentEmail", sql.NVarChar, currentEmail);
    const result = await request.query(`
      SELECT TOP 1 LOCATION_CODE
      FROM IOCLUtilityCredentials
      WHERE LOCATION_NAME = @locationName
        AND LOWER(LTRIM(RTRIM(ADMIN_MAIL_ID))) = @currentEmail
        AND ACTIVE = 'Y'
    `);
    if (!result.recordset?.length) {
      return res.status(404).json({ success: false, message: "Current admin email does not match this location." });
    }

    const otp = generateOtp();
    const locationCode = result.recordset[0].LOCATION_CODE;
    otpStore[`location:${currentEmail}:${locationCode}`] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    await transporter.sendMail({
      from: '"IOCL_Utility_App" <ioclcbe4149@gmail.com>',
      to: currentEmail,
      subject: "Location credential change verification",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    });
    return res.json({ success: true, message: "OTP sent to the current admin email." });
  } catch (error) {
    console.error("Location change OTP error:", error);
    return res.status(500).json({ success: false, message: "Unable to send verification OTP." });
  }
});

app.patch("/api/utility-locations/change", async (req, res) => {
  try {
    const locationName = String(req.body.locationName || "").trim();
    const currentEmail = String(req.body.currentEmail || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const newPasscode = String(req.body.newPasscode || "").trim();
    const newAdminMailId = String(req.body.newAdminMailId || "").trim().toLowerCase();

    if (!locationName || !currentEmail || !otp || (!newPasscode && !newAdminMailId)) {
      return res.status(400).json({ success: false, message: "OTP and at least one new value are required." });
    }
    if (!isValidEmail(currentEmail)) {
      return res.status(400).json({ success: false, message: "Enter a valid current admin email address." });
    }
    if (newAdminMailId && !isValidEmail(newAdminMailId)) {
      return res.status(400).json({ success: false, message: "Enter a valid new admin email address." });
    }

    await sql.connect(sqlConfig);
    const locationRequest = new sql.Request();
    locationRequest.input("locationName", sql.NVarChar, locationName);
    const locationResult = await locationRequest.query(`
      SELECT TOP 1 LOCATION_CODE
      FROM IOCLUtilityCredentials
      WHERE LOCATION_NAME = @locationName
        AND ACTIVE = 'Y'
    `);
    const locationCode = locationResult.recordset?.[0]?.LOCATION_CODE;
    if (!locationCode) {
      return res.status(404).json({ success: false, message: "Selected location was not found." });
    }

    const stored = otpStore[`location:${currentEmail}:${locationCode}`];
    if (!stored || Date.now() > stored.expiresAt || stored.otp !== otp) {
      return res.status(401).json({ success: false, message: "Invalid or expired OTP." });
    }

    const request = new sql.Request();
    request.input("locationCode", sql.NVarChar, locationCode);
    request.input("currentEmail", sql.NVarChar, currentEmail);
    request.input("newPasscode", sql.NVarChar, newPasscode || null);
    request.input("newAdminMailId", sql.NVarChar, newAdminMailId || null);
    const result = await request.query(`
      UPDATE IOCLUtilityCredentials
      SET PASSCODE = COALESCE(@newPasscode, PASSCODE),
          ADMIN_MAIL_ID = COALESCE(@newAdminMailId, ADMIN_MAIL_ID)
      WHERE LOCATION_CODE = @locationCode
        AND LOWER(LTRIM(RTRIM(ADMIN_MAIL_ID))) = @currentEmail
        AND ACTIVE = 'Y'
    `);
    if (!result.rowsAffected?.[0]) {
      return res.status(404).json({ success: false, message: "Location or current admin email was not found." });
    }
    delete otpStore[`location:${currentEmail}:${locationCode}`];
    return res.json({ success: true, message: "Location credentials updated successfully." });
  } catch (error) {
    console.error("Location credential update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update location credentials." });
  }
});

  app.post("/api/auth/login", async (req, res) => {
    try {
      const locationName = String(req.body.locationName || "").trim();
      const passcode = String(req.body.passcode || "").trim();
      const role = String(req.body.role || "User").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const acceptedRoles = role === "Admin" ? ["ADMIN", "SUPER_ADMIN"] : [role.toUpperCase()];

      if (!locationName || !passcode || !["User", "Admin", "Security", "Contractor"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Location, passcode, and a valid role are required.",
        });
      }

      await sql.connect(sqlConfig);
      const request = new sql.Request();
      request.input("locationName", sql.NVarChar, locationName);
      request.input("passcode", sql.NVarChar, passcode);
      
      const result = await request.query(`
        SELECT TOP 1 LOCATION_CODE
        FROM IOCLUtilityCredentials
        WHERE LOCATION_NAME = @locationName
          AND PASSCODE = @passcode
      `);

      if (!result.recordset?.length) {
        return res.status(401).json({
          success: false,
          message: "Invalid passcode for the selected location.",
        });
      }

      let authenticatedRole = role;
      let userName = "";
      if (role !== "User" && role !== "Contractor") {
        if (!email) {
          return res.status(400).json({
            success: false,
            message: "For this role email is required.",
          });
        }
        if (!isValidEmail(email)) {
          return res.status(400).json({
            success: false,
            message: "Enter a valid email address.",
          });
        }

        const officerRequest = new sql.Request();
        officerRequest.input("email", sql.NVarChar, email);
        officerRequest.input("locationCode", sql.NVarChar, result.recordset[0].LOCATION_CODE);
        const officerResult = await officerRequest.query(`
          SELECT TOP 1 [ROLE], [STATUS], [OFFICER_NAME]
          FROM OfficerCredentials
          WHERE LOWER(LTRIM(RTRIM(MAIL_ID))) = @email
            AND LOCATION_CODE = @locationCode
            AND UPPER(LTRIM(RTRIM([ROLE]))) IN ('${acceptedRoles.join("','")}')
        `);

        if (!officerResult.recordset?.length) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized for this role and location.",
          });
        }
        if (String(officerResult.recordset[0].STATUS || "ACTIVE").toUpperCase() === "INACTIVE") {
          return res.status(403).json({
            success: false,
            message: "Your officer status is INACTIVE. Ask the location Admin or Super Admin to validate your email and make your status ACTIVE.",
          });
        }
        authenticatedRole = String(officerResult.recordset[0].ROLE).trim().toUpperCase();
        userName = officerResult.recordset[0].OFFICER_NAME || "";
      } else if (role === "Contractor" && email && isValidEmail(email)) {
        const contractorRequest = new sql.Request();
        contractorRequest.input("email", sql.NVarChar, email);
        contractorRequest.input("locationCode", sql.NVarChar, result.recordset[0].LOCATION_CODE);
        const contractorResult = await contractorRequest.query(`
          SELECT TOP 1 CONTRACTOR_NAME
          FROM ContractorCredentials
          WHERE LOWER(LTRIM(RTRIM(MAIL_ID))) = @email
            AND LOCATION_CODE = @locationCode
        `);
        userName = contractorResult.recordset?.[0]?.CONTRACTOR_NAME || "";
      }

      return res.json({
        success: true,
        role: authenticatedRole,
        locationCode: result.recordset[0].LOCATION_CODE,
        userName,
      });
    } catch (error) {
      console.error("Login query error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to verify access right now.",
      });
    }
  });

app.post('/api/upload-officer-excel', uploadExcel.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const workbook = req.file.buffer
      ? xlsx.read(req.file.buffer, { type: 'buffer' })
      : xlsx.readFile(req.file.path);

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ success: false, message: "Excel file contains no sheets" });
    }

    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (!Array.isArray(sheetData) || sheetData.length === 0) {
      return res.status(400).json({ success: false, message: "Excel sheet is empty or invalid" });
    }

    const validationErrors = [];
    sheetData.forEach((row, index) => {
      const rowNumber = index + 2;
      const mobile = sanitizeValue(row['MOBILE NO']);
      const mailID = sanitizeValue(row['MAIL ID'])?.toLowerCase();
      const role = String(sanitizeValue(row['ROLE']) || '').toUpperCase();
      if (!isValidMobile(mobile)) validationErrors.push(`Row ${rowNumber}: MOBILE NO must contain exactly 10 digits.`);
      if (!isValidEmail(mailID)) validationErrors.push(`Row ${rowNumber}: MAIL ID must be a valid email address.`);
      if (role === 'ADMIN' && !isBusinessEmail(mailID)) validationErrors.push(`Row ${rowNumber}: ADMIN must use a business email address.`);
    });
    if (bulkValidationResponse(validationErrors, res)) return;

    const pool = await sql.connect(sqlConfig);
    let count = 0
    let responseText = "";
    for (const row of sheetData) {
        try{
            const locationCode = sanitizeValue(row['LOCATION CODE']);
                const name     = (sanitizeValue(row['NAME']) || '').toLocaleUpperCase();
                const mobile         = sanitizeValue(row['MOBILE NO']);
                const mailID       = (sanitizeValue(row['MAIL ID']) || '').toLocaleLowerCase();
                const role = String(sanitizeValue(row['ROLE'])).toUpperCase();

                if (!isValidEmail(mailID)) {
                  throw new Error(`Invalid email for officer ${name || '(unknown)'}.`);
                }

                if (!['ADMIN', 'SUPER_ADMIN', 'SECURITY'].includes(role)) {
                  throw new Error(
                    `Invalid ROLE for officer ${name || '(unknown)'}: ${role}`,
                  );
                }
                const empID = normalizeOfficerEmpId(row['EMPLOYEE ID'], role);

                await pool.request()
                .input('locationCode', sql.VarChar, locationCode)
                .input('name', sql.VarChar, name)
                .input('empID', sql.VarChar, empID)
                .input('mobile', sql.VarChar, mobile)
                .input('mailID', sql.VarChar, mailID)
                .input('role', sql.VarChar, role)
                .query(`
                INSERT INTO OfficerCredentials (LOCATION_CODE, OFFICER_NAME, Emp_ID, MOBILE_NO, MAIL_ID, [ROLE], [STATUS])
                VALUES (@locationCode, @name, @empID, @mobile, @mailID, @role, 'INACTIVE')
                `)
    }
    catch (err) {
    // Check if the error is specifically a unique constraint violation
    if (err.number === 2627 || err.number === 2601) {
        count = count + 1
        responseText = `${err.message}`
      console.warn(`Skipping duplicate row. Identifier already exists. Detail: ${err.message}`);
      continue; // This skips the current bad row and moves to the next Excel row safely!
    }
    
    // If it's a different error (e.g., connection drop, bad data type), you might want to throw it
    throw err; 
  }
    }

    res.status(200).json({ 
      success: true, 
      message: `${count!=sheetData.length?`Successfully imported ${sheetData.length - count} records into Azure SQL!`:""}\n${count>0?`Upload failed for ${count} records due to ${responseText}`:""}`
    });

  } catch (error) {
    console.error("Excel import failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload-officer-single",
  async (req, res) => {
    try {
      const bodyData = req.body || {};
      const mailID = String(bodyData['mailID'] || '').trim().toLowerCase();
      const role = String(bodyData['role'] || "ADMIN").toUpperCase();
      if (!isValidEmail(mailID)) {
        return res.status(400).json({ error: "Please provide a valid officer email address." });
      }
      if (role === "ADMIN" && !isBusinessEmail(mailID)) {
        return res.status(400).json({ error: "ADMIN must use a business email address." });
      }

      const sqlConfig = {
        user: process.env.AZURE_SQL_USER,
        password: process.env.AZURE_SQL_PASSWORD,
        server: process.env.AZURE_SQL_SERVER,
        database: process.env.AZURE_SQL_DATABASE,
        options: {
          encrypt: process.env.AZURE_SQL_ENCRYPT !== "false",
          trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === "true",
        },
      };
      await sql.connect(sqlConfig);
      const request = new sql.Request();
      if (!["ADMIN", "SUPER_ADMIN", "SECURITY"].includes(role)) {
        return res.status(400).json({ error: "Invalid officer role." });
      }
      request.input('locationCode', sql.NVarChar, bodyData['locationCode'] || null);
      request.input('name', sql.NVarChar, bodyData['name'].toUpperCase() || null);
      request.input('empID', sql.NVarChar, normalizeOfficerEmpId(bodyData['empID'], role));
      request.input('mobileNo', sql.NVarChar, bodyData['mobileNo'] || null);
      request.input('mailID', sql.NVarChar, mailID);
      request.input('role', sql.NVarChar, role);
      
      const insertSql = `INSERT INTO dbo.OfficerCredentials (
        LOCATION_CODE, OFFICER_NAME, Emp_ID, MOBILE_NO, MAIL_ID, [ROLE], [STATUS]) 
        VALUES (@locationCode, @name, @empID, @mobileNo, @mailID, @role, 'ACTIVE')`;
      await request.query(insertSql)
      
        res.status(200).json({ success: true });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

app.get("/api/officer-master-data", (req, res) => {
  (async () => {
    try {
      await sql.connect(sqlConfig);
      const locationCode = String(req.query.locationCode || "").trim();
      const requestedRoles = String(req.query.roles || "")
        .split(",")
        .map((role) => role.trim().toUpperCase())
        .filter((role) => ["ADMIN", "SUPER_ADMIN", "SECURITY", "USER"].includes(role));
      const request = new sql.Request();
      request.input("locationCode", sql.NVarChar, locationCode);
      request.input("role1", sql.NVarChar, requestedRoles[0] || "");
      request.input("role2", sql.NVarChar, requestedRoles[1] || "");
      const result = await request.query(`
        SELECT *
        FROM OfficerCredentials
        WHERE (@locationCode = '' OR LOCATION_CODE = @locationCode)
          AND (@role1 = '' OR UPPER(LTRIM(RTRIM([ROLE]))) IN (@role1, @role2))
      `);
      res.json(result.recordset);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
});

app.delete("/api/officer-master-data/:id", async (req, res) => {
  try {
    if (String(req.get("x-user-role") || "").toUpperCase() !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only a super admin can delete officer records." });
    }

    const officerId = Number(req.params.id);
    if (!Number.isInteger(officerId) || officerId <= 0) {
      return res.status(400).json({ error: "Invalid officer id." });
    }

    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input("id", sql.Int, officerId);
    const result = await request.query(
      "DELETE FROM dbo.OfficerCredentials WHERE ID = @id"
    );
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Officer record not found." });
    }

    return res.status(200).json({ success: true, id: officerId });
  } catch (error) {
    console.error("Officer delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/officer-master-data/:id/role", async (req, res) => {
  try {
    if (String(req.get("x-user-role") || "").toUpperCase() !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only a super admin can change officer roles." });
    }

    const officerId = Number(req.params.id);
    const role = String(req.body?.role || "").trim().toUpperCase();
    if (!Number.isInteger(officerId) || officerId <= 0) {
      return res.status(400).json({ error: "Invalid officer id." });
    }
    if (!["ADMIN", "SUPER_ADMIN", "SECURITY"].includes(role)) {
      return res.status(400).json({ error: "Invalid officer role." });
    }

    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input("id", sql.Int, officerId);
    request.input("role", sql.NVarChar, role);
    const result = await request.query(
      "UPDATE dbo.OfficerCredentials SET [ROLE] = @role WHERE ID = @id"
    );
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Officer record not found." });
    }

    return res.status(200).json({ success: true, id: officerId, role });
  } catch (error) {
    console.error("Officer role update error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/officer-master-data/:id/verify-email", async (req, res) => {
  try {
    const verifyingRole = String(req.get("x-user-role") || "").toUpperCase();
    if (!["ADMIN", "SUPER_ADMIN"].includes(verifyingRole)) {
      return res.status(403).json({ error: "Only an admin or super admin can verify officer emails." });
    }

    const officerId = Number(req.params.id);
    const locationCode = String(req.body?.locationCode || "").trim();
    if (!Number.isInteger(officerId) || officerId <= 0 || !locationCode) {
      return res.status(400).json({ error: "Invalid officer id or location." });
    }

    await sql.connect(sqlConfig);
    const request = new sql.Request();
    request.input("id", sql.Int, officerId);
    request.input("locationCode", sql.NVarChar, locationCode);
    const result = await request.query(`
      UPDATE dbo.OfficerCredentials
      SET [STATUS] = 'ACTIVE'
      WHERE ID = @id AND LOCATION_CODE = @locationCode
    `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Officer record not found for this location." });
    }
    return res.json({ success: true, id: officerId, status: "ACTIVE" });
  } catch (error) {
    console.error("Officer email verification update error:", error);
    return res.status(500).json({ error: error.message });
  }
});

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ioclcbe4149@gmail.com',
    pass: 'wfsv hvdb gqqh prqb'
    // pass: 'levf jhhk ggix zebi'
  }
});

async function ensureLabourWorkflowColumns(pool) {
  await pool.request().query(`
    IF COL_LENGTH('dbo.LabourEntryRecord', 'REQUEST_TOKEN') IS NULL
      ALTER TABLE dbo.LabourEntryRecord ADD REQUEST_TOKEN NVARCHAR(100) NULL;
    IF COL_LENGTH('dbo.LabourEntryRecord', 'REQUEST_STATUS') IS NULL
      ALTER TABLE dbo.LabourEntryRecord ADD REQUEST_STATUS NVARCHAR(20) NOT NULL CONSTRAINT DF_LabourEntryRecord_RequestStatus DEFAULT 'PENDING';
    IF COL_LENGTH('dbo.LabourEntryRecord', 'APPROVED_AT') IS NULL
      ALTER TABLE dbo.LabourEntryRecord ADD APPROVED_AT DATETIME2 NULL;
    IF COL_LENGTH('dbo.LabourEntryRecord', 'APPROVED_BY') IS NULL
      ALTER TABLE dbo.LabourEntryRecord ADD APPROVED_BY NVARCHAR(150) NULL;
  `);
}

function escapePdfText(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createLabourApprovalPdf(rows, token) {
  rows = Array.isArray(rows) ? rows : [];
  const lines = [
    "IOCL | LABOUR ENTRY APPROVAL",
    "Temporary Pass Request",
    `Request reference: ${token.slice(0, 12).toUpperCase()}`,
    `Status: APPROVED    Approved at: ${new Date().toLocaleString("en-GB")}`,
    "",
  ];
  rows.forEach((row, index) => {
    lines.push(`${index + 1}. ${row.LABOUR_NAME || ""}`);
    lines.push(`   Contractor: ${row.CONTRACTOR || ""} | Mobile: ${row.MOBILE_NO || ""}`);
    lines.push(`   ID proof: ${row.AADHAAR_NO || ""}`);
    lines.push(`   Address: ${row.ADDRESS || ""}`);
    lines.push(`   Purpose: ${row.PURPOSE || ""} | Time in: ${row.TIME_IN || ""}`);
    lines.push("");
  });
  lines.push("This document confirms approval of the labour entry request.");

  const content = ["BT", "/F1 18 Tf", "50 760 Td", `(${escapePdfText(lines[0])}) Tj`, "/F1 11 Tf"];
  lines.slice(1).forEach((line) => content.push("0 -20 Td", `(${escapePdfText(line)}) Tj`));
  content.push("ET");
  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function formatReportDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-GB", { hour12: false });
}

function drawReportCell(doc, text, x, y, width, height, options = {}) {
  const padding = options.padding ?? 4;
  doc.rect(x, y, width, height).stroke();
  doc.font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.fontSize ?? 8)
    .text(String(text ?? ""), x + padding, y + padding, {
      width: width - padding * 2,
      height: height - padding * 2,
      align: options.align || "left",
      valign: "center",
      ellipsis: true,
    });
}

function createLabourPermissionReport(rows) {
  rows = Array.isArray(rows) ? rows : [];
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));
  const first = rows[0] || {};
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  const right = left + pageWidth;

  const logoPath = path.join(__dirname, "public", "iocl.png");

    const approvers = [
    ...new Set(
      rows
        .map((row) => row.APPROVED_BY)
        .filter(Boolean),
    ),
  ];
  const showApproverPerRow = approvers.length > 1;

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, left, 28, { fit: [78, 58], align: "left", valign: "top" });
  }
  doc.font("Helvetica-Bold").fontSize(13).text("INDIAN OIL CORPORATION LIMITED", left, 30, { align: "center", width: pageWidth });
  doc.fontSize(11).text("COIMBATORE TERMINAL", left, 47, { align: "center", width: pageWidth });
  showApproverPerRow
    ? doc.fontSize(10).text(`Date: ${formatReportDate(first.APPROVED_AT).split(",")[0]}`, right - 180, 38, { width: 180, align: "right" })
    : doc.fontSize(10).text(`Date/Time: ${formatReportDate(first.APPROVED_AT)}`, right - 180, 38, { width: 180, align: "right" });
  doc.fontSize(12).text("Sub : PERMISSION FOR ENTRY OF CONTRACTORS' WORKERS", left, 82, { align: "center", width: pageWidth });
  doc.font("Helvetica").fontSize(9).text(`Dear Sir,\n\nWe request permission for entry into the IOCL Coimbatore Terminal for the following persons.`, left, 108);

  let y = 145;
  drawReportCell(doc, `Name of the Work / Work's Description: ${first.PURPOSE || ""}`, left, y, pageWidth, 26, { bold: true, fontSize: 9 });
  y += 26;
  drawReportCell(doc, `Contractor: ${first.CONTRACTOR || ""}    Address: ${first.ADDRESS || ""}`, left, y, pageWidth, 26, { bold: true, fontSize: 9 });
  y += 26;

  const groups = 3;
  const groupWidth = pageWidth / groups;
  const rowHeight = 30;
  const headerHeight = 22;

  for (let group = 0; group < groups; group += 1) {
    const x = left + group * groupWidth;
    drawReportCell(doc, "Sr. No", x, y, 38, headerHeight, { bold: true, align: "center" });
    drawReportCell(doc, "Name of the Worker", x + 38, y, groupWidth - 88, headerHeight, { bold: true, align: "center" });
    drawReportCell(doc, "Pass No.", x + groupWidth - 50, y, 50, headerHeight, { bold: true, align: "center" });
    for (let rowIndex = 0; rowIndex < 7; rowIndex += 1) {
      const row = rows[group * 7 + rowIndex];
      const rowY = y + headerHeight + rowIndex * rowHeight;
      drawReportCell(doc, row ? rowIndex + 1 + group * 7 : "", x, rowY, 38, rowHeight, { align: "center" });
      const approverName = row?.APPROVER_NAME || row?.APPROVED_BY || "";
      drawReportCell(
        doc,
        row
          ? showApproverPerRow
            ? `${row.LABOUR_NAME || ""}\nApproved by: ${approverName}\nApproved On: ${formatReportDate(row.APPROVED_AT)}`
            : row.LABOUR_NAME || ""
          : "",
        x + 38,
        rowY,
        groupWidth - 88,
        rowHeight,
        { fontSize: 6, padding: 3 },
      );
      drawReportCell(doc, row?.GATE_PASS_NO || "", x + groupWidth - 50, rowY, 50, rowHeight, { align: "center" });
    }
  }

  y += headerHeight + rowHeight * 7 + 20;
  doc.font("Helvetica").fontSize(8).text("We hereby undertake responsibility for all activities including safety and security of all the above persons.", left, y, { width: pageWidth });
  doc.font("Helvetica-Bold").fontSize(9).text(
    `Authorized by: ${approvers.length === 1 ? approvers[0] : "Approved by the authorized officers shown above"}`,
    left,
    y + 32,
  );
  !showApproverPerRow ? doc.font("Helvetica").fontSize(8).text(formatReportDate(first.APPROVED_AT), left, y + 45) : null;
  doc.font("Helvetica-Bold").fontSize(9).text(
    `Approved by: `,
    right-100,
    y + 32,
  );
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.end();
  });
}

function createLabourRegisterReport(rows) {
  rows = Array.isArray(rows) ? rows : [];
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 24 });
  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const logoPath = path.join(__dirname, "public", "iocl.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, left, 20, { fit: [58, 42], align: "left", valign: "top" });
  }
  doc.font("Helvetica-Bold").fontSize(14).text("REGISTER FOR DETAILS OF CONTRACTORS' WORKERS", left, 28, { align: "center", width });
  doc.fontSize(10).text(`Location: COIMBATORE TERMINAL`, left, 68);

  const columns = [
    ["Sl. No.", 34], ["Date", 62], ["Name of Contractor", 104], ["Name of the Worker", 104], ["Worker's Aadhaar No.", 82],
    ["Worker's Mobile No.", 72], ["Gate Pass No.", 82], 
    // ["Father's Name", 88],
    ["Address", 125], 
    // ["ABAT", 48],
    // ["Signature of LTI / Left Thumb Impression", 95], 
    ["Time In", 62], 
    ["Time Out", 62],
    ["Name & Designation of Authorizing Official", 100],
  ];
  const totalColumnWidth = columns.reduce((sum, column) => sum + column[1], 0);
  const scale = width / totalColumnWidth;
  let y = 88;
  const headerHeight = 38;
  let x = left;
  (Array.isArray(columns) ? columns : []).forEach(([label, columnWidth]) => {
    const scaledWidth = columnWidth * scale;
    drawReportCell(doc, label, x, y, scaledWidth, headerHeight, { bold: true, fontSize: 6, align: "center" });
    x += scaledWidth;
  });
  const rowHeight = 25;
  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    x = left;
    const values = [index + 1, formatReportDate(row.CREATED_AT).split(",")[0] || "", row.CONTRACTOR, row.LABOUR_NAME, row.AADHAAR_NO, row.MOBILE_NO, row.GATE_PASS_NO, row.ADDRESS, row.TIME_IN, "", row.APPROVING_OFFICER,];
    (Array.isArray(columns) ? columns : []).forEach(([, columnWidth], columnIndex) => {
      const scaledWidth = columnWidth * scale;
      drawReportCell(doc, values[columnIndex], x, y + headerHeight + index * rowHeight, scaledWidth, rowHeight, {
        fontSize: 7,
        align: columnIndex === 5 ? "left" : "center",
      });
      x += scaledWidth;
    });
  });
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.end();
  });
}
// APP_BASE_URL must be set in the environment where server.js itself runs (not the Amplify frontend build config),
// since REACT_APP_ prefixed vars are only injected into the React bundle at build time and are never visible here.
const labourWorkflowBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

async function sendLabourWorkflowEmail(officerEmail, requestToken, rows) {
  const applicationLink = `${labourWorkflowBaseUrl}/approve-labour/${requestToken}`;
  const first = rows[0] || {};
  await transporter.sendMail({
    from: '"IOCL_Utility_App" <ioclcbe4149@gmail.com>',
    to: officerEmail,
    subject: `Action required: Labour pass request for ${first.CONTRACTOR || "contractor"}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:28px;border:1px solid #d9e2ec;border-radius:10px;color:#1f2937"><h2 style="color:#0b5cab;margin:0 0 8px">Worker Entry Approval</h2><p>A request for <strong>${rows.length} worker${rows.length === 1 ? "" : "s"}</strong> is waiting for your review.</p><p><strong>CONTRACTOR:</strong> ${first.CONTRACTOR || ""}<br><strong>WORKERS:</strong> ${rows.map((row) => row.LABOUR_NAME || row.labourName || "").join(", ")}<br><strong>PURPOSE:</strong> ${first.PURPOSE || ""}</p><p style="text-align:center;margin:28px 0"><a href="${applicationLink}" style="background:#0b5cab;color:white;padding:13px 22px;text-decoration:none;border-radius:5px;font-weight:bold">Review and approve</a></p></div>`,  });
}

app.post("/api/labour-pass-requests", async (req, res) => {
  const { locationCode, contractor, purpose, timeIn, approvingOfficer, mailID, labours } = req.body || {};
  if (!locationCode || !contractor || !purpose || !timeIn || !approvingOfficer || !mailID || !Array.isArray(labours) || labours.length === 0) {
    return res.status(400).json({ success: false, message: "Location, contractor, purpose, time, approver and at least one labour are required." });
  }
  let pool;
  try {
    pool = await sql.connect(getSqlConfig());
    await ensureLabourWorkflowColumns(pool);
    const requestToken = crypto.randomBytes(32).toString("hex");
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      for (const labour of labours) {
        const request = new sql.Request(transaction);
        request.input("locationCode", sql.NVarChar, locationCode);
        request.input("labourName", sql.NVarChar, labour.labourName || null);
        request.input("contractor", sql.NVarChar, contractor);
        request.input("mobileNo", sql.NVarChar, labour.mobileNo || null);
        request.input("aadhaarNo", sql.NVarChar, labour.aadhaarNo || null);
        request.input("address", sql.NVarChar, labour.address || null);
        request.input("purpose", sql.NVarChar, purpose);
        request.input("timeIn", sql.NVarChar, timeIn);
        request.input("approvingOfficer", sql.NVarChar, approvingOfficer);
        request.input("requestToken", sql.NVarChar, requestToken);
        await request.query(`INSERT INTO dbo.LabourEntryRecord (LOCATION_CODE, LABOUR_NAME, CONTRACTOR, MOBILE_NO, AADHAAR_NO, ADDRESS, PURPOSE, TIME_IN, APPROVING_OFFICER, REQUEST_TOKEN, REQUEST_STATUS, CREATED_AT) VALUES (@locationCode, @labourName, @contractor, @mobileNo, @aadhaarNo, @address, @purpose, @timeIn, @approvingOfficer, @requestToken, 'PENDING', SYSUTCDATETIME())`);
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    await sendLabourWorkflowEmail(mailID, requestToken, labours.map((labour) => ({ ...labour, CONTRACTOR: contractor, PURPOSE: purpose })));
    return res.status(201).json({ success: true, requestToken, count: labours.length });
  } catch (error) {
    console.error("Labour pass request failed:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/labour-pass-requests/:token", async (req, res) => {
  try {
    await sql.connect(getSqlConfig());
    const request = new sql.Request();
    request.input("token", sql.NVarChar, req.params.token);
    const result = await request.query("SELECT ID, LABOUR_NAME, CONTRACTOR, MOBILE_NO, AADHAAR_NO, ADDRESS, PURPOSE, TIME_IN, APPROVING_OFFICER, REQUEST_STATUS, CREATED_AT, APPROVED_AT FROM dbo.LabourEntryRecord WHERE REQUEST_TOKEN = @token ORDER BY ID");
    if (!result.recordset.length) return res.status(404).json({ message: "Approval request was not found or has expired." });
    return res.json({ rows: result.recordset, status: result.recordset[0].REQUEST_STATUS });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/api/labour-pass-requests/:token/forward", async (req, res) => {
  try {
    const approvingOfficer = String(req.body?.approvingOfficer || "").trim();
    const mailID = String(req.body?.mailID || "").trim().toLowerCase();
    if (!approvingOfficer || !mailID) {
      return res.status(400).json({ message: "The next approving officer and email are required." });
    }

    const pool = await sql.connect(getSqlConfig());
    await ensureLabourWorkflowColumns(pool);
    const request = pool.request();
    request.input("token", sql.NVarChar, req.params.token);
    const result = await request.query(
      "SELECT * FROM dbo.LabourEntryRecord WHERE REQUEST_TOKEN = @token ORDER BY ID",
    );
    const rows = Array.isArray(result.recordset) ? result.recordset : [];
    if (!rows.length) {
      return res.status(404).json({ message: "Approval request was not found." });
    }
    if (rows.some((row) => row.REQUEST_STATUS !== "PENDING")) {
      return res.status(409).json({ message: "Only pending labour requests can be forwarded." });
    }

    const update = pool.request();
    update.input("token", sql.NVarChar, req.params.token);
    update.input("approvingOfficer", sql.NVarChar, approvingOfficer);
    await update.query(
      "UPDATE dbo.LabourEntryRecord SET APPROVING_OFFICER = @approvingOfficer WHERE REQUEST_TOKEN = @token AND REQUEST_STATUS = 'PENDING'",
    );
    await sendLabourWorkflowEmail(mailID, req.params.token, rows);
    return res.json({ success: true, approvingOfficer });
  } catch (error) {
    console.error("Labour request forwarding error:", error);
    return res.status(500).json({ message: error.message });
  }
});

app.get("/api/labour-pass-requests", async (req, res) => {
  let pool;
  try {
    const { fetchdate, location_code, contractor } = req.query;
    pool = await new sql.ConnectionPool(sqlConfig).connect();
    const request = pool.request();
    const whereClauses = ["REQUEST_TOKEN IS NOT NULL"];

    if (fetchdate) {
      request.input("fetchdate", sql.Date, String(fetchdate));
      whereClauses.push("CAST(CREATED_AT AS DATE) = @fetchdate");
    }
    if (location_code) {
      request.input("locationCode", sql.NVarChar, String(location_code));
      whereClauses.push("LOCATION_CODE = @locationCode");
    }
    if (contractor) {
      request.input("contractor", sql.NVarChar, String(contractor));
      whereClauses.push("CONTRACTOR = @contractor");
    }

    const result = await request.query(
      `SELECT * FROM dbo.LabourEntryRecord WHERE ${whereClauses.join(" AND ")} ORDER BY CREATED_AT DESC`,
    );
    return res.json(Array.isArray(result.recordset) ? result.recordset : []);
  } catch (error) {
    console.error("Labour request query failed:", {
      message: error.message,
      code: error.code,
      fetchdate: req.query.fetchdate,
      location_code: req.query.location_code,
      contractor: req.query.contractor,
    });
    return res.status(500).json({ error: error.message });
  } finally {
    if (pool) await pool.close();
  }
});

app.get("/api/labour-pass-reports", async (req, res) => {
  try {
    const { fetchdate, location_code, contractor, format } = req.query;
    if (!["permission", "register"].includes(format)) {
      return res.status(400).json({ error: "A valid report format is required." });
    }
    if (format === "permission" && (!fetchdate || !contractor)) {
      return res.status(400).json({
        error: "Contractor and creation date are required for the permission letter.",
      });
    }

    const pool = await sql.connect(sqlConfig);
    await ensureLabourWorkflowColumns(pool);
    const request = pool.request();
    const conditions = ["REQUEST_TOKEN IS NOT NULL", "REQUEST_STATUS = 'APPROVED'"];
    if (fetchdate) {
      request.input("fetchdate", sql.NVarChar, String(fetchdate));
      conditions.push("CAST(CREATED_AT AS DATE) = CONVERT(date, @fetchdate, 23)");
    }
    if (location_code) {
      request.input("locationCode", sql.NVarChar, String(location_code));
      conditions.push("LOCATION_CODE = @locationCode");
    }
    if (contractor) {
      request.input("contractor", sql.NVarChar, String(contractor));
      conditions.push("CONTRACTOR = @contractor");
    }
    const result = await request.query(`SELECT *, COALESCE(NULLIF(LTRIM(RTRIM(APPROVED_BY)), ''), APPROVING_OFFICER) AS APPROVER_NAME FROM dbo.LabourEntryRecord WHERE ${conditions.join(" AND ")} ORDER BY CREATED_AT, ID`);
    const rows = Array.isArray(result.recordset) ? result.recordset : [];
    if (!rows.length) {
      return res.status(404).json({ error: "No approved labour records found for the selected filters." });
    }
    const pdf = format === "permission"
      ? await createLabourPermissionReport(rows)
      : await createLabourRegisterReport(rows);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="labour-${format}-report.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error("Labour report error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/labour-pass-requests/:token/labours/:labourId/decision", async (req, res) => {
  try {
    const pool = await sql.connect(getSqlConfig());
    await ensureLabourWorkflowColumns(pool);
    const labourId = Number(req.params.labourId);
    const decision = String(req.body?.decision || "").toUpperCase();
    if (!Number.isInteger(labourId) || !["APPROVE", "REJECT"].includes(decision)) {
      return res.status(400).json({ message: "A valid labour and decision are required." });
    }
    const request = new sql.Request();
    request.input("token", sql.NVarChar, req.params.token);
    request.input("labourId", sql.Int, labourId);
    const result = await request.query("SELECT * FROM dbo.LabourEntryRecord WHERE REQUEST_TOKEN = @token AND ID = @labourId");
    if (!result.recordset.length) return res.status(404).json({ message: "Approval request was not found." });
    if (result.recordset[0].REQUEST_STATUS !== "PENDING") return res.status(409).json({ message: "This labour has already been decided." });
    const update = new sql.Request();
    update.input("token", sql.NVarChar, req.params.token);
    update.input("labourId", sql.Int, labourId);
    update.input("decision", sql.NVarChar, decision === "APPROVE" ? "APPROVED" : "REJECTED");
    update.input("decidedBy", sql.NVarChar, req.body?.decidedBy || result.recordset[0].APPROVING_OFFICER);
    await update.query("UPDATE dbo.LabourEntryRecord SET REQUEST_STATUS = @decision, APPROVED_AT = CASE WHEN @decision = 'APPROVED' THEN SYSUTCDATETIME() ELSE NULL END, APPROVED_BY = @decidedBy WHERE REQUEST_TOKEN = @token AND ID = @labourId");

    const allRequestRows = new sql.Request();
    allRequestRows.input("token", sql.NVarChar, req.params.token);
    const rowsResult = await allRequestRows.query("SELECT * FROM dbo.LabourEntryRecord WHERE REQUEST_TOKEN = @token ORDER BY ID");
    const rows = rowsResult.recordset;
    const status = rows.every((row) => row.REQUEST_STATUS === "APPROVED")
      ? "APPROVED"
      : rows.every((row) => row.REQUEST_STATUS === "REJECTED")
        ? "REJECTED"
        : rows.some((row) => row.REQUEST_STATUS !== "PENDING")
          ? "PARTIALLY DECIDED"
          : "PENDING";
    const approvedRows = rows.filter((row) => row.REQUEST_STATUS === "APPROVED");
    if (role !== "User") {
      if (!email) {
        return res.status(400).json({ success: false, message: "Officer email is required." });
      }
      const officerRequest = new sql.Request();
      officerRequest.input("email", sql.NVarChar, email);
      officerRequest.input("locationCode", sql.NVarChar, result.recordset[0].LOCATION_CODE);
      const officerResult = await officerRequest.query(`
        SELECT TOP 1 [ROLE]
        FROM OfficerCredentials
        WHERE LOWER(LTRIM(RTRIM(MAIL_ID))) = @email
          AND LOCATION_CODE = @locationCode
          AND UPPER(LTRIM(RTRIM([ROLE]))) IN ('${acceptedRoles.join("','")}')
      `);
      if (!officerResult.recordset?.length) {
        return res.status(403).json({ success: false, message: "You are not authorized for this role and location." });
      }
    }

    return res.json({
      success: true,
      status,
      pdfBase64: approvedRows.length ? createLabourApprovalPdf(approvedRows, req.params.token).toString("base64") : null,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/api/labour-pass-requests/:token/decision", async (req, res) => {
  try {
    const pool = await sql.connect(getSqlConfig());
    await ensureLabourWorkflowColumns(pool);
    const labourIds = Array.isArray(req.body?.labourIds)
      ? req.body.labourIds.map(Number).filter((id) => Number.isInteger(id))
      : [];
    const decision = String(req.body?.decision || "").toUpperCase();
    if (!labourIds.length || !["APPROVE", "REJECT"].includes(decision)) {
      return res.status(400).json({ message: "Select at least one labour and choose approve or reject." });
    }

    const request = new sql.Request();
    request.input("token", sql.NVarChar, req.params.token);
    const rowsResult = await request.query("SELECT * FROM dbo.LabourEntryRecord WHERE REQUEST_TOKEN = @token ORDER BY ID");
    const rows = rowsResult.recordset;
    if (!rows.length) return res.status(404).json({ message: "Approval request was not found." });

    const selectedRows = rows.filter((row) => labourIds.includes(row.ID));
    if (selectedRows.length !== labourIds.length) return res.status(400).json({ message: "One or more selected labours do not belong to this request." });
    if (selectedRows.some((row) => row.REQUEST_STATUS !== "PENDING")) return res.status(409).json({ message: "One or more selected labours have already been decided." });

    for (const labourId of labourIds) {
      const update = new sql.Request();
      update.input("token", sql.NVarChar, req.params.token);
      update.input("labourId", sql.Int, labourId);
      update.input("decision", sql.NVarChar, decision === "APPROVE" ? "APPROVED" : "REJECTED");
      update.input("decidedBy", sql.NVarChar, req.body?.decidedBy || rows[0].APPROVING_OFFICER);
      await update.query("UPDATE dbo.LabourEntryRecord SET REQUEST_STATUS = @decision, APPROVED_AT = CASE WHEN @decision = 'APPROVED' THEN SYSUTCDATETIME() ELSE NULL END, APPROVED_BY = @decidedBy WHERE REQUEST_TOKEN = @token AND ID = @labourId AND REQUEST_STATUS = 'PENDING'");
    }

    const refreshed = new sql.Request();
    refreshed.input("token", sql.NVarChar, req.params.token);
    const updatedRows = (await refreshed.query("SELECT * FROM dbo.LabourEntryRecord WHERE REQUEST_TOKEN = @token ORDER BY ID")).recordset;
    const status = updatedRows.every((row) => row.REQUEST_STATUS === "APPROVED")
      ? "APPROVED"
      : updatedRows.every((row) => row.REQUEST_STATUS === "REJECTED")
        ? "REJECTED"
        : updatedRows.some((row) => row.REQUEST_STATUS !== "PENDING")
          ? "PARTIALLY DECIDED"
          : "PENDING";
    const approvedRows = updatedRows.filter((row) => row.REQUEST_STATUS === "APPROVED");
    return res.json({ success: true, status, pdfBase64: approvedRows.length ? createLabourApprovalPdf(approvedRows, req.params.token).toString("base64") : null });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/api/labour-pass-requests/:id/:gatepass", async (req, res) => {
  try {
    const recordId = Number(req.params.id);
    const gatepass = String(req.params.gatepass || "").trim().toUpperCase();
    if (!Number.isInteger(recordId) || recordId <= 0) {
      return res.status(400).json({ error: "Invalid record id." });
    }
    if (!/^[RGY]-\d+$/.test(gatepass)) {
      return res.status(400).json({ error: "Gate pass must be R-, G- or Y- followed by a number." });
    }
    await sql.connect(sqlConfig);
    const existingRequest = new sql.Request();
    existingRequest.input("id", sql.Int, recordId);
    const existingResult = await existingRequest.query(
      "SELECT REQUEST_STATUS FROM dbo.LabourEntryRecord WHERE ID = @id",
    );
    if (!existingResult.recordset.length) {
      return res.status(404).json({ error: "Labour pass request was not found." });
    }
    if (existingResult.recordset[0].REQUEST_STATUS !== "APPROVED") {
      return res.status(409).json({ error: "Gate pass can only be assigned to an approved request." });
    }
    const updateRequest = new sql.Request();
    updateRequest.input("id", sql.Int, recordId);
    updateRequest.input("gatepassno", sql.NVarChar(sql.MAX), gatepass);
    const updateResult = await updateRequest.query(
      "UPDATE dbo.LabourEntryRecord SET GATE_PASS_NO = @gatepassno WHERE id = @id"
    );
    if (!updateResult.rowsAffected[0]) {
      return res.status(404).json({ error: "Labour pass request was not found." });
    }
    return res.status(200).json({ success: true, GATE_PASS_NO: gatepass });
  } catch (error) {
    console.error("Gate Pass update error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Sends an approval notification email to the approving officer
 * @param {string} officerEmail - The email address of the approving officer
 * @param {object} labourDetails - The details of the labour from your request
 */

async function sendApprovalEmail(officerEmail, labourDetails) {
  const {
    LABOUR_NAME,
    CONTRACTOR,
    MOBILE_NO,
    AADHAAR_NO,
    ADDRESS,
    PURPOSE,
    TIME_IN,
    CREATED_AT
  } = labourDetails;

  // Change this to your actual frontend application URL
//   const applicationLink = `https://your-app-domain.com/approve-pass/${requestId}`;
    const applicationLink = `http://192.168.1.39:3001`;
  // 2. Define the email template using HTML
  const mailOptions = {
    from: '"IOCL_Utility_App" <ioclcbe4149@gmail.com>',
    to: officerEmail,
    subject: `Action Required: Approve Pass Request for ${CONTRACTOR}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
        <h2 style="color: #1a73e8; margin-top: 0;">New Pass Approval Request</h2>
        <p>Dear Sir/Ma'am,</p>
        <p>A new pass request has been submitted. Please review the details of the labour below:</p>
        
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 35%;">Worker Name:</td>
            <td style="padding: 8px 0;">${LABOUR_NAME}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Contractor:</td>
            <td style="padding: 8px 0;">${CONTRACTOR}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Mobile No:</td>
            <td style="padding: 8px 0;">${MOBILE_NO}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Aadhaar No:</td>
            <td style="padding: 8px 0;">${AADHAAR_NO}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Address:</td>
            <td style="padding: 8px 0;">${ADDRESS}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Purpose:</td>
            <td style="padding: 8px 0;">${PURPOSE}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Time In:</td>
            <td style="padding: 8px 0;">${TIME_IN}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Requested At:</td>
            <td style="padding: 8px 0;">${new Date(CREATED_AT).toLocaleString()}</td>
          </tr>
        </table>
        
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${applicationLink}" 
             style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
             Review & Action Request
          </a>
        </div>
        
        <p style="font-size: 12px; color: #666; text-align: center;">
          If the button above doesn't work, copy and paste this link into your browser:<br>
          <a href="${applicationLink}">${applicationLink}</a>
        </p>
      </div>
    `
  };

  // 3. Send the Email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Approval email sent successfully: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email to officer:', error);
    return false;
  }
}

app.post("/api/upload-labour-pass",
  upload.fields([
    { name: "document1", maxCount: 1 },
    { name: "document2", maxCount: 1 },
    { name: "document3", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const bodyData = req.body || {};
      const files = req.files || {};

      const getFileUrl = (fieldName) => {
        const file = files[fieldName]?.[0];
        return file ? `uploads/${file.filename}` : null;
      };

      const filePaths = {
        document1: getFileUrl("document1"),
        document2: getFileUrl("document2"),
        document3: getFileUrl("document3"),
      };

      if (useAzureStorage_1) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(
          process.env.AZURE_STORAGE_CONNECTION_STRING_1
        );
        const containerName = process.env.AZURE_STORAGE_CONTAINER || "uploads";
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists({ access: 'container' });

        for (const field of ["document1", "document2", "document3"]) {
          const file = files[field]?.[0];
          if (!file) continue;
          const safeName = file.originalname.replace(/[^a-zA-Z0-9.-_]/g, "_");
          const blobName = `${Date.now()}-${field}-${safeName}`;
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: { blobContentType: file.mimetype },
          });
          filePaths[field] = blockBlobClient.url;
        }
      }

      const sqlConfig = {
        user: process.env.AZURE_SQL_USER,
        password: process.env.AZURE_SQL_PASSWORD,
        server: process.env.AZURE_SQL_SERVER,
        database: process.env.AZURE_SQL_DATABASE,
        options: {
          encrypt: process.env.AZURE_SQL_ENCRYPT !== "false",
          trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === "true",
        },
      };

      await sql.connect(sqlConfig);
      const request = new sql.Request();
      request.input('location_code', sql.NVarChar, bodyData['location_code'] || null);
      request.input('labourName', sql.NVarChar, bodyData['labourName'] || null);
      request.input('contractor', sql.NVarChar, bodyData['contractor'] || null);
      request.input('mobile_no', sql.NVarChar, bodyData['mobile_no'] || null);
      request.input('aadhaarNo', sql.NVarChar, bodyData['aadhaarNo'] || null);
      request.input('address', sql.NVarChar, bodyData['address'] || null);
      request.input('gatePassNo', sql.NVarChar, bodyData['gatePassNo'] || null);
      request.input('purpose', sql.NVarChar, bodyData['purpose'] || null);
      request.input('timeIn', sql.NVarChar, bodyData['timeIn'] || null);
      request.input('approvingOfficer', sql.NVarChar, bodyData['approvingOfficer'] || null);
      request.input('doc1_path', sql.NVarChar, filePaths.document1 || null);
      request.input('doc2_path', sql.NVarChar, filePaths.document2 || null);
      request.input('doc3_path', sql.NVarChar, filePaths.document3 || null);

      try {
        // ... Your logic to save details to MS SQL Database ...
        const mail_content = {
        LABOUR_NAME: bodyData['labourName'],
        CONTRACTOR: bodyData['contractor'],
        MOBILE_NO: bodyData['mobile_no'],
        AADHAAR_NO: bodyData['aadhaarNo'],
        ADDRESS: bodyData['address'],
        PURPOSE: bodyData['purpose'],
        TIME_IN: bodyData['timeIn'], // Standardized string
        CREATED_AT: new Date()
        };
        const officerEmailAddress = bodyData['mailID']; // Fetch from database
        sendApprovalEmail(officerEmailAddress, mail_content);
        } catch (error) {
            console.log("error: ",error.message);
        }
      
      const insertSql = `INSERT INTO dbo.LabourEntryRecord (
        LOCATION_CODE, LABOUR_NAME, CONTRACTOR,
        MOBILE_NO, AADHAAR_NO, ADDRESS, GATE_PASS_NO, PURPOSE, TIME_IN, APPROVING_OFFICER,
        doc1_path, doc2_path, doc3_path, created_at
      ) VALUES (@location_code, @labourName, @contractor,
        @mobile_no, @aadhaarNo, @address, @gatePassNo, @purpose, @timeIn, @approvingOfficer,
        @doc1_path, @doc2_path, @doc3_path, SYSUTCDATETIME());`;

      await request.query(insertSql)
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

let permitEmails = [];
let permitEmailFetchPromise = null;

const permitImapConfig = {
  imap: {
    user: process.env.PERMIT_EMAIL_USER,
    password: process.env.PERMIT_EMAIL_PASSWORD,
    host: process.env.PERMIT_EMAIL_HOST || 'imap.gmail.com',
    port: Number(process.env.PERMIT_EMAIL_PORT || 993),
    tls: process.env.PERMIT_EMAIL_TLS !== 'false',
    authTimeout: 20000,
    tlsOptions: { rejectUnauthorized: false },
  },
};

function getEmailSender(parsedMail) {
  if (!parsedMail) return '';

  if (parsedMail.from && parsedMail.from.text) return parsedMail.from.text;
  if (parsedMail.from && parsedMail.from.value && parsedMail.from.value.length) {
    return parsedMail.from.value[0].address || parsedMail.from.value[0].name || '';
  }

  return '';
}

function normalizeMailText(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractValue(pattern, text) {
  const match = text.match(pattern);
  return match && match[1] ? match[1].trim() : '';
}

const regex = /(\d{2}:\d{2}:\d{2}).*?(\d{2}:\d{2}:\d{2})/;

function parsePermitMailContent(rawText, fallbackSubject = '') {
  const text = normalizeMailText(rawText || fallbackSubject || '');
  const clearanceTime = extractValue(/Clearance Timing\s*[:\-]?\s*([^\n]+)/i, text)
  const permitNo = extractValue(/Permit Request no.\s*[:#-]?\s*([A-Za-z0-9\-/]+)/i, text)
  const permitType = permitNo.includes('H')?"Hot Work":permitNo.includes('C')?"Cold Work":permitNo.includes('W')?"Height Work":"";
  const permitData = {
    Date: new Date().toLocaleDateString("en-GB").replace(",", "").replaceAll("/", "-"),
    'Permit No': permitNo,
    'Permit Type': permitType,
    'Work Description': extractValue(/Job detail\s*[:\-]?\s*([^\n]+)/i, text),
    'Work Location': extractValue(/location\s*[:\-]?\s*([^\n]+)/i, text),
    'Receiver Name': extractValue(/Permit Requestor\s*[:\-]?\s*([^\n]+)/i, text),
    'Clearance From': clearanceTime.match(regex)?clearanceTime.match(regex)[1]:null,
    'Clearance Till': clearanceTime.match(regex)?clearanceTime.match(regex)[2]:null,
    'Contractor Name': extractValue(/Vendor Name\s*[:\-]?\s*([^\n]+)/i, text),
  };

  if (!permitData.permitType && fallbackSubject) {
    permitData.permitType = fallbackSubject;
  }

  return permitData;
}

function isPermitMail(parsedMail) {
  const subject = String(parsedMail?.subject || '').toLowerCase();
  return subject.includes('clearance no');
}

async function fetchTodayPermitEmailsFromImap() {
  let connection;
  try {
    if (!permitImapConfig.imap.user || !permitImapConfig.imap.password) {
      console.warn('Permit email IMAP credentials are missing. Set PERMIT_EMAIL_USER and PERMIT_EMAIL_PASSWORD in the environment.');
      permitEmails = [];
      return;
    }
    connection = await imaps.connect({ imap: permitImapConfig.imap });
    await connection.openBox('INBOX');

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const searchCriteria = [['SINCE', since]];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const parsedEmails = [];

    for (const item of messages || []) {
      try {
        const bodyPart = (item.parts || []).find((part) => part.which === '') || item.parts?.[0];
        if (!bodyPart || !bodyPart.body) continue;

        const parsed = await simpleParser(bodyPart.body);
        if (!isPermitMail(parsed)) continue;

        const permitData = parsePermitMailContent(parsed.text || parsed.html || '', parsed.subject || '');

        parsedEmails.push({
          id: item.attributes?.uid || parsed.messageId,
          subject: parsed.subject,
          from: getEmailSender(parsed),
          date: parsed.date,
          text: parsed.text,
          html: parsed.html,
          json: permitData,
        });
      } catch (innerError) {
        console.error('Error parsing permit email item:', innerError);
      }
    }

    const permitNoCounts = new Map();
    for (const email of parsedEmails) {
      const permitNo = normalizePermitNo(email.json?.['Permit No']);
      if (permitNo) {
        permitNoCounts.set(permitNo, (permitNoCounts.get(permitNo) || 0) + 1);
      }
    }
    const missingPermitNo = parsedEmails.filter(
      (email) => !normalizePermitNo(email.json?.['Permit No']),
    ).length;
    const duplicatePermitNos = [...permitNoCounts]
      .filter(([, count]) => count > 1)
      .map(([permitNo, count]) => `${permitNo}x${count}`);
    const messageDetails = parsedEmails
      .map((email) => `${email.id}:${normalizePermitNo(email.json?.['Permit No']) || 'MISSING'}`)
      .join(',');

    permitEmails = dedupePermitRecords(
      parsedEmails,
      (email) => email.json?.['Permit No'],
    );
    console.info(`[permit-sync] Gmail permits: instance=${PERMIT_SYNC_INSTANCE_ID}, matchingMessages=${parsedEmails.length}, withPermitNo=${[...permitNoCounts.values()].reduce((sum, count) => sum + count, 0)}, unique=${permitEmails.length}, missingPermitNo=${missingPermitNo}, duplicatePermitNos=${duplicatePermitNos.join(',') || 'none'}, messages=[${messageDetails}]`);
  } catch (error) {
    console.error('Error fetching permit emails:', error);
    permitEmails = [];
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

function fetchTodayPermitEmails() {
  if (!permitEmailFetchPromise) {
    permitEmailFetchPromise = fetchTodayPermitEmailsFromImap().finally(() => {
      permitEmailFetchPromise = null;
    });
  }

  return permitEmailFetchPromise;
}

app.get('/api/permits', async (req, res) => {
  res.json({ success: true, count: permitEmails.length, data: permitEmails });
});

// Forwards permit mail to the shared permit-tracking Google Sheet. This runs centrally
// here (PM2-managed, single process) instead of in the React frontend, since relying on
// whichever browser tabs happen to be open led to uncoordinated duplicate/mislabeled writes.
const PERMIT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzFEbaJnXq5bVjQuYQjidG544bGBscOcKQaw5lalrCayipfE8xp7Jas4nlrK_OfElHl/exec';
const PERMIT_SHEET_ID = '1Jj8ub1mBS0RylJmadtYn2MenjBHWfX7c4vM_Oci6ydc';
const PERMIT_CLAIM_DIR = path.join(UPLOAD_DIR, 'permit-sync-claims');
const PERMIT_CLAIM_RECONCILE_GRACE_MS = 2 * 60 * 1000;
fs.mkdirSync(PERMIT_CLAIM_DIR, { recursive: true });
let utilityLocationsCache = [];
// sentPermitNos is only this process's own memory of what it already POSTed; it resets on
// every restart. sheetPermitNosCache is read back from the sheet itself, so a restart can
// still tell a permit was already recorded there and won't repost it.
const sentPermitNos = new Set();
let sheetPermitNosCache = new Set();
let sheetPermitNosCacheReady = false;
let permitSheetRowsCache = [];

function normalizePermitNo(permitNo) {
  return String(permitNo || '').trim().toUpperCase();
}

function dedupePermitRecords(records, getPermitNo) {
  const byPermitNo = new Map();
  for (const record of records) {
    const permitNo = normalizePermitNo(getPermitNo(record));
    if (permitNo) {
      byPermitNo.set(permitNo, record);
    }
  }
  return [...byPermitNo.values()];
}

function getPermitClaimPath(permitNo) {
  const permitKey = normalizePermitNo(permitNo);
  const filename = `${crypto.createHash('sha256').update(permitKey).digest('hex')}.claim`;
  return path.join(PERMIT_CLAIM_DIR, filename);
}

async function claimPermitForSheetWrite(permitNo) {
  const permitKey = normalizePermitNo(permitNo);
  const claimPath = getPermitClaimPath(permitKey);
  const createdAt = new Date().toISOString();
  let claimFile;
  try {
    claimFile = await fs.promises.open(claimPath, 'wx');
    await claimFile.writeFile(`${permitKey}\n${createdAt}\nPID=${process.pid}\nstatus=pending\n`);
    return { claimPath, createdAt };
  } catch (error) {
    if (error.code === 'EEXIST') {
      return null;
    }
    throw error;
  } finally {
    await claimFile?.close();
  }
}

async function markPermitClaimWritten(claimPath, permitNo, createdAt) {
  await fs.promises.writeFile(
    claimPath,
    `${normalizePermitNo(permitNo)}\n${createdAt}\nPID=${process.pid}\nstatus=written\nwrittenAt=${new Date().toISOString()}\n`,
  );
}

async function reconcilePermitClaims(sheetPermitNos) {
  const claimFiles = await fs.promises.readdir(PERMIT_CLAIM_DIR);
  let clearedClaims = 0;

  for (const filename of claimFiles.filter((name) => name.endsWith('.claim'))) {
    const claimPath = path.join(PERMIT_CLAIM_DIR, filename);
    try {
      const contents = await fs.promises.readFile(claimPath, 'utf8');
      const [permitKeyLine, createdAtLine, , statusLine, writtenAtLine] = contents.split(/\r?\n/);
      const permitKey = normalizePermitNo(permitKeyLine);
      if (!permitKey) continue;

      const isInSheet = sheetPermitNos.has(permitKey);
      const isWritten = statusLine === 'status=written' || !statusLine;
      const recordedAt = Date.parse(
        statusLine === 'status=written'
          ? writtenAtLine?.replace('writtenAt=', '')
          : createdAtLine,
      );

      if (isInSheet) {
        if (!isWritten) {
          await markPermitClaimWritten(claimPath, permitKey, createdAtLine);
        }
        continue;
      }

      if (isWritten && Number.isFinite(recordedAt)
        && Date.now() - recordedAt >= PERMIT_CLAIM_RECONCILE_GRACE_MS) {
        await fs.promises.unlink(claimPath);
        sentPermitNos.delete(permitKey);
        clearedClaims += 1;
      }
    } catch (error) {
      console.warn(`[permit-sync] unable to reconcile claim ${filename}:`, error.message);
    }
  }

  if (clearedClaims) {
    console.info(`[permit-sync] cleared ${clearedClaims} old claim(s) for permits absent from the sheet`);
  }
}

async function refreshSheetPermitNosCache() {
  try {
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${PERMIT_SHEET_ID}/gviz/tq?tqx=out:json&sheet=permit_details&_=${Date.now()}`,
    );
    if (!response.ok) {
      throw new Error(`Sheet read returned HTTP ${response.status}`);
    }
    const text = await response.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const cols = json.table.cols.map((col) => col.label);
    const permitNoIndex = cols.indexOf('Permit No');
    if (permitNoIndex === -1) {
      throw new Error('Permit No column is missing from the sheet');
    }
    const rows = json.table.rows.map((row) => {
      const cells = row.c || [];
      return Object.fromEntries(
        cols.map((col, index) => [col, cells[index]?.v ?? '']),
      );
    });
    const uniqueRows = dedupePermitRecords(rows, (row) => row['Permit No']);
    const permitNos = uniqueRows.map((row) => normalizePermitNo(row['Permit No']));
    const refreshedPermitNos = new Set(permitNos);
    await reconcilePermitClaims(refreshedPermitNos);
    sheetPermitNosCache = refreshedPermitNos;
    permitSheetRowsCache = uniqueRows;
    sheetPermitNosCacheReady = true;
    console.info(`[permit-sync] sheet rows: instance=${PERMIT_SYNC_INSTANCE_ID}, raw=${rows.length}, uniquePermits=${uniqueRows.length}, duplicateRows=${rows.length - uniqueRows.length}`);
  } catch (error) {
    console.error('Failed to refresh sheet permit-no cache:', error);
  }
}

app.get('/api/permit-sheet', (req, res) => {
  if (!sheetPermitNosCacheReady) {
    return res.status(503).json({ success: false, message: 'Permit data is not ready yet.' });
  }
  return res.json({ success: true, data: permitSheetRowsCache });
});

async function refreshUtilityLocationsCache() {
  try {
    await sql.connect(sqlConfig);
    const result = await sql.query("SELECT LOCATION_CODE, LOCATION_NAME FROM IOCLUtilityCredentials WHERE ACTIVE='Y'");
    utilityLocationsCache = result.recordset || [];
    const locationCounts = utilityLocationsCache.reduce((counts, location) => {
      const code = String(location.LOCATION_CODE || '').trim();
      counts.set(code, (counts.get(code) || 0) + 1);
      return counts;
    }, new Map());
    const duplicateCodes = [...locationCounts]
      .filter(([code, count]) => code && count > 1)
      .map(([code]) => code);
    if (duplicateCodes.length) {
      console.error('Permit sync cannot uniquely resolve duplicate active location codes:', duplicateCodes);
    }
  } catch (error) {
    console.error('Failed to refresh utility locations cache:', error);
  }
}

// Permit No is prefixed with the 4-digit location code (e.g. "1349C2600079" -> "1349"),
// which is the authoritative source of the issuing terminal.
function resolvePermitLocationName(permitNo) {
  const locCode = String(permitNo || '').match(/^\d{4}/)?.[0];
  if (!locCode) {
    return null;
  }
  const matches = utilityLocationsCache.filter(
    (location) => String(location.LOCATION_CODE || '').trim() === locCode,
  );
  return matches.length === 1 ? matches[0].LOCATION_NAME ?? null : null;
}

async function writePermitToSheet(item, locationName, source, cycleId = 'manual') {
  if (!sheetPermitNosCacheReady) {
    await refreshSheetPermitNosCache();
  }
  if (!sheetPermitNosCacheReady) {
    const error = new Error('Unable to verify existing permits in the sheet.');
    error.statusCode = 503;
    throw error;
  }

  const permitNoKey = normalizePermitNo(item['Permit No']);
  if (sentPermitNos.has(permitNoKey) || sheetPermitNosCache.has(permitNoKey)) {
    console.info(`[permit-sync] duplicate skipped: instance=${PERMIT_SYNC_INSTANCE_ID}, cycle=${cycleId}, source=${source}, permitNo=${permitNoKey}`);
    return false;
  }

  const claim = await claimPermitForSheetWrite(permitNoKey);
  if (!claim) {
    sentPermitNos.add(permitNoKey);
    sheetPermitNosCache.add(permitNoKey);
    console.info(`[permit-sync] durable duplicate claim skipped: instance=${PERMIT_SYNC_INSTANCE_ID}, cycle=${cycleId}, source=${source}, permitNo=${permitNoKey}`);
    return false;
  }

  sentPermitNos.add(permitNoKey);
  console.log('sentPermitNos',sentPermitNos);
  
  const payload = Object.fromEntries(
    Object.entries(item).filter(([key]) => key !== 'locationCode'),
  );
  payload['Location Name'] = locationName;
  console.info(`[permit-sync] writing: instance=${PERMIT_SYNC_INSTANCE_ID}, cycle=${cycleId}, source=${source}, permitNo=${permitNoKey}, location=${locationName}`);
  const response = await fetch(PERMIT_SHEET_URL, {
    method: 'POST',
    body: new URLSearchParams({ data: JSON.stringify(payload) }),
  });
  if (!response.ok) {
    const responseBody = (await response.text()).slice(0, 500);
    console.error(`[permit-sync] write rejected: instance=${PERMIT_SYNC_INSTANCE_ID}, cycle=${cycleId}, source=${source}, permitNo=${permitNoKey}, httpStatus=${response.status}, url=${response.url}, body=${responseBody}`);
    throw new Error(`Sheet write returned HTTP ${response.status}`);
  }

  sheetPermitNosCache.add(permitNoKey);
  try {
    await markPermitClaimWritten(claim.claimPath, permitNoKey, claim.createdAt);
  } catch (error) {
    console.warn(`[permit-sync] could not mark successful write claim for ${permitNoKey}:`, error.message);
  }
  console.info(`[permit-sync] write accepted: instance=${PERMIT_SYNC_INSTANCE_ID}, cycle=${cycleId}, source=${source}, permitNo=${permitNoKey}, httpStatus=${response.status}, url=${response.url}`);
  return true;
}

app.post('/api/permits/manual', async (req, res) => {
  try {
    const item = req.body || {};
    const permitNo = String(item['Permit No'] || '').trim();
    const locationCode = String(item.locationCode || '').trim();
    const requiredFields = [
      'Permit Type', 'Work Description', 'Work Location', 'Receiver Name',
      'Clearance From', 'Clearance Till', 'Contractor Name',
    ];
    if (!permitNo || requiredFields.some((field) => !String(item[field] || '').trim())) {
      return res.status(400).json({ success: false, message: 'All permit fields are required.' });
    }
    if (!locationCode || !permitNo.startsWith(locationCode)) {
      return res.status(400).json({ success: false, message: 'Permit No does not match the selected terminal.' });
    }

    if (!utilityLocationsCache.length) {
      await refreshUtilityLocationsCache();
    }
    const locationName = resolvePermitLocationName(permitNo);
    if (!locationName) {
      return res.status(400).json({ success: false, message: 'Unable to uniquely resolve the permit terminal.' });
    }

    console.info(`[permit-sync] manual submit received: instance=${PERMIT_SYNC_INSTANCE_ID}, permitNo=${normalizePermitNo(permitNo)}, ip=${req.ip}, userAgent=${req.get('user-agent') || 'unknown'}`);
    const written = await writePermitToSheet({ ...item, 'Permit No': permitNo }, locationName, 'manual');
    if (!written) {
      return res.status(409).json({ success: false, message: 'This Permit No is already in the sheet.' });
    }
    return res.json({ success: true, message: 'Permit submitted successfully.' });
  } catch (error) {
    console.error('Manual permit sheet write failed:', error);
    return res.status(error.statusCode || 502).json({ success: false, message: error.message || 'Unable to submit permit.' });
  }
});

// Guards against a new cycle starting while a previous one (IMAP fetch + sequential
// sheet POSTs) is still running past the 10s interval, which would let both cycles see
// the same permit as pending before either marks it sent, causing a double-post.
let isSyncingPermits = false;
let lastPermitSyncSummaryAt = 0;
let permitSyncCycleSequence = 0;
let activePermitSyncCycleId = null;

async function syncPermitsToSheet() {
  if (isSyncingPermits) {
    console.warn(`[permit-sync] skipped overlapping sync cycle: instance=${PERMIT_SYNC_INSTANCE_ID}, activeCycle=${activePermitSyncCycleId}`);
    return;
  }
  isSyncingPermits = true;
  const cycleId = ++permitSyncCycleSequence;
  activePermitSyncCycleId = cycleId;
  try {
    if (!sheetPermitNosCacheReady) {
      await refreshSheetPermitNosCache();
      if (!sheetPermitNosCacheReady) {
        return;
      }
    }
    await fetchTodayPermitEmails();
    const zlist = permitEmails
      .map((item) => item.json)
      .filter(Boolean)
      .filter((ele) => ele['Permit No'])
      .filter((ele) => {
        const clearanceTill = ele['Clearance Till'];
        return clearanceTill > new Date().toLocaleTimeString('en-GB');
      });
    const uniqueByPermitNo = dedupePermitRecords(zlist, (item) => item['Permit No']);
    const pending = uniqueByPermitNo.filter(
      (item) => !sentPermitNos.has(normalizePermitNo(item['Permit No']))
        && !sheetPermitNosCache.has(normalizePermitNo(item['Permit No'])),
    );
    if (pending.length || Date.now() - lastPermitSyncSummaryAt >= 60000) {
      console.info(`[permit-sync] cycle: instance=${PERMIT_SYNC_INSTANCE_ID}, cycle=${cycleId}, mailbox=${permitEmails.length}, active=${zlist.length}, unique=${uniqueByPermitNo.length}, pending=${pending.length}, sentThisProcess=${sentPermitNos.size}, sheetCache=${sheetPermitNosCache.size}, pendingPermitNos=${pending.map((item) => normalizePermitNo(item['Permit No'])).join(',') || 'none'}`);
      lastPermitSyncSummaryAt = Date.now();
    }

    for (const item of pending) {
      const locationName = resolvePermitLocationName(item['Permit No']);
      if (locationName == null) {
        console.warn(`[permit-sync] unresolved terminal; not writing permitNo=${normalizePermitNo(item['Permit No'])}`);
        continue;
      }
      try {
        await writePermitToSheet(item, locationName, 'email', cycleId);
      } catch (error) {
        // The sheet may have accepted the POST before the connection failed; don't retry
        // an uncertain delivery during this process lifetime and risk creating a duplicate.
        console.error('Permit sheet delivery outcome is uncertain; suppressing retry:', item['Permit No'], error);
      }
    }
  } catch (error) {
    console.error('Failed to sync permits to sheet:', error);
  } finally {
    isSyncingPermits = false;
    activePermitSyncCycleId = null;
  }
}

refreshUtilityLocationsCache();
setInterval(refreshUtilityLocationsCache, 5 * 60 * 1000);
const ENABLE_PERMIT_SYNC = true;

refreshSheetPermitNosCache().then(() => {
  if (ENABLE_PERMIT_SYNC) {
    syncPermitsToSheet();
  }
});
setInterval(refreshSheetPermitNosCache, 30000);
if (ENABLE_PERMIT_SYNC) {
  setInterval(syncPermitsToSheet, 10000);
  console.info(`[permit-sync] background Gmail-to-sheet worker enabled; instance=${PERMIT_SYNC_INSTANCE_ID}, script=${__filename}`);
} else {
  console.info(`[permit-sync] background Gmail-to-sheet worker disabled; instance=${PERMIT_SYNC_INSTANCE_ID}, script=${__filename}`);
}

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Upload server running on http://localhost:${PORT}`);
});
