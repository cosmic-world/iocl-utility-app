# Document Upload & Storage Guide

## Storage Location
All uploaded documents are stored in the `uploads/` folder in the project root directory:
```
/TempPass-Registry/uploads/
```

## How It Works

### Database
- **Location:** `database.db` (SQLite) - created automatically in project root
- **Table:** `temp_pass_records`
- **Stores:** Form data + document file paths (not the actual files)

### Document Storage
- **Actual files:** Stored as physical files in `/uploads/` folder
- **Database references:** Stores relative paths like `uploads/1234567890-document1-filename.pdf`
- **Access:** Via `http://localhost:5000/uploads/filename` when server is running

## Running the System

### 1. Start the Upload Server (Terminal 1)
```bash
npm run server
```
This starts Express on port 5000 and creates:
- `/uploads/` folder (if not exists)
- `database.db` (if not exists)

### 2. Start the React App (Terminal 2)
```bash
npm start
```
React runs on port 3001 and proxies API calls to port 5000.

## Form Features

### File Upload Options
- **File Picker:** Click to browse and select PDF or images
- **Camera Capture:** Click camera icon to capture directly from device camera
- **All Optional:** No files required; skip any document if not needed
- **Supported Formats:** PDF, JPG, JPEG, PNG, WEBP

### Validation
- ✅ All form fields (Permit Type, Work Description, etc.) are mandatory
- ✅ Documents are optional - upload only what you need
- ✅ Invalid file types are automatically rejected by the browser
- ✅ File size limit: 30MB per file

## Database Schema

```sql
CREATE TABLE temp_pass_records (
  id INTEGER PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  permit_type TEXT,
  work_desc TEXT,
  work_location TEXT,
  receiver_name TEXT,
  clearance_from TEXT,
  clearance_till TEXT,
  contractor_name TEXT,
  contractor_supervisor TEXT,
  location_name TEXT,
  division TEXT,
  document1_path TEXT,      -- Can be NULL if no file uploaded
  document2_path TEXT,      -- Can be NULL if no file uploaded
  document3_path TEXT,      -- Can be NULL if no file uploaded
  document4_path TEXT       -- Can be NULL if no file uploaded
);
```

## File Organization Example

After uploading a permit form with 2 documents, your structure looks like:
```
/TempPass-Registry/
├── uploads/
│   ├── 1719340800000-document1-safety_plan.pdf
│   └── 1719340800001-document2-site_photo.jpg
├── database.db
└── ... (other files)
```

And in database, the document paths are stored as:
```
uploads/1719340800000-document1-safety_plan.pdf
uploads/1719340800001-document2-site_photo.jpg
```

## API Endpoints

### POST /api/upload
**Submits form + documents**
- Accepts: FormData with form fields + files
- Response: `{ success: true, id: <submission_id> }`

### GET /api/temp_pass_records
**Retrieves all temp_pass_records**
- Response: JSON array of all records with document paths

## Troubleshooting

### Documents not showing in `/uploads/`
1. Ensure server is running: `npm run server`
2. Check server console for upload errors
3. Verify file size < 30MB

### "All fields must be filled" error
- Check that all form text fields have values (documents can be empty)

### Cannot capture from camera
- Ensure app runs on HTTPS or localhost
- Grant camera permissions when prompted
- Some browsers require camera capture on HTTPS

### Database errors
- Delete `database.db` if schema is corrupted
- Restart server to recreate from scratch
