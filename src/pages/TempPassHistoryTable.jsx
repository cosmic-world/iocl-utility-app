import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarExport,
  GridFooterContainer,
} from "@mui/x-data-grid";
import { styled } from "@mui/material/styles";
import {
  KeyboardArrowRight,
  KeyboardDoubleArrowRight,
  KeyboardArrowLeft,
  KeyboardDoubleArrowLeft,
} from "@mui/icons-material";
import {
  Button,
  TextField,
  CircularProgress,
  Autocomplete,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import {
  Visibility,
  Download,
  UploadFile,
  History,
  PhotoCamera,
} from "@mui/icons-material";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { NavBarComponent, SetSelectedApplication } from "../action/userSlice";

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  color:
    theme.palette.mode === "light"
      ? "rgba(0,0,0,.85)"
      : "rgba(255,255,255,0.85)",
  WebkitFontSmoothing: "auto",
  letterSpacing: "normal",
  "& .MuiDataGrid-columnsContainer": {
    backgroundColor: theme.palette.mode === "light" ? "#fafafa" : "#1d1d1d",
  },
  // "& .MuiDataGrid-iconSeparator": {
  //   display: "none",
  // },
  "& .MuiDataGrid-main": {
    border: `1px solid black`,
    marginTop: "5px",
  },
  "& .MuiDataGrid-columnHeader, .MuiDataGrid-cell": {
    borderRight: `1px solid black`,
  },
  "& .MuiDataGrid-columnsContainer, .MuiDataGrid-cell": {
    borderTop: `1px solid black`,
  },
  "& .MuiDataGrid-cell": {
    color:
      theme.palette.mode === "light"
        ? "rgba(0,0,0,.85)"
        : "rgba(255,255,255,0.65)",
  },
  "& .MuiPaginationItem-root": {
    borderRadius: 0,
  },
}));

function EditToolbar({ requestFrom, requestTill }) {
  return (
    <GridToolbarContainer className="d-flex flex-sm-row w-100 justify-content-center justify-content-sm-between align-items-center p-2">
      <GridToolbarExport
        sx={{
          width: 120,
        }}
      />

      <Typography variant="h4" align="center">
        TEMPORARY PASS HISTORY REPORT
      </Typography>
      {/* <Typography variant="h5" align="center">
        {`${requestFrom ? `FROM: ${requestFrom}` : ''} ${requestTill ? `TILL: ${requestTill}` : ''}`.trim()}
      </Typography> */}

      <Box display="flex" justifyContent="center" gap={1}>
        {requestFrom && (
          <Chip
            label={`From: ${requestFrom}`}
            variant="outlined"
            color="primary"
            size="medium"
          />
        )}
        {requestTill && (
          <Chip
            label={`Till: ${requestTill}`}
            variant="outlined"
            color="primary"
            size="medium"
          />
        )}
      </Box>
    </GridToolbarContainer>
  );
}

