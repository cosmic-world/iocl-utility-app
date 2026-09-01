import React, { useState, useEffect, useRef } from "react";
import { apiUrl } from "../api";
import { useDispatch, useSelector } from "react-redux";
import Table from "react-bootstrap/Table";
import "../css/page_layout.css";
import {
  Button,
  TextField,
  CircularProgress,
  Autocomplete,
  Typography,
  Box,
} from "@mui/material";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Visibility, Download, Delete } from "@mui/icons-material";
import {
  SetOfficerMasterList,
  NavBarComponent,
  SetSelectedApplication,
} from "../action/userSlice";

export default function MasterData() {
  const dispatch = useDispatch();
  const {
    officerList,
    navBarComponent,
    userType,
    locationCode: selectedLocationCode,
  } = useSelector(
    (state) => state.myApp,
  );
  
  const [saveLoader, setSaveLoader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [file, setFile] = useState(null);
  const [locationCode, setLocationCode] = useState("");
  const [mailID, setMailID] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [role, setRole] = useState("USER");
  const [searchLocationCode, setSearchLocationCode] = useState(
    selectedLocationCode || "",
  );
  const [officersForLocation, setOfficersForLocation] = useState([]);
  const fileInputRef = useRef(null);

  const handleExcelChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleExcelSubmit = async (e) => {
    e.preventDefault();
    setSaveLoader(true);

    if (!file) return alert("Please select an Excel file first!");

    setLoading(true);
    const formData = new FormData();
    formData.append("excel_file", file); // Must match upload.single('excel_file') on backend

    try {
      const response = await fetch(
        apiUrl("/api/upload-officer-excel"),
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();

      if (data.success) {
        alert(data.message);
              handleSync(); // Refresh officer list after upload
      } else {
        alert("Upload failed: " + data.message);
      }
    } catch (error) {
      console.error("Error uploading excel:", error);
    } finally {
      setSaveLoader(false);
      setLoading(false);
      setFile(null); // Reset file input after submission
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // ◄ Forces the browser UI text to reset to "No file chosen"
      }
    }
  };

  const handlePostData = async (e) => {
    e.preventDefault();
    if (!locationCode) {
      alert("Please select a Location Code.");
      return;
    }

    if (!officerName) {
      alert("Please enter Officer Name.");
      return;
    }

    if (!mailID) {
      alert("Please enter Mail ID.");
      return;
    }

    if (!mobileNo) {
      alert("Please enter Mobile No.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobileNo)) {
      alert("Mobile No should be exactly 10 digits.");
      return;
    }

    setSaveLoader(true);
    setSubmitting(true);

    try {
      const payload = { locationCode, officerName, mailID, mobileNo, role };
      // Submit to server
      const response = await fetch(
        apiUrl("/api/upload-officer-single"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json", // <-- ADD THIS CRITICAL LINE
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (data.success) {
        alert("Record submitted successfully!");
        await loadOfficerList();
        // Reset form
        setLocationCode("");
        setMailID("");
        setOfficerName("");
        setMobileNo("");
        setRole("USER");
        handleSync(); // Refresh officer list after submission
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaveLoader(false);
      setSubmitting(false);
    }
  };

  const loadOfficerList = async () => {
    const response = await fetch(apiUrl("/api/officer-master-data"));
    if (!response.ok) {
      throw new Error("Failed to load officer records");
    }
    const data = await response.json();
    const officerRecords = Array.isArray(data) ? data : [];
    dispatch(SetOfficerMasterList(officerRecords));
    return officerRecords;
  };

  useEffect(() => {
    loadOfficerList().catch((error) => {
      console.error("Failed to fetch officer records", error);
    });
  }, [dispatch]);

  const handleSync = async () => {
    setSaveLoader(true);
    setSyncing(true);
    try {
      const officerRecords = await loadOfficerList();
      // officerRecords.length > 0
      //   ? alert("Syncing completed successfully.")
      //   : alert("No records found in the database.");
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSyncing(false);
    }
  };

  const handleDeleteOfficer = async (officerId) => {
    if (!isSuperAdmin) {
      alert("Only a super admin can delete officer records.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this officer?")) {
      return;
    }

    setSaveLoader(true);
    try {
      const response = await fetch(
        apiUrl(`/api/officer-master-data/${officerId}`),
        {
          method: "DELETE",
          headers: { "x-user-role": userType },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete officer record.");
      }

      dispatch(
        SetOfficerMasterList(
          officerList.filter(
            (officer) => String(officer.ID) !== String(officerId),
          ),
        ),
      );
      alert("Officer record deleted successfully.");
            handleSync(); // Refresh officer list after deletion
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaveLoader(false);
    }
  };

  const isSuperAdmin = userType === "super_admin";

  useEffect(() => {
    setOfficersForLocation(officerList.filter((officer) => officer["LOCATION_CODE"] == searchLocationCode))
  }, [officerList]);

  return (
    <div
      className={
        "d-flex flex-column justify-content-start align-items-center w-100 h-100 p-2"
      }
      style={{
        overflow: "none",
        overflowX: "auto",
      }}
    >

      {saveLoader ? (
        <CircularProgress
          color="success"
          sx={{
            position: "fixed",
            zIndex: 2000,
            transform: "translate(-50%, -50%)",
            left: "45%",
            top: "40%",
            zoom: 3,
          }}
        />
      ) : null}

      <Box sx={{ p: 3, border: "1px dashed #ccc", m: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Bulk Upload of via Excel
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Excel columns: LOCATION CODE, OFFICER NAME, MAIL ID, MOBILE NO, ROLE.
            ROLE must be USER or SUPER_ADMIN.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            href="/template_officer.xlsx" // Points directly to the file in your public folder
            download="Officer_Template.xlsx" // Forces the browser to download it instead of opening it
          >
            Download Excel Template
          </Button>
        </Box>

        <hr style={{ border: "0.5px solid #eee", margin: "15px 0" }} />

        <form onSubmit={handleExcelSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelChange}
            style={{ marginBottom: "1rem" }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mb: 2 }}
            style={{ width: 150 }}
          >
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </Box>

      <div
        className="d-flex flex-column justify-content-center align-items-center w-100 p-2 mt-2"
        style={{ border: "1px dashed #ccc" }}
      >
        <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-2">
          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Location Code</Typography>
            <TextField
              fullWidth
              variant="outlined"
              style={{ backgroundColor: "white" }}
              value={locationCode}
              onChange={(e) =>
                setLocationCode(e.target.value?.toUpperCase() || "")
              }
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                  textTransform: "uppercase",
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Officer Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={officerName}
              style={{ backgroundColor: "white" }}
              onChange={(e) =>
                setOfficerName(e.target.value?.toUpperCase() || "")
              }
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                  textTransform: "uppercase",
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Mobile No</Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="number"
              value={mobileNo}
              style={{ backgroundColor: "white" }}
              onChange={(e) => setMobileNo(e.target.value?.toUpperCase() || "")}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                  textTransform: "uppercase",
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Mail ID</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={mailID}
              style={{ backgroundColor: "white" }}
              onChange={(e) => setMailID(e.target.value?.toUpperCase() || "")}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                  textTransform: "uppercase",
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Role</Typography>
            <TextField
              select
              fullWidth
              value={role}
              onChange={(e) => setRole(e.target.value)}
              SelectProps={{ native: true }}
              style={{ backgroundColor: "white" }}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                  textTransform: "uppercase",
                },
              }}
            >
              <option value="USER">USER</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </TextField>
          </div>
        </div>

        <Button
          color="primary"
          variant="contained"
          sx={{ m: 2 }}
          style={{ width: 200 }}
          disabled={submitting}
          onClick={(e) => {
            handlePostData(e);
          }}
        >
          {submitting ? "Submitting..." : "SUBMIT"}
        </Button>
      </div>

      <Typography variant="h6" sx={{ mt: 2 }}>
        Existing Officers
      </Typography>
      <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-2">
        <TextField
          label="Location Code"
          value={searchLocationCode}
          onChange={(e) => setSearchLocationCode(e.target.value.toUpperCase())}
          placeholder="Enter Location Code"
          style={{ backgroundColor: "white", margin: 5, width: 350 }}
        />
        <Button
          color="primary"
          variant="contained"
          sx={{ m: 1, width: 180 }}
          onClick={() => <>
          {setOfficersForLocation(officerList.filter((officer) => officer["LOCATION_CODE"] == searchLocationCode))}
          {officerList.filter((officer) => officer["LOCATION_CODE"] == searchLocationCode).length === 0 ? alert("No officers found for the entered Location Code."):''}
          </>}
        >
          Search Officers
        </Button>
        <Button
          color="secondary"
          variant="outlined"
          sx={{ m: 1, width: 180, backgroundColor: "white" }}
          onClick={() => {
            setSearchLocationCode("");
          }}
        >
          Clear Search
        </Button>
      </div>
      <Table bordered hover striped className="ttes_table">
        <thead className="table-head">
          <tr>
            <th>LOCATION CODE</th>
            <th>OFFICER NAME</th>
            <th>MAIL ID</th>
            <th>MOBILE NO</th>
            <th>ROLE</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {officersForLocation.map((officer) => (
            <tr key={officer.ID}>
              <td>{officer.LOCATION_CODE}</td>
              <td>{officer.OFFICER_NAME}</td>
              <td>{officer.MAIL_ID}</td>
              <td>{officer.MOBILE_NO}</td>
              <td>{officer.ROLE || "USER"}</td>
              <td style={{ textAlign: "center" }}>
                <span
                  title={
                    isSuperAdmin
                      ? "Delete officer"
                      : "Only a super admin can delete officers"
                  }
                >
                  <Button
                    color="error"
                    variant="outlined"
                    startIcon={<Delete />}
                    onClick={() => handleDeleteOfficer(officer.ID)}
                    disabled={saveLoader || !isSuperAdmin}
                  >
                    Delete
                  </Button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
