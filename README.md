git init
git add .
git commit -m "my commit"
git branch -M main
git remote add origin https://github.com/cosmic-world/permit-display-web.git
git push -u origin main

npx prettier --write "src/**/*.{js,jsx,css}" <!-- for local -->
prettier --write "src/**/*.{js,jsx,css}"  <!-- for global -->

# nginx commands

taskkill /f /IM nginx.exe
nginx.exe -t
start nginx
nginx -s reload

# create a new git repository on the command line

git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/cosmic-world/iocl-utility-app.git
git push -u origin main

Deployment ID
AKfycbwIhhhfFufeF9aQzpTqiakivSyQ216TFsuprFyCUodT-D9m9jqSwj5gYRr8I7z4kX6tKQ

URL
https://script.google.com/macros/s/AKfycbwIhhhfFufeF9aQzpTqiakivSyQ216TFsuprFyCUodT-D9m9jqSwj5gYRr8I7z4kX6tKQ/exec

CREATE TABLE VendorMasterRecord (
    ID INT IDENTITY(1,1) PRIMARY KEY, -- Automatically increments unique IDs
    LOCATION_CODE NVARCHAR(50) NOT NULL,
    CREW_NAME NVARCHAR(150) NOT NULL,
    VENDOR NVARCHAR(150),
    CREW_TYPE NVARCHAR(50),
    TT_NO NVARCHAR(50) NOT NULL,
    CREATED_AT DATETIME DEFAULT GETDATE() -- Automatically tracks when row was added
);


ALTER TABLE temp_pass_records ALTER COLUMN location_code NVARCHAR(150) NOT NULL;
ALTER TABLE temp_pass_records ALTER COLUMN crew_type NVARCHAR(50) NOT NULL;

TRUNCATE TABLE temp_pass_records;
TRUNCATE TABLE VendorMasterRecord;

ALTER TABLE VendorMasterRecord 
ADD MOBILE_NO NVARCHAR(50) NOT NULL;

temp_pass_records

ALTER TABLE temp_pass_records 
ADD 
    approval_history NVARCHAR(500) NOT NULL

EXEC sp_rename 'temp_pass_records.aadhaar_no', 'govt_id', 'COLUMN';

UPDATE temp_pass_records
SET approval_history = '26-06-2026'
WHERE Id = 1; -- Replace 1 with the actual ID number of that row

ALTER TABLE temp_pass_records ALTER COLUMN request_to DATE NOT NULL;
ALTER TABLE temp_pass_records ALTER COLUMN request_from DATE NOT NULL;

ALTER TABLE VendorMasterRecord ADD CONSTRAINT Unique_Mobile_No UNIQUE (MOBILE_NO);
ALTER TABLE VendorMasterRecord ADD CONSTRAINT Unique_GovtID UNIQUE (GOVT_ID);
ALTER TABLE VendorMasterRecord ADD CONSTRAINT Unique_Driving_Licence UNIQUE (DRIVING_LICENCE);

EXEC sp_rename 'dbo.VendorMasterRecord.UQ_Mobile', 'Unique_Mobile_No', 'OBJECT'
EXEC sp_rename 'dbo.VendorMasterRecord.UQ_GovtID', 'Unique_GovtID', 'OBJECT'
EXEC sp_rename 'dbo.VendorMasterRecord.UQ_Licence', 'Unique_Driving_Licence', 'OBJECT'

DELETE FROM VendorMasterRecord WHERE ID = 1;

CREATE TABLE LabourEntryRecord (
    ID INT IDENTITY(1,1) PRIMARY KEY, -- Automatically increments unique IDs
    LOCATION_CODE NVARCHAR(50) NOT NULL,
    LABOUR_NAME NVARCHAR(150) NOT NULL,
    CONTRACTOR NVARCHAR(150),
    MOBILE_NO NVARCHAR(50) NOT NULL,
    AADHAAR_NO NVARCHAR(50) NOT NULL,
    ADDRESS NVARCHAR(500) NULL,
    GATE_PASS_NO NVARCHAR(20) NULL,
    PURPOSE NVARCHAR(100) NULL,
    TIME_IN NVARCHAR(50) NULL,
    TIME_OUT NVARCHAR(50) NULL,
    CREATED_AT DATETIME DEFAULT GETDATE() -- Automatically tracks when row was added
);

-- 1. Correctly drop the old INDEXES instead of constraints
DROP INDEX IF EXISTS Unique_Mobile_no ON LabourMasterRecord;
DROP INDEX IF EXISTS Unique_Aadhaar ON LabourMasterRecord;

-- 2. Create the fresh FILTERED Unique Indexes that ignore NULL values
CREATE UNIQUE NONCLUSTERED INDEX Unique_Mobile_no 
ON LabourMasterRecord(MOBILE_NO) 
WHERE MOBILE_NO IS NOT NULL;

CREATE UNIQUE NONCLUSTERED INDEX Unique_Aadhaar 
ON LabourMasterRecord(AADHAAR_NO) 
WHERE AADHAAR_NO IS NOT NULL;

CREATE TABLE OfficerCredentials (
    ID INT IDENTITY(1,1) PRIMARY KEY, -- Automatically increments unique IDs
    LOCATION_CODE NVARCHAR(50) NOT NULL,
    OFFICER_NAME NVARCHAR(150) NOT NULL,
    MAIL_ID NVARCHAR(150),
    MOBILE_NO NVARCHAR(50) NOT NULL,
    CREATED_AT DATETIME DEFAULT GETDATE() -- Automatically tracks when row was added
);

CREATE TABLE ContractorCredentials (
    ID INT IDENTITY(1,1) PRIMARY KEY, -- Automatically increments unique IDs
    LOCATION_CODE NVARCHAR(50) NOT NULL,
    CONTRACTOR_NAME NVARCHAR(150) NOT NULL,
    MAIL_ID NVARCHAR(150),
    MOBILE_NO NVARCHAR(50) NOT NULL,
    CREATED_AT DATETIME DEFAULT GETDATE() -- Automatically tracks when row was added
);

CREATE UNIQUE NONCLUSTERED INDEX Unique_Contractor_Mobile_no 
ON ContractorCredentials(MOBILE_NO) 
WHERE MOBILE_NO IS NOT NULL;

ALTER TABLE OfficerCredentials ALTER COLUMN MAIL_ID NVARCHAR(150) NOT NULL;
ALTER TABLE ContractorCredentials ALTER COLUMN MAIL_ID NVARCHAR(150) NOT NULL;

TRUNCATE TABLE ContractorCredentials;
TRUNCATE TABLE VendorMasterRecord;

ALTER TABLE LabourEntryRecord 
ADD 
    doc1_path NVARCHAR(200) NULL,
    doc2_path NVARCHAR(200) NULL,
    doc3_path NVARCHAR(200) NULL;

UPDATE dbo.OfficerCredentials
SET [ROLE] = 'SUPER_ADMIN'
WHERE MAIL_ID = 'admin@example.com';

ALTER TABLE dbo.OfficerCredentials
ADD [ROLE] NVARCHAR(20) NOT NULL
    CONSTRAINT DF_OfficerCredentials_ROLE DEFAULT 'USER';

UPDATE dbo.temp_pass_records
SET vendor = LTRIM(RTRIM(vendor))
WHERE vendor IS NOT NULL;