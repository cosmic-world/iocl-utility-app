import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  NavBarComponent,
  ResetAppState,
  SetSelectedApplication,
} from "../action/userSlice";
import MenuIcon from "@mui/icons-material/Menu";
import Download from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import BadgeIcon from "@mui/icons-material/Badge";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Menu,
  MenuItem,
  Divider,
  Button,
} from "@mui/material";
import persistSessionStorage from "redux-persist/lib/storage/session";
import RoleRestrictedTooltip from "../components/RoleRestrictedTooltip";

const SESSION_EXPIRY_KEY = "ioclSessionExpiresAt";
// const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const SESSION_DURATION_MS = 10 * 1000;

function signOut(dispatch, showExpiryAlert = false) {
  dispatch(ResetAppState());
  dispatch(NavBarComponent("sign-in"));
  dispatch(SetSelectedApplication("Sign In"));
  window.sessionStorage.clear();
  persistSessionStorage.removeItem("persist:root");
  if (showExpiryAlert) {
    window.setTimeout(() => {
      window.alert("Your session has expired. Please sign in again.");
    }, 0);
  }
}

export default function Header({}) {
  const dispatch = useDispatch();
  const {
    navBarComponent,
    selectedApplication,
    userType,
    selectedTerminal,
    authorized,
    userName,
  } = useSelector((state) => state.myApp);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [anchorE1, setAnchorE1] = React.useState(null);
  const open = Boolean(anchorE1);

  const manuals = [
    {
      label: "TT Crew Temporary Pass Manual",
      href: `${process.env.PUBLIC_URL}/manuals/TT-Crew-Temporary-Pass-User_Manual.pdf`,
      filename: "TT-Crew-Temporary-Pass-User_Manual.pdf",
    },
    {
      label: "Permit Dashboard Manual",
      href: `${process.env.PUBLIC_URL}/manuals/Permit-Dashboard-User_Manual.pdf`,
      filename: "Permit-Dashboard-User_Manual.pdf",
    },
    {
      label: "Worker Entry Manual",
      href: `${process.env.PUBLIC_URL}/manuals/Worker-Entry-User_Manual.pdf`,
      filename: "Worker-Entry-User_Manual.pdf",
    },
  ];
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // update every 1 second
    return () => clearInterval(interval); // cleanup
  }, []);

  useEffect(() => {
    if (!authorized) {
      window.sessionStorage.removeItem(SESSION_EXPIRY_KEY);
      return undefined;
    }

    let expiresAt = Number(window.sessionStorage.getItem(SESSION_EXPIRY_KEY));
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
      expiresAt = Date.now() + SESSION_DURATION_MS;
      window.sessionStorage.setItem(SESSION_EXPIRY_KEY, String(expiresAt));
    }

    const timeout = window.setTimeout(
      () => signOut(dispatch, true),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [authorized, dispatch]);

  return (
    <div
      className="d-flex align-items-center"
      style={{
        fontFamily: "Lucida Sans",
        fontSize: "1.4rem",
        height: 50,
        backgroundColor: "white",
        border: "1px solid #1976d2",
        borderLeft: "none",
        borderRight: "none",
        justifyContent: "center",
      }}
    >
      {userType != "" ? (
        <>
          <Menu
            id="profile-dropdown"
            anchorEl={anchorE1}
            open={open}
            aria-hidden={false}
            onClose={() => setAnchorE1(null)}
            MenuListProps={{ sx: { paddingTop: 0, paddingBottom: 0 } }}
            slotProps={{
              paper: {
                sx: {
                  width: "fit-content",
                  "& .MuiMenuItem-root": {
                    fontFamily: "Candara",
                    fontSize: "1.2rem",
                    color: "black",
                    textAlign: "center !Important",
                  },
                },
              },
            }}
          >
            <RoleRestrictedTooltip show={userType == ""}>
              <MenuItem
                selected={navBarComponent == "home2"}
                onClick={() => {
                  dispatch(NavBarComponent("home2"));
                  dispatch(SetSelectedApplication("Application Dashboard"));
                  setAnchorE1(null);
                }}
                disabled={userType == "" ? true : false}
                className="d-flex justify-content-center p-3"
              >
                Application Dashboard
              </MenuItem>
            </RoleRestrictedTooltip>
            <Divider className="bg-dark m-0" />
            <RoleRestrictedTooltip
              show={userType == "User" || userType == "Contractor"}
            >
              <MenuItem
                selected={navBarComponent == "officer_cred"}
                className="d-flex justify-content-center p-3"
                disabled={userType == "User" || userType == "Contractor"}
                onClick={() => {
                  dispatch(NavBarComponent("officer_cred"));
                  dispatch(SetSelectedApplication("Admin Control"));
                  setAnchorE1(null);
                }}
              >
                Admin Control
              </MenuItem>
            </RoleRestrictedTooltip>
            <Divider className="bg-dark m-0" />
            <MenuItem
              selected={navBarComponent == "contacts"}
              className="d-flex justify-content-center p-3"
              onClick={() => {
                dispatch(NavBarComponent("contacts"));
                dispatch(SetSelectedApplication("Contacts"));
                setAnchorE1(null);
              }}
            >
              Contacts
            </MenuItem>
            <Divider className="bg-dark m-0" />
            <MenuItem className="p-0">
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  width: "100%",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    justifyContent: "center",
                    position: "relative",
                    "& .MuiAccordionSummary-content": {
                      flexGrow: 0,
                      margin: 1.5,
                    },
                    "& .MuiAccordionSummary-expandIconWrapper": {
                      position: "absolute",
                      right: 8,
                    },
                  }}
                >
                  <Button
                    size="small"
                    sx={{
                      minWidth: 0,
                      fontSize: "1.08rem",
                      textTransform: "none",
                      fontFamily: "Lucida Sans",
                      fontWeight: "normal",
                    }}
                  >
                    Help Manuals
                  </Button>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: 0 }}>
                  {manuals.map((manual, index) => (
                    <React.Fragment key={manual.href}>
                      {
                        <Divider
                          variant="middle"
                          component="li"
                          className="my-0"
                        />
                      }
                      <MenuItem
                        component="a"
                        href={manual.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setAnchorE1(null)}
                        className="d-flex justify-content-center p-3"
                        style={{ fontSize: "17px" }}
                      >
                        <Download sx={{ mr: 1, color: "#1976d2" }} />
                        {manual.label}
                      </MenuItem>
                    </React.Fragment>
                  ))}
                </AccordionDetails>
              </Accordion>
            </MenuItem>
            <Divider className="bg-dark m-0" />
            {authorized ? (
              <MenuItem
                selected={navBarComponent == "sign-out"}
                className="d-flex justify-content-center p-3"
                onClick={() => {
                  signOut(dispatch);
                  setAnchorE1(null);
                }}
              >
                Sign Out
              </MenuItem>
            ) : null}
          </Menu>
        </>
      ) : null}

      {userType!="User" && userType!="" ? (
<div
          className="d-xxl-none d-flex justify-content-center align-items-center h-100 mx-1 ms-2"
          title={userName}
          style={{
            color: "#1976d2",
            fontWeight: "bold",
            borderRight: userType != "" ? "1px solid #1976d2" : null,
            overflow: "hidden",
            position: "absolute",
            left: 0,
          }}
        >
          <label style={{fontSize:'1rem', flexShrink: 0}}>{`Welcome!`}&nbsp;</label>
          <label
            style={{
              color: "orange",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize:'1rem', 
            }}
          >{`${userName
            .trim()
            .replace(/_/g, " ")
            .replace(/\s+/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .replace(/_/g, " ")}`}</label>
                      <AccountCircleIcon
              style={{ color: "#1976d2", fontSize: "1.8rem", paddingTop: 1 }}
            />
        </div>
) : null}

      <MenuIcon
        style={{
          cursor: userType != "" ? "pointer" : "default",
          zoom: 1.5,
          color: "white",
          height: "100%",
          backgroundColor: "#1976d2",
        }}
        onClick={(event) =>
          userType != "" ? setAnchorE1(event.currentTarget) : null
        }
      />
      {userType ? (
      <div
          className="d-flex d-xxl-none justify-content-center align-items-center h-100 mx-1 me-2"
          style={{
            color: "#1976d2",
            fontWeight: "bold",
            position: "absolute",
            right: 0,
          }}
        >
          <BadgeIcon style={{ color: "#1976d2", fontSize: "1.8rem", paddingBottom: 1 }} />
          <label style={{fontSize:'1rem', paddingTop:4}}>{`Role:`}&nbsp;</label>
          <label style={{ fontSize:'1rem', paddingTop:4, color: "orange" }}>{`${
            userType == "User"
              ? "Viewer"
              : userType
                  .trim()
                  .replace(/_/g, " ")
                  .replace(/\s+/g, " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (char) => char.toUpperCase())
                  .replace(/_/g, " ")
          }`}</label>
        </div>
        ) : null}
      {/* current date-time stamp display */}
      <div
        className="d-none d-xxl-flex justify-content-center align-items-center h-100"
        style={{
          color: "#1976d2",
          fontWeight: "bold",
          width: "300px",
        }}
      >
        <label>
          {currentTime.toLocaleDateString("en-GB").replace(/\//g, "-")}{" "}
          {currentTime.toLocaleTimeString("en-GB", { hour12: false })}
        </label>
      </div>

      <div
        className={`header-locationName h-100 flex-grow-1
      d-none d-xxl-flex justify-content-center align-items-center text-white user-select-none`}
      >
        {`${selectedApplication} ${selectedTerminal != "" ? "-" : ""} ${selectedTerminal[1] || ""}`}
      </div>

      {userName ? (
        <div
          className="d-none d-xxl-flex justify-content-center align-items-center h-100 mx-1"
          title={userName}
          style={{
            color: "#1976d2",
            fontWeight: "bold",
            borderRight: userType != "" ? "1px solid #1976d2" : null,
            width: 300,
            overflow: "hidden",
          }}
        >
          <label style={{ flexShrink: 0 }}>{`Welcome!`}&nbsp;</label>
          <label
            style={{
              color: "orange",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >{`${userName
            .trim()
            .replace(/_/g, " ")
            .replace(/\s+/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .replace(/_/g, " ")}`}</label>
        </div>
      ) : null}

      {userType != "" ? (
        <div
          className="d-none d-xxl-flex justify-content-center align-items-center h-100"
          style={{
            color: "#1976d2",
            fontWeight: "bold",
            width: 250,
          }}
        >
          <label>{`Role:`}&nbsp;</label>
          <label style={{ color: "orange" }}>{`${
            userType == "User"
              ? "Viewer"
              : userType
                  .trim()
                  .replace(/_/g, " ")
                  .replace(/\s+/g, " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (char) => char.toUpperCase())
                  .replace(/_/g, " ")
          }`}</label>
        </div>
      ) : null}

      <div
        className="d-none d-xxl-flex justify-content-center align-items-center h-100"
        style={{
          color: "#6c757d",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: "1.2rem",
          borderLeft: userType != "" ? "1px solid #1976d2" : null,
          width: 250,
        }}
      >
        <label>{`Developed by Manas Roy`}</label>
      </div>
    </div>
  );
}
