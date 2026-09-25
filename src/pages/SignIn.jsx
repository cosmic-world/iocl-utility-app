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
} from "../action/userSlice";
import { apiUrl } from "../api";
import { useOtpCooldown } from "../otpCooldown";
import "../css/page_layout.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value) =>
  EMAIL_REGEX.test(
    String(value || "")
      .trim()
      .toLowerCase(),
  );

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
  const [changeOtpSent, setChangeOtpSent] = useState(false);
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
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to verify OTP.");
      const acceptedRoles =
        role === "Security" ? ["SECURITY"] : ["ADMIN", "SUPER_ADMIN"];
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
      dispatch(SetAuthorized(true));
      dispatch(SetSelectedApplication("Role Selection"));
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
  }, []);

  const handleSendRegistrationOtp = async () => {
    if (!registration.adminMailId.trim()) {
      setMessage({
        type: "error",
        text: "Enter the admin email to receive the OTP.",
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

  const handleRegisterLocation = async (event) => {
    event.preventDefault();

    if (!registration.adminMailId.trim()) {
      setMessage({
        type: "error",
        text: "Enter the admin email before registration.",
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
        "Registration successful. Contact admin for assigning a Super Admin user for this location.",
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
    if (
      changeDetails.newAdminMailId &&
      !isValidEmail(changeDetails.newAdminMailId)
    ) {
      alert("Enter a valid email address.");
      setMessage({
        type: "error",
        text: "Enter a valid email address.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl("/api/utility-locations/change"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changeDetails),
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
      dispatch(SelectedTerminal(""));
      await handleRefreshLocations();
    } catch (error) {
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
      <Box className="d-flex justify-content-center align-items-center w-100 h-100">
        <Card variant="outlined" sx={{ width: "100%", maxWidth: 500 }}>
          <CardContent
            component="form"
            onSubmit={
              isRegistration ? handleRegisterLocation : handleChangeCredentials
            }
            className="d-flex flex-column gap-2"
          >
            <Typography variant="h6">
              {isRegistration
                ? "Register New Location"
                : "Change Location Credentials"}
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
                />
                <TextField
                  required
                  type="password"
                  label="Passcode"
                  value={registration.passcode}
                  onChange={update("passcode")}
                />
                <TextField
                  required
                  type="email"
                  label="Admin email"
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
                      textTransform: "lowercase",
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
                      disabled={isLoading || !registrationOtp.trim()}
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
                      : ""
                  }
                  value={changeDetails.currentEmail}
                  onChange={(event) => {
                    update("currentEmail")(event);
                    setChangeOtpSent(false);
                    changeOtpCooldown.resetCooldown();
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
                      onChange={update("newAdminMailId")}
                      sx={{
                        "& .MuiInputBase-input": {
                          textTransform: "lowercase",
                        },
                      }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={
                        isLoading ||
                        (!changeDetails.newPasscode &&
                          !changeDetails.newAdminMailId)
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
    <Box className="d-flex justify-content-center align-items-center w-100 h-100">
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 500 }}>
        <CardContent
          component="form"
          onSubmit={handleSubmit}
          className="d-flex flex-column align-items-center"
        >
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              type="button"
              variant="outlined"
              size="small"
              style={{ width: 200 }}
              onClick={() => setViewMode("register")}
            >
              New location
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
              <FormControlLabel value="User" control={<Radio />} label="User" />
              <FormControlLabel
                value="Admin"
                control={<Radio />}
                label="Admin"
              />
              <FormControlLabel
                value="Security"
                control={<Radio />}
                label="Security"
              />
            </RadioGroup>
          </FormControl>
          {needsOfficerVerification ? (
            <Stack spacing={2} sx={{ width: "100%", mb: 2 }}>
              <Typography variant="subtitle1">Role verification</Typography>
              <TextField
                type="email"
                label="Registered officer email"
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
