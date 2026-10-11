import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Cascader } from "antd";
import { AlternateEmail, LocationOn, Password } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  NavBarComponent,
  SelectedTerminal,
  SetAuthorized,
  SetLocationCode,
  SetSelectedApplication,
  SetUserType,
  SetLocationList,
  SetLocationMasterList,
  SetUserName,
} from "../action/userSlice";
import { apiUrl } from "../api";
import { useOtpCooldown } from "../otpCooldown";
import "../css/page_layout.css";

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

function maskEmail(email) {
  if (!email) return "";
  const [username, domain] = email.split("@");
  const domainParts = domain.split(".");

  const maskedUsername = username.slice(0, 2) + "***";

  const maskedDomain = domainParts[0].slice(0, 2) + "***";

  return `${maskedUsername}@${maskedDomain}.${domainParts.slice(1).join(".")}`;
}

function SignIn() {
  const dispatch = useDispatch();
  const { selectedTerminal, locationList, locationMasterList } = useSelector(
    (state) => state.myApp,
  );
  const [role, setRole] = useState("User");
  const [passcode, setPasscode] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("login");
  const [registration, setRegistration] = useState({
    stateOffice: "",
    locationName: "",
    locationCode: "",
    passcode: "",
    adminMailId: "",
  });
  const [registrationOtp, setRegistrationOtp] = useState("");
  const [registrationOtpSent, setRegistrationOtpSent] = useState(false);
  const [registrationOtpVerified, setRegistrationOtpVerified] = useState(false);
  const [changeDetails, setChangeDetails] = useState({
    stateOffice: "",
    locationName: "",
    currentEmail: "",
    otp: "",
    newPasscode: "",
    newAdminMailId: "",
  });
  const [superUserDetail, setSuperUserDetail] = useState({
    name: "",
    empID: "",
    mobileNo: "",
    designation: "",
  });
  const [changeOtpSent, setChangeOtpSent] = useState(false);
  const [newAdminOtp, setNewAdminOtp] = useState("");
  const [newAdminOtpSent, setNewAdminOtpSent] = useState(false);
  const [newAdminOtpVerified, setNewAdminOtpVerified] = useState(false);
  const [newAdminOtpToken, setNewAdminOtpToken] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const loginOtpCooldown = useOtpCooldown();
  const registrationOtpCooldown = useOtpCooldown();
  const changeOtpCooldown = useOtpCooldown();

  const handleGetAllLocations = async () => {
    try {
      const response = await fetch(apiUrl("/api/locations-master"));
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      dispatch(SetLocationMasterList(zlist));
    } catch (error) {
      console.error("Failed to fetch records", error);
    }
  };

  const locationMasterOptions = [];
  (locationMasterList || []).forEach((location) => {
    const stateOffice = locationMasterOptions.find(
      (item) => item.value === location.STATE_OFFICE,
    );
    const child = {
      label: location.LOCATION_NAME,
      value: location.LOCATION_NAME,
    };
    if (stateOffice) stateOffice.children.push(child);
    else
      locationMasterOptions.push({
        label: location.STATE_OFFICE,
        value: location.STATE_OFFICE,
        children: [child],
      });
  });

  const options = [];
  (locationList || []).forEach((location) => {
    const stateOffice = options.find(
      (item) => item.value === location.STATE_OFFICE,
    );
    const child = {
      label: location.LOCATION_NAME,
      value: location.LOCATION_NAME,
    };
    if (stateOffice) stateOffice.children.push(child);
    else
      options.push({
        label: location.STATE_OFFICE,
        value: location.STATE_OFFICE,
        children: [child],
      });
  });

  const locationName = selectedTerminal?.[selectedTerminal.length - 1] || "";
  const needsOfficerVerification = role !== "User";

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setMessage({
        type: "error",
        text: "Enter your registered officer email.",
      });
      return;
    }
    if (!isValidEmail(email)) {
      alert("Enter a valid email address.");
      setMessage({
        type: "error",
        text: "Enter a valid email address.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const location = (locationList || []).find(
        (item) => item.LOCATION_NAME === locationName,
      );
      const response = await fetch(apiUrl("/api/admin/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
          locationCode: location?.LOCATION_CODE || "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send OTP.");
      setOtpSent(true);
      loginOtpCooldown.startCooldown();
      setMessage({
        type: "success",
        text: "OTP sent to your registered email.",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (!otpSent || !otp.trim()) {
        throw new Error("Send and enter the OTP before continuing.");
      }
      if (!isValidEmail(email)) {
        alert("Enter a valid email address.");
        throw new Error("Enter a valid email address.");
      }
      const response = await fetch(apiUrl("/api/admin/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          role,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to verify OTP.");
      const acceptedRoles =
        role === "Security"
          ? ["SECURITY"]
          : role === "Contractor"
            ? ["CONTRACTOR"]
            : ["ADMIN", "SUPER_ADMIN"];
      if (!acceptedRoles.includes(String(data.role).toUpperCase())) {
        throw new Error(
          "This officer account is not registered for the selected role.",
        );
      }
      setOtpVerified(true);
      return true;
    } catch (error) {
      setOtpVerified(false);
      setMessage({ type: "error", text: error.message });
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!locationName || !passcode.trim()) {
      setMessage({
        type: "error",
        text: "Select a location and enter its passcode.",
      });
      return;
    }
    if (needsOfficerVerification && !isValidEmail(email)) {
      alert("Enter a valid email address.");
      setMessage({
        type: "error",
        text: "Enter a valid email address.",
      });
      return;
    }
    setIsLoading(true);
    try {
      if (needsOfficerVerification && !otpVerified) {
        const verified = await handleVerifyOtp();
        if (!verified) return;
      }

      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName,
          passcode: passcode.trim(),
          role,
          email,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to verify access.");
      dispatch(SetLocationCode(data.locationCode));
      dispatch(SetUserType(data.role));
      dispatch(SetUserName(data.userName || ""));
      dispatch(SetAuthorized(true));
      dispatch(SetSelectedApplication("Application Dashboard"));
      dispatch(NavBarComponent("home2"));
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshLocations = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(apiUrl("/api/utility-locations"));
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      dispatch(SetLocationList(zlist));
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefreshLocations();
    handleGetAllLocations();
  }, [dispatch]);

  const handleSendRegistrationOtp = async () => {
          if (!superUserDetail.name) {
        alert("Please enter Officer Name.");
        return;
      }
  
      if (!superUserDetail.empID ) {
        alert("Please enter Emp ID");
        return;
      }
  
      if (!/^[0-9]{8}$/.test(superUserDetail.empID)) {
        alert("Company Emp ID should be exactly 8 digits.");
        return;
      }
  
      if (!superUserDetail.designation) {
        alert("Please enter Designation.");
        return;
      }
  
      if (!superUserDetail.mobileNo) {
        alert("Please enter Mobile No.");
        return;
      }
  
      if (!/^[0-9]{10}$/.test(superUserDetail.mobileNo)) {
        alert("Mobile No should be exactly 10 digits.");
        return;
      }

    if (!registration.adminMailId.trim()) {
      setMessage({
        type: "error",
        text: "Enter the email to receive the OTP.",
      });
      return;
    }
    if (!isValidEmail(registration.adminMailId)) {
      alert("Enter a valid email address.");
      setMessage({
        type: "error",
        text: "Enter a valid email address.",
      });
      return;
    }
    if (!isBusinessEmail(registration.adminMailId)) {
      alert(
        "Kindly use a business email address, not a personal email provider.",
      );
      return;
    }
    const duplicateLocation = (locationList || []).find(
      (location) =>
        String(location.ADMIN_MAIL_ID || "")
          .trim()
          .toLowerCase() === registration.adminMailId.trim().toLowerCase() &&
        location.LOCATION_NAME !== registration.locationName,
    );
    if (duplicateLocation) {
      const messageText = `This admin email already exists for ${duplicateLocation.LOCATION_NAME}.`;
      alert(messageText);
      setMessage({
        type: "error",
        text: messageText,
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        apiUrl("/api/utility-locations/register/request-otp"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: registration.adminMailId.trim().toLowerCase(),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send OTP.");

      setRegistrationOtpSent(true);
      setRegistrationOtpVerified(false);
      setRegistrationOtp("");
      registrationOtpCooldown.startCooldown();
      setMessage({ type: "success", text: data.message });
    } catch (error) {
      setRegistrationOtpSent(false);
      setRegistrationOtpVerified(false);
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRegistrationOtp = async () => {
    try {
      if (!registrationOtpSent || !registrationOtp.trim()) {
        throw new Error("Send and enter the OTP before continuing.");
      }
      if (!isValidEmail(registration.adminMailId)) {
        throw new Error("Enter a valid admin email address.");
      }

      const response = await fetch(
        apiUrl("/api/utility-locations/register/verify-otp"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: registration.adminMailId.trim().toLowerCase(),
            otp: registrationOtp.trim(),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to verify OTP.");

      setRegistrationOtpVerified(true);
      setMessage({ type: "success", text: data.message });
      return true;
    } catch (error) {
      setRegistrationOtpVerified(false);
      setMessage({ type: "error", text: error.message });
      return false;
    }
  };

  const handlePostSuperUserData = async (e) => {
      try {
        const payload = {
          locationCode: String(registration.locationCode),
          name:superUserDetail.name,
          empID: superUserDetail.empID,
          mobileNo: superUserDetail.mobileNo,
          mailID: registration.adminMailId,
          designation: superUserDetail.designation,
          role: 'SUPER_ADMIN',
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
          // Reset form
          setSuperUserDetail({
            name: "",
            empID: "",
            mobileNo: "",
            mailID: "",
            designation: "",
          });
          return true;
        } else {
          alert("Upload failed: " + data.error);
          return false;
        }
      } catch (error) {
        alert("Error: " + error.message);
        return false;
      }
  };

  const handleRegisterLocation = async (event) => {
    event.preventDefault();
    if (!registrationOtpVerified) {
      const verified = await handleVerifyRegistrationOtp();
      if (!verified) return;
    }

    const isLocationRegistered = (locationList || []).some(
      (location) => location.LOCATION_NAME === registration.locationName,
    );
    if (isLocationRegistered) {
      alert("This location is already registered.");
      return;
    }
    if (registration.locationCode == "") {
      alert("Location code is missing. Contact Admin.");
      return;
    }
    setIsLoading(true);
    try {
      const superUserCreated = await handlePostSuperUserData();
      if (!superUserCreated) return;

      const response = await fetch(apiUrl("/api/utility-locations/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateOffice: registration.stateOffice,
          locationName: registration.locationName,
          locationCode: registration.locationCode,
          passcode: registration.passcode,
          adminMailId: registration.adminMailId,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to register location.");
      setMessage({ type: "success", text: data.message });
      setRegistration({
        stateOffice: "",
        locationName: "",
        locationCode: "",
        passcode: "",
        adminMailId: "",
      });
      setRegistrationOtp("");
      setRegistrationOtpSent(false);
      setRegistrationOtpVerified(false);
      registrationOtpCooldown.resetCooldown();
      handleRefreshLocations();
      alert(
        data.message
      );
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendChangeOtp = async () => {
    if (!changeDetails.currentEmail.trim()) {
      setMessage({
        type: "error",
        text: "Enter the current admin email.",
      });
      return;
    }
    if (!isValidEmail(changeDetails.currentEmail)) {
      alert("Enter a valid email address.");
      setMessage({
        type: "error",
        text: "Enter a valid email address.",
      });
      return;
    }
    if (!isBusinessEmail(changeDetails.currentEmail)) {
      alert(
        "Kindly use a business email address, not a personal email provider.",
      );
      setMessage({
        type: "error",
        text: "Kindly use a business email address, not a personal email provider.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        apiUrl("/api/utility-locations/change/request-otp"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationName: changeDetails.locationName,
            currentEmail: changeDetails.currentEmail,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send OTP.");
      setChangeOtpSent(true);
      setNewAdminOtp("");
      setNewAdminOtpSent(false);
      setNewAdminOtpVerified(false);
      setNewAdminOtpToken("");
      changeOtpCooldown.startCooldown();
      setMessage({ type: "success", text: data.message });
      handleRefreshLocations();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeCredentials = async (event) => {
    event.preventDefault();
    if (
      !changeDetails.currentEmail.trim() ||
      !isValidEmail(changeDetails.currentEmail)
    ) {
      alert("Enter a valid email address.");
      setMessage({
        type: "error",
        text: "Enter a valid email address.",
      });
      return;
    }
    const newAdminMailId = changeDetails.newAdminMailId.trim().toLowerCase();
    if (newAdminMailId && !isValidEmail(newAdminMailId)) {
      alert("Enter a valid email address.");
      setMessage({
        type: "error",
        text: "Enter a valid email address.",
      });
      return;
    }
    if (newAdminMailId && !isBusinessEmail(newAdminMailId)) {
      alert(
        "Kindly use a business email address, not a personal email provider.",
      );
      setMessage({
        type: "error",
        text: "Kindly use a business email address, not a personal email provider.",
      });
      return;
    }
    if (newAdminMailId && !newAdminOtpVerified) {
      setMessage({
        type: "error",
        text: "Verify the new admin email with OTP before updating.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl("/api/utility-locations/change"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...changeDetails,
          newAdminMailId,
          newAdminOtpToken: newAdminMailId ? newAdminOtpToken : "",
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to update credentials.");
      setMessage({ type: "success", text: data.message });
      setChangeDetails({
        stateOffice: "",
        locationName: "",
        currentEmail: "",
        otp: "",
        newPasscode: "",
        newAdminMailId: "",
      });
      setChangeOtpSent(false);
      changeOtpCooldown.resetCooldown();
      setNewAdminOtp("");
      setNewAdminOtpSent(false);
      setNewAdminOtpVerified(false);
      setNewAdminOtpToken("");
      dispatch(SelectedTerminal(""));
      await handleRefreshLocations();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNewAdminOtp = async () => {
    const newAdminMailId = changeDetails.newAdminMailId.trim().toLowerCase();
    if (!isValidEmail(newAdminMailId)) {
      setMessage({
        type: "error",
        text: "Enter a valid new admin email address.",
      });
      return;
    }
    if (!isBusinessEmail(newAdminMailId)) {
      setMessage({
        type: "error",
        text: "Kindly use a business email address, not a personal email provider.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        apiUrl("/api/utility-locations/change/request-new-email-otp"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationName: changeDetails.locationName,
            currentEmail: changeDetails.currentEmail,
            newAdminMailId,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send OTP.");
      setNewAdminOtpSent(true);
      setNewAdminOtpVerified(false);
      setNewAdminOtpToken("");
      setNewAdminOtp("");
      setMessage({ type: "success", text: data.message });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyNewAdminOtp = async () => {
    const newAdminMailId = changeDetails.newAdminMailId.trim().toLowerCase();
    if (!newAdminOtpSent || !/^\d{6}$/.test(newAdminOtp.trim())) {
      setMessage({
        type: "error",
        text: "Enter the six-digit OTP sent to the new admin email.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        apiUrl("/api/utility-locations/change/verify-new-email-otp"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationName: changeDetails.locationName,
            currentEmail: changeDetails.currentEmail,
            newAdminMailId,
            otp: newAdminOtp.trim(),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to verify OTP.");
      setNewAdminOtpVerified(true);
      setNewAdminOtpToken(data.verificationToken);
      setMessage({ type: "success", text: data.message });
    } catch (error) {
      setNewAdminOtpVerified(false);
      setNewAdminOtpToken("");
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (viewMode !== "login") {
    const isRegistration = viewMode === "register";
    const update = (field) => (event) => {
      const value = event.target.value;
      if (isRegistration)
        setRegistration((current) => ({ ...current, [field]: value }));
      else setChangeDetails((current) => ({ ...current, [field]: value }));
    };
    return (
      <Box className="d-flex justify-content-center align-items-start align-items-md-center w-100 h-100 py-1">
        <Card variant="outlined" sx={{ width: "100%", maxWidth: 500, m: 1 }}>
          <CardContent
            component="form"
            onSubmit={
              isRegistration ? handleRegisterLocation : handleChangeCredentials
            }
            className="d-flex flex-column gap-2"
          >
            <Typography variant="h6">
              {isRegistration
                ? "Register New Location and Super Admin"
                : "Change Location Credentials"
              }
            </Typography>
            {isRegistration ? (
              <>
                <Cascader
                  options={locationMasterOptions}
                  expandTrigger="hover"
                  // popupMenuColumnStyle={{ maxHeight: 60 }}
                  value={
                    registration.stateOffice && registration.locationName
                      ? [registration.stateOffice, registration.locationName]
                      : []
                  }
                  onChange={(value) =>
                    setRegistration((current) => ({
                      ...current,
                      stateOffice: value?.[0] || "",
                      locationName: value?.[1] || "",
                      locationCode:
                        locationMasterList.find(
                          (item) => item.LOCATION_NAME === (value?.[1] || ""),
                        )?.LOCATION_CODE || "",
                    }))
                  }
                  placeholder="Select Terminal..."
                  style={{ width: "100%", height: 60 }}
                />
                <TextField
                  required
                  disabled
                  value={
                    registration.locationName != ""
                      ? locationMasterList.find(
                          (item) =>
                            item.LOCATION_NAME === registration.locationName,
                        ).LOCATION_CODE
                        ? `Location Code: ${locationMasterList.find((item) => item.LOCATION_NAME === registration.locationName).LOCATION_CODE}`
                        : ""
                      : ""
                  }
                  placeholder={
                    registration.locationName != ""
                      ? locationMasterList.find(
                          (item) =>
                            item.LOCATION_NAME === registration.locationName,
                        )?.LOCATION_CODE ||
                        "Location code to be updated. Contact Admin."
                      : "Location code"
                  }
                                    sx={{
                    // 1. Increase font size of the placeholder/input text
                    "& .MuiInputBase-input": {
                      fontSize: "1rem",
                      fontFamily: "Lucida Sans",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      fontFamily: "Lucida Sans",
                      fontSize: "0.8rem", // Optional: adjust placeholder size
                      fontStyle: "italic", // Optional: make placeholder italicized
                    },
                  }}
                />
                <TextField
                  required
                  type="password"
                  placeholder="Enter Location Passcode"
                  value={registration.passcode}
                  onChange={update("passcode")}
                                    sx={{
                    // 1. Increase font size of the placeholder/input text
                    "& .MuiInputBase-input": {
                      fontSize: "1rem",
                      fontFamily: "Lucida Sans",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      fontFamily: "Lucida Sans",
                      fontSize: "0.8rem", // Optional: adjust placeholder size
                      fontStyle: "italic", // Optional: make placeholder italicized
                    },
                  }}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  value={superUserDetail.name}
                  style={{ backgroundColor: "white" }}
                  placeholder="Enter name"
                  onChange={(e) =>
                    setSuperUserDetail({
                      ...superUserDetail,
                      name:
                        e.target.value
                          ?.replace(/\s+/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (char) => char.toUpperCase()) || "",
                    })
                  }
                  sx={{
                    // 1. Increase font size of the placeholder/input text
                    "& .MuiInputBase-input": {
                      fontSize: "1rem",
                      fontFamily: "Lucida Sans",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      fontFamily: "Lucida Sans",
                      fontSize: "0.8rem", // Optional: adjust placeholder size
                      fontStyle: "italic", // Optional: make placeholder italicized
                    },
                  }}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  type="text"
                  value={superUserDetail.empID}
                  placeholder="Emp id must be 8-digit for officer role else enter '1'"
                  inputProps={{ inputMode: "numeric", maxLength: 10 }}
                  style={{ backgroundColor: "white" }}
                  onChange={(e) =>
                    setSuperUserDetail({
                      ...superUserDetail,
                      empID: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  sx={{
                    // 1. Increase font size of the placeholder/input text
                    "& .MuiInputBase-input": {
                      fontSize: "1rem",
                      fontFamily: "Lucida Sans",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      fontFamily: "Lucida Sans",
                      fontSize: "0.8rem", // Optional: adjust placeholder size
                      fontStyle: "italic", // Optional: make placeholder italicized
                    },
                  }}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  type="text"
                  value={superUserDetail.designation}
                  placeholder="Enter designation"
                  inputProps={{ maxLength: 50 }}
                  style={{ backgroundColor: "white" }}
                  onChange={(e) =>
                    setSuperUserDetail({
                      ...superUserDetail,
                      designation: e.target.value,
                    })
                  }
                  sx={{
                    // 1. Increase font size of the placeholder/input text
                    "& .MuiInputBase-input": {
                      fontSize: "1rem",
                      fontFamily: "Lucida Sans",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      fontFamily: "Lucida Sans",
                      fontSize: "0.8rem", // Optional: adjust placeholder size
                      fontStyle: "italic", // Optional: make placeholder italicized
                    },
                  }}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  type="text"
                  placeholder="Enter Mobile No"
                  value={superUserDetail.mobileNo}
                  error={
                    superUserDetail.mobileNo &&
                    superUserDetail.mobileNo.length !== 10
                  }
                  inputProps={{ inputMode: "numeric", maxLength: 10 }}
                  style={{ backgroundColor: "white" }}
                  onChange={(e) =>
                    setSuperUserDetail({
                      ...superUserDetail,
                      mobileNo: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  sx={{
                    // 1. Increase font size of the placeholder/input text
                    "& .MuiInputBase-input": {
                      fontSize: "1rem",
                      fontFamily: "Lucida Sans",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      fontFamily: "Lucida Sans",
                      fontSize: "0.8rem", // Optional: adjust placeholder size
                      fontStyle: "italic", // Optional: make placeholder italicized
                    },
                  }}
                />
                <TextField
                  required
                  type="email"
                  placeholder="Enter email"
                  error={
                    Boolean(registration.adminMailId) &&
                    !isValidEmail(registration.adminMailId)
                  }
                  value={registration.adminMailId}
                  onChange={(event) => {
                    update("adminMailId")(event);
                    setRegistrationOtp("");
                    setRegistrationOtpSent(false);
                    setRegistrationOtpVerified(false);
                    registrationOtpCooldown.resetCooldown();
                  }}
                                    sx={{
                    // 1. Increase font size of the placeholder/input text
                    "& .MuiInputBase-input": {
                      fontSize: "1rem",
                      fontFamily: "Lucida Sans",
                      textTransform: "lowercase",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      fontFamily: "Lucida Sans",
                      fontSize: "0.8rem", // Optional: adjust placeholder size
                      fontStyle: "italic", // Optional: make placeholder italicized
                      textTransform: "none",
                    },
                  }}
                />
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleSendRegistrationOtp}
                  disabled={
                    isLoading ||
                    !registration.adminMailId.trim() ||
                    !registrationOtpCooldown.canResend
                  }
                >
                  {isLoading
                    ? "Sending..."
                    : !registrationOtpCooldown.canResend
                      ? `Resend in ${registrationOtpCooldown.timeLabel}`
                      : registrationOtpSent
                        ? "Resend OTP"
                        : "Send OTP"}
                </Button>
                {registrationOtpSent ? (
                  <>
                    <label
                      style={{
                        display: "block",
                        color: "brown",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        fontStyle: "italic",
                      }}
                    >
                      {
                        "If OTP is not received, check Junk/Spam folder for the OTP"
                      }
                    </label>
                    <TextField
                      required
                      label="Registration OTP"
                      value={registrationOtp}
                      onChange={(event) =>
                        setRegistrationOtp(event.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleVerifyRegistrationOtp}
                      disabled={isLoading || !registrationOtp.trim() || registrationOtpVerified}
                    >
                      {isLoading ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </>
                ) : null}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading || !registrationOtpVerified}
                >
                  {isLoading && registrationOtpVerified
                    ? "Registering..."
                    : "Register Location"}
                </Button>
              </>
            ) : (
              <>
                <Cascader
                  required
                  options={options}
                  expandTrigger="hover"
                  placeholder="Select location"
                  value={
                    changeDetails.stateOffice && changeDetails.locationName
                      ? [changeDetails.stateOffice, changeDetails.locationName]
                      : []
                  }
                  onChange={(value) =>
                    setChangeDetails((current) => ({
                      ...current,
                      stateOffice: value?.[0] || "",
                      locationName: value?.[value.length - 1] || "",
                    }))
                  }
                  style={{ width: "100%", height: 55 }}
                />
                <TextField
                  required
                  type="email"
                  error={
                    Boolean(changeDetails.currentEmail) &&
                    !isValidEmail(changeDetails.currentEmail)
                  }
                  label="Type Registered Admin Email"
                  disabled={changeDetails.locationName == ""}
                  placeholder={
                    changeDetails.locationName !== ""
                      ? maskEmail(
                          locationList.find(
                            (item) =>
                              item.LOCATION_NAME === changeDetails.locationName,
                          )?.ADMIN_MAIL_ID || "",
                        )
                      : "Select Location First"
                  }
                  value={changeDetails.currentEmail}
                  onChange={(event) => {
                    update("currentEmail")(event);
                    setChangeOtpSent(false);
                    changeOtpCooldown.resetCooldown();
                    setNewAdminOtp("");
                    setNewAdminOtpSent(false);
                    setNewAdminOtpVerified(false);
                    setNewAdminOtpToken("");
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    // 1. Increase font size of the placeholder/input text
                    "& .MuiInputBase-input": {
                      textTransform: "lowercase",
                    },
                  }}
                />
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleSendChangeOtp}
                  disabled={
                    isLoading ||
                    !changeDetails.locationName ||
                    !changeDetails.currentEmail ||
                    !changeOtpCooldown.canResend
                  }
                >
                  {isLoading
                    ? "Sending..."
                    : !changeOtpCooldown.canResend
                      ? `Resend in ${changeOtpCooldown.timeLabel}`
                      : changeOtpSent
                        ? "Resend OTP"
                        : "Send OTP"}
                </Button>
                {changeOtpSent ? (
                  <>
                    <label
                      style={{
                        display: "block",
                        color: "brown",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        fontStyle: "italic",
                      }}
                    >
                      {
                        "If OTP is not received, check Junk/Spam folder for the OTP"
                      }
                    </label>
                    <TextField
                      required
                      label="OTP"
                      value={changeDetails.otp}
                      onChange={update("otp")}
                    />
                    <TextField
                      type="password"
                      label="New passcode"
                      value={changeDetails.newPasscode}
                      onChange={update("newPasscode")}
                    />
                    <TextField
                      type="email"
                      error={
                        Boolean(changeDetails.newAdminMailId) &&
                        !isValidEmail(changeDetails.newAdminMailId)
                      }
                      label="New admin email"
                      value={changeDetails.newAdminMailId}
                      onChange={(event) => {
                        update("newAdminMailId")(event);
                        setNewAdminOtp("");
                        setNewAdminOtpSent(false);
                        setNewAdminOtpVerified(false);
                        setNewAdminOtpToken("");
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          textTransform: "lowercase",
                        },
                      }}
                    />
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleSendNewAdminOtp}
                      disabled={
                        isLoading ||
                        !isValidEmail(changeDetails.newAdminMailId) ||
                        newAdminOtpVerified
                      }
                    >
                      {newAdminOtpVerified
                        ? "New Email Verified"
                        : "Send OTP to New Email"}
                    </Button>
                    {newAdminOtpSent ? (
                      <>
                        <TextField
                          label="New email OTP"
                          value={newAdminOtp}
                          onChange={(event) => {
                            setNewAdminOtp(event.target.value);
                            setNewAdminOtpVerified(false);
                            setNewAdminOtpToken("");
                          }}
                          inputProps={{ inputMode: "numeric", maxLength: 6 }}
                        />
                        <Button
                          type="button"
                          variant="outlined"
                          onClick={handleVerifyNewAdminOtp}
                          disabled={isLoading || newAdminOtpVerified}
                        >
                          {newAdminOtpVerified
                            ? "Verified"
                            : "Verify New Email OTP"}
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={
                        isLoading ||
                        (!changeDetails.newPasscode &&
                          !changeDetails.newAdminMailId) ||
                        (Boolean(changeDetails.newAdminMailId) &&
                          !newAdminOtpVerified)
                      }
                    >
                      {isLoading ? "Updating..." : "Verify OTP & Update"}
                    </Button>
                  </>
                ) : null}
              </>
            )}
            {message.text ? (
              <Alert severity={message.type || "info"}>{message.text}</Alert>
            ) : null}
            <Button
              type="button"
              variant="outlined"
              size="small"
              style={{ width: 200 }}
              onClick={() => {
                setViewMode("login");
                setMessage({ type: "", text: "" });
                setRegistration({
                  stateOffice: "",
                  locationName: "",
                  locationCode: "",
                  passcode: "",
                  adminMailId: "",
                });
                setRegistrationOtp("");
                setRegistrationOtpSent(false);
                setRegistrationOtpVerified(false);
                setNewAdminOtp("");
                setNewAdminOtpSent(false);
                setNewAdminOtpVerified(false);
                setNewAdminOtpToken("");
                setChangeDetails({
                  stateOffice: "",
                  locationName: "",
                  currentEmail: "",
                  otp: "",
                  newPasscode: "",
                  newAdminMailId: "",
                });
              }}
            >
              Back to login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      className="d-flex justify-content-center align-items-start align-items-md-center w-100 h-100 py-1"
      style={{ overflow: "auto" }}
    >
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 500, m: 1 }}>
        <CardContent
          component="form"
          onSubmit={handleSubmit}
          className="d-flex flex-column align-items-center"
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Button
              type="button"
              variant="outlined"
              size="small"
              style={{ width: 200 }}
              onClick={() => setViewMode("register")}
            >
              New Registration
            </Button>
            <Button
              type="button"
              variant="outlined"
              size="small"
              style={{ width: 200 }}
              onClick={() => setViewMode("change")}
            >
              Change credentials
            </Button>
          </Stack>
          <Cascader
            options={options}
            expandTrigger="hover"
            value={selectedTerminal || undefined}
            onChange={(value) => dispatch(SelectedTerminal(value || ""))}
            placeholder="Select Terminal..."
            style={{ width: "100%", height: 60, marginBottom: 20 }}
            prefix={<LocationOn color="primary" />}
          />
          <TextField
            fullWidth
            required
            type="password"
            placeholder="Enter location passcode"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Password color="primary" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ mb: 1 }} disabled={locationName == ""}>
            <RadioGroup
              row
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setOtpSent(false);
                setOtpVerified(false);
                loginOtpCooldown.resetCooldown();
                setMessage({ type: "", text: "" });
              }}
            >
              <FormControlLabel
                value="User"
                control={<Radio />}
                label="Normal User"
              />
              <FormControlLabel
                value="Admin"
                control={<Radio />}
                label="Officer"
              />
              <FormControlLabel
                value="Security"
                control={<Radio />}
                label="Security"
              />
              <FormControlLabel
                value="Contractor"
                control={<Radio />}
                label="Contractor"
              />
            </RadioGroup>
          </FormControl>
          {needsOfficerVerification ? (
            <Stack spacing={2} sx={{ width: "100%", mb: 2 }}>
              <Typography variant="subtitle1">Role verification</Typography>
              <TextField
                type="email"
                label="Registered Email ID"
                value={email}
                error={Boolean(email) && !isValidEmail(email)}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setOtpSent(false);
                  setOtpVerified(false);
                  setOtp("");
                  loginOtpCooldown.resetCooldown();
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AlternateEmail color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiInputBase-input": {
                    textTransform: "lowercase",
                  },
                }}
              />
              <Button
                type="button"
                variant="outlined"
                onClick={handleSendOtp}
                disabled={
                  isLoading ||
                  !email.trim() ||
                  !isValidEmail(email) ||
                  !loginOtpCooldown.canResend
                }
              >
                {!loginOtpCooldown.canResend
                  ? `Resend in ${loginOtpCooldown.timeLabel}`
                  : otpSent
                    ? "Resend"
                    : "Send OTP"}
              </Button>
              {otpSent ? (
                <>
                  <label
                    style={{
                      display: "block",
                      color: "brown",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                      fontStyle: "italic",
                    }}
                  >
                    {
                      "If OTP is not received, check Junk/Spam folder for the OTP"
                    }
                  </label>
                  <TextField
                    label="OTP"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                  />
                </>
              ) : null}
            </Stack>
          ) : null}
          {message.text ? (
            <Alert
              severity={message.type || "info"}
              sx={{ mb: 2, width: "100%" }}
            >
              {message.text}
            </Alert>
          ) : null}
          <div className="d-flex flex-wrap justify-content-center gap-2 align-items-center w-100">
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={isLoading}
              sx={{ width: 200 }}
            >
              {isLoading
                ? "Checking..."
                : needsOfficerVerification && !otpVerified
                  ? "Verify OTP & Submit"
                  : "Submit"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              color="success"
              disabled={isRefreshing}
              sx={{ width: 200 }}
              onClick={handleRefreshLocations}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Box>
  );
}

export default SignIn;
