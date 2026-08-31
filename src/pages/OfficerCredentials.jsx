import React, { useState, useEffect, useRef } from "react";
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
import { Visibility, Download } from "@mui/icons-material";
import {
  SetOfficerMasterList,
  NavBarComponent,
  SetSelectedApplication,
} from "../action/userSlice";

export default function MasterData() {
  const dispatch = useDispatch();
  const { officerList, navBarComponent, userType } = useSelector(
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
        "http://localhost:5000/api/upload-officer-excel",
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();

      if (data.success) {
        alert(data.message);
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
      const payload = { locationCode, officerName, mailID, mobileNo };
      // Submit to server
      const response = await fetch(
        "http://localhost:5000/api/upload-officer-single",
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
        // Reset form
        setLocationCode("");
        setMailID("");
        setOfficerName("");
        setMobileNo("");
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

  const handleSync = async () => {
    setSaveLoader(true);
    setSyncing(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/officer-master-data",
      );
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];

      setSaveLoader(false);
      dispatch(SetOfficerMasterList(zlist));
      zlist.length > 0
        ? alert("Syncing completed successfully.")
        : alert("No records found in the database.");
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSyncing(false);
    }
  };

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
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ border: "1px solid black", width: "100%" }}
      >
        <Button
          variant={
            navBarComponent === "labourPassDashboard" ? "outlined" : "contained"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "labourPassDashboard" ? "white" : "null",
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("Labour Pass Dashboard"));
            dispatch(NavBarComponent("labourPassDashboard"));
          }}
        >
          Labour Pass Dashboard
        </Button>
        <Button
          variant={
            navBarComponent === "contractor_masterData"
              ? "outlined"
              : "contained"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "contractor_masterData" ? "white" : "null",
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("Labour Master Data"));
            dispatch(NavBarComponent("contractor_masterData"));
          }}
        >
          Labour Master Data
        </Button>
        <Button
          variant={
            navBarComponent === "contractor_cred" ? "outlined" : "contained"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "contractor_cred" ? "white" : "null",
            "&:disabled": {
              cursor: "not-allowed",
              backgroundColor: "white",
              pointerEvents: "all !important",
            },
          }}
          disabled={userType !== "admin"}
          onClick={() => {
            dispatch(SetSelectedApplication("Contractor Master Data"));
            dispatch(NavBarComponent("contractor_cred"));
          }}
        >
          Contractor Master Data (Admin Only)
        </Button>
        <Button
          variant={
            navBarComponent === "officer_cred" ? "outlined" : "contained"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "officer_cred" ? "white" : "null",
            "&:disabled": {
              cursor: "not-allowed",
              backgroundColor: "white",
              pointerEvents: "all !important",
            },
          }}
          disabled={userType !== "admin"}
          onClick={() => {
            dispatch(SetSelectedApplication("Officer Master Data"));
            dispatch(NavBarComponent("officer_cred"));
          }}
        >
          Officer Master Data (Admin Only)
        </Button>
      </div>

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
            Please use our official excel template.
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
    </div>
  );
}
