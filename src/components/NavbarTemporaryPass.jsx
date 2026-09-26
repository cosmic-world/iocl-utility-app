import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@mui/material";
import RoleRestrictedTooltip from "../components/RoleRestrictedTooltip";
import { NavBarComponent, SetSelectedApplication } from "../action/userSlice";

export default function NavbarTemporaryPass() {
  const dispatch = useDispatch();
  const { navBarComponent, userType } = useSelector((state) => state.myApp);
  return (
    <div
      className="d-flex flex-column flex-xxl-row justify-content-center align-items-center"
      style={{
        borderBottom: "1px solid black",
        width: "100%",
        marginBottom: "10px",
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
          dispatch(SetSelectedApplication("TT Crew Temporary Pass Dashboard"));
          dispatch(NavBarComponent("tempPassHistory"));
        }}
      >
        Temporary Pass Dashboard
      </Button>
      <RoleRestrictedTooltip
        show={userType == "User" || userType == "Contractor"}
      >
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
          disabled={userType == "User" || userType == "Contractor"}
        >
          TT Crew Master Data (Admin Only)
        </Button>
      </RoleRestrictedTooltip>
    </div>
  );
}
