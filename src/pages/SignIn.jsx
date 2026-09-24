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
} from "../action/userSlice";
import { apiUrl } from "../api";
import "../css/page_layout.css";

function SignIn() {
  const dispatch = useDispatch();
  const { selectedTerminal, locationList } = useSelector(
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
    locationName: "",
    passcode: "",
    adminMailId: "",
  });
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
  }, []);

  const handleRegisterLocation = async (event) => {
    event.preventDefault();
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
      handleRefreshLocations();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendChangeOtp = async () => {
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
      setMessage({ type: "success", text: data.message });
      handleRefreshLocations()
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeCredentials = async (event) => {
    event.preventDefault();
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
                <TextField
                  required
                  label="State office"
                  value={registration.stateOffice}
                  onChange={(event) =>
                    setRegistration((current) => ({
                      ...current,
                      stateOffice: event.target.value.toUpperCase(),
                    }))
                  }
                />
                <TextField
                  required
                  label="Location name"
                  value={registration.locationName}
                  onChange={(event) =>
                    setRegistration((current) => ({
                      ...current,
                      locationName: event.target.value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()),
                    }))
                  }
                />
                <TextField
                  required
                  label="Location code"
                  value={registration.locationCode}
                  onChange={update("locationCode")}
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
                  value={registration.adminMailId}
                  onChange={update("adminMailId")}
                />
                <Button type="submit" variant="contained" disabled={isLoading}>
                  {isLoading ? "Registering..." : "Register Location"}
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
                  label="Current registered Admin Email"
                  value={changeDetails.currentEmail}
                  onChange={update("currentEmail")}
                />
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleSendChangeOtp}
                  disabled={
                    isLoading ||
                    !changeDetails.locationName ||
                    !changeDetails.currentEmail
                  }
                >
                  {isLoading ? "Sending..." : "Send OTP"}
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
                      label="New admin email"
                      value={changeDetails.newAdminMailId}
                      onChange={update("newAdminMailId")}
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
            label="Location passcode"
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
                label="Registered officer email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AlternateEmail color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="button"
                variant="outlined"
                onClick={handleSendOtp}
                disabled={isLoading || !email.trim()}
              >
                Send OTP
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
