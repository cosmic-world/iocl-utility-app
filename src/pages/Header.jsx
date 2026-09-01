import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Typewriter from "typewriter-effect";
import { NavBarComponent, SetSelectedApplication } from "../action/userSlice";
import MenuIcon from "@mui/icons-material/Menu";
import { Menu, MenuItem, Divider } from "@mui/material";

export default function Header({}) {
  const dispatch = useDispatch();
  const { navBarComponent, selectedApplication, userType } = useSelector(
    (state) => state.myApp,
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [anchorE1, setAnchorE1] = React.useState(null);
  const open = Boolean(anchorE1);
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
        border: "1px solid #0d6efd",
        borderLeft: "none",
        borderRight: "none",
      }}
    >
      {navBarComponent != "" && navBarComponent != "home"? (
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
              selected={navBarComponent == "home"}
              onClick={() => {
                dispatch(NavBarComponent("home"));
                dispatch(SetSelectedApplication("USER TYPE"));
                setAnchorE1(null);
              }}
              className="d-flex justify-content-center"
            >
              User Role Selection
            </MenuItem>
            <Divider className="bg-dark" />
            <MenuItem
              selected={navBarComponent == "home2"}
              onClick={() => {
                dispatch(NavBarComponent("home2"));
                dispatch(SetSelectedApplication("APPLICATION SELECTION"));
                setAnchorE1(null);
              }}
              disabled={userType == "" ? true : false}
              className="d-flex justify-content-center"
            >
              Application Selection
            </MenuItem>
            <Divider className="bg-dark" />
            <MenuItem
              selected={navBarComponent == "officer_cred"}
              className="d-flex justify-content-center"
              disabled={userType == "user"}
              onClick={() => {
                dispatch(NavBarComponent("officer_cred"));
                dispatch(SetSelectedApplication("ADMIN CONTROL"));
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
                dispatch(SetSelectedApplication("CONTACTS"));
                setAnchorE1(null);
              }}
            >
              Contacts
            </MenuItem>
          </Menu>
        </>
      ) : null}

      <MenuIcon
        style={{
          cursor: navBarComponent != "" && navBarComponent != "home"? "pointer" : "default",
          zoom: 1.5,
          color: "white",
          height: "100%",
          backgroundColor: "#0d6efd",
        }}
        onClick={(event) =>
          navBarComponent != "" && navBarComponent != "home"? setAnchorE1(event.currentTarget) : null
        }
      />
      {/* current date-time stamp display */}
      <div
        className="d-none d-xxl-flex justify-content-center align-items-center h-100 w-25"
        style={{
          color: "#0d6efd",
          fontWeight: "bold",
        }}
      >
        <label>
          {currentTime.toLocaleDateString("en-GB").replace(/\//g, "-")}{" "}
          {currentTime.toLocaleTimeString("en-GB", { hour12: false })}
        </label>
      </div>

      <div
        className={`header-locationName h-100 w-50
      d-none d-xxl-flex justify-content-center align-items-center text-white user-select-none`}
      >
        {selectedApplication}
      </div>

      <div
        className="d-none d-xxl-flex justify-content-center align-items-center h-100 w-25"
        style={{
          color: "#0d6efd",
          fontWeight: "bold",
          borderRight: userType!=""?"1px solid #0d6efd":null,
        }}
      >
        <label>{`Developed by Manas Roy`}</label>
      </div>
      {userType!=""?
      <div
        className="d-none d-xxl-flex justify-content-center align-items-center h-100"
        style={{
          color: "#0d6efd",
          fontWeight: "bold",
          width: 200,
        }}
      >
        <label>{`Role:`}&nbsp;</label>
        <label style={{ color: "orange" }}>{`${userType}`}</label>
      </div>
      :null}
    </div>
  );
}
