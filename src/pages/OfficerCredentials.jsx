import React, { useState, useEffect, useRef } from "react";
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
import { Download, Delete, SwapHoriz } from "@mui/icons-material";
import { SetOfficerMasterList } from "../action/userSlice";
import { useOtpCooldown } from "../otpCooldown";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "ymail.com",
  "rediffmail.com",
  "rediff.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "zoho.com",
]);
const isValidEmail = (value) =>
  EMAIL_REGEX.test(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
const isBusinessEmail = (value) => {
  const domain = String(value || "")
    .trim()
    .toLowerCase()
    .split("@")[1];
  return Boolean(domain) && !FREE_EMAIL_DOMAINS.has(domain);
};

export default function OfficerCredentials({handleSyncOfficer}) {
  const dispatch = useDispatch();
  const {
    officerList,
    locationCode,
    selectedTerminal,
    userType,
    locationCode: selectedLocationCode,
  } = useSelector((state) => state.myApp);

  const [saveLoader, setSaveLoader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [mailID, setMailID] = useState("");
  const [name, setName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [empID, setEmpID] = useState("");
  const [role, setRole] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [verificationOfficerId, setVerificationOfficerId] = useState(null);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [verificationOtpSent, setVerificationOtpSent] = useState(false);
  const [verificationOtpLoading, setVerificationOtpLoading] = useState(false);
  const otpCooldown = useOtpCooldown();
  const verificationOtpCooldown = useOtpCooldown();

  const locationName = selectedTerminal[selectedTerminal.length - 1];
  const officersForLocation = officerList;

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
      const response = await fetch(apiUrl("/api/upload-officer-excel"), {
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

  const handleSendOtp = async () => {
    const email = mailID.trim().toLowerCase();
    const officerRole = userType === "SECURITY" ? userType : role || "ADMIN";
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (officerRole === "ADMIN" && !isBusinessEmail(email)) {
      alert(
        "ADMIN must use a business email address, not a personal email provider.",
      );
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch(apiUrl("/api/credentials/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          credentialType: "officer",
          role: officerRole,
        }),
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
          credentialType: "officer",
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
    const officerRole = userType === "SECURITY" ? userType : role || "ADMIN";

    if (!name) {
      alert("Please enter Officer Name.");
      return;
    }

    if (!empID && role != "SECURITY") {
      alert("Please enter Emp ID");
      return;
    }

    if (!/^[0-9]{8}$/.test(empID) && role != "SECURITY") {
      alert("Company Emp ID should be exactly 8 digits.");
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

    if (!mailID) {
      alert("Please enter Mail ID.");
      return;
    }

    if (!isValidEmail(mailID)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (officerRole === "ADMIN" && !isBusinessEmail(mailID)) {
      alert(
        "ADMIN must use a business email address, not a personal email provider.",
      );
      return;
    }

    if (!otpVerified) {
      alert("Please verify the email address with OTP before submitting.");
      return;
    }

    setSaveLoader(true);
    setSubmitting(true);

    try {
      const payload = {
        locationCode: String(locationCode),
        name,
        empID,
        mobileNo,
        mailID: mailID.trim().toLowerCase(),
        role: officerRole,
      };
      // Submit to server
      const response = await fetch(apiUrl("/api/upload-officer-single"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // <-- ADD THIS CRITICAL LINE
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        alert("Record submitted successfully!");
        await handleSyncOfficer();
        // Reset form
        setMailID("");
        setOtp("");
        setOtpSent(false);
        setOtpVerified(false);
        otpCooldown.resetCooldown();
        setEmpID("");
        setName("");
        setMobileNo("");
        setRole("");
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
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaveLoader(false);
    }
  };

  const handleChangeRole = async (officer, selectedRole) => {
    if (!isSuperAdmin) {
      alert("Only a super admin can change officer roles.");
      return;
    }

    if (!selectedRole || selectedRole === officer.ROLE) return;
    if (!["ADMIN", "SUPER_ADMIN", "SECURITY"].includes(selectedRole)) {
      alert("Role must be ADMIN, SUPER_ADMIN, or SECURITY.");
      return;
    }

    setSaveLoader(true);
    try {
      const response = await fetch(
        apiUrl(`/api/officer-master-data/${officer.ID}/role`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": userType,
          },
          body: JSON.stringify({ role: selectedRole }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to change officer role.");
      }

      setSelectedRoles((currentRoles) => {
        const nextRoles = { ...currentRoles };
        delete nextRoles[officer.ID];
        return nextRoles;
      });
      dispatch(
              SetOfficerMasterList(
                officerList.map((item) =>
                  item.ID === officer.ID
                    ? {
                        ...item,
                        ROLE: selectedRole,
                      }
                    : item,
                ),
              ),
            );
      alert("Officer role changed successfully.");
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaveLoader(false);
    }
  };

  const handleSendOfficerVerificationOtp = async (officer) => {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userType)) {
      alert("Only an admin or super admin can verify officer emails.");
      return;
    }
    if (String(officer.STATUS || "ACTIVE").toUpperCase() === "ACTIVE") return;

    setVerificationOfficerId(officer.ID);
    setVerificationOtpLoading(true);
    try {
      const email = String(officer.MAIL_ID || "").trim().toLowerCase();
      const requestResponse = await fetch(apiUrl("/api/credentials/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          credentialType: "officer",
          role: officer.ROLE,
        }),
      });
      const requestData = await requestResponse.json();
      if (!requestResponse.ok || !requestData.success) {
        throw new Error(requestData.message || "Unable to send verification OTP.");
      }
      setVerificationOtpSent(true);
      setVerificationOtp("");
      verificationOtpCooldown.startCooldown();
      alert(`OTP sent to ${email}.`);
    } catch (error) {
      alert(error.message);
    } finally {
      setVerificationOtpLoading(false);
    }
  };

  const handleVerifyOfficerEmail = async (officer) => {
    const email = String(officer.MAIL_ID || "").trim().toLowerCase();
    if (!/^\d{6}$/.test(verificationOtp.trim())) {
      alert("Please enter the six-digit OTP sent to the officer email.");
      return;
    }

    setVerificationOtpLoading(true);
    try {
      const verifyResponse = await fetch(apiUrl("/api/credentials/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: verificationOtp.trim(), credentialType: "officer" }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyData.success) {
        throw new Error(verifyData.message || "Invalid or expired OTP.");
      }

      const statusResponse = await fetch(
        apiUrl(`/api/officer-master-data/${officer.ID}/verify-email`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": userType,
          },
          body: JSON.stringify({ locationCode: officer.LOCATION_CODE }),
        },
      );
      const statusData = await statusResponse.json();
      if (!statusResponse.ok || !statusData.success) {
        throw new Error(statusData.error || "Unable to activate officer.");
      }

      dispatch(
        SetOfficerMasterList(
          officerList.map((item) =>
            item.ID === officer.ID ? { ...item, STATUS: "ACTIVE" } : item,
          ),
        ),
      );
      setVerificationOfficerId(null);
      setVerificationOtp("");
      setVerificationOtpSent(false);
      alert("Officer email verified and account activated.");
    } catch (error) {
      alert(error.message);
    } finally {
      setVerificationOtpLoading(false);
    }
  };

  const isSuperAdmin = userType === "SUPER_ADMIN";

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
            Excel columns: LOCATION CODE, OFFICER NAME, MAIL ID, MOBILE NO,
            ROLE. ROLE must be ADMIN, SUPER_ADMIN, or SECURITY.
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

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={name}
              style={{ backgroundColor: "white" }}
              onChange={(e) =>
                setName(
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

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Emp ID</Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="text"
              value={empID}
              inputProps={{ inputMode: "numeric", maxLength: 10 }}
              style={{ backgroundColor: "white" }}
              onChange={(e) => setEmpID(e.target.value.replace(/\D/g, ""))}
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

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Mobile No (10-digit)</Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="text"
              value={mobileNo}
              error={mobileNo && mobileNo.length !== 10}
              inputProps={{ inputMode: "numeric", maxLength: 10 }}
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

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Role</Typography>
            <TextField
              select
              fullWidth
              value={userType == "SECURITY" ? userType : role}
              disabled={userType == "SECURITY"}
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
              <option value="" disabled>
                Select Role
              </option>
              <option value="ADMIN">ADMIN</option>
              <option value="SECURITY">SECURITY</option>
            </TextField>
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Mail ID</Typography>
            <TextField
              fullWidth
              variant="outlined"
              type="email"
              value={mailID}
              error={Boolean(mailID) && !isValidEmail(mailID)}
              style={{ backgroundColor: "white" }}
              onChange={(e) => {
                setMailID(e.target.value || "");
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
          </div>

          <div
            className="break d-flex justify-content-center"
            style={{ width: "100%" }}
          >
            <div
              className="d-flex flex-wrap justify-content-start align-items-center"
              style={{ width: "100%", maxWidth: 350 }}
            >
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                value={otp}
                inputProps={{ maxLength: 6, inputMode: "numeric" }}
                label="Email OTP"
                disabled={!otpSent || otpVerified}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                style={{ backgroundColor: "white" }}
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
        Existing Users at {locationName}
      </Typography>
      <Table bordered hover striped className="ttes_table">
        <thead className="table-head">
          <tr>
            <th>NAME</th>
            <th style={{width:100}}>EMP ID</th>
            <th style={{width:150}}>MOBILE NO</th>
            <th>MAIL ID</th>
            <th style={{width:200}}>ROLE</th>
            <th style={{width:100}}>STATUS</th>
            <th style={{ minWidth: 500 }}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {officersForLocation.map((officer) => (
            <tr key={officer.ID}>
              <td>{officer.OFFICER_NAME}</td>
              <td>{officer.Emp_ID}</td>
              <td>{officer.MOBILE_NO}</td>
              <td>{officer.MAIL_ID}</td>
              <td>
                <TextField
                  select
                  size="small"
                  value={selectedRoles[officer.ID] || officer.ROLE}
                  onChange={(event) =>
                    setSelectedRoles((currentRoles) => ({
                      ...currentRoles,
                      [officer.ID]: event.target.value,
                    }))
                  }
                  disabled={saveLoader || !isSuperAdmin}
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="SECURITY">SECURITY</option>
                </TextField>
              </td>
              <td>{String(officer.STATUS || "ACTIVE").toUpperCase()}</td>
              <td style={{ textAlign: "center" }}>
                <span
                  style={{
                    display: "flex",
                    gap: "8px",
                    width: "100%",
                  }}
                  title={
                    isSuperAdmin
                      ? null
                      : "Only a super admin can perform these actions"
                  }
                >
                  <Button
                    color="primary"
                    variant="outlined"
                    startIcon={<SwapHoriz />}
                    onClick={() =>
                      handleChangeRole(officer, selectedRoles[officer.ID])
                    }
                    disabled={
                      saveLoader || !isSuperAdmin || !selectedRoles[officer.ID]
                    }
                    sx={{ width:200 }}
                  >
                    Change Role
                  </Button>
                  <Button
                    color="error"
                    variant="outlined"
                    startIcon={<Delete />}
                    onClick={() => handleDeleteOfficer(officer.ID)}
                    disabled={saveLoader || !isSuperAdmin}
                    sx={{ width:150 }}
                  >
                    Delete
                  </Button>
                  {String(officer.STATUS || "ACTIVE").toUpperCase() === "INACTIVE" &&
                  ["ADMIN", "SUPER_ADMIN"].includes(userType) ? (
                    verificationOfficerId === officer.ID ? (
                      <>
                        <TextField
                          size="small"
                          label="OTP"
                          value={verificationOtp}
                          inputProps={{ maxLength: 6, inputMode: "numeric" }}
                          onChange={(event) =>
                            setVerificationOtp(event.target.value.replace(/\D/g, ""))
                          }
                          sx={{
                            width: 110,
                            "& .MuiInputBase-input": { textAlign: "center" },
                          }}
                        />
                        <Button
                          color="success"
                          variant="outlined"
                          onClick={() => handleVerifyOfficerEmail(officer)}
                          disabled={verificationOtpLoading || !verificationOtpSent}
                          sx={{ width: 120 }}
                        >
                          Verify OTP
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleSendOfficerVerificationOtp(officer)}
                          disabled={verificationOtpLoading || !verificationOtpCooldown.canResend}
                          sx={{ width: 100 }}
                        >
                          {!verificationOtpCooldown.canResend
                            ? verificationOtpCooldown.timeLabel
                            : "Resend"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        color="success"
                        variant="outlined"
                        onClick={() => handleSendOfficerVerificationOtp(officer)}
                        disabled={saveLoader || verificationOtpLoading}
                        sx={{ width: 150 }}
                      >
                        Verify Email
                      </Button>
                    )
                  ) : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
