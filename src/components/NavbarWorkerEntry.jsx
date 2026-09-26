import React, { useState, useEffect } from "react";
import {
  Button,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { NavBarComponent, SetSelectedApplication } from "../action/userSlice";
import RoleRestrictedTooltip from "../components/RoleRestrictedTooltip";

export default function NavbarWorkerEntry() {
      const dispatch = useDispatch();
      const {
        navBarComponent,
        userType,
      } = useSelector((state) => state.myApp);
  return (
          <div
        className="d-flex flex-column flex-xxl-row justify-content-center align-items-center"
        style={{
          border: "1px solid black",
          width: "100%",
        }}
      >
        <RoleRestrictedTooltip show={userType == "User"}>
          <Button
            variant={
              navBarComponent === "labourPassDashboard"
                ? "contained"
                : "outlined"
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
        </RoleRestrictedTooltip>
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
            dispatch(SetSelectedApplication("Worker Pass History"));
            dispatch(NavBarComponent("labourPassHistory"));
          }}
        >
          APPROVAL HISTORY
        </Button>
        <RoleRestrictedTooltip show={userType == "User"}>
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
                navBarComponent === "contractor_masterData"
                  ? "null"
                  : "white",
            }}
            onClick={() => {
              dispatch(SetSelectedApplication("Worker Master Data"));
              dispatch(NavBarComponent("contractor_masterData"));
            }}
            disabled={userType == "User"}
          >
            Worker Master Data
          </Button>
        </RoleRestrictedTooltip>
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
          // disabled={userType == "User"}
        >
          Contractor Master Data
        </Button>
      </div>
  )
}
