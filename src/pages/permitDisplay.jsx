import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Table from "react-bootstrap/Table";
import "../css/page_layout.css";
import { NavBarComponent, SetSelectedApplication } from "../action/userSlice";
import { Button } from "@mui/material";

export default function PermitDisplay() {
  const dispatch = useDispatch();
  const { PermitList, navBarComponent, userType } = useSelector(
    (state) => state.myApp,
  );
  const [startIndex, setstartIndex] = useState(0);
  const $table = document.querySelector(".ttes_table_view");
  const $table_height = $table ? $table.clientHeight : 500;
  const $thead = document.querySelector(".table-head");
  const $thead_height = $thead ? $thead.clientHeight : 50;
  const tbody_rows_count = Math.floor(($table_height - $thead_height) / 45) - 1;
  const step = tbody_rows_count;

  const [clock, setClock] = React.useState(0);

  useEffect(() => {
    setInterval(() => {
      if (clock > 5000) {
        setClock(0);
      } else {
        setClock((prevTemp) => prevTemp + 1);
      }
    }, 5000);
  }, []);

  // useEffect(() => {
  //   window.location.reload()
  // }, []);

  useEffect(() => {
    setstartIndex((prevState) =>
      prevState + step < PermitList.length ? prevState + step : 0,
    );
  }, [clock]);

  return (
    <div
      className={
        "d-flex flex-column justify-content-start align-items-center w-100 h-100 p-0"
      }
      style={{
        overflow: "none",
        overflowX: "auto",
        backgroundColor: "#dee4ea",
      }}
    >
      <div
        className="d-flex flex-column flex-xxl-row justify-content-center align-items-center"
        style={{
          border: "1px solid black",
          width: "100%",
          borderTop: "none",
        }}
      >
        <Button
          variant={navBarComponent === "formControl" ? "contained" : "outlined"}
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "formControl" ? "null" : "white",
          }}
          onClick={() => {
            dispatch(SetSelectedApplication("TT Crew Temporary Pass Request"));
            dispatch(NavBarComponent("formControl"));
          }}
        >
          Permit Request Form
        </Button>
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
            dispatch(
              SetSelectedApplication("TT Crew Temporary Pass Dashboard"),
            );
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
            dispatch(SetSelectedApplication("TT Crew Master Data"));
            dispatch(NavBarComponent("layoutDisplay"));
          }}
          disabled={window.innerWidth < 768}
        >
          Permit Layout View (Desktop Only)
        </Button>
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
            dispatch(SetSelectedApplication("Modify Records"));
            dispatch(NavBarComponent("modifyRecords"));
          }}
          disabled={userType !== "admin"}
        >
          Modify Records (Admin Only)
        </Button>
      </div>

      <div className="ttes_table_view m-2">
        <Table bordered hover className="ttes_table">
          <thead className="table-head">
            <tr>
              <th>DATE</th>
              <th>PERMIT TYPE</th>
              <th>WORK DESCRIPTION</th>
              <th>WORK LOCATION</th>
              <th>OFFICER NAME</th>
              <th>CLEARANCE FROM</th>
              <th>CLEARANCE TILL</th>
              <th>CONTRACTOR NAME</th>
              <th>CONTRACTOR SUPERVISOR</th>
              <th>LOCATION NAME</th>
              <th>DIVISION</th>
            </tr>
          </thead>
          <tbody
            style={{
              overflow: "hidden",
            }}
          >
            {Array.from({ length: tbody_rows_count }, (_, i) => {
              const permit = PermitList[i + startIndex];
              return (
                <tr key={i}>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Date"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Permit Type"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Work Description"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Work Location"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Receiver Name"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Clearance From"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Clearance Till"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Contractor Name"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Contractor Supervisor"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Location Name"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Division"] : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
