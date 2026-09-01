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
import { Visibility, Download } from "@mui/icons-material";
import {
  SetContractorMasterList,
  NavBarComponent,
  SetSelectedApplication,
} from "../action/userSlice";

export default function LabourMasterData() {
  const dispatch = useDispatch();
  const { contractorList, navBarComponent, userType } = useSelector(
    (state) => state.myApp,
  );
  const [saveLoader, setSaveLoader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [file, setFile] = useState(null);
  const [locationCode, setLocationCode] = useState("");
  const [contractor, setContractor] = useState("");
  const [labourName, setLabourName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [address, setAddress] = useState("");

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
      const response = await fetch(apiUrl("/api/upload-labour-excel"), {
        method: "POST",
        body: formData,
      });
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

    if (!contractor) {
      alert("Please enter/select Contractor.");
      return;
    }

    if (!labourName) {
      alert("Please enter Labour Name.");
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
      alert("Please enter Aadhaar No or ID Proof No.");
      return;
    }

    if (!address) {
      alert("Please enter Address");
      return;
    }

    setSaveLoader(true);
    setSubmitting(true);

    try {
      const payload = {
        locationCode,
        contractor,
        labourName,
        mobileNo,
        aadhaarNo,
        address,
      };
      // Submit to server
      const response = await fetch(apiUrl("/api/upload-labour-single"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // <-- ADD THIS CRITICAL LINE
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Record submitted successfully!");
        // Reset form
        setLocationCode("");
        setContractor("");
        setLabourName("");
        setMobileNo("");
        setAadhaarNo("");
        setAddress("");
      } else {
        const error = await response.text();
        console.error("Error submitting form:", error);
        // alert("Error submitting form: " + error);
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
      const response = await fetch(apiUrl("/api/contractor-master-data"));
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];

      setSaveLoader(false);
      dispatch(SetContractorMasterList(zlist));
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
        className="d-flex flex-column flex-xxl-row justify-content-center align-items-center"
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
            href="/template_labour.xlsx" // Points directly to the file in your public folder
            download="Labour_Master_Template.xlsx" // Forces the browser to download it instead of opening it
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

      <Button
        variant="outlined"
        color="secondary"
        sx={{ m: 2 }}
        style={{ width: 250, backgroundColor: "white" }}
        disabled={syncing}
        onClick={(e) => {
          handleSync(e);
        }}
      >
        {syncing ? "Syncing Master..." : "SYNC CONTRACTOR LIST"}
      </Button>

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
              value={locationCode}
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
            <Typography>Contractor Name</Typography>
            <Autocomplete
              name="contractor"
              className="w-100"
              value={contractor !== "" ? contractor : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setContractor(newValue.toLocaleUpperCase())
                  : setContractor("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setContractor(newValue) : setContractor("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              options={
                contractorList.length > 0
                  ? [
                      ...new Set(
                        contractorList
                          .filter((ele) => ele.LOCATION_CODE == locationCode)
                          .map((item) => item["CONTRACTOR"]),
                      ),
                    ]
                  : []
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
                  placeholder={
                    locationCode == ""
                      ? "Select Location Code First or Type For New..."
                      : "Select From Dropdown or Type For New..."
                  }
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      backgroundColor: "white",
                      textTransform: "uppercase",
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
            <Typography>Labour Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={labourName}
              style={{ backgroundColor: "white" }}
              onChange={(e) =>
                setLabourName(e.target.value?.toUpperCase() || "")
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
              value={mobileNo}
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
            <Typography>Aadhaar No / ID Proof No</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={aadhaarNo}
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
            <Typography>Address</Typography>
            <TextField
              fullWidth
              multiline
              variant="outlined"
              value={address}
              style={{ backgroundColor: "white" }}
              onChange={(e) => setAddress(e.target.value?.toUpperCase() || "")}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
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
