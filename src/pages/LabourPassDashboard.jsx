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
  IconButton,
  ButtonGroup,
  Checkbox,
} from "@mui/material";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";

import {
  Visibility,
  Download,
  UploadFile,
  History,
  PhotoCamera,
} from "@mui/icons-material";
import {
  SetLabourMasterList,
  SetOfficerMasterList,
  NavBarComponent,
  SetSelectedApplication,
} from "../action/userSlice";
import CameraModal from "./CameraModal";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";

function normalizeLabourNames(labourData) {
  // Check if it's an array (multiple names)
  if (Array.isArray(labourData)) {
    return labourData
      .map((name, index) => `${index + 1}: '${name}'`)
      .join(", ");
  }

  // If it's a single string (or fallback), return as-is
  return labourData;
}

export default function tempPassDashboard() {
  const dispatch = useDispatch();
  const { labour_masterList, officerList, navBarComponent, userType } =
    useSelector((state) => state.myApp);

  const [records, setRecords] = useState([]);
  const [startIndex, setstartIndex] = useState(0);

  const [saveLoader, setSaveLoader] = useState(false);

  const [locationCode, setLocationCode] = useState("");
  const [contractor, setContractor] = useState("");
  const [labourName, setLabourName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [address, setAddress] = useState("");
  const [approvingOfficer, setApprovingOfficer] = useState("");
  const [purpose, setPurpose] = useState("");
  const [gatePassNo, setGatePassNo] = useState("");
  const [timeIn, setTimeIn] = useState("");
  const [passType, setPassType] = useState("");

  const [searchLocationCode, setSearchLocationCode] = useState("");
  const [searchContractor, setSearchContractor] = useState("");
  const [approvingOfficer_1, setApprovingOfficer_1] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [seaching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitting_1, setSubmitting_1] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [documents, setDocuments] = useState(Array(3).fill(null));

  useEffect(() => {
    handleSync();
    handleSyncOfficerList();
  }, []);

  const checkIfOfficerListHasDuplicates =
    officerList.length !=
    [...new Set(officerList.map((item) => item["OFFICER_NAME"]))].length;

  const FinalOfficerList = checkIfOfficerListHasDuplicates
    ? [
        ...new Set(
          officerList.map(
            (item) => `${item["OFFICER_NAME"]} - ${item["MAIL_ID"]}`,
          ),
        ),
      ]
    : [...new Set(officerList.map((item) => item["OFFICER_NAME"]))];

  const getTodayLabel = () =>
    new Date().toLocaleDateString("en-GB").replace(/\//g, "-");

  const 
  handleSyncOfficerList = async () => {
    setSaveLoader(true);
    setSyncing(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/officer-master-data",
      );
      if (!response.ok) {
        throw new Error("Failed to sync officer master records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];

      setSaveLoader(false);
      dispatch(SetOfficerMasterList(zlist));
      // zlist.length > 0
      //   ? alert("Syncing completed successfully.")
      //   : alert("No records found in the database.");
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    setSaveLoader(true);
    setSyncing(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/labour-master-data",
      );
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];

      setSaveLoader(false);
      dispatch(SetLabourMasterList(zlist));
      // zlist.length > 0
      //   ? alert("Syncing completed successfully.")
      //   : alert("No records found in the database.");
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSyncing(false);
    }
  };
  const officerName =
    approvingOfficer !== ""
      ? checkIfOfficerListHasDuplicates
        ? approvingOfficer.split("-")[0].trim()
        : approvingOfficer
      : "";
  const mailID =
    approvingOfficer !== ""
      ? checkIfOfficerListHasDuplicates
        ? approvingOfficer.split("-")[1].trim()
        : officerList.find((item) => item.OFFICER_NAME === approvingOfficer)
            ?.MAIL_ID || ""
      : "";

  const fetchRecords = async () => {
    setSaveLoader(true);
    setSearching(true);
    try {
      const params = new URLSearchParams();

      if (searchContractor) params.append("contractor", searchContractor);

      const url = `http://localhost:5000/api/labour-master-data?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      setRecords(zlist);
      zlist.length == 0
        ? alert("No records found matching the search criteria.")
        : null;
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSearching(false);
    }
  };

  const handleFileChange = (index, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF and image files (PNG, JPEG, JPG, WEBP) are allowed");
      return;
    }

    // Validate file size (max 30MB)
    if (file.size > 30 * 1024 * 1024) {
      alert("File size must be less than 30MB");
      return;
    }

    // Update documents array
    const newDocuments = [...documents];
    newDocuments[index] = file;
    setDocuments(newDocuments);
  };

  const handlePostData = async (e, officerName, type) => {
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
      alert("Please enter/select Labour Name.");
      return;
    }

    if (!mobileNo) {
      alert("Please enter/select Mobile No.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobileNo)) {
      alert("Mobile No should be exactly 10 digits.");
      return;
    }

    if (!aadhaarNo) {
      alert("Please enter/select Aadhaar No or ID Proof No.");
      return;
    }

    if (!address) {
      alert("Please enter/select Address");
      return;
    }

    if (!purpose) {
      alert("Please enter Purpose of request");
      return;
    }

    if (!timeIn) {
      alert("Please enter Time In");
      return;
    }

    setSaveLoader(true);
    type == "single" ? setSubmitting(true) : setSubmitting_1(true);

    try {
      const formData = new FormData();
      // Add form fields
      formData.append("location_code", locationCode);
      formData.append("contractor", contractor);
      formData.append("labourName", normalizeLabourNames(labourName));
      formData.append("mobile_no", mobileNo);
      formData.append("aadhaarNo", aadhaarNo);
      formData.append("address", address);
      formData.append("gatePassNo", gatePassNo);
      formData.append("purpose", purpose);
      formData.append("timeIn", timeIn);
      formData.append("approvingOfficer", officerName);
      formData.append("mailID", mailID); // Add mailID to the form data

      // Add files (only if they exist)
      if (documents[0]) formData.append("document1", documents[0]);
      if (documents[1]) formData.append("document2", documents[1]);
      if (documents[2]) formData.append("document3", documents[2]);

      // Submit to server
      const response = await fetch(
        "http://localhost:5000/api/upload-labour-pass",
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.ok) {
        alert("Record submitted successfully!");
        // Reset form
        // setLocationCode("");
        // setApprovingOfficer("");
        // setContractor("");
        // setLabourName("");
        // setMobileNo("");
        // setAadhaarNo("");
        // setAddress("");
        // setGatePassNo("");
        // setPurpose("");
        // setTimeIn("");
        // setApprovingOfficer("");
        // setDocuments(Array(4).fill(null));
      } else {
        const data = await response.json();
        alert("connection error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaveLoader(false);
      setSubmitting(false);
      setSubmitting_1(false);
    }
  };

  const parseApprovalHistory = (value) => {
    if (!value) return [];
    const trimmed = String(value).trim();
    if (!trimmed) return [];
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const handleApproveToday = async (recordId) => {
    setSaveLoader(true);
    setApprovingId(recordId);
    try {
      const response = await fetch(
        `http://localhost:5000/api/records/${recordId}/approve`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update approval history");
      }

      setRecords((prevRecords) =>
        prevRecords.map((item) =>
          item.id === recordId
            ? { ...item, approval_history: data.approval_history }
            : item,
        ),
      );
      fetchRecords();
      alert("Approval given successfully for the request");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaveLoader(false);
      setApprovingId(null);
    }
  };

  const fileInputRefs = useRef([]);
  const cameraInputRefs = useRef([]);
  const [activeCamIndex, setActiveCamIndex] = useState(null); // Tracks which row is actively using the camera

  const handleCameraClick = async (index) => {
    try {
      // Check if mediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        alert("Your browser does not support camera features.");
        return;
      }

      // List all media devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoDevice = devices.some(
        (device) => device.kind === "videoinput",
      );

      if (!hasVideoDevice) {
        alert("No camera is available to open on this device.");
      } else {
        // Camera exists! Open the modal for this specific document index
        setActiveCamIndex(index);
      }
    } catch (error) {
      alert("Error checking for camera availability.");
      console.error(error);
    }
  };

  const handleCameraCapture = (index, file) => {
    // Mock event object to seamlessly feed your existing handleFileChange function
    const mockEvent = {
      target: {
        files: [file],
      },
    };
    handleFileChange(index, mockEvent);
  };

  return (
    <div
      className={
        "d-flex flex-column justify-content-start align-items-center w-100 h-100 p-2"
      }
      style={{
        overflow: "auto",
      }}
    >
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          border: "1px solid black",
          width: "100%",
          borderBottom: "none",
        }}
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

      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ border: "1px solid black", width: "100%" }}
      >
        <Typography
          variant="h4"
          className="w-75 d-flex justify-content-center align-items-center"
          style={{ borderBottom: "1px dashed black" }}
        >
          Single Labour Pass Request
        </Typography>
        <Typography
          variant="h7"
          className="w-75 d-flex justify-content-center align-items-center"
          style={{ borderBottom: "1px dashed black" }}
        >
          If the Labour is new and expected to come regularly, please add in the
          Contractor Master Data for ease of apply.
        </Typography>
        <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-2">
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
          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Location Code</Typography>
            <Autocomplete
              className="w-100"
              options={
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList.map((item) => item["LOCATION_CODE"]),
                      ),
                    ]
                  : []
              }
              name="Location Code"
              value={locationCode !== "" ? locationCode : null}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) =>
                newValue !== null
                  ? setLocationCode(newValue)
                  : setLocationCode("")
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
                  placeholder="Select Location Code"
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
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList
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
            <Autocomplete
              name="labourName"
              className="w-100"
              value={labourName !== "" ? labourName : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setLabourName(newValue.toLocaleUpperCase())
                  : setLabourName("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setLabourName(newValue) : setLabourName("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              options={
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.CONTRACTOR == contractor,
                          )
                          .map((item) => item["LABOUR_NAME"]),
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
                    contractor == ""
                      ? "Select Contractor First or Type For New..."
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
            <Typography>Mobile No</Typography>
            <Autocomplete
              name="Mobile No"
              className="w-100"
              value={mobileNo !== "" ? mobileNo : null}
              onInputChange={(event, newValue) => {
                newValue !== null ? setMobileNo(newValue) : setMobileNo("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setMobileNo(newValue) : setMobileNo("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              disabled={labourName == ""}
              options={
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.LABOUR_NAME == labourName &&
                              ele.MOBILE_NO,
                          )
                          .map((item) => item["MOBILE_NO"]),
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
                  type="number"
                  placeholder={
                    labourName == ""
                      ? "Select Labour Name First"
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
            <Typography>Aadhaar No / ID Proof No</Typography>
            <Autocomplete
              name="Aadhaar No"
              className="w-100"
              value={aadhaarNo !== "" ? aadhaarNo : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setAadhaarNo(newValue.toLocaleUpperCase())
                  : setAadhaarNo("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setAadhaarNo(newValue) : setAadhaarNo("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              disabled={labourName == ""}
              options={
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.LABOUR_NAME == labourName &&
                              ele.AADHAAR_NO,
                          )
                          .map((item) => item["AADHAAR_NO"]),
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
                    labourName == ""
                      ? "Select Labour Name First"
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
            <Typography>Address</Typography>
            <Autocomplete
              name="address"
              className="w-100"
              value={address !== "" ? address : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setAddress(newValue.toLocaleUpperCase())
                  : setAddress("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setAddress(newValue) : setAddress("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              disabled={labourName == ""}
              options={
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.LABOUR_NAME == labourName &&
                              ele.ADDRESS,
                          )
                          .map((item) => item["ADDRESS"]),
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
                  multiline
                  placeholder={
                    labourName == ""
                      ? "Select Labour Name First"
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
                      "& .MuiInputBase-input::placeholder": {
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
            <Typography>Purpose</Typography>
            <TextField
              fullWidth
              variant="outlined"
              multiline
              value={purpose}
              style={{ backgroundColor: "white" }}
              placeholder={"Type Purpose..."}
              onChange={(e) => setPurpose(e.target.value?.toUpperCase() || "")}
              sx={{
                "& .MuiOutlinedInput-root": {
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                },
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  backgroundColor: "white",
                  textTransform: "uppercase",
                },
                "& .MuiInputBase-input::placeholder": {
                  fontFamily: "Lucida Sans",
                  fontSize: "0.8rem", // Optional: adjust placeholder size
                  fontStyle: "italic", // Optional: make placeholder italicized
                  textTransform: "none",
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Gate Pass No</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={gatePassNo}
              style={{ backgroundColor: "white" }}
              onChange={(e) =>
                setGatePassNo(e.target.value?.toUpperCase() || "")
              }
              placeholder={"Type Gate Pass No..."}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                  textTransform: "uppercase",
                },
                "& .MuiInputBase-input::placeholder": {
                  fontFamily: "Lucida Sans",
                  fontSize: "0.8rem", // Optional: adjust placeholder size
                  fontStyle: "italic", // Optional: make placeholder italicized
                  textTransform: "none",
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Time In</Typography>
            <div style={{ backgroundColor: "white" }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DemoItem>
                  <TimePicker
                    value={timeIn ? dayjs(timeIn, "HH:mm:ss") : null}
                    format="HH:mm:ss"
                    onChange={(newValue) => {
                      if (newValue) {
                        setTimeIn(newValue.format("HH:mm:ss"));
                      } else {
                        setTimeIn("");
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          "& .MuiInputBase-input": {
                            fontSize: "1rem",
                            paddingTop: "10px !important", // Reduces extra top whitespace
                            paddingBottom: "10px !important", // Keeps it centered vertically
                            fontFamily: "Lucida Sans",
                            color: "black",
                          },
                          "& input::placeholder": {
                            fontFamily: "Lucida Sans",
                            fontSize: "0.8rem", // Optional: adjust placeholder size
                            fontStyle: "italic", // Optional: make placeholder italicized
                          },
                        },
                      },
                    }}
                  />
                </DemoItem>
              </LocalizationProvider>
            </div>
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Approving Officer</Typography>
            <Autocomplete
              className="w-100"
              options={FinalOfficerList}
              name="Location Code"
              value={approvingOfficer !== "" ? approvingOfficer : null}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) =>
                newValue !== null
                  ? setApprovingOfficer(newValue)
                  : setApprovingOfficer("")
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
                  placeholder="Select Location Code"
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
        </div>

        <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-2">
          {["Document-1", "Document-2", "Document-3"].map((field, index) => (
            <div
              key={index}
              style={{ width: "300px" }}
              className="d-flex flex-column align-items-center align-items-sm-start"
            >
              <Typography>{`${field} (Optional)`}</Typography>

              <ButtonGroup variant="contained">
                <Button
                  startIcon={<UploadFile />}
                  style={{
                    fontFamily: "Lucida Sans",
                    textTransform: "none",
                    width: "200px",
                  }}
                  onClick={() => fileInputRefs.current[index]?.click()}
                >
                  Choose File
                </Button>
                <Button
                  // color="secondary"
                  variant="outlined"
                  style={{ backgroundColor: "white" }}
                  onClick={() => handleCameraClick(index)}
                  // onClick={() => cameraInputRefs.current[index]?.click()}
                >
                  <PhotoCamera />
                </Button>
              </ButtonGroup>

              <Typography
                variant="body2"
                style={{ fontFamily: "Lucida Sans", color: "#555" }}
              >
                {documents[index]
                  ? `Selected: ${documents[index].name.slice(0, 20)}`
                  : "No file chosen"}
              </Typography>

              <input
                type="file"
                ref={(el) => (fileInputRefs.current[index] = el)}
                accept=".pdf,image/*"
                onChange={(e) => handleFileChange(index, e)}
                style={{ display: "none" }}
              />

              <input
                type="file"
                ref={(el) => (cameraInputRefs.current[index] = el)}
                accept="image/*"
                capture="environment" // Focuses on the rear camera (use "user" for front/selfie camera)
                onChange={(e) => handleFileChange(index, e)}
                style={{ display: "none" }}
              />
            </div>
          ))}
          <CameraModal
            open={activeCamIndex !== null}
            onClose={() => setActiveCamIndex(null)}
            onCapture={(file) => handleCameraCapture(activeCamIndex, file)}
          />
        </div>
        <div
          className="d-flex flex-sm-row justify-content-center align-items-center position-relative pt-0"
          style={{ borderTop: "1px dashed", width: "90%" }}
        >
          <Button
            color="primary"
            variant="contained"
            sx={{ m: 2 }}
            style={{ width: 200 }}
            disabled={submitting}
            onClick={(e) => {
              handlePostData(e, approvingOfficer, "single");
            }}
          >
            {submitting ? "Submitting..." : "SUBMIT"}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            sx={{ m: 2 }}
            style={{ width: 200, backgroundColor: "white" }}
            disabled={syncing}
            onClick={(e) => {
              handleSync(e);
            }}
          >
            {syncing ? "Syncing Master..." : "SYNC MASTER"}
          </Button>
        </div>
      </div>

      <Typography
        variant="h4"
        className="w-75 d-flex justify-content-center align-items-center mt-3"
        style={{ borderBottom: "1px dashed black" }}
      >
        Multiple Labour Pass Request
      </Typography>

      <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-0">
        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Autocomplete
            className="w-100"
            options={
              labour_masterList.length > 0
                ? [
                    ...new Set(
                      labour_masterList.map((item) => item["LOCATION_CODE"]),
                    ),
                  ]
                : []
            }
            name="Search Location Code"
            value={searchLocationCode !== "" ? searchLocationCode : null}
            isOptionEqualToValue={(option, value) => option === value}
            onChange={(e, newValue) =>
              newValue !== null
                ? setSearchLocationCode(newValue)
                : setSearchLocationCode("")
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
                label="Location Code"
                placeholder="Select Location Code or Type For New..."
                InputLabelProps={{
                  ...params.InputLabelProps,
                  shrink: true,
                }}
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
          <Autocomplete
            name="Search Contractor"
            className="w-100"
            value={searchContractor !== "" ? searchContractor : null}
            onInputChange={(event, newValue) => {
              newValue !== null
                ? setSearchContractor(newValue)
                : setSearchContractor("");
            }}
            onChange={(event, newValue) => {
              newValue !== null
                ? setSearchContractor(newValue)
                : setSearchContractor("");
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            disabled={searchLocationCode === ""}
            options={
              labour_masterList.length > 0
                ? [
                    ...new Set(
                      labour_masterList
                        .filter(
                          (ele) => ele.LOCATION_CODE == searchLocationCode,
                        )
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
                label="Contractor"
                placeholder={
                  searchLocationCode == ""
                    ? "Select Location Code First or Type For New..."
                    : "Select From CONTRACTOR Dropdown or Type For New..."
                }
                InputLabelProps={{
                  ...params.InputLabelProps,
                  shrink: true,
                }}
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

        <Button
          color="primary"
          variant="contained"
          sx={{ m: 2 }}
          style={{ width: 200 }}
          disabled={seaching}
          onClick={(e) => {
            searchContractor != ""
              ? fetchRecords(e)
              : alert("No contractor is selected!");
          }}
        >
          {seaching ? "Searching..." : "SEARCH RECORDS"}
        </Button>

        <Button
          color="primary"
          variant="outlined"
          sx={{ m: 2 }}
          style={{ width: 200, backgroundColor: "white" }}
          onClick={(e) => {
            setRecords([]);
            setSearchLocationCode("");
            setSearchTT("");
            setSearchContractor("");
          }}
        >
          CLEAR VIEW
        </Button>
      </div>

      <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-0">
        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Autocomplete
            className="w-100"
            options={FinalOfficerList}
            name="Select Approving Name"
            value={approvingOfficer_1 !== "" ? approvingOfficer_1 : null}
            isOptionEqualToValue={(option, value) => option === value}
            onChange={(e, newValue) =>
              newValue !== null
                ? setApprovingOfficer_1(newValue)
                : setApprovingOfficer_1("")
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
                label="Select Approving Officer"
                placeholder="Select Location Code"
                InputLabelProps={{
                  ...params.InputLabelProps,
                  shrink: true,
                }}
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

        <Button
          color="success"
          variant="contained"
          sx={{ m: 2 }}
          style={{ width: 200 }}
          disabled={submitting_1}
          onClick={(e) => {
            handlePostData(e, approvingOfficer_1, "bulk");
          }}
        >
          {submitting_1 ? "Submitting..." : "SUBMIT"}
        </Button>
      </div>

      <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-0">
        <Button
          color="error"
          variant="contained"
          style={{ width: 200 }}
          // onClick={(e) => {
          //   setRecords([]);
          //   setSearchLocationCode("");
          //   setSearchTT("");
          //   setSearchContractor("");
          // }}
        >
          APPROVE TODAY
        </Button>
      </div>

      <div className="ttes_table_view">
        <Table bordered hover striped className="ttes_table">
          <thead className="table-head">
            <tr>
              <th style={{ width: 80 }}>SELECT</th>
              <th>LABOUR NAME</th>
              <th>MOBILE NO</th>
              <th>AADHAAR</th>
              <th style={{ flex: 1 }}>ADDRESS</th>
              {/* <th style={{ width: 300}}>GATE PASS NO</th> */}
            </tr>
          </thead>
          <tbody
            style={{
              overflow: "hidden",
            }}
          >
            {Array.from(
              { length: records.length > 0 ? records.length : 100 },
              (_, i) => {
                const record = records[i];
                return (
                  <tr key={i}>
                    <td style={{ textAlign: "center" }}>
                      {<Checkbox />}
                      {i + 1}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["LABOUR_NAME"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["MOBILE_NO"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["AADHAAR_NO"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["ADDRESS"] : ""}
                    </td>
                    {/* <td style={{ textAlign: "center", display: "flex", alignItems: "center", border: '1px solid red' }}>
                      <DropdownButton id="dropdown-basic-button" title={passType==""?"Select Pass Type":passType}>
                        <Dropdown.Item onClick={()=>setPassType('Red')}>Red</Dropdown.Item>
                        <Dropdown.Item onClick={()=>setPassType('Yellow')}>Yellow</Dropdown.Item>
                        <Dropdown.Item onClick={()=>setPassType('Green')}>Green</Dropdown.Item>
                      </DropdownButton>
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={gatePassNo}
                        style={{ backgroundColor: "white" }}
                        onChange={(e) =>
                          setGatePassNo(e.target.value?.toUpperCase() || "")
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
                    </td> */}
                  </tr>
                );
              },
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
