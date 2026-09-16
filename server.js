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

app.post("/api/admin/request-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email address is required." });
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
    const result = await request.query(`
      SELECT [ROLE]
      FROM OfficerCredentials
      WHERE LOWER(LTRIM(RTRIM(MAIL_ID))) = @email
    `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email address is not found in the registered officer list.",
      });
    }
    const otp = generateOtp();
    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      role: String(result.recordset[0].ROLE).toUpperCase(),
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

app.post("/api/upload-temp-pass",
  upload.fields([
    { name: "request_letter", maxCount: 1 },
    { name: "id_proof", maxCount: 1 },
    { name: "driving_licence", maxCount: 1 },
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
        driving_licence: getFileUrl("driving_licence"),
      };

      if (useAzureStorage) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(
          process.env.AZURE_STORAGE_CONNECTION_STRING
        );
        const containerName = process.env.AZURE_STORAGE_CONTAINER || "uploads";
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists({ access: 'container' });

        for (const field of ["request_letter", "id_proof", "driving_licence"]) {
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
      request.input('driving_licence_path', sql.NVarChar, filePaths.driving_licence || null);
      request.input('approval_history', sql.NVarChar(sql.MAX), bodyData['approval_history'] || null);
      
      const insertSql = `INSERT INTO dbo.temp_pass_records (
        location_code, vendor, crew_type, crew_name, tt_no,
        mobile_no, govt_id, driving_licence_no, request_from, request_to,
        request_letter_path, id_proof_path, driving_licence_path, approval_history, created_at
      ) VALUES (@location_code, @vendor, @crew_type, @crew_name, @tt_no,
        @mobile_no, @govt_id, @driving_licence_no, @request_from, @request_to,
        @request_letter_path, @id_proof_path, @driving_licence_path, @approval_history, SYSUTCDATETIME());`;
      await request.query(insertSql)
      
      await sql.close();

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
    await sql.close();

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
      
      await sql.close();
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
    
    await pool.close();

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
      await sql.close();
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
      
      await sql.close();

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

    const pool = await sql.connect(sqlConfig);
    let count = 0
    let responseText = "";
    for (const row of sheetData) {
        try{
            const locationCode = sanitizeValue(row['LOCATION CODE']);
                const labourName     = sanitizeValue(row['LABOUR NAME']);
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
    

    await pool.close();

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
      
      await sql.close();

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

      if (contractor) {
      whereClauses.push(`contractor = '${contractor.replace(/'/g, "''")}'`)
      }

          if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }

      await sql.connect(sqlConfig);
      const result = await sql.query(query);
      await sql.close();
      res.json(result.recordset);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
});

app.post('/api/upload-contractor-excel', uploadExcel.single('excel_file'), async (req, res) => {
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

    const pool = await sql.connect(sqlConfig);
    let count = 0
    let responseText =""
    for (const row of sheetData) {
        try{
            const locationCode = sanitizeValue(row['LOCATION CODE']);
                const contractorName     = sanitizeValue(row['CONTRACTOR NAME']).toUpperCase();
                const mailID       = sanitizeValue(row['MAIL ID']).toLowerCase();
                const mobile         = sanitizeValue(row['MOBILE NO']);

                await pool.request()
                .input('locationCode', sql.VarChar, locationCode)
                .input('contractorName', sql.VarChar, contractorName)
                .input('mailID', sql.VarChar, mailID)
                .input('mobile', sql.VarChar, mobile)
                .query(`
                INSERT INTO ContractorCredentials (LOCATION_CODE, CONTRACTOR_NAME, MAIL_ID, MOBILE_NO)
                VALUES (@locationCode, @contractorName, @mailID, @mobile)
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

    await pool.close();

    res.status(200).json({ 
      success: true, 
      message: `${count!=sheetData.length?`Successfully imported ${sheetData.length - count} records into Azure SQL!`:""}\n${count>0?`Upload failed for ${count} records due to ${responseText}`:""}`
    });

  } catch (error) {
    console.error("Excel import failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload-contractor-single",
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
      request.input('contractorName', sql.NVarChar, bodyData['contractorName'].toUpperCase() || null);
      request.input('mailID', sql.NVarChar, bodyData['mailID'].toLowerCase() || null);
      request.input('mobileNo', sql.NVarChar, bodyData['mobileNo'] || null);
      
      const insertSql = `INSERT INTO dbo.ContractorCredentials (
        LOCATION_CODE, CONTRACTOR_NAME, MAIL_ID, MOBILE_NO) 
        VALUES (@locationCode, @contractorName, @mailID, @mobileNo)`;
      await request.query(insertSql)
      
      await sql.close();

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
      const result = await sql.query("SELECT * FROM ContractorCredentials");
      await sql.close();
      res.json(result.recordset);
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({ error: error.message });
    }
  })();
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

    const pool = await sql.connect(sqlConfig);
    let count = 0
    let responseText = "";
    for (const row of sheetData) {
        try{
            const locationCode = sanitizeValue(row['LOCATION CODE']);
                const name     = sanitizeValue(row['NAME']).toLocaleUpperCase();
                const mobile         = sanitizeValue(row['MOBILE NO']);
                const mailID       = sanitizeValue(row['MAIL ID']).toLocaleLowerCase();
                const role = String(sanitizeValue(row['ROLE'])).toUpperCase();

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
                INSERT INTO OfficerCredentials (LOCATION_CODE, OFFICER_NAME, Emp_ID, MOBILE_NO, MAIL_ID, [ROLE])
                VALUES (@locationCode, @name, @empID, @mobile, @mailID, @role)
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

    await pool.close();

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
      const role = String(bodyData['role'] || "ADMIN").toUpperCase();
      if (!["ADMIN", "SUPER_ADMIN", "SECURITY"].includes(role)) {
        return res.status(400).json({ error: "Invalid officer role." });
      }
      request.input('locationCode', sql.NVarChar, bodyData['locationCode'] || null);
      request.input('name', sql.NVarChar, bodyData['name'].toUpperCase() || null);
      request.input('empID', sql.NVarChar, normalizeOfficerEmpId(bodyData['empID'], role));
      request.input('mobileNo', sql.NVarChar, bodyData['mobileNo'] || null);
      request.input('mailID', sql.NVarChar, bodyData['mailID'].toLowerCase() || null);
      request.input('role', sql.NVarChar, role);
      
      const insertSql = `INSERT INTO dbo.OfficerCredentials (
        LOCATION_CODE, OFFICER_NAME, Emp_ID, MOBILE_NO, MAIL_ID, [ROLE]) 
        VALUES (@locationCode, @name, @empID, @mobileNo, @mailID, @role)`;
      await request.query(insertSql)
      
      await sql.close();
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
      const result = await sql.query("SELECT * FROM OfficerCredentials");
      await sql.close();
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
    await sql.close();

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
    await sql.close();

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Officer record not found." });
    }

    return res.status(200).json({ success: true, id: officerId, role });
  } catch (error) {
    console.error("Officer role update error:", error);
    res.status(500).json({ error: error.message });
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

const labourWorkflowBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

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

async function sendLabourWorkflowEmail(officerEmail, requestToken, rows) {
  const applicationLink = `${labourWorkflowBaseUrl}/approve-labour/${requestToken}`;
  const first = rows[0] || {};
  await transporter.sendMail({
    from: '"IOCL_Utility_App" <ioclcbe4149@gmail.com>',
    to: officerEmail,
    subject: `Action required: Labour pass request for ${first.CONTRACTOR || "contractor"}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:28px;border:1px solid #d9e2ec;border-radius:10px;color:#1f2937"><h2 style="color:#0b5cab;margin:0 0 8px">Labour entry approval</h2><p>A request for <strong>${rows.length} labour${rows.length === 1 ? "" : "s"}</strong> is waiting for your review.</p><p><strong>Contractor:</strong> ${first.CONTRACTOR || ""}<br><strong>Purpose:</strong> ${first.PURPOSE || ""}</p><p style="text-align:center;margin:28px 0"><a href="${applicationLink}" style="background:#0b5cab;color:white;padding:13px 22px;text-decoration:none;border-radius:5px;font-weight:bold">Review and approve</a></p><p style="font-size:12px;color:#64748b">Request reference: ${requestToken.slice(0, 12).toUpperCase()}</p></div>`,
  });
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
  } finally {
    if (pool) await pool.close();
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

app.get("/api/labour-pass-requests", async (req, res) => {
  try {
    await sql.connect(getSqlConfig());
      const { fetchdate } = req.query;
      let whereClauses = [];
      let result = await sql.query(`
      SELECT REQUEST_TOKEN, CONTRACTOR, APPROVING_OFFICER, PURPOSE, TIME_IN,
        REQUEST_STATUS, CREATED_AT, APPROVED_AT, LABOUR_NAME
      FROM dbo.LabourEntryRecord
      ORDER BY CREATED_AT DESC
    `)
      whereClauses.push('REQUEST_TOKEN IS NOT NULL')
      if (fetchdate) {
      whereClauses.push(`request_from >= '${fetchdate.replace(/'/g, "''")}'`)
      }
    result += " WHERE " + whereClauses.join(" AND ");
    const requests = new Map();
    result.recordset.forEach((row) => {
      const current = requests.get(row.REQUEST_TOKEN) || {
        REQUEST_TOKEN: row.REQUEST_TOKEN,
        CONTRACTOR: row.CONTRACTOR,
        APPROVING_OFFICER: row.APPROVING_OFFICER,
        PURPOSE: row.PURPOSE,
        TIME_IN: row.TIME_IN,
        CREATED_AT: row.CREATED_AT,
        LABOUR_COUNT: 0,
        statuses: [],
      };
      current.LABOUR_COUNT += 1;
      current.statuses.push(row.REQUEST_STATUS);
      requests.set(row.REQUEST_TOKEN, current);
    });
    return res.json([...requests.values()].map((request) => ({
      ...request,
      REQUEST_STATUS: request.statuses.every((status) => status === "APPROVED")
        ? "APPROVED"
        : request.statuses.every((status) => status === "REJECTED")
          ? "REJECTED"
          : request.statuses.some((status) => status !== "PENDING")
            ? "PARTIALLY DECIDED"
            : "PENDING",
    })));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/api/labour-pass-requests/:token/labours/:labourId/decision", async (req, res) => {
  try {
    await sql.connect(getSqlConfig());
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
    await sql.connect(getSqlConfig());
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
  console.log('labourDetails',labourDetails);
  
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
            <td style="padding: 8px 0; font-weight: bold; width: 35%;">Labour Name:</td>
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
      
      await sql.close();

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

let permitEmails = [];

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
  const sender = getEmailSender(parsedMail).toLowerCase();
  const subject = String(parsedMail?.subject || '').toLowerCase();
  const bodyText = String(parsedMail?.text || parsedMail?.html || '').toLowerCase();

  return (
    sender.includes('roym1') ||
    sender.includes('noreply') ||
    subject.includes('permit') ||
    bodyText.includes('permit') ||
    bodyText.includes('clearance')
  );
}

async function fetchTodayPermitEmails() {
  let connection;
  try {
    if (!permitImapConfig.imap.user || !permitImapConfig.imap.password) {
      console.warn('Permit email IMAP credentials are missing. Set PERMIT_EMAIL_USER and PERMIT_EMAIL_PASSWORD in the environment.');
      permitEmails = [];
      return;
    }
    connection = await imaps.connect({ imap: permitImapConfig.imap });
    await connection.openBox('INBOX');

// Filter for emails received today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const searchCriteria = [
      ['SINCE', today]
    ];
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

    permitEmails = parsedEmails;
  } catch (error) {
    const msg = String(error?.message || '');
    console.error('Error fetching permit emails:', error);

    permitEmails = [];
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

app.get('/api/permits', async (req, res) => {
  try {
    await fetchTodayPermitEmails();
    res.json({ success: true, count: permitEmails.length, data: permitEmails });
  } catch (error) {
    console.error('Failed to read permit emails:', error);
    res.status(500).json({ success: false, message: error.message || 'Unable to read permit mail.' });
  }
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Upload server running on http://localhost:${PORT}`);
});
