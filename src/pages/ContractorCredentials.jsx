import React, { useState, useRef, useEffect } from "react";
import { apiUrl } from "../api";
import { useDispatch, useSelector } from "react-redux";
import Table from "react-bootstrap/Table";
import "../css/page_layout.css";
import {
  Button,
  TextField,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";
import { Download, Edit, Save, Cancel, Delete } from "@mui/icons-material";
import {
  NavBarComponent,
  SetSelectedApplication,
  SetContractorMasterList,
} from "../action/userSlice";
import { useOtpCooldown } from "../otpCooldown";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value) =>
  EMAIL_REGEX.test(
    String(value || "")
      .trim()
      .toLowerCase(),
  );

export default function ContractorCredentials({ handleSyncContractor }) {
  const dispatch = useDispatch();
  const {
    navBarComponent,
    locationCode,
    selectedTerminal,
    contractorList,
    userType,
  } = useSelector((state) => state.myApp);
  const [saveLoader, setSaveLoader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [mailID, setMailID] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [editingContractorId, setEditingContractorId] = useState(null);
  const [editingContractor, setEditingContractor] = useState(null);
  const [editOtp, setEditOtp] = useState("");
  const [editOtpSent, setEditOtpSent] = useState(false);
  const [editOtpVerified, setEditOtpVerified] = useState(false);
  const [editOtpLoading, setEditOtpLoading] = useState(false);
  const otpCooldown = useOtpCooldown();
  const editOtpCooldown = useOtpCooldown();
  const locationName = selectedTerminal[selectedTerminal.length - 1];
  const fileInputRef = useRef(null);
  const isSuperUser = userType === "SUPER_ADMIN";
  const contractorsForLocation = contractorList;

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
      const response = await fetch(apiUrl("/api/upload-contractor-excel"), {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        handleSyncContractor();
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
        fileInputRef.current.value = ""; // Reset the file input
      }
    }
  };

  const handleSendOtp = async () => {
    const email = mailID.trim().toLowerCase();
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch(apiUrl("/api/credentials/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, credentialType: "contractor" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Unable to send OTP.");
      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");
      otpCooldown.startCooldown();
      alert("OTP sent to the email address.");
    } catch (error) {
      alert(error.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const email = mailID.trim().toLowerCase();
    if (!otpSent || !/^\d{6}$/.test(otp.trim())) {
      alert("Please enter the six-digit OTP sent to the email address.");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch(apiUrl("/api/credentials/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: otp.trim(),
          credentialType: "contractor",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Unable to verify OTP.");
      setOtpVerified(true);
      alert("Email verified successfully.");
    } catch (error) {
      setOtpVerified(false);
      alert(error.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePostData = async (e) => {
    e.preventDefault();

    if (!contractorName) {
      alert("Please enter Contractor Name.");
      return;
    }

    if (!mailID) {
      alert("Please enter Mail ID.");
      return;
    }

    if (!isValidEmail(mailID)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!otpVerified) {
      alert("Please verify the email address with OTP before submitting.");
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
      const payload = {
        locationCode: String(locationCode),
        contractorName,
        mailID: mailID.trim().toLowerCase(),
        mobileNo,
      };
      // Submit to server
      const response = await fetch(apiUrl("/api/upload-contractor-single"), {
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
        setMailID("");
        setOtp("");
        setOtpSent(false);
        setOtpVerified(false);
        otpCooldown.resetCooldown();
        setContractorName("");
        setMobileNo("");
        handleSyncContractor();
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
  useEffect(() => {
    handleSyncContractor();
  }, [handleSyncContractor]);

  const handleEditContractor = (record) => {
    setEditingContractorId(record.ID);
    setEditingContractor({
      contractorName: record.CONTRACTOR_NAME || "",
      mailID: record.MAIL_ID || "",
      mobileNo: record.MOBILE_NO || "",
    });
    setEditOtp("");
    setEditOtpSent(false);
    setEditOtpVerified(false);
    editOtpCooldown.resetCooldown();
  };

  const handleSendEditOtp = async () => {
    const email = editingContractor?.mailID.trim().toLowerCase();
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    setEditOtpLoading(true);
    try {
      const response = await fetch(apiUrl("/api/credentials/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, credentialType: "contractor" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to send OTP.");
      }
      setEditOtpSent(true);
      setEditOtpVerified(false);
      setEditOtp("");
      editOtpCooldown.startCooldown();
      alert("OTP sent to the contractor email address.");
    } catch (error) {
      alert(error.message);
    } finally {
      setEditOtpLoading(false);
    }
  };

  const handleVerifyEditOtp = async () => {
    const email = editingContractor?.mailID.trim().toLowerCase();
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!editOtpSent || !/^\d{6}$/.test(editOtp.trim())) {
      alert("Please enter the six-digit OTP sent to the email address.");
      return;
    }

    setEditOtpLoading(true);
    try {
      const response = await fetch(apiUrl("/api/credentials/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: editOtp.trim(),
          credentialType: "contractor",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to verify OTP.");
      }
      setEditOtpVerified(true);
      alert("Email verified successfully.");
    } catch (error) {
      setEditOtpVerified(false);
      alert(error.message);
    } finally {
      setEditOtpLoading(false);
    }
  };

  const handleSaveContractor = async (record) => {
    if (!isSuperUser) return;
    if (
      !editingContractor?.contractorName ||
      !isValidEmail(editingContractor.mailID) ||
      !/^\d{10}$/.test(editingContractor.mobileNo)
    ) {
      alert(
        "Enter a valid contractor name, email address, and 10-digit mobile number.",
      );
      return;
    }
    if (!editOtpVerified) {
      alert(
        "Please verify the contractor email address with OTP before saving.",
      );
      return;
    }

    setSaveLoader(true);
    try {
      const response = await fetch(
        apiUrl(`/api/contractor-master-data/${record.ID}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": userType,
          },
          body: JSON.stringify({ locationCode, ...editingContractor }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to update contractor.");
      dispatch(
        SetContractorMasterList(
          contractorList.map((item) =>
            item.ID === record.ID
              ? {
                  ...item,
                  CONTRACTOR_NAME: editingContractor.contractorName
                    .trim()
                    .replace(/\s+/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (char) => char.toUpperCase()),
                  MAIL_ID: editingContractor.mailID.trim().toLowerCase(),
                  MOBILE_NO: editingContractor.mobileNo,
                }
              : item,
          ),
        ),
      );
      setEditingContractorId(null);
      setEditingContractor(null);
      setEditOtp("");
      setEditOtpSent(false);
      setEditOtpVerified(false);
      alert("Contractor updated successfully.");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaveLoader(false);
    }
  };

  const handleDeleteContractor = async (record) => {
    if (
      !isSuperUser ||
      !window.confirm("Are you sure you want to delete this contractor?")
    ) {
      return;
    }

    setSaveLoader(true);
    try {
      const response = await fetch(
        apiUrl(`/api/contractor-master-data/${record.ID}`),
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": userType,
          },
          body: JSON.stringify({ locationCode }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to delete contractor.");
      dispatch(
        SetContractorMasterList(
          contractorList.filter(
            (item) => String(item.ID) !== String(record.ID),
          ),
        ),
      );
      alert("Contractor deleted successfully.");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaveLoader(false);
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
        style={{
          border: "1px solid black",
          width: "100%",
        }}
      >
        <Button
          variant={
            navBarComponent === "labourPassDashboard" ? "contained" : "outlined"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "labourPassDashboard" ? "null" : "white",
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("Worker Entry Request"));
            dispatch(NavBarComponent("labourPassDashboard"));
          }}
          disabled={userType == "User"}
        >
          Worker Entry Request
        </Button>
        <Button
          variant={
            navBarComponent === "labourPassApproval" ? "contained" : "outlined"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "labourPassApproval" ? "null" : "white",
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("Worker Pass Approval Centre"));
            dispatch(NavBarComponent("labourPassApproval"));
          }}
        >
          APPROVAL CENTRE
        </Button>
        <Button
          variant={
            navBarComponent === "labourPassHistory" ? "contained" : "outlined"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "labourPassHistory" ? "null" : "white",
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("Worker Pass Approval Centre"));
            dispatch(NavBarComponent("labourPassHistory"));
          }}
        >
          APPROVAL HISTORY
        </Button>
        <Button
          variant={
            navBarComponent === "contractor_masterData"
              ? "contained"
              : "outlined"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "contractor_masterData" ? "null" : "white",
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("Worker Master Data"));
            dispatch(NavBarComponent("contractor_masterData"));
          }}
          disabled={userType == "User"}
        >
          Worker Master Data
        </Button>
        <Button
          variant={
            navBarComponent === "contractor_cred" ? "contained" : "outlined"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "contractor_cred" ? "null" : "white",
            "&:disabled": {
              cursor: "not-allowed",
              backgroundColor: "white",
              pointerEvents: "all !important",
            },
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("Contractor Master Data"));
            dispatch(NavBarComponent("contractor_cred"));
          }}
          disabled={userType == "User"}
        >
          Contractor Master Data
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
            href="/template_contractor.xlsx" // Points directly to the file in your public folder
            download="Contractor_Template.xlsx" // Forces the browser to download it instead of opening it
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
        <div
          className="d-flex flex-wrap gap-20 justify-content-center align-items-center w-100 p-2"
          style={{ gap: 20 }}
        >
          <div style={{ width: "100%", maxWidth: 350 }}>
            <Typography>Location Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={locationName}
              style={{ backgroundColor: "white" }}
              size="small"
              disabled
              sx={{
                "& .MuiOutlinedInput-root": {
                  paddingTop: "1px !important", // Reducer top whitespace
                  paddingBottom: "1px !important", // Keeps it centered vertically
                },
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  backgroundColor: "white",
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

          <div style={{ width: "100%", maxWidth: 350 }}>
            <Typography>Contractor Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={contractorName}
              style={{ backgroundColor: "white" }}
              onChange={(e) =>
                setContractorName(
                  e.target.value
                    ?.replace(/\s+/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (char) => char.toUpperCase()) || "",
                )
              }
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350 }}>
            <Typography>Mobile No (10-digit)</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={mobileNo}
              type="text"
              inputProps={{ inputMode: "numeric", maxLength: 10 }}
              error={mobileNo && mobileNo.length !== 10}
              style={{ backgroundColor: "white" }}
              onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, ""))}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350 }}>
            <Typography>Mail ID</Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="email"
              value={mailID}
              error={Boolean(mailID) && !isValidEmail(mailID)}
              style={{ backgroundColor: "white" }}
              onChange={(e) => {
                setMailID(e.target.value?.toLowerCase() || "");
                setOtpSent(false);
                setOtpVerified(false);
                setOtp("");
                otpCooldown.resetCooldown();
              }}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                  textTransform: "lowercase",
                },
              }}
            />
          </div>

          <div
            className="break d-flex justify-content-center"
            style={{ width: "100%" }}
          >
            <div
              className="d-flex flex-wrap justify-content-center align-items-center gap-2"
              style={{ width: "100%", maxWidth: 350 }}
            >
              <TextField
                fullWidth
                variant="outlined"
                value={otp}
                size="small"
                type="text"
                label="Email OTP"
                inputProps={{ maxLength: 6, inputMode: "numeric" }}
                disabled={!otpSent || otpVerified}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                style={{ backgroundColor: "white", maxWidth: 350 }}
                sx={{
                  // 1. Increase font size of the placeholder/input text
                  "& .MuiInputBase-input": {
                    fontSize: "1rem",
                    fontFamily: "Lucida Sans",
                  },
                }}
              />
              <Button
                variant="outlined"
                onClick={handleSendOtp}
                disabled={otpLoading || otpVerified || !otpCooldown.canResend}
                style={{ width: 150 }}
              >
                {!otpCooldown.canResend
                  ? `Resend in ${otpCooldown.timeLabel}`
                  : otpSent
                    ? "Resend"
                    : "Send OTP"}
              </Button>
              <Button
                variant="outlined"
                color="success"
                onClick={handleVerifyOtp}
                disabled={otpLoading || !otpSent || otpVerified}
                style={{ width: 150 }}
              >
                {otpVerified ? "Email Verified" : "Verify OTP"}
              </Button>
            </div>
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
        Existing Contractors for Location
      </Typography>
      <Table bordered hover striped className="ttes_table">
        <thead className="table-head">
          <tr>
            <th style={{ minWidth: "100px" }}>LOCATION CODE</th>
            <th>CONTRACTOR NAME</th>
            <th>MAIL ID</th>
            <th>MOBILE NO (10-digit)</th>
            {isSuperUser ? <th>ACTION</th> : null}
          </tr>
        </thead>
        <tbody>
          {contractorsForLocation.map((record) => {
            const isEditing = editingContractorId === record.ID;
            return (
              <tr key={record.ID}>
                <td>{record.LOCATION_CODE}</td>
                <td>
                  {isEditing ? (
                    <TextField
                      size="small"
                      value={editingContractor.contractorName}
                      sx={{
                        "& .MuiInputBase-input": {
                          textAlign: "center",
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                      onChange={(e) =>
                        setEditingContractor({
                          ...editingContractor,
                          contractorName: e.target.value,
                        })
                      }
                    />
                  ) : (
                    record.CONTRACTOR_NAME
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <div className="d-flex flex-wrap justify-content-center align-items-center gap-1">
                      <TextField
                        size="small"
                        type="email"
                        value={editingContractor.mailID}
                        error={
                          Boolean(editingContractor.mailID) &&
                          !isValidEmail(editingContractor.mailID)
                        }
                        sx={{
                          "& .MuiInputBase-input": {
                            textAlign: "center",
                            backgroundColor: "#f5f5f5",
                            textTransform: "lowercase",
                          },
                        }}
                        onChange={(e) => {
                          setEditingContractor({
                            ...editingContractor,
                            mailID: e.target.value,
                          });
                          setEditOtpSent(false);
                          setEditOtpVerified(false);
                          setEditOtp("");
                          editOtpCooldown.resetCooldown();
                        }}
                      />
                      <div className="d-flex gap-1">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleSendEditOtp}
                          disabled={
                            editOtpLoading ||
                            editOtpVerified ||
                            !editOtpCooldown.canResend
                          }
                        >
                          {!editOtpCooldown.canResend
                            ? `Resend ${editOtpCooldown.timeLabel}`
                            : editOtpSent
                              ? "Resend OTP"
                              : "Send OTP"}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={handleVerifyEditOtp}
                          disabled={
                            editOtpLoading || !editOtpSent || editOtpVerified
                          }
                        >
                          {editOtpVerified ? "Verified" : "Verify OTP"}
                        </Button>
                      </div>
                      {editOtpSent && !editOtpVerified ? (
                        <TextField
                          size="small"
                          label="Email OTP"
                          value={editOtp}
                          inputProps={{ maxLength: 6, inputMode: "numeric" }}
                          onChange={(e) =>
                            setEditOtp(e.target.value.replace(/\D/g, ""))
                          }
                          sx={{
                            "& .MuiInputBase-input": {
                              textAlign: "center",
                              backgroundColor: "#f5f5f5",
                            },
                          }}
                        />
                      ) : null}
                    </div>
                  ) : (
                    record.MAIL_ID
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <TextField
                      size="small"
                      value={editingContractor.mobileNo}
                      error={
                        editingContractor.mobileNo &&
                        editingContractor.mobileNo.length !== 10
                      }
                      inputProps={{ maxLength: 10, inputMode: "numeric" }}
                      sx={{
                        "& .MuiInputBase-input": {
                          textAlign: "center",
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                      onChange={(e) =>
                        setEditingContractor({
                          ...editingContractor,
                          mobileNo: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                  ) : (
                    record.MOBILE_NO
                  )}
                </td>
                {isSuperUser ? (
                  <td>
                    {isEditing ? (
                      <>
                        <Button
                          startIcon={<Save />}
                          onClick={() => handleSaveContractor(record)}
                        >
                          Save
                        </Button>
                        <Button
                          startIcon={<Cancel />}
                          onClick={() => {
                            setEditingContractorId(null);
                            setEditingContractor(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          startIcon={<Edit />}
                          onClick={() => handleEditContractor(record)}
                          disabled={saveLoader}
                        >
                          Edit
                        </Button>
                        <Button
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => handleDeleteContractor(record)}
                          disabled={saveLoader}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
