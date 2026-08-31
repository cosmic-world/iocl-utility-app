require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { BlobServiceClient } = require("@azure/storage-blob");
const sql = require("mssql");

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
      SELECT TOP 1 *
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
    console.log(`OTP sent to ${email}: ${otp}`);
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
                const officerName     = sanitizeValue(row['OFFICER NAME']).toLocaleUpperCase();
                const mailID       = sanitizeValue(row['MAIL ID']).toLocaleLowerCase();
                const mobile         = sanitizeValue(row['MOBILE NO']);

                await pool.request()
                .input('locationCode', sql.VarChar, locationCode)
                .input('officerName', sql.VarChar, officerName)
                .input('mailID', sql.VarChar, mailID)
                .input('mobile', sql.VarChar, mobile)
                .query(`
                INSERT INTO OfficerCredentials (LOCATION_CODE, OFFICER_NAME, MAIL_ID, MOBILE_NO)
                VALUES (@locationCode, @officerName, @mailID, @mobile)
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
      request.input('locationCode', sql.NVarChar, bodyData['locationCode'] || null);
      request.input('officerName', sql.NVarChar, bodyData['officerName'].toUpperCase() || null);
      request.input('mailID', sql.NVarChar, bodyData['mailID'].toLowerCase() || null);
      request.input('mobileNo', sql.NVarChar, bodyData['mobileNo'] || null);
      
      const insertSql = `INSERT INTO dbo.OfficerCredentials (
        LOCATION_CODE, OFFICER_NAME, MAIL_ID, MOBILE_NO) 
        VALUES (@locationCode, @officerName, @mailID, @mobileNo)`;
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



const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ioclcbe4149@gmail.com',
    pass: 'wfsv hvdb gqqh prqb'
    // pass: 'levf jhhk ggix zebi'
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
      console.log(bodyData)
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
        console.log(`Sending approval email to: ${officerEmailAddress}`);

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



const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Upload server running on http://localhost:${PORT}`);
});
