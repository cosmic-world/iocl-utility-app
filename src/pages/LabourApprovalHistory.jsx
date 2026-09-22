import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Autocomplete,
  TextField,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { apiUrl } from "../api";
import Table from "react-bootstrap/Table";
import {
  NavBarComponent,
  SetSelectedApplication,
} from "../action/userSlice";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export default function LabourApprovalDashboard() {
  const { userType, locationCode, contractorList, navBarComponent } = useSelector(
    (state) => state.myApp,
  );
  const dispatch = useDispatch();
  const [recordsLaborsEntry, setRecordsLaborsEntry] = useState([]);
  const $table = document.querySelector(".ttes_table_view");
  const $table_height = $table ? $table.clientHeight : 500;
  const $thead = document.querySelector(".table-head");
  const $thead_height = $thead ? $thead.clientHeight : 50;
  const tbody_rows_count = Math.floor(($table_height - $thead_height) / 50);
  const [saveLoader, setSaveLoader] = useState(false);
  const [searchContractor, setSearchContractor] = useState("");
  const [creation_date, setCreation_date] = useState("");
  const handleFetch = async () => {
    try {
      const params = new URLSearchParams();
      params.append("location_code", String(locationCode));
      if (searchContractor) params.append("contractor", searchContractor);
      if (creation_date)
        params.append(
          "fetchdate",
          creation_date.split("-").reverse().join("-"),
        );
      const url = apiUrl(`/api/labour-pass-requests?${params.toString()}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data.filter(item=>item.REQUEST_STATUS === "APPROVED") : [];
      setRecordsLaborsEntry(zlist);
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
    }
  };

  const handlePrintReport = async (format) => {
    if (format === "permission" && (!searchContractor || !creation_date)) {
      alert("Select a contractor and creation date before printing the permission letter.");
      return;
    }

    const params = new URLSearchParams({
      format,
      location_code: String(locationCode),
    });
    if (searchContractor) params.append("contractor", searchContractor);
    if (creation_date) {
      params.append("fetchdate", creation_date.split("-").reverse().join("-"));
    }

    try {
      setSaveLoader(true);
      const response = await fetch(apiUrl(`/api/labour-pass-reports?${params.toString()}`));
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to create report");
      }
      const blob = await response.blob();
      const reportUrl = URL.createObjectURL(blob);
      window.open(reportUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaveLoader(false);
    }
  };

  return (
    <div
      className={
        "d-flex flex-column justify-content-start align-items-center w-100 h-100 p-2"
      }
      style={{
        overflow: "auto",
      }}
    >
            <div
              className="d-flex flex-column flex-xxl-row justify-content-center align-items-center"
              style={{
                border: "1px solid black",
                width: "100%",
              }}
            >
              <Button
                variant={
                  navBarComponent === "labourPassDashboard" ? "contained" : "outlined"
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
              >
                Worker Entry Request
              </Button>
              <Button
                variant={
                  navBarComponent === "labourPassApproval" ? "contained" : "outlined"}
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
                  dispatch(SetSelectedApplication("Worker Pass Approval Centre"));
                  dispatch(NavBarComponent("labourPassHistory"));
                }}
              >
                APPROVAL HISTORY
              </Button>
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
                    navBarComponent === "contractor_masterData" ? "null" : "white",
                }}
                onClick={() => {
                  dispatch(SetSelectedApplication("Worker Master Data"));
                  dispatch(NavBarComponent("contractor_masterData"));
                }}
              >
                Worker Master Data
              </Button>
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
              >
                Contractor Master Data
              </Button>
            </div>
      <Box sx={{ width: "100%", height: "100%"}}>
        <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center my-2">
          <div style={{ width: "100%", maxWidth: 350 }}>
            <Autocomplete
              name="Search Contractor"
              value={searchContractor !== "" ? searchContractor : null}
              onChange={(event, newValue) => {
                newValue !== null
                  ? setSearchContractor(newValue)
                  : setSearchContractor("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              options={
                contractorList.length > 0
                  ? [
                      ...new Set(
                        contractorList
                          .filter((ele) => ele.LOCATION_CODE == locationCode)
                          .map((item) => item["CONTRACTOR_NAME"]),
                      ),
                    ]
                  : []
              }
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                },
                "& .MuiOutlinedInput-root": {
                  paddingTop: "2px !important", // Reducer top whitespace
                  paddingBottom: "2px !important", // Keeps it centered vertically
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={"Select Contractor from Dropdown"}
                  label="Contractor"
                  InputLabelProps={{
                    ...params.InputLabelProps,
                    shrink: true,
                  }}
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      backgroundColor: "white",
                    },
                    sx: {
                      "& input::placeholder": {
                        fontFamily: "Lucida Sans",
                        fontSize: "0.8rem", // Optional: adjust placeholder size
                        fontStyle: "italic", // Optional: make placeholder italicized
                      },
                    },
                  }}
                />
              )}
            />
          </div>
                  <div style={{ width: "100%", maxWidth: 350 }}>
                    <div style={{ backgroundColor: "white" }}>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DemoItem>
                          <DatePicker
                            value={creation_date ? dayjs(creation_date, "DD-MM-YYYY") : null}
                            format="DD-MM-YYYY"
                            onChange={(newValue) => {
                              if (newValue) {
                                setCreation_date(newValue.format("DD-MM-YYYY"));
                              } else {
                                setCreation_date("");
                              }
                            }}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                label: "Created on",
                                InputLabelProps: { shrink: true },
                                sx: {
                                  "& .MuiInputBase-input": {
                                    fontSize: "1rem",
                                    paddingTop: "10px !important", // Reduces extra top whitespace
                                    paddingBottom: "10px !important", // Keeps it centered vertically
                                    fontFamily: "Lucida Sans",
                                    color: "black",
                                  },
                                  "& input::placeholder": {
                                    fontFamily: "Lucida Sans",
                                    fontSize: "0.8rem", // Optional: adjust placeholder size
                                    fontStyle: "italic", // Optional: make placeholder italicized
                                  },
                                },
                              },
                            }}
                          />
                        </DemoItem>
                      </LocalizationProvider>
                    </div>
                  </div>
          <Button
            variant="outlined"
            onClick={handleFetch}
            disabled={saveLoader}
            style={{ width: 200, backgroundColor: "white" }}
          >
            Fetch
          </Button>
          <Button
            color="primary"
            variant="outlined"
            style={{ width: 200, backgroundColor: "white" }}
            onClick={() => {
              setRecordsLaborsEntry([]);
              setSearchContractor("");
              setCreation_date("");
            }}
          >
            Clear Table
          </Button>
          <Button
            variant="contained"
            color="success"
            style={{ width: 250 }}
            disabled={saveLoader}
            onClick={() => handlePrintReport("permission")}
          >
            Print Permission Letter
          </Button>
          <Button
            variant="contained"
            color="info"
            style={{ width: 250 }}
            disabled={saveLoader}
            onClick={() => handlePrintReport("register")}
          >
            Print Labour Register
          </Button>
        </div>
        {saveLoader ? (
          <CircularProgress
            color="success"
            sx={{
              position: "fixed",
              zIndex: 2000,
              transform: "translate(-50%, -50%)",
              left: "45%",
              top: "40%",
              zoom: 3,
            }}
          />
        ) : null}

        <div className="ttes_table_view">
          <Table bordered hover striped className="ttes_table">
            <thead className="table-head">
              <tr>
                <th style={{ width: 200 }}>DATE</th>
                <th style={{ width: 300 }}>CONTRACTOR NAME</th>
                <th style={{ width: 250 }}>WORKER NAME</th>
                <th style={{ width: 200 }}>MOBILE NO</th>
                <th style={{ width: 200 }}>AADHAAR NO</th>
                <th>ADDRESS</th>
                <th style={{ width: 300 }}>GATE PASS NO</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(
                {
                  length: Math.max(recordsLaborsEntry.length, tbody_rows_count),
                },
                (_, i) => {
                  const record = recordsLaborsEntry[i];
                  return (
                    <tr key={i}>
                      <td style={{ textAlign: "center" }}>
                        {record ? record["CREATED_AT"].slice(0, 10).split("-").reverse().join("-") : ""}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {record ? record["CONTRACTOR"] : ""}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {record ? record["LABOUR_NAME"] : ""}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {record ? record["MOBILE_NO"] : ""}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {record ? record["AADHAAR_NO"] : ""}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {record ? record["ADDRESS"] : ""}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {record ? record["GATE_PASS_NO"] : ""}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </Table>
        </div>
      </Box>
    </div>
  );
}
