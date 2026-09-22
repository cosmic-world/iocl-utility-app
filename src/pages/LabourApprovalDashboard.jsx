import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Autocomplete,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import UndoIcon from "@mui/icons-material/Undo";
import { useDispatch, useSelector } from "react-redux";
import { apiUrl } from "../api";
import Table from "react-bootstrap/Table";
import { NavBarComponent, SetSelectedApplication } from "../action/userSlice";

export default function LabourApprovalDashboard({ handleSyncContractor }) {
  const { userType, locationCode, contractorList, navBarComponent } =
    useSelector((state) => state.myApp);
  const dispatch = useDispatch();
  const [recordsLaborsEntry, setRecordsLaborsEntry] = useState([]);
  const $table = document.querySelector(".ttes_table_view");
  const $table_height = $table ? $table.clientHeight : 500;
  const $thead = document.querySelector(".table-head");
  const $thead_height = $thead ? $thead.clientHeight : 50;
  const tbody_rows_count = Math.floor(($table_height - $thead_height) / 50);
  const [saveLoader, setSaveLoader] = useState(false);
  const [searchContractor, setSearchContractor] = useState("");
  const [approvingId, setApprovingId] = useState(null);
  const [editingGatePassId, setEditingGatePassId] = useState(null);
  const getTodayLabel = () =>
    new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  const [gatePassNo, setGatePassNo] = useState({});
  useEffect(() => {
    handleSyncContractor();
  }, []);
  const handleSubmit = async () => {
    try {
      const params = new URLSearchParams();
      params.append("location_code", String(locationCode));
      if (searchContractor) params.append("contractor", searchContractor);
      params.append(
        "fetchdate",
        getTodayLabel().split("-").reverse().join("-"),
      );
      const response = await fetch(
        apiUrl(`/api/labour-pass-requests?${params.toString()}`),
      );
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      zlist.length == 0 ? alert("No records found") : null;
      setRecordsLaborsEntry(zlist);
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
    }
  };

  const handleUpdateGatePassNo = async (recordId) => {
    if (!recordId) return;
    const gatePass = String(gatePassNo[recordId] || "")
      .replace(/\s/g, "")
      .toUpperCase();
    if (!/^[RGY]-\d+$/.test(gatePass)) {
      alert(
        "Gatepass no must start with 'R-', 'G-' or 'Y-' followed by a number",
      );
      return;
    }

    setSaveLoader(true);
    setApprovingId(recordId);
    try {
      const response = await fetch(
        apiUrl(
          `/api/labour-pass-requests/${recordId}/${encodeURIComponent(gatePass)}`,
        ),
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update gate pass number");
      }

      setRecordsLaborsEntry((prevRecords) =>
        prevRecords.map((item) =>
          String(item.ID ?? item.id) === String(recordId)
            ? { ...item, GATE_PASS_NO: data.GATE_PASS_NO }
            : item,
        ),
      );
      setGatePassNo((previous) => ({
        ...previous,
        [recordId]: data.GATE_PASS_NO,
      }));
      setEditingGatePassId(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setSaveLoader(false);
      setApprovingId(null);
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
      <Box sx={{ width: "100%", height: "100%" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="center"
          alignItems={{ sm: "center" }}
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#12324a" }}>
              Review pending requests and monitor approval status
            </Typography>
          </Box>
        </Stack>
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
          <Button
            variant="outlined"
            onClick={handleSubmit}
            disabled={saveLoader}
            style={{ width: 200, backgroundColor: "white" }}
          >
            Search
          </Button>
          <Button
            color="primary"
            variant="outlined"
            style={{ width: 200, backgroundColor: "white" }}
            onClick={(e) => {
              setRecordsLaborsEntry([]);
              setSearchContractor("");
            }}
          >
            Clear Table
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
                <th style={{ width: 300 }}>CONTRACTOR NAME</th>
                <th style={{ width: 250 }}>WORKER NAME</th>
                <th style={{ width: 200 }}>MOBILE NO</th>
                <th style={{ width: 200 }}>AADHAAR NO</th>
                <th>ADDRESS</th>
                <th style={{ width: 200 }}>APPROVAL STATUS</th>
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
                  const isApproved = record?.REQUEST_STATUS === "APPROVED";
                  const id = record?.ID ?? record?.id;
                  const hasGatePass = Boolean(record?.GATE_PASS_NO);
                  const isEditingGatePass = editingGatePassId === id;
                  return (
                    <tr key={i}>
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
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          color:
                            record?.REQUEST_STATUS === "PENDING"
                              ? "blue"
                              : record?.REQUEST_STATUS === "APPROVED"
                                ? "green"
                                : "black",
                        }}
                      >
                        {record?.REQUEST_STATUS || ""}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="d-flex justify-content-center align-items-center gap-2 text-nowrap">
                          <TextField
                            fullWidth
                            variant="outlined"
                            value={
                              record
                                ? (gatePassNo[id] ?? record.GATE_PASS_NO ?? "")
                                : ""
                            }
                            disabled={
                              !record ||
                              userType === "user" ||
                              !isApproved ||
                              (hasGatePass && !isEditingGatePass)
                            }
                            style={{
                              backgroundColor: "white",
                              visibility: record ? "visible" : "hidden",
                            }}
                            placeholder={"e.g., R-1 or G-1 or Y-1"}
                            onChange={(e) =>
                              setGatePassNo((previous) => ({
                                ...previous,
                                [id]: e.target.value.toUpperCase(),
                              }))
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                paddingTop: "0px !important", // Reducer top whitespace
                                paddingBottom: "0px !important", // Keeps it centered vertically
                              },
                              // 1. Increase font size of the placeholder/input text
                              "& .MuiInputBase-input": {
                                fontSize: "1rem",
                                fontFamily: "Lucida Sans",
                                backgroundColor: "white",
                                textTransform: "uppercase",
                                textAlign: "center !important",
                                padding: "8px !important",
                              },
                              "& .MuiInputBase-input::placeholder": {
                                fontFamily: "Lucida Sans",
                                fontSize: "0.8rem", // Optional: adjust placeholder size
                                fontStyle: "italic", // Optional: make placeholder italicized
                                textTransform: "none",
                                textAlign: "center !important",
                                padding: "8px !important",
                              },
                            }}
                          />
                          {record &&
                            hasGatePass &&
                            isApproved &&
                            userType !== "user" &&
                            (isEditingGatePass ? (
                              <UndoIcon
                                size="small"
                                color="error"
                                aria-label="Cancel editing gate pass number"
                                onClick={() => {
                                  setGatePassNo((previous) => {
                                    const next = { ...previous };
                                    delete next[id];
                                    return next;
                                  });
                                  setEditingGatePassId(null);
                                }}
                                disabled={saveLoader}
                              ></UndoIcon>
                            ) : (
                              <EditIcon
                                size="small"
                                color="primary"
                                aria-label="Edit gate pass number"
                                onClick={() => {
                                  setGatePassNo((previous) => ({
                                    ...previous,
                                    [id]: record.GATE_PASS_NO,
                                  }));
                                  setEditingGatePassId(id);
                                }}
                                disabled={saveLoader}
                              ></EditIcon>
                            ))}
                          <Button
                            size="small"
                            variant={"contained"}
                            style={{
                              width: 150,
                              visibility: record ? "visible" : "hidden",
                            }}
                            color="success"
                            disabled={
                              !record ||
                              userType === "user" ||
                              !isApproved ||
                              (hasGatePass && !isEditingGatePass)
                            }
                            onClick={() => record && handleUpdateGatePassNo(id)}
                          >
                            {"Update"}
                          </Button>
                        </div>
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
