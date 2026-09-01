import React, { useEffect, useState } from "react";
import { apiUrl } from "../api";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { ManageAccounts, Person } from "@mui/icons-material";
import {
  Typography,
  CardActionArea,
  Box,
  TextField,
  Button,
  Stack,
  Alert,
  Badge 
} from "@mui/material";
import {
  SetUserType,
  NavBarComponent,
  SetSelectedApplication,
  SetOfficerMasterList,
} from "../action/userSlice";
import { useDispatch, useSelector } from "react-redux";

export default function contacts() {
  const dispatch = useDispatch();
  const { userType, officerList } = useSelector((state) => state.myApp);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const loadOfficerList = async () => {
      if (officerList && officerList.length > 0) return;

      try {
        const response = await fetch(apiUrl("/api/officer-master-data"));
        const data = await response.json();
        dispatch(SetOfficerMasterList(data || []));
      } catch (error) {
        console.error("Failed to load officer list:", error);
      }
    };

    loadOfficerList();
  }, [dispatch, officerList]);

  const handleUserSelection = (item) => {
    if (item === "admin") {
      setShowAdminForm(true);
      setMessage({ type: "", text: "" });
      return;
    }

    dispatch(SetUserType(item));
    dispatch(NavBarComponent("home2"));
    dispatch(SetSelectedApplication("APPLICATION SELECTION"));
  };

  const handleSendOtp = async () => {
    const trimmedEmail = String(adminEmail || "").trim().toLowerCase();
    const isRegistered = officerList.some(
      (item) => String(item.MAIL_ID || item.MAILID || "").trim().toLowerCase() === trimmedEmail
    );

    if (!trimmedEmail || !isRegistered) {
      setMessage({
        type: "error",
        text: "Email address is not found in the registered officer list.",
      });
      return;
    }

    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch(apiUrl("/api/admin/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP.");
      }

      setOtpSent(true);
      setMessage({
        type: "success",
        text: data.message || "OTP sent successfully to the registered officer email.",
      });
    } catch (error) {
      setOtpSent(false);
      setMessage({ type: "error", text: error.message || "Failed to send OTP." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedEmail = String(adminEmail || "").trim().toLowerCase();

    if (!trimmedEmail || !otp) {
      setMessage({ type: "error", text: "Enter the registered email and OTP." });
      return;
    }

    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch(apiUrl("/api/admin/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, otp }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid OTP.");
      }

      dispatch(SetUserType("admin"));
      dispatch(NavBarComponent("home2"));
      dispatch(SetSelectedApplication("APPLICATION SELECTION"));
      setShowAdminForm(false);
      setMessage({ type: "success", text: data.message || "Admin verified." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "OTP verification failed." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box className="d-flex flex-column w-100 h-100 align-items-center justify-content-center">
      <Box className="d-flex flex-wrap w-100 mt-5 mb-5 justify-content-evenly align-items-center">
        {["user", "admin"].map((item, index) => {
          return (
            <Badge color={userType === item ?"success": "none"} overlap="circular" variant="dot">
            <Card
              style={{ width: 250, height: 250, cursor: "pointer", margin: 10 }}
              key={index}
            >
              <CardActionArea
                onClick={() => handleUserSelection(item)}
                data-active={userType === item}
                sx={{
                  height: "100%",
                  backgroundColor: "white",
                  transition: "background-color 0.3s",
                  "&.MuiButtonBase-root, &.MuiCardActionArea-root": {
                    backgroundColor:
                      userType === item ? "action.selected" : "white !important",
                  },
                }}
              >
                <CardContent className="w-100 h-100 text-center">
                  <Typography className="brand-name">
                    {index == 0 ? (
                      <Person color="primary" sx={{ zoom: 3, mb: 1 }} />
                    ) : (
                      <ManageAccounts color="primary" sx={{ zoom: 3, mb: 1 }} />
                    )}{" "}
                    <br /> I am <br /> {item}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
            </Badge>
          );
        })}
      </Box>

      {showAdminForm ? (
        <Box sx={{ mt: 0, width: "100%", maxWidth: 420 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Admin verification
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Registered email address"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  fullWidth
                  size="small"
                />

                <Button
                  variant="contained"
                  onClick={handleSendOtp}
                  disabled={isLoading || !adminEmail}
                >
                  {isLoading ? "Sending..." : "Send OTP"}
                </Button>

                {otpSent ? (
                  <>
                    <TextField
                      label="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      fullWidth
                      size="small"
                    />

                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleVerifyOtp}
                      disabled={isLoading || !otp}
                    >
                      {isLoading ? "Verifying..." : "Verify OTP & Continue"}
                    </Button>
                  </>
                ) : null}

                {message.text ? (
                  <Alert severity={message.type || "info"}>{message.text}</Alert>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      ) : null}
    </Box>
  );
}
