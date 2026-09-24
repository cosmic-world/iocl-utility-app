import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  NavBarComponent,
  ResetAppState,
  SetSelectedApplication,
} from "../action/userSlice";
import MenuIcon from "@mui/icons-material/Menu";
import Download from "@mui/icons-material/Download";
import { Button, Menu, MenuItem, Divider, Tooltip } from "@mui/material";
import persistSessionStorage from "redux-persist/lib/storage/session";

export default function Header({}) {
  const dispatch = useDispatch();
  const { navBarComponent, selectedApplication, userType, selectedTerminal, authorized } =
    useSelector((state) => state.myApp);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [anchorE1, setAnchorE1] = React.useState(null);
  const open = Boolean(anchorE1);

  const manual = String(selectedApplication || "").includes("TT Crew")
    ? {
        href: `${process.env.PUBLIC_URL}/manuals/tt-crew-temporary-pass.html`,
        filename: "TT-Crew-Temporary-Pass-User-Manual.html",
      }
    : String(selectedApplication || "").includes("Permit")
      ? {
          href: `${process.env.PUBLIC_URL}/manuals/permit-dashboard.html`,
          filename: "Permit-Dashboard-User-Manual.html",
        }
      : [
            "Labour Entry",
            "Worker Entry",
            "Worker Pass",
            "Worker Master",
            "Contractor Master",
          ].some((label) => String(selectedApplication || "").includes(label))
        ? {
            href: `${process.env.PUBLIC_URL}/manuals/worker-entry.html`,
            filename: "Worker-Entry-User-Manual.html",
          }
        : null;
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // update every 1 second
    return () => clearInterval(interval); // cleanup
  }, []);
  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{
        fontFamily: "Lucida Sans",
        fontSize: "1.4rem",
        height: 50,
        backgroundColor: "white",
        border: "1px solid #1976d2",
        borderLeft: "none",
        borderRight: "none",
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
            <MenuItem
              selected={navBarComponent == "home2"}
              onClick={() => {
                dispatch(NavBarComponent("home2"));
                dispatch(SetSelectedApplication("Application Dashboard"));
                setAnchorE1(null);
              }}
              disabled={userType == "" ? true : false}
              className="d-flex justify-content-center"
            >
              Application Dashboard
            </MenuItem>
            <Divider className="bg-dark" />
            <MenuItem
              selected={navBarComponent == "officer_cred"}
              className="d-flex justify-content-center"
              disabled={userType == "user"}
              onClick={() => {
                dispatch(NavBarComponent("officer_cred"));
                dispatch(SetSelectedApplication("Admin Control"));
                setAnchorE1(null);
              }}
            >
              Admin Control
            </MenuItem>
            <Divider className="bg-dark" />
            <MenuItem
              selected={navBarComponent == "contacts"}
              className="d-flex justify-content-center"
              onClick={() => {
                dispatch(NavBarComponent("contacts"));
                dispatch(SetSelectedApplication("Contacts"));
                setAnchorE1(null);
              }}
            >
              Contacts
            </MenuItem>
            {/* <Divider className="bg-dark" /> */}
            {/* <Tooltip
              title={
                manual
                  ? "Download user manual"
                  : "Manual unavailable for this view"
              }
            >
              <MenuItem className="d-flex justify-content-center">
                <Button
                  component={manual ? "a" : "button"}
                  href={manual?.href}
                  download={manual?.filename}
                  disabled={!manual}
                  size="small"
                  startIcon={<Download />}
                  sx={{
                    width: "100%",
                    height: "100%",
                    whiteSpace: "nowrap",
                    fontFamily: "Lucida Sans",
                  }}
                >
                  Help Manual
                </Button>
              </MenuItem>
            </Tooltip> */}
            <Divider className="bg-dark" />
            {authorized?
            <MenuItem
              selected={navBarComponent == "sign-out"}
              className="d-flex justify-content-center"
              onClick={() => {
                dispatch(ResetAppState());
                dispatch(NavBarComponent("sign-in"));
                dispatch(SetSelectedApplication("Sign In"));
                window.sessionStorage.clear();
                persistSessionStorage.removeItem("persist:root");
                setAnchorE1(null);
              }}
            >
              Sign Out
            </MenuItem>
            :null}
          </Menu>
        </>
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
      {/* current date-time stamp display */}
      <div
        className="d-none d-xxl-flex justify-content-center align-items-center h-100 w-25"
        style={{
          color: "#1976d2",
          fontWeight: "bold",
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

      <div
        className="d-none d-xxl-flex justify-content-center align-items-center h-100"
        style={{
          color: "#1976d2",
          fontWeight: "bold",
          borderRight: userType != "" ? "1px solid #1976d2" : null,
          width: 400,
        }}
      >
        <label>{`Developed by Manas Roy`}</label>
      </div>
      {userType != "" ? (
        <div
          className="d-none d-xxl-flex justify-content-center align-items-center h-100"
          style={{
            color: "#1976d2",
            fontWeight: "bold",
            width: 300,
          }}
        >
          <label>{`Role:`}&nbsp;</label>
          <label
            style={{ color: "orange" }}
          >{`${userType.toUpperCase().replace(/_/g, " ")}`}</label>
        </div>
      ) : null}
    </div>
  );
}
