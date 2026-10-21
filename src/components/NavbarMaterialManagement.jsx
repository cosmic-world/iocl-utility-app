import React, { useState, useEffect } from "react";
import { Button } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { NavBarComponent, SetSelectedApplication } from "../action/userSlice";

export default function NavbarMaterialManagement() {
  const dispatch = useDispatch();
  const { navBarComponent, userType } = useSelector((state) => state.myApp);
  return (
    <div
      className="d-flex flex-column flex-xxl-row justify-content-center align-items-center"
      style={{
        borderBottom: "1px solid black",
        width: "100%",
      }}
    >
      <Button
        variant={navBarComponent === "iocl_incoming" ? "contained" : "outlined"}
        color="warning"
        sx={{
          my: 1,
          mx: 5,
          backgroundColor:
            navBarComponent === "iocl_incoming" ? "null" : "white",
        }}
        onClick={() => {
          dispatch(SetSelectedApplication("IOCL Incoming"));
          dispatch(NavBarComponent("iocl_incoming"));
        }}
        disabled={userType == "User"}
      >
        IOCL Incoming
      </Button>
      <Button
        variant={
          navBarComponent === "iocl_non_return" ? "contained" : "outlined"
        }
        color="warning"
        sx={{
          my: 1,
          mx: 5,
          backgroundColor:
            navBarComponent === "iocl_non_return" ? "null" : "white",
        }}
        onClick={() => {
          dispatch(SetSelectedApplication("IOCL Non-Returnable"));
          dispatch(NavBarComponent("iocl_non_return"));
        }}
      >
        IOCL Non-Returnable
      </Button>
      <Button
        variant={
          navBarComponent === "iocl_returnable" ? "contained" : "outlined"
        }
        color="warning"
        sx={{
          my: 1,
          mx: 5,
          backgroundColor:
            navBarComponent === "iocl_returnable" ? "null" : "white",
        }}
        onClick={() => {
          dispatch(SetSelectedApplication("IOCL Returnable"));
          dispatch(NavBarComponent("iocl_returnable"));
        }}
      >
        IOCL Returnable
      </Button>
      <Button
        variant={
          navBarComponent === "contractor_incoming" ? "contained" : "outlined"
        }
        color="warning"
        sx={{
          my: 1,
          mx: 5,
          backgroundColor:
            navBarComponent === "contractor_incoming" ? "null" : "white",
        }}
        onClick={() => {
          dispatch(SetSelectedApplication("Contractor Incoming"));
          dispatch(NavBarComponent("contractor_incoming"));
        }}
        disabled={userType == "User"}
      >
        Contractor Incoming
      </Button>
      <Button
        variant={
          navBarComponent === "contractor_non_return" ? "contained" : "outlined"
        }
        color="warning"
        sx={{
          my: 1,
          mx: 5,
          backgroundColor:
            navBarComponent === "contractor_non_return" ? "null" : "white",
        }}
        onClick={() => {
          dispatch(SetSelectedApplication("Contractor Non-Returnable"));
          dispatch(NavBarComponent("contractor_non_return"));
        }}
      >
        Contractor Non-Returnable
      </Button>
      <Button
        variant={
          navBarComponent === "contractor_return" ? "contained" : "outlined"
        }
        color="warning"
        sx={{
          my: 1,
          mx: 5,
          backgroundColor:
            navBarComponent === "contractor_return" ? "null" : "white",
        }}
        onClick={() => {
          dispatch(SetSelectedApplication("Contractor Returnable"));
          dispatch(NavBarComponent("contractor_return"));
        }}
      >
        Contractor Returnable
      </Button>
    </div>
  );
}
