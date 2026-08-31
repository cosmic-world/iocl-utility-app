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
import { NavBarComponent, SetSelectedApplication } from "../action/userSlice";

export default function MasterData() {
  const dispatch = useDispatch();
  const { navBarComponent, userType } = useSelector((state) => state.myApp);
  const [saveLoader, setSaveLoader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [locationCode, setLocationCode] = useState("");
  const [crewType, setCrewType] = useState("");
  const [vendor, setVendor] = useState("");
  const [crewName, setCrewName] = useState("");

  const crewTypeList = useState(["DRIVER", "HELPER"]);

  const [ttNo, setTTNo] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [drivingLicence, setDrivingLicence] = useState("");

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
        "http://localhost:5000/api/upload-ttcrew-excel",
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

    if (!crewType) {
      alert("Please select Crew Type.");
      return;
    }

    if (!vendor) {
      alert("Please enter Vendor.");
      return;
    }

    if (!crewName) {
      alert("Please enter Crew Name.");
      return;
    }

    if (!ttNo) {
      alert("Please enter TT No.");
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

    if (!aadhaarNo) {
      alert("Please enter ID Proof No.");
      return;
    }

    if (crewType === "DRIVER" && !drivingLicence) {
      alert("Driving Licence No is required for Driver.");
      return;
    }

    setSaveLoader(true);
    setSubmitting(true);

    try {
      const payload = {
        location_code: locationCode,
        vendor: vendor,
        crew_type: crewType,
        crew_name: crewName,
        tt_no: ttNo,
        mobile_no: mobileNo,
        govt_id: aadhaarNo,
        driving_licence_no: drivingLicence,
      };
      // Submit to server
      const response = await fetch("http://localhost:5000/api/upload-master", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // <-- ADD THIS CRITICAL LINE
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        alert("Record submitted successfully!");
        // Reset form
        setLocationCode("");
        setVendor("");
        setCrewType("");
        setCrewName("");
        setTTNo("");
        setMobileNo("");
        setAadhaarNo("");
        setDrivingLicence("");
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
            navBarComponent === "tempPassDashboard" ? "outlined" : "contained"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "tempPassDashboard" ? "white" : "null",
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("TT Crew Temporary Pass Request"));
            dispatch(NavBarComponent("tempPassDashboard"));
          }}
        >
          Temporary Pass Request
        </Button>
        <Button
          variant={
            navBarComponent === "tempPassHistory" ? "outlined" : "contained"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "tempPassHistory" ? "white" : "null",
          }}
          onClick={() => {
            dispatch(
              SetSelectedApplication("TT Crew Temporary Pass Dashboard"),
            );
            dispatch(NavBarComponent("tempPassHistory"));
          }}
        >
          Temporary Pass Dashboard
        </Button>
        <Button
          variant={navBarComponent === "masterData" ? "outlined" : "contained"}
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "masterData" ? "white" : "null",
            "&:disabled": {
              cursor: "not-allowed",
              backgroundColor: "white",
              pointerEvents: "all !important",
            },
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("TT Crew Master Data"));
            dispatch(NavBarComponent("masterData"));
          }}
          disabled={userType !== "admin"}
        >
          TT Crew Master Data (Admin Only)
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

      <Box
        sx={{ p: 3, border: "1px dashed #ccc", mt: 3, mb: 5, borderRadius: 2 }}
      >
        <Typography variant="h6" gutterBottom>
          Bulk Upload via Excel
        </Typography>

        {/* Download Link Block */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Please use our official excel template.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            href="/template.xlsx" // Points directly to the file in your public folder
            download="Temporary_Pass_Template.xlsx" // Forces the browser to download it instead of opening it
          >
            Download Excel Template
          </Button>
        </Box>

        <hr style={{ border: "0.5px solid #eee", margin: "15px 0" }} />

        {/* Form Submission Block */}
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
            <Typography>Crew Type</Typography>
            <Autocomplete
              className="w-100"
              options={["DRIVER", "HELPER"]}
              name="CREW TYPE"
              value={crewType !== "" ? crewType : null}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) =>
                newValue !== null ? setCrewType(newValue) : setCrewType("")
              }
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                },
                "& .MuiOutlinedInput-root": {
                  paddingTop: "2px !important", // Reducer top whitespace
                  paddingBottom: "2px !important", // Keeps it centered vertically
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select Driver or Helper"
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      backgroundColor: "white",
                    },
                    sx: {
                      "& input::placeholder": {
                        fontFamily: "Lucida Sans",
                        fontSize: "0.8rem", // Optional: adjust placeholder size
                        fontStyle: "italic", // Optional: make placeholder italicized
                      },
                    },
                  }}
                />
              )}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Vendor</Typography>
            <TextField
              fullWidth
              variant="outlined"
              style={{ backgroundColor: "white" }}
              onChange={(e) => setVendor(e.target.value?.toUpperCase() || "")}
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
            <Typography>Crew Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              style={{ backgroundColor: "white" }}
              onChange={(e) => setCrewName(e.target.value?.toUpperCase() || "")}
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
            <Typography>TT No</Typography>
            <TextField
              fullWidth
              variant="outlined"
              style={{ backgroundColor: "white" }}
              onChange={(e) => setTTNo(e.target.value?.toUpperCase() || "")}
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
            <Typography>ID Proof No</Typography>
            <TextField
              fullWidth
              variant="outlined"
              style={{ backgroundColor: "white" }}
              onChange={(e) =>
                setAadhaarNo(e.target.value?.toUpperCase() || "")
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
            <Typography>Driving Licence No</Typography>
            <TextField
              fullWidth
              variant="outlined"
              style={{ backgroundColor: "white" }}
              onChange={(e) =>
                setDrivingLicence(e.target.value?.toUpperCase() || "")
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
