import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@mui/material";
import RoleRestrictedTooltip from "./RoleRestrictedTooltip";
import { Sync } from "@mui/icons-material";
import { NavBarComponent, SetSelectedApplication } from "../action/userSlice";
import FormControlPage from "../pages/formControlPage";

export default function NavbarPermit() {
  const dispatch = useDispatch();
  const { navBarComponent, userType } = useSelector((state) => state.myApp);
  const [show, setShow] = useState(false);
  return (
    <div style={{ width: "100%" }}>
      <FormControlPage show={show} setShow={setShow} />

      <div
        className="d-flex flex-column flex-xxl-row justify-content-center align-items-center"
        style={{
          border: "1px solid black",
          width: "100%",
          borderTop: "none",
        }}
      >
        <RoleRestrictedTooltip show={userType == "User"}>
          <Button
            variant={
              navBarComponent === "formControl" ? "contained" : "outlined"
            }
            color="warning"
            disabled={userType == "User"}
            sx={{
              my: 1,
              mx: 5,
              backgroundColor:
                navBarComponent === "formControl" ? "null" : "white",
            }}
            onClick={() => {
              setShow(true);
            }}
          >
            Permit Request Form
          </Button>
        </RoleRestrictedTooltip>
        <Button
          variant={
            navBarComponent === "permitDisplay" ? "contained" : "outlined"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "permitDisplay" ? "null" : "white",
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("Permit Display Table View"));
            dispatch(NavBarComponent("permitDisplay"));
          }}
        >
          Permit Table View
        </Button>
        <Button
          variant={
            navBarComponent === "layoutDisplay" ? "contained" : "outlined"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "layoutDisplay" ? "null" : "white",
            "&:disabled": {
              cursor: "not-allowed",
              backgroundColor: "white",
              pointerEvents: "all !important",
            },
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("Permit Display Layout View"));
            dispatch(NavBarComponent("layoutDisplay"));
          }}
          disabled={window.innerWidth < 768}
        >
          Permit Layout View (Desktop Only)
        </Button>
        <RoleRestrictedTooltip
          show={userType == "User" || userType == "Contractor"}
        >
          <Button
            variant={
              navBarComponent === "modifyRecords" ? "contained" : "outlined"
            }
            color="warning"
            sx={{
              my: 1,
              mx: 5,
              backgroundColor:
                navBarComponent === "modifyRecords" ? "null" : "white",
              "&:disabled": {
                cursor: "not-allowed",
                backgroundColor: "white",
                pointerEvents: "all !important",
              },
            }}
            onClick={() => {
              dispatch(SetSelectedApplication("Modify Permit Records"));
              dispatch(NavBarComponent("modifyRecords"));
            }}
            disabled={userType == "User" || userType == "Contractor"}
          >
            Modify Records (Admin Only)
          </Button>
        </RoleRestrictedTooltip>
      </div>
    </div>
  );
}
