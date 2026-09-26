import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Table from "react-bootstrap/Table";
import "../css/page_layout.css";
import ReactApexChart from "react-apexcharts";
import {
  Button,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  Select,
  CircularProgress,
} from "@mui/material";
import NavbarPermit from "../components/NavbarPermit";

export default function LayoutDisplay({ state, handleReadMail }) {
  const { PermitList, selectedTerminal, officerList } = useSelector(
    (state) => state.myApp,
  );
  const [saveLoader, setSaveLoader] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [rowNumber, setRowNumber] = useState(null);
  const [oldrowNumber, setOldRowNumber] = useState(null);
  const [mark, setMark] = useState("new");
  const locationName = selectedTerminal[selectedTerminal.length - 1];
  const [startIndex, setstartIndex] = useState(0);
  const $table = document.querySelector(".ttes_table_div");
  const $table_height = $table ? $table.clientHeight : 500;
  const $thead = document.querySelector(".table-head");
  const $thead_height = $thead ? $thead.clientHeight : 50;
  const tbody_rows_count = Math.floor(($table_height - $thead_height) / 50);
  const step = tbody_rows_count;
  const [clock, setClock] = React.useState(0);
  const officerListForLocation = officerList;
  const uniquePermitList = [
    ...new Map(PermitList.map((item) => [item["Permit No"], item])).values(),
  ];

  useEffect(() => {
    setInterval(() => {
      if (clock > 5000) {
        setClock(0);
      } else {
        setClock((prevTemp) => prevTemp + 1);
      }
    }, 10000);
  }, []);

  useEffect(() => {
    setstartIndex((prevState) =>
      prevState + step < uniquePermitList.length ? prevState + step : 0,
    );
  }, [clock]);

  const handleClick = (e, value) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setMenuPosition({
      mouseX: e.clientX,
      mouseY: e.clientY,
    });

    setMarkerPosition({
      mouseX: x,
      mouseY: y,
    });
    setMark(value);
  };
  const handleSelect = (value, index) => {
    setRowNumber(index);
  };

  const handleMenuClose = () => {
    setMenuPosition(null);
    setRowNumber(null);
    setOldRowNumber(null);
    setMark("new");
  };

  const sheet_url = `https://script.google.com/macros/s/AKfycbzWr167t9azcmb8iEHUYwdjuf77mFuOuA6i1F07QYIKbJHY47UjVitbgW7cCkOrhvA/exec`;
  const handleSubmit = async () => {
    const x_list = uniquePermitList.filter(
      (val) => val["Unique ID"] === oldrowNumber,
    );
    const x = x_list.length > 0 ? x_list[0].page_left : null;
    const y = x_list.length > 0 ? x_list[0].page_top : null;
    setSaveLoader(true);
    try {
      await fetch(sheet_url, {
        method: "POST",
        // mode: "no-cors",
        body: new URLSearchParams({
          row: rowNumber,
          updates: JSON.stringify([
            { col: 12, value: mark === "existing" ? y : markerPosition.mouseY },
            { col: 13, value: mark === "existing" ? x : markerPosition.mouseX },
          ]),
        }),
      });
      mark != "existing" ? setSaveLoader(false) : null;
      handleMenuClose();
    } catch (error) {
      console.log(
        "error layout new...",
        `${error} and also check internet connection`,
      );
    }
    if (mark === "existing") {
      try {
        await fetch(sheet_url, {
          method: "POST",
          mode: "no-cors",
          body: new URLSearchParams({
            row: oldrowNumber,
            updates: JSON.stringify([
              { col: 12, value: "" },
              { col: 13, value: "" },
            ]),
          }),
        });
        setSaveLoader(false);
      } catch (error) {
        console.log(
          "error layout existing...",
          `${error} and also check internet connection`,
        );
      }
    }
  };

  const [imgExists, setImgExists] = useState(true);

  const imagePath = `${process.env.PUBLIC_URL}/asset/${locationName ? locationName.replace(/\s+/g, "_").toLowerCase() : ""}.png`;
  useEffect(() => {
    const img = new Image();
    img.src = imagePath;
    img.onload = () => setImgExists(true);
    img.onerror = () => setImgExists(false);
  }, [imagePath]);
  const findOfficerName = (item) => {
    const filteredOfficerName = officerListForLocation.find(
      (officer) => officer["Emp_ID"] == item,
    );
    if (filteredOfficerName) {
      return filteredOfficerName["OFFICER_NAME"];
    } else {
      return item;
    }
  };

  return (
    <>
      {saveLoader ? (
        <CircularProgress
          color="success"
          style={{
            position: "fixed",
            zIndex: 2000,
            zoom: 3,
            transform: "translate(-50%, -50%)",
            left: "50%",
            top: "50%",
          }}
        />
      ) : null}
      <Menu
        open={menuPosition !== null}
        onClose={() => handleMenuClose()}
        anchorReference="anchorPosition"
        anchorPosition={
          menuPosition !== null
            ? { top: menuPosition.mouseY + 5, left: menuPosition.mouseX + 5 }
            : undefined
        }
        MenuListProps={{
          sx: {
            paddingTop: 0,
            paddingBottom: 0,
          },
        }}
      >
        <MenuItem className="m-0 p-1">
          <Select
            defaultValue=""
            size="small"
            style={{ width: 300, fontFamily: "Lucida Sans", fontSize: 14 }}
          >
            {uniquePermitList
              .filter((val) => val.page_left == "" && val.page_top == "")
              .map((val, idx) => {
                const text = [
                  "Date",
                  "Permit Type",
                  "Permit No",
                  "Contractor Name",
                  "Work Description",
                  "Work Location",
                  "Receiver Name",
                  "Clearance From",
                  "Clearance Till",
                ]
                  .map(
                    (key) =>
                      `${key} : ${
                        key === "Receiver Name"
                          ? findOfficerName(val[key])
                          : key === "Work Description"
                            ? (val[key]?.split("/")[1] || val[key])?.slice(
                                0,
                                100,
                              )
                            : val[key] || ""
                      }`,
                  )
                  .join("\n");
                return (
                  <MenuItem
                    key={idx}
                    value={text}
                    onClick={() => {
                      handleSelect(text, val["Unique ID"]);
                    }}
                    style={{
                      fontFamily: "Lucida Sans",
                      fontSize: 14,
                      display: "block",
                    }}
                  >
                    <div className="w-100" style={{ whiteSpace: "pre-line" }}>
                      {text}
                    </div>
                    <Divider className="bg-dark mt-2" />
                  </MenuItem>
                );
              })}
          </Select>
        </MenuItem>
        <Divider className="bg-dark m-0" />
        <div className="w-100 d-flex justify-content-center">
          <Button
            variant="contained"
            size="large"
            className="m-2"
            onClick={() => handleSubmit()}
          >
            Submit
          </Button>
        </div>
      </Menu>
      <div
        className={
          "d-flex flex-column h-100 w-100 justify-content-start align-items-center"
        }
      >
        <NavbarPermit />

        <div
          className={
            "d-flex justify-content-center align-items-start w-100 h-75 p-2"
          }
          style={{
            overflow: "none",
            overflowX: "auto",
            backgroundColor: "#dee4ea",
          }}
        >
          <div
            className={
              "d-flex flex-column justify-content-center align-items-center"
            }
            style={{ width: "20%", marginRight: "20px" }}
          >
            <Table
              bordered
              hover
              style={{ backgroundColor: "white", marginBottom: "2rem" }}
              className="legend-table"
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>Color</th>
                  <th>Type of Permit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="d-flex justify-content-center">
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        backgroundColor: "#e7028c",
                        textAlign: "center",
                      }}
                    ></div>
                  </td>
                  <td>Hot Work</td>
                </tr>
                <tr>
                  <td className="d-flex justify-content-center">
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        backgroundColor: "#d9d90b",
                        marginTop: 2,
                        textAlign: "center",
                      }}
                    ></div>
                  </td>
                  <td>Cold Work</td>
                </tr>
                <tr>
                  <td className="d-flex justify-content-center">
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        backgroundColor: "#b9b5b5",
                        marginTop: 2,
                        textAlign: "center",
                      }}
                    ></div>
                  </td>
                  <td>Height Work</td>
                </tr>
                <tr>
                  <td className="d-flex justify-content-center">
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        backgroundColor: "#6ccded",
                        marginTop: 2,
                        textAlign: "center",
                      }}
                    ></div>
                  </td>
                  <td>Electrical Work</td>
                </tr>
              </tbody>
            </Table>
            <div
              id="chart"
              style={{ border: "1px solid black", backgroundColor: "white" }}
            >
              <ReactApexChart
                options={state.options}
                series={state.series}
                type="pie"
                width={window.innerWidth * 0.2}
              />
            </div>
          </div>
          <div className="d-flex flex-column h-100 w-100 justify-content-start align-items-center">
            <label
              className="d-flex w-100 justify-content-center align-items-center"
              style={{
                backgroundColor: "white",
                border: "1px solid black",
                borderBottom: 0,
                fontSize: "20px",
                fontWeight: "bold",
                fontFamily: "Lucida Sans",
                minHeight: "40px",
              }}
            >
              To show the work spot on the layout, double click the location on
              the layout and select the permit records from the dropdown
            </label>
            {imgExists ? (
              <div
                className="p-1 w-100"
                style={{
                  border: "1px solid black",
                  height: "calc(100% - 40px",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "98%",
                    cursor: "pointer",
                  }}
                  onDoubleClick={(e) => handleClick(e, "new")}
                >
                  <img
                    src={imagePath}
                    alt="layout"
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "block",
                    }}
                  />
                  {uniquePermitList.map((val, index) => {
                    return (
                      <Tooltip
                        key={index}
                        arrow
                        placement="right-start"
                        slotProps={{
                          tooltip: {
                            sx: {
                              backgroundColor: "#fff",
                              color: "black",
                              border: "1px solid #ccc",
                              fontSize: "12px",
                              fontFamily: "Lucida Sans",
                            },
                          },
                          arrow: {
                            sx: {
                              color: "#fff",
                            },
                          },
                        }}
                        title={
                          <Table bordered>
                            <tbody>
                              {[
                                "Date",
                                "Permit Type",
                                "Permit No",
                                "Contractor Name",
                                "Work Description",
                                "Work Location",
                                "Receiver Name",
                                "Clearance From",
                                "Clearance Till",
                              ].map((key) => {
                                const value =
                                  key === "Receiver Name"
                                    ? findOfficerName(val[key])
                                    : key === "Work Description"
                                      ? (
                                          val[key]?.split("/")[1] || val[key]
                                        )?.slice(0, 100)
                                      : val[key] || "";

                                return (
                                  <tr key={key}>
                                    <td>{key}</td>
                                    <td>{value}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        }
                      >
                        <div
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleClick(e, "existing");
                            setOldRowNumber(val["Unique ID"]);
                          }}
                          style={{
                            position: "absolute",
                            visibility:
                              val.page_left && val.page_top
                                ? "visible"
                                : "hidden",
                            zIndex: 1000,
                            cursor: "pointer",
                            zoom: 1,
                            top: `${val.page_top}%`,
                            left: `${val.page_left}%`,
                            height: 25,
                            width: 25,
                            borderRadius: "50%",
                            textAlign: "center",
                            fontWeight: "bold",
                            paddingTop: 0.5,
                            background:
                              val["Permit Type"] == "Hot Work"
                                ? "#e7028c"
                                : val["Permit Type"] == "Cold Work"
                                  ? "#d9d90b"
                                  : val["Permit Type"] == "Electrical Work"
                                    ? "#6ccded"
                                    : val["Permit Type"] == "Height Work"
                                      ? "#b9b5b5"
                                      : "#ccc",
                          }}
                        >
                          {index + 1}
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  border: "1px solid",
                  fontFamily: "Lucida Sans",
                  fontSize: "2rem",
                  fontWeight: "bold",
                }}
              >
                Layout Not Available
              </div>
            )}
          </div>
        </div>
        <div className="ttes_table_div px-2">
          <Table bordered hover className="ttes_table m-0">
            <thead className="table-head">
              <tr>
                <th style={{ width: 100 }}>SL NO</th>
                <th style={{ width: 150 }}>DATE</th>
                <th style={{ width: 150 }}>PERMIT TYPE</th>
                <th style={{ width: 150 }}>PERMIT NO</th>
                <th style={{ width: 200 }}>CONTRACTOR NAME</th>
                <th>WORK DESCRIPTION</th>
                <th>WORK LOCATION</th>
                <th style={{ width: 200 }}>OFFICER NAME</th>
                <th style={{ width: 100 }}>CLEARANCE FROM</th>
                <th style={{ width: 100 }}>CLEARANCE TILL</th>
              </tr>
            </thead>
            <tbody
              style={{
                overflow: "hidden",
              }}
            >
              {Array.from({ length: tbody_rows_count }, (_, i) => {
                const permit = uniquePermitList[i + startIndex];
                return (
                  <tr key={i}>
                    <td style={{ textAlign: "center" }}>
                      {permit ? i + 1 + startIndex : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {permit ? permit["Date"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {permit ? permit["Permit Type"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {permit ? permit["Permit No"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {permit ? permit["Contractor Name"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {permit
                        ? (
                            permit["Work Description"]?.split("/")[1] ||
                            permit["Work Description"]
                          )?.slice(0, 100)
                        : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {permit ? permit["Work Location"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {permit ? findOfficerName(permit["Receiver Name"]) : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {permit ? permit["Clearance From"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {permit ? permit["Clearance Till"] : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </div>
    </>
  );
}