export default function ExportCustomToolbar({}) {
  const dispatch = useDispatch();
  const { navBarComponent, userType } = useSelector((state) => state.myApp);
  const [seaching, setSearching] = useState(false);
  const [saveLoader, setSaveLoader] = useState(false);
  const [searchLocationCode, setSearchLocationCode] = useState("");
  const [searchTT, setSearchTT] = useState("");
  const [searchVendor, setSearchVendor] = useState("");
  const { masterList } = useSelector((state) => state.myApp);
  const [records, setRecords] = useState([]);
  const [requestFrom, setRequestFrom] = useState("");
  const [requestTill, setRequestTill] = useState("");

  const getDaysDifference = (fromStr, toStr) => {
    if (!fromStr || !toStr) return 0;

    // Split "DD-MM-YYYY" strings
    const [fromDay, fromMonth, fromYear] = fromStr.split("-");
    const [toDay, toMonth, toYear] = toStr.split("-");

    // Create Date objects (Month is 0-indexed, so subtract 1)
    const dateFrom = new Date(fromYear, fromMonth - 1, fromDay);
    const dateTo = new Date(toYear, toMonth - 1, toDay);

    // Calculate difference in milliseconds
    const diffTime = dateTo - dateFrom;

    // Convert to total days
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleOpenDoc = (value) => {
    if (!value || typeof value !== "string") {
      alert("No valid document URL available.");
      return;
    }
    // Format the target destination URL
    const url = value.startsWith("http") ? value : `/uploads/${value}`;
    // Programmatically open the tab instead of returning dead JSX
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const parseApprovalHistory = (value) => {
    if (!value) return [];
    const trimmed = String(value).trim();
    if (!trimmed) return [];
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const columns = [
    {
      field: "date1",
      headerName: "DATE",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "location_code",
      headerName: "LOCATION CODE",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "crew_type",
      headerName: "CREW TYPE",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "crew_name",
      headerName: "CREW NAME",
      minWidth: 130,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "vendor",
      headerName: "VENDOR",
      minWidth: 130,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "tt_no",
      headerName: "TT NO",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "mobile_no",
      headerName: "MOBILE NO",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "govt_id",
      headerName: "GOVT ID",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "driving_licence_no",
      headerName: "DRIVING LICENSE",
      minWidth: 130,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "request_from",
      headerName: "REQUEST FROM",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "request_to",
      headerName: "REQUEST TO",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "pass_requested",
      headerName: "PASS REQUESTED (DAYS)",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "approval_history",
      headerName: "APPROVAL HISTORY",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
    },
    {
      field: "request_letter_path",
      headerName: "REQUEST LETTER",
      minWidth: 100,
      type: "actions",
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
      getActions: (params) => {
        const rawValue = params.row.request_letter_path;
        const fileUrl =
          typeof rawValue === "object" && rawValue?.props?.href
            ? rawValue.props.href
            : rawValue;
        return [
          <GridActionsCellItem
            icon={<Visibility />}
            label="id_proof"
            onClick={() => handleOpenDoc(fileUrl)}
            style={{ color: "#9c27b0" }}
          />,
        ];
      },
    },
    {
      field: "Id_proof_path",
      headerName: "ID PROOF",
      type: "actions",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
      getActions: (params) => {
        const rawValue = params.row.Id_proof_path;
        const fileUrl =
          typeof rawValue === "object" && rawValue?.props?.href
            ? rawValue.props.href
            : rawValue;
        return [
          <GridActionsCellItem
            icon={<Visibility />}
            label="id_proof"
            onClick={() => handleOpenDoc(fileUrl)}
            style={{ color: "#9c27b0" }}
          />,
        ];
      },
    },
    {
      field: "driving_licence_path",
      headerName: "DRIVING LICENCE",
      type: "actions",
      minWidth: 100,
      flex: 1,
      headerAlign: "center",
      align: "center",
      headerClassName: "id-column",
      cellClassName: "id-column",
      getActions: (params) => {
        const rawValue = params.row.driving_licence_path;
        const fileUrl =
          typeof rawValue === "object" && rawValue?.props?.href
            ? rawValue.props.href
            : rawValue;
        return [
          <GridActionsCellItem
            icon={<Visibility />}
            label="id_proof"
            onClick={() => handleOpenDoc(fileUrl)}
            style={{ color: "#9c27b0" }}
          />,
        ];
      },
    },
  ];

  const rows = records.map((record, index) => ({
    id: index,
    date1: new Date(record.created_at)
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-"),
    location_code: record.location_code,
    crew_type: record.crew_type,
    crew_name: record.crew_name,
    vendor: record.vendor,
    tt_no: record.tt_no,
    mobile_no: record.mobile_no,
    govt_id: record.govt_id,
    driving_licence_no: record.driving_licence_no,
    request_from: new Date(record["request_from"])
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-"),
    request_to: new Date(record["request_to"])
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-"),
    pass_requested: getDaysDifference(
      new Date(record["request_from"])
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-"),
      new Date(record["request_to"])
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-"),
    ),
    approval_history: `${parseApprovalHistory(record.approval_history).length}-Days`,
    request_letter_path: record.request_letter_path,
    Id_proof_path: record.id_proof_path,
    driving_licence_path: record.driving_licence_path,
  }));

  const [filterModel, setFilterModel] = useState({ items: [] });

  const handleFilterModelChange = (model) => {
    setFilterModel(model);
    if (model.items.length === 0) {
      setHigherLimit(100);
    } else {
      setHigherLimit(model.items[0].value ? ParentList.length : 100);
    }
  };

  const getTodayLabel = () =>
    new Date().toLocaleDateString("en-GB").replace(/\//g, "-");

  const fetchRecords = async () => {
    setSaveLoader(true);
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchLocationCode)
        params.append("location_code", searchLocationCode);
      if (searchVendor) params.append("vendor", searchVendor);
      if (searchTT) params.append("tt_no", searchTT);
      if (requestFrom)
        params.append(
          "requestFrom",
          requestFrom.split("-").reverse().join("-"),
        );
      if (requestTill)
        params.append(
          "requestTill",
          requestTill.split("-").reverse().join("-"),
        );

      const url = `/api/temp_pass_records?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      zlist.length > 0 ? (
        setRecords(zlist)
      ) : (
        <>
          {setRecords(zlist)}
          {alert("No records found matching the search criteria.")}
        </>
      );
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSearching(false);
    }
  };

  return (
    <div className="d-flex flex-column justify-content-start align-items-center w-100 h-100 p-2">
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          borderBottom: "1px solid black",
          width: "100%",
          marginBottom: "10px",
        }}
      >
        <Button
          variant={
            navBarComponent === "tempPassDashboard" ? "outlined" : "contained"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "tempPassDashboard" ? "white" : "null",
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
            navBarComponent === "tempPassHistory" ? "outlined" : "contained"
          }
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "tempPassHistory" ? "white" : "null",
          }}
          onClick={() => {
            dispatch(
              SetSelectedApplication("TT Crew Temporary Pass Dashboard"),
            );
            dispatch(NavBarComponent("tempPassHistory"));
          }}
        >
          Temporary Pass Dashboard
        </Button>
        <Button
          variant={navBarComponent === "masterData" ? "outlined" : "contained"}
          color="warning"
          sx={{
            my: 1,
            mx: 5,
            backgroundColor:
              navBarComponent === "masterData" ? "white" : "null",
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
          disabled={userType !== "admin"}
        >
          TT Crew Master Data (Admin Only)
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

      <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-2">
        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Autocomplete
            className="w-100"
            options={
              masterList.length > 0
                ? [...new Set(masterList.map((item) => item["LOCATION_CODE"]))]
                : []
            }
            name="Search Location Code"
            value={searchLocationCode !== "" ? searchLocationCode : null}
            isOptionEqualToValue={(option, value) => option === value}
            onChange={(e, newValue) =>
              newValue !== null
                ? setSearchLocationCode(newValue)
                : setSearchLocationCode("")
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
                label="Location Code"
                placeholder="Select Location Code or Type For New..."
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

        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Autocomplete
            name="Search Vendor"
            className="w-100"
            value={searchVendor !== "" ? searchVendor : null}
            onInputChange={(event, newValue) => {
              newValue !== null
                ? setSearchVendor(newValue)
                : setSearchVendor("");
            }}
            onChange={(event, newValue) => {
              newValue !== null
                ? setSearchVendor(newValue)
                : setSearchVendor("");
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            disabled={searchLocationCode === ""}
            options={
              masterList.length > 0
                ? [
                    ...new Set(
                      masterList
                        .filter(
                          (ele) => ele.LOCATION_CODE == searchLocationCode,
                        )
                        .map((item) => item["VENDOR"]),
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
                label="Vendor"
                placeholder={
                  searchLocationCode == ""
                    ? "Select Location Code First or Type For New..."
                    : "Select From Vendor Dropdown or Type For New..."
                }
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

        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Autocomplete
            name="SearchTTNo"
            className="w-100"
            value={searchTT !== "" ? searchTT : null}
            onInputChange={(event, newValue) => {
              newValue !== null ? setSearchTT(newValue) : setSearchTT("");
            }}
            onChange={(event, newValue) => {
              newValue !== null ? setSearchTT(newValue) : setSearchTT("");
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            disabled={searchLocationCode === "" || searchVendor === ""}
            options={
              masterList.length > 0
                ? [
                    ...new Set(
                      masterList
                        .filter(
                          (ele) =>
                            ele.LOCATION_CODE == searchLocationCode &&
                            ele.VENDOR == searchVendor,
                        )
                        .map((item) => item["TT_NO"]),
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
                label="TT"
                placeholder={
                  searchVendor == ""
                    ? "Select Vendor First or Type For New..."
                    : "Select From TT Dropdown or Type For New..."
                }
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

        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <div style={{ backgroundColor: "white" }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DemoItem>
                <DatePicker
                  value={requestFrom ? dayjs(requestFrom, "DD-MM-YYYY") : null}
                  format="DD-MM-YYYY"
                  onChange={(newValue) => {
                    if (newValue) {
                      setRequestFrom(newValue.format("DD-MM-YYYY"));
                    } else {
                      setRequestFrom("");
                    }
                  }}
                  slotProps={{
                    textField: {
                      label: "Request From",
                      InputLabelProps: { shrink: true },
                      fullWidth: true,
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

        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <div style={{ backgroundColor: "white" }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DemoItem>
                <DatePicker
                  value={requestTill ? dayjs(requestTill, "DD-MM-YYYY") : null}
                  format="DD-MM-YYYY"
                  onChange={(newValue) => {
                    if (newValue) {
                      setRequestTill(newValue.format("DD-MM-YYYY"));
                    } else {
                      setRequestTill("");
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      label: "Request Till",
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
          color="primary"
          variant="contained"
          sx={{ m: 2 }}
          style={{ width: 200 }}
          disabled={seaching}
          onClick={(e) => {
            fetchRecords(e);
          }}
        >
          {seaching ? "Fetching..." : "FETCH RECORDS"}
        </Button>

        <Button
          color="primary"
          variant="outlined"
          style={{ width: 200, backgroundColor: "white" }}
          onClick={(e) => {
            setRecords([]);
            setSearchLocationCode("");
            setSearchTT("");
            setSearchVendor("");
          }}
        >
          CLEAR TABLE
        </Button>
      </div>

      <div
        style={{
          width: "100%",
          minHeight: `calc(100% - 50px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
          overflow: "auto",
        }}
      >
        <StyledDataGrid
          getRowHeight={() => "auto"}
          sx={{
            borderRadius: "4px",
            paddingRight: "1rem",
            paddingLeft: "1rem",
            color: "black",
            fontSize: "1rem",
            fontFamily: "calibri",
            paddingBottom: "0.2rem",
            boxShadow: 4,
            border: 0,
            borderColor: "primary.light",
            "&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell": {
              py: "5px",
            },
            "& .MuiDataGrid-cell:hover": {
              color: "primary.main",
            },
            "& .MuiDataGrid-columnHeader": {
              // minWidth: 'fit-content !important',
              // backgroundColor: 'white'
            },
            // 1. Wrap Column Headers
            "& .MuiDataGrid-columnHeaderTitleContainer": {
              whiteSpace: "normal",
              lineHeight: "normal",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold !important",
              fontFamily: "calibri",
              whiteSpace: "normal",
              lineHeight: "1.2",
              fontWeight: "bold",
              overflow: "visible",
              textAlign: "center",
            },
            // 2. Wrap Cell Content
            "& .MuiDataGrid-cell": {
              whiteSpace: "normal",
              display: "flex",
              alignItems: "center",
              lineHeight: "1.5",
              paddingTop: "8px",
              paddingBottom: "8px",
              backgroundColor: "white",
              padding: "2px !important",
              wordBreak: "break-word",
              // minWidth: 'max-content'
            },
          }}
          rows={rows}
          columns={columns}
          filterModel={filterModel}
          onFilterModelChange={handleFilterModelChange}
          slotProps={{ toolbar: { requestFrom, requestTill } }}
          slots={{
            toolbar: EditToolbar,
          }}
        />
      </div>
    </div>
  );
}
