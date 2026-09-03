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
  IconButton,
  ButtonGroup,
} from "@mui/material";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  Visibility,
  Download,
  UploadFile,
  History,
  PhotoCamera,
} from "@mui/icons-material";
import {
  SetMasterList,
  NavBarComponent,
  SetSelectedApplication,
} from "../action/userSlice";
import CameraModal from "./CameraModal";

export default function tempPassDashboard() {
  const dispatch = useDispatch();
  const { masterList, navBarComponent, userType } = useSelector(
    (state) => state.myApp,
  );

  const [records, setRecords] = useState([]);

  const [saveLoader, setSaveLoader] = useState(false);

  const [locationCode, setLocationCode] = useState("");
  const [crewType, setCrewType] = useState("");
  const [vendor, setVendor] = useState("");
  const [crewName, setCrewName] = useState("");

  const [ttNo, setTTNo] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [drivingLicence, setDrivingLicence] = useState("");
  const [requestStart, setRequestStart] = useState("");
  const [requestEnd, setRequestEnd] = useState("");

  const [searchLocationCode, setSearchLocationCode] = useState("");
  const [searchTT, setSearchTT] = useState("");
  const [searchVendor, setSearchVendor] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [seaching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [documents, setDocuments] = useState(Array(3).fill(null));

  useEffect(() => {
    handleSync();
  }, []);

  const getTodayLabel = () =>
    new Date().toLocaleDateString("en-GB").replace(/\//g, "-");

  const handleSync = async () => {
    setSaveLoader(true);
    setSyncing(true);
    try {
      const response = await fetch(apiUrl("/api/ttcrew-master-data"));
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();

      const zlist = Array.isArray(data) ? data : [];

      setSaveLoader(false);
      dispatch(SetMasterList(zlist));
      zlist.length > 0
        ? null
        : alert("No records found in the database.");
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSyncing(false);
    }
  };

  const fetchRecords = async () => {
    setSaveLoader(true);
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchLocationCode)
        params.append("location_code", searchLocationCode);
      if (searchVendor) params.append("vendor", searchVendor);
      if (searchTT) params.append("tt_no", searchTT);
      params.append(
        "up_to_date",
        getTodayLabel().split("-").reverse().join("-"),
      );

      const url = apiUrl(`/api/temp_pass_records?${params.toString()}`);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      zlist.length > 0 ? (
        setRecords(zlist)
      ) : (
        <>
          {setRecords(zlist)}
          {alert("No records found matching the search criteria.")}
        </>
      );
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
      alert("Please enter/select Vendor.");
      return;
    }

    if (!crewName) {
      alert("Please enter/select Crew Name.");
      return;
    }

    if (!ttNo) {
      alert("Please enter/select TT No.");
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
      alert("Please enter/select ID Proof No.");
      return;
    }

    if (crewType === "DRIVER" && !drivingLicence) {
      alert("Driving Licence No is required for Driver.");
      return;
    }

    if (!requestStart) {
      alert("Please select Request From date.");
      return;
    }

    if (!requestEnd) {
      alert("Please select Request To date.");
      return;
    }

    if (requestStart && requestEnd) {
      const fromDate = new Date(requestStart.split("-").reverse().join("-"));
      const toDate = new Date(requestEnd.split("-").reverse().join("-"));
      if (toDate < fromDate) {
        alert(
          "Request To date must be greater than or equal to Request From date.",
        );
        return;
      }
    }

    if (records.length > 0) {
      if (
        records.filter(
          (ele) =>
            ele["tt_no"] == ttNo &&
            ele["crew_name"] == crewName &&
            ele["crew_type"] == crewType,
        ).length > 0
      ) {
        alert(
          `Pending Temporary Pass request for TT crew: ${crewName} and TT: ${ttNo} is already exist.\nCheck Existing Request Table`,
        );
        return;
      }
    }

    setSaveLoader(true);
    setSubmitting(true);

    try {
      const formData = new FormData();
      // Add form fields
      formData.append("location_code", locationCode);
      formData.append("vendor", vendor);
      formData.append("crew_type", crewType);
      formData.append("crew_name", crewName);
      formData.append("tt_no", ttNo);
      formData.append("mobile_no", mobileNo);
      formData.append("govt_id", aadhaarNo);
      formData.append("driving_licence_no", drivingLicence);
      formData.append(
        "request_from",
        requestStart.split("-").reverse().join("-"),
      );
      formData.append("request_to", requestEnd.split("-").reverse().join("-"));

      // Add files (only if they exist)
      if (documents[0]) formData.append("request_letter", documents[0]);
      if (documents[1]) formData.append("id_proof", documents[1]);
      if (documents[2]) formData.append("driving_licence", documents[2]);

      // Submit to server
      const response = await fetch(apiUrl("/api/upload-temp-pass"), {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
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
        setRequestStart("");
        setRequestEnd("");
        setDocuments(Array(4).fill(null));
      } else {
        const data = await response.json();
        alert("connection error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaveLoader(false);
      setSubmitting(false);
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
      const response = await fetch(apiUrl(`/api/records/${recordId}/approve`), {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update approval history");
      }

      setRecords((prevRecords) =>
        prevRecords.map((item) =>
          (item.Id ?? item.id) === recordId
            ? { ...item, approval_history: data.approval_history }
            : item,
        ),
      );
      alert("Approval recorded for today.");
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

  const existingVendorList = masterList.length > 0
                ? [
                    ...new Set(
                      masterList
                        .filter(
                          (ele) => ele.LOCATION_CODE == searchLocationCode,
                        )
                        .map((item) => item["VENDOR"]),
                    ),
                  ]
                : []
  const newVendorList = records.length > 0? [...new Set(records.map((item) => item["vendor"]))] : []
  const combinedVendorList = [...new Set([...existingVendorList, ...newVendorList])]

  const existingTTList = masterList.length > 0 ? [
                    ...new Set(
                      masterList
                        .filter(
                          (ele) => ele.LOCATION_CODE == searchLocationCode,
                        )
                        .map((item) => item["TT"]),
                    ),
                  ]
                : []
                  const newTTList = records.length > 0? [...new Set(records.map((item) => item["tt_no"]))] : []
  const combinedTTList = [...new Set([...existingTTList, ...newTTList])];

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
        className="d-flex flex-column flex-xxl-row justify-content-center align-items-center"
        style={{
          border: "1px solid black",
          width: "100%",
          borderBottom: "none",
        }}
      >
        <Button
          variant={
            navBarComponent === "tempPassDashboard" ? "contained" : "outlined"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "tempPassDashboard" ? "null" : "white",
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
            navBarComponent === "tempPassHistory" ? "contained" : "outlined"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "tempPassHistory" ? "null" : "white",
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
          variant={navBarComponent === "masterData" ? "contained" : "outlined"}
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "masterData" ? "null" : "white",
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
          disabled={userType == "user"}
        >
          TT Crew Master Data (Admin Only)
        </Button>
      </div>

      <div className="d-flex flex-column justify-content-start align-items-center" style={{ border: "1px solid black", width: "100%", height: 'fit-content' }}>
        <Typography
          variant="h4"
          className="w-75 d-flex justify-content-center align-items-center"
          style={{ borderBottom: "1px dashed black" }}
        >
          New Request
        </Typography>
        <Typography
          variant="h7"
          className="w-75 d-flex justify-content-center align-items-center"
          style={{ borderBottom: "1px dashed black" }}
        >
          If Pass Request for the TT crew is already given for this period,
          please check the Existing Request Table and ask for today's approval
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
                masterList.length > 0
                  ? [
                      ...new Set(
                        masterList.map((item) => item["LOCATION_CODE"]),
                      ),
                    ]
                  : []
              }
              name="Location Code"
              value={locationCode !== "" ? locationCode : null}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) =>
                newValue !== null
                  ? setLocationCode(newValue.trim())
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
            <Autocomplete
              name="Vendor"
              className="w-100"
              value={vendor !== "" ? vendor : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setVendor(newValue.toLocaleUpperCase().trim())
                  : setVendor("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setVendor(newValue.trim()) : setVendor("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              options={
                masterList.length > 0
                  ? [
                      ...new Set(
                        masterList
                          .filter((ele) => ele.LOCATION_CODE == locationCode)
                          .map((item) => item["VENDOR"]),
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
            <Typography>Crew Name</Typography>
            <Autocomplete
              name="CrewName"
              className="w-100"
              value={crewName !== "" ? crewName : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setCrewName(newValue.toLocaleUpperCase().trim())
                  : setCrewName("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setCrewName(newValue.trim()) : setCrewName("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              options={
                masterList.length > 0
                  ? [
                      ...new Set(
                        masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.VENDOR == vendor,
                          )
                          .map((item) => item["CREW_NAME"]),
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
                    vendor == ""
                      ? "Select Vendor First or Type For New..."
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
            <Typography>TT No</Typography>
            <Autocomplete
              name="TTNo"
              className="w-100"
              value={ttNo !== "" ? ttNo : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setTTNo(newValue.toLocaleUpperCase().trim())
                  : setTTNo("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setTTNo(newValue.trim()) : setTTNo("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              options={
                masterList.length > 0
                  ? [
                      ...new Set(
                        masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.VENDOR == vendor,
                          )
                          .map((item) => item["TT_NO"]),
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
                    vendor == ""
                      ? "Select Vendor First or Type For New..."
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
                newValue !== null ? setMobileNo(newValue.trim()) : setMobileNo("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setMobileNo(newValue.trim()) : setMobileNo("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              disabled={crewName == ""}
              options={
                masterList.length > 0
                  ? [
                      ...new Set(
                        masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.CREW_NAME == crewName &&
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
                    crewName == ""
                      ? "Select Crew Name First"
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
            <Typography>ID Proof No</Typography>
            <Autocomplete
              name="Aadhaar No"
              className="w-100"
              value={aadhaarNo !== "" ? aadhaarNo : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setAadhaarNo(newValue.toLocaleUpperCase().trim())
                  : setAadhaarNo("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setAadhaarNo(newValue.trim()) : setAadhaarNo("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              disabled={crewName == ""}
              options={
                masterList.length > 0
                  ? [
                      ...new Set(
                        masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.CREW_NAME == crewName &&
                              ele.GOVT_ID,
                          )
                          .map((item) => item["GOVT_ID"]),
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
                    crewName == ""
                      ? "Select Crew Name First"
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
            <Typography>Driving Licence No</Typography>
            <Autocomplete
              name="Driving Licence"
              className="w-100"
              value={drivingLicence !== "" ? drivingLicence : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setDrivingLicence(newValue.toLocaleUpperCase().trim())
                  : setDrivingLicence("");
              }}
              onChange={(event, newValue) => {
                newValue !== null
                  ? setDrivingLicence(newValue.trim())
                  : setDrivingLicence("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              disabled={crewName == "" || crewType == "HELPER"}
              options={
                masterList.length > 0
                  ? [
                      ...new Set(
                        masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.CREW_NAME == crewName &&
                              ele.DRIVING_LICENCE,
                          )
                          .map((item) => item["DRIVING_LICENCE"]),
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
                    crewType == ""
                      ? "Select Crew Type First"
                      : crewType == "HELPER"
                        ? "Applicable For Driver Only"
                        : crewName == ""
                          ? "Select Crew Name First"
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
            <Typography>Request From</Typography>
            <div style={{ backgroundColor: "white" }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DemoItem>
                  <DatePicker
                    value={
                      requestStart ? dayjs(requestStart, "DD-MM-YYYY") : null
                    }
                    format="DD-MM-YYYY"
                    onChange={(newValue) => {
                      if (newValue) {
                        setRequestStart(newValue.format("DD-MM-YYYY"));
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
            <Typography>Request To</Typography>
            <div style={{ backgroundColor: "white" }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DemoItem>
                  <DatePicker
                    value={requestEnd ? dayjs(requestEnd, "DD-MM-YYYY") : null}
                    format="DD-MM-YYYY"
                    onChange={(newValue) => {
                      if (newValue) {
                        setRequestEnd(newValue.format("DD-MM-YYYY"));
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
        </div>

        <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-2">
          {["Request Letter", "ID Proof", "Driving Licence"].map(
            (field, index) => (
              <div
                key={index}
                style={{ width: "300px" }}
                className="d-flex flex-column align-items-center align-items-sm-start"
              >
                <Typography>{field}</Typography>

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
            ),
          )}
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
              handlePostData(e);
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
        className="w-75 d-flex justify-content-center align-items-start mt-3"
        style={{ borderBottom: "1px dashed black"}}
      >
        Existing Request
      </Typography>

      <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-2">
        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Autocomplete
            className="w-100"
            options={
              masterList.length > 0
                ? [...new Set(masterList.map((item) => item["LOCATION_CODE"]))]
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
            name="Search Vendor"
            className="w-100"
            value={searchVendor !== "" ? searchVendor : null}
            onInputChange={(event, newValue) => {
              newValue !== null
                ? setSearchVendor(newValue)
                : setSearchVendor("");
            }}
            onChange={(event, newValue) => {
              newValue !== null
                ? setSearchVendor(newValue)
                : setSearchVendor("");
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            // disabled={searchLocationCode === ""}
            options={combinedVendorList}
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
                label="Vendor"
                placeholder={
                  searchLocationCode == ""
                    ? "Select Location Code First or Type For New..."
                    : "Select From Vendor Dropdown or Type For New..."
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

        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Autocomplete
            name="SearchTTNo"
            className="w-100"
            value={searchTT !== "" ? searchTT : null}
            onInputChange={(event, newValue) => {
              newValue !== null ? setSearchTT(newValue) : setSearchTT("");
            }}
            onChange={(event, newValue) => {
              newValue !== null ? setSearchTT(newValue) : setSearchTT("");
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            // disabled={searchLocationCode === "" || searchVendor === ""}
            options={combinedTTList}
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
                label="TT"
                placeholder={
                  searchVendor == ""
                    ? "Select Vendor First or Type For New..."
                    : "Select From TT Dropdown or Type For New..."
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
            fetchRecords(e);
          }}
        >
          {seaching ? "Searching..." : "SEARCH RECORDS"}
        </Button>

        <Button
          color="primary"
          variant="outlined"
          style={{ width: 200, backgroundColor: "white" }}
          onClick={(e) => {
            setRecords([]);
            setSearchLocationCode("");
            setSearchTT("");
            setSearchVendor("");
          }}
        >
          CLEAR VIEW
        </Button>
      </div>

      <div className="ttes_table_view">
        <Table bordered hover striped className="ttes_table">
          <thead className="table-head">
            <tr>
              <th>DATE</th>
              <th>LOCATION CODE</th>
              <th>CREW TYPE</th>
              <th>CREW NAME</th>
              <th>VENDOR</th>
              <th>TT NO</th>
              <th>MOBILE NO</th>
              <th>GOVT ID</th>
              <th>DRIVING LICENSE NO</th>
              <th>REQUEST FROM</th>
              <th>REQUEST TO</th>
              <th>PASS REQUESTED (DAYS)</th>
              <th>APPROVAL HISTORY</th>
              <th style={{ width: 100 }}>REQUEST LETTER</th>
              <th style={{ width: 100 }}>ID PROOF</th>
              <th style={{ width: 100 }}>DRIVING LICENCE DOC</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(
              { length: records.length > 0 ? records.length : 100 },
              (_, i) => {
                const record = records[i];
                const getLink = (value) => {
                  if (!value) return "-";
                  const url = value.startsWith("http")
                    ? value
                    : `/uploads/${value}`;
                  return (
                    <a href={url} target="_blank" rel="noreferrer">
                      <Visibility color="secondary" />
                    </a>
                  );
                };
                const getDaysDifference = (fromStr, toStr) => {
                  if (!fromStr || !toStr) return 0;

                  // Split "DD-MM-YYYY" strings
                  const [fromDay, fromMonth, fromYear] = fromStr.split("-");
                  const [toDay, toMonth, toYear] = toStr.split("-");

                  // Create Date objects (Month is 0-indexed, so subtract 1)
                  const dateFrom = new Date(fromYear, fromMonth - 1, fromDay);
                  const dateTo = new Date(toYear, toMonth - 1, toDay);

                  // Calculate difference in milliseconds
                  const diffTime = dateTo - dateFrom;

                  // Convert to total days
                  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                };
                return (
                  <tr key={i}>
                    <td style={{ textAlign: "center" }}>
                      {record
                        ? new Date(record.created_at)
                            .toLocaleDateString("en-GB")
                            .replace(/\//g, "-")
                        : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["location_code"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["crew_type"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["crew_name"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["vendor"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["tt_no"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["mobile_no"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["govt_id"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["driving_licence_no"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record
                        ? new Date(record["request_from"])
                            .toLocaleDateString("en-GB")
                            .replace(/\//g, "-")
                        : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record
                        ? new Date(record["request_to"])
                            .toLocaleDateString("en-GB")
                            .replace(/\//g, "-")
                        : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record
                        ? getDaysDifference(
                            new Date(record["request_from"])
                              .toLocaleDateString("en-GB")
                              .replace(/\//g, "-"),
                            new Date(record["request_to"])
                              .toLocaleDateString("en-GB")
                              .replace(/\//g, "-"),
                          )
                        : ""}
                    </td>
                    <td style={{ textAlign: "center", minWidth: 180 }}>
                      {record ? (
                        <div className="d-flex justify-content-center align-items-center gap-2 text-nowrap">
                          <Button
                            size="small"
                            variant={
                              parseApprovalHistory(
                                record.approval_history,
                              ).includes(getTodayLabel())
                                ? "outlined"
                                : "contained"
                            }
                            color="success"
                            disabled={userType == "user" ||
                              approvingId === record.Id ||
                              parseApprovalHistory(
                                record.approval_history,
                              ).includes(getTodayLabel())
                            }
                            onClick={() => handleApproveToday(record.Id)}
                          >
                            {approvingId === record.Id
                              ? "..."
                              : parseApprovalHistory(
                                    record.approval_history,
                                  ).includes(getTodayLabel())
                                ? "Approved"
                                : "Approve Today"}
                          </Button>
                          <label>{`${parseApprovalHistory(record.approval_history).length}-Days`}</label>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              const historyDates = parseApprovalHistory(
                                record.approval_history,
                              );
                              const message =
                                historyDates.length > 0
                                  ? `${record["crew_name"]}\n${record["vendor"]}\n${record["tt_no"]}\n${record["crew_type"]}\nPrevious approvals:\n${historyDates.join("\n")}`
                                  : "No previous approvals yet.";
                              alert(message);
                            }}
                          >
                            <History fontSize="small" />
                          </IconButton>
                        </div>
                      ) : (
                        ""
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? getLink(record.request_letter_path) : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? getLink(record.id_proof_path) : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? getLink(record.driving_licence_path) : ""}
                    </td>
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
