import { Add, Cancel, Delete, Edit, Save } from "@mui/icons-material";
import { Box, Button, Snackbar, Tooltip } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import {
  DataGrid,
  GridActionsCellItem,
  GridRowModes,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  CircularProgress,
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import UserConfirmationModalWithoutPin from "./UserConfirmationModalWithoutPin";
import {
  NavBarComponent,
  SetSelectedApplication,
} from "../action/userSlice";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});
const EditToolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
      <GridToolbarQuickFilter sx={{ marginLeft: 5 }} />
    </GridToolbarContainer>
  );
};

function formatDate(date1) {
  const date = new Date(...date1.slice(5, -1).split(","));
  return date.toLocaleDateString("en-GB").replace(",", "").replaceAll("/", "-");
}
function formatTime(dateStr) {
  const parts = dateStr.match(/\d+/g);
  const hour = parts[3].padStart(2, '0');
  const minute = parts[4].padStart(2, '0');
  return `${hour}:${minute}`
}

const ModifyRecords = () => {
  const dispatch = useDispatch();
  const { selectedTerminal, userType, navBarComponent } = useSelector((state) => state.myApp);
  const [rows, setRows] = React.useState([]);
  const [rowModesModel, setRowModesModel] = React.useState({});
  const [localID, setlocalID] = React.useState(0);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [failOpen, setFailOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const [pageSize, setPageSize] = React.useState(100);
  const [selectedId, setSelectedId] = useState("");
  const [saveLoader, setSaveLoader] = useState(false);
  const SHEET_ID = "1Jj8ub1mBS0RylJmadtYn2MenjBHWfX7c4vM_Oci6ydc";
  const locationName = selectedTerminal[selectedTerminal.length - 1];
  const sheet_url = `https://script.google.com/macros/s/AKfycbzWr167t9azcmb8iEHUYwdjuf77mFuOuA6i1F07QYIKbJHY47UjVitbgW7cCkOrhvA/exec`;
  const delete_sheet_url = `https://script.google.com/macros/s/AKfycbzkp6GfBX8y_DJeLV4bR9Pm5slAtKNWaxTS4YNpzVczo2MUx3aOT6JMLD0k5PsZ-cnB/exec`

  const fetchSheetData = async () => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=permit_details`,
      );
      const text = await response.text();
      // Remove unwanted characters from response
      const json = JSON.parse(text.substring(47).slice(0, -2));
      const rows = json.table.rows.map((row) =>
        row.c.map((ele) => ele?.v ?? ""),
      );
      const cols = json.table.cols.map((col) => col.label);
      // Convert rows into simple array
      const formattedData1 = rows.map((row) => {
        const obj = {};
        row.forEach((cell, index) => {
          obj[cols[index]] = cell;
        });
        return obj;
      });
        const formattedData = formattedData1.filter(
          obj => !(Object.keys(obj).length === 1 && obj[""] === "")
        );
      const filteredData1 =
        formattedData.length > 0
          ? formattedData
            .filter(
              (ele) =>
                ele["Location Name"].toLowerCase() ===
                ((locationName !== "") & (locationName != undefined)
                  ? locationName.toLowerCase()
                  : "test"),
            )
          : [];

      const filteredData2 = filteredData1.map((item) => ({
        ...item,
        Date: formatDate(item.Timestamp),
        "Clearance From": formatTime(item["Clearance From"]),
        "Clearance Till": formatTime(item["Clearance Till"]),
      }));

      const filteredData = filteredData2.map((obj) =>
        Object.fromEntries(
          Object.entries(obj).filter(
            ([key]) => !["Timestamp", "Jdbc_Status"].includes(key),
          ),
        ),
      );
      const res1 =
        filteredData.length > 0
          ? filteredData.map((val) => val['Unique ID'])
          : [{ id: 0 }].map((val) => val['Unique ID']);
      var result = Math.max(...res1);
      setRows(filteredData.map((val, index) => ({ id: index, ...val })));
      setlocalID(result + 1);
    } catch (error) {
      console.log("error admin...", `${error} and also check internet connection`);
    }
  };

  useEffect(() => {
    if (selectedTerminal !== "") {
      fetchSheetData();
    }
  }, [locationName]);

  const handleRowEditStart = (params, event) => {
    event.defaultMuiPrevented = true;
  };

  const handleRowEditStop = (params, event) => {
    event.defaultMuiPrevented = true;
  };

  const handleEditClick = (id) => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = async(id) => {
    setSaveLoader(true);
    try {
      await fetch(delete_sheet_url, {
        method: "POST",
        body: new URLSearchParams({
          row: id,
        }),
      });
      setSaveLoader(false)
      setSuccessOpen(true);
      fetchSheetData()
    } catch (error) {
      setSaveLoader(false)
      setFailOpen(true)
      console.log("error admin...", `${error} and also check internet connection`);
    }
  };

  const [show, setShow] = useState(false);

  const handleCancelClick = (id) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });

    const editedRow = rows.find((row) => row.id === id);
    if (editedRow.isNew) {
      setRows(rows.filter((row) => row.id !== id));
      setlocalID(localID - 1);
    }
  };

  const processRowUpdate = async (newRow) => {
    const updatedRow = { ...newRow, isNew: false };
    setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
    setSaveLoader(true);
    try {
      await fetch(sheet_url, {
        method: "POST",
        body: new URLSearchParams({
          row: newRow['Unique ID'],
          updates: JSON.stringify([
            { col: 2, value: newRow['Permit Type'] },
            { col: 3, value: newRow['Work Description'] },
            { col: 4, value: newRow['Work Location'] },
            { col: 5, value: newRow['Receiver Name'] },
            { col: 6, value: newRow['Clearance From'] },
            { col: 7, value: newRow['Clearance Till'] },
            { col: 8, value: newRow['Contractor Name'] },
            { col: 9, value: newRow['Contractor Supervisor'] },
          ]),
        }),
      });
      fetchSheetData();
      setSaveLoader(false)
      setSuccessOpen(true);
    } catch (error) {
      setSaveLoader(false)
      setFailOpen(true)
      console.log("error admin...", `${error} and also check internet connection`);
    }
    return updatedRow;
  };

  const handleClose = () => {
    setFailOpen(false);
    setSuccessOpen(false);
    setError("");
  };

  const columns = [
    {
      field: "Date",
      headerName: "Date",
      width: 120,
      editable: false,
      align: "center",
      headerAlign: "center",
      headerClassName: "header-class"
    },
    {
      field: "Permit Type",
      headerName: "Permit Type",
      width: 180,
      editable: true,
      align: "center",
      headerAlign: "center",
      type: "singleSelect",
      valueOptions: (param) => {
        return [
          "Hot Work",
          "Cold Work",
          "Height + Hot Work",
          "Height + Cold Work",
          "Electrical Work",
        ]
      },
    },
    {
      field: "Work Description",
      headerName: "Work Description",
      flex: 1,
      editable: true,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "Work Location",
      headerName: "Work Location",
      width: 180,
      editable: true,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "Receiver Name",
      headerName: "Officer Name",
      width: 180,
      editable: true,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "Clearance From",
      headerName: "Clearance From",
      width: 180,
      editable: true,
      align: "center",
      headerAlign: "center",
      renderEditCell: (params) => {
        const handleChange = (newValue) => {
          params.api.setEditCellValue({
            id: params.id,
            field: params.field,
            value: newValue ? newValue.format("HH:mm") : "",
          });
        };
        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DemoItem>
          <TimePicker
            value={params.value ? dayjs(params.value, "HH:mm") : null}
            format="HH:mm"
            onChange={(newValue)=>handleChange(newValue)}
          />
          </DemoItem>
          </LocalizationProvider>
        );
      },
    },
    {
      field: "Clearance Till",
      headerName: "Clearance Till",
      width: 180,
      editable: true,
      align: "center",
      headerAlign: "center",
      renderEditCell: (params) => {
        const handleChange = (newValue) => {
          params.api.setEditCellValue({
            id: params.id,
            field: params.field,
            value: newValue ? newValue.format("HH:mm") : "",
          });
        };
        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DemoItem>
          <TimePicker
            value={params.value ? dayjs(params.value, "HH:mm") : null}
            format="HH:mm"
            onChange={(newValue)=>handleChange(newValue)}
          />
          </DemoItem>
          </LocalizationProvider>
        );
      },
    },
    {
      field: "Contractor Name",
      headerName: "Contractor Name",
      width: 240,
      editable: true,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "Contractor Supervisor",
      headerName: "Contractor Supervisor",
      width: 180,
      editable: true,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      cellClassName: "actions",
      getActions: (params) => {
        const id = params.id
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<Save />}
              label="Save"
              onClick={handleSaveClick(id)}
              style={{ color: "green" }}
            />,
            <GridActionsCellItem
              icon={<Cancel />}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
              style={{ color: "#ffc107" }}
            />,
          ];
        }
        return [
          <GridActionsCellItem
            icon={<Edit />}
            label="Edit"
            className="textPrimary"
            onClick={() => {
              handleEditClick(id)
            }}
            color="inherit"
            style={{ color: "blue" }}
          />
          ,
          <GridActionsCellItem
            icon={<Delete />}
            label="Delete"
            onClick={() => {
              setSelectedId(params.row['Unique ID']);
              setShow(true)
            }}
            color="danger"
            style={{ color: "red" }}
          />
        ];
      },
    },
  ];

  return (
    <>
      <UserConfirmationModalWithoutPin
        handleAction={handleDeleteClick}
        show={show}
        setShow={setShow}
        selectedId={selectedId}
      />
            <div
              className="d-flex flex-column flex-xxl-row justify-content-center align-items-center"
              style={{
                border: "1px solid black",
                width: "100%",
                borderTop: "none",
              }}
            >
              <Button
                variant={
                  navBarComponent === "formControl" ? "outlined" : "contained"
                }
                color="warning"
                sx={{
                  my: 1,
                  mx: 5,
                  backgroundColor:
                    navBarComponent === "formControl" ? "white" : "null",
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
                  navBarComponent === "permitDisplay" ? "outlined" : "contained"
                }
                color="warning"
                sx={{
                  my: 1,
                  mx: 5,
                  backgroundColor:
                    navBarComponent === "permitDisplay" ? "white" : "null",
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
                variant={navBarComponent === "layoutDisplay" ? "outlined" : "contained"}
                color="warning"
                sx={{
                  my: 1,
                  mx: 5,
                  backgroundColor:
                    navBarComponent === "layoutDisplay" ? "white" : "null",
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
                  variant={navBarComponent === "modifyRecords" ? "outlined" : "contained"}
                  color="warning"
                  sx={{
                  my: 1,
                  mx: 5,
                  backgroundColor:
                      navBarComponent === "modifyRecords" ? "white" : "null",
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
      <Box
        sx={{
          height: `calc(100%)`,
          width: "100%",
          padding: "1rem",
          borderColor: "primary.light",
          "& .MuiDataGrid-cell:hover": {
            color: "primary.main",
          },
          "& .actions": {
            color: "text.secondary",
          },
          "& .textPrimary": {
            color: "text.primary",
          },
        }}
      >
        <DataGrid
          sx={{
            backgroundColor: "#cacaca",
            borderRadius: "1rem",
            padding: "0px",
            fontFamily: "Lucida Sans",
          }}
          rows={rows}
          rowHeight={60}
          columns={columns}
          disableRowSelectionOnClick
          editMode="row"
          rowModesModel={rowModesModel}
          onRowModesModelChange={(newModel) => setRowModesModel(newModel)}
          onRowEditStart={handleRowEditStart}
          onRowEditStop={handleRowEditStop}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={(error) => alert(error)}
          pageSize={pageSize}
          onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
          rowsPerPageOptions={[10, 20, 50, 100]}
          pagination
          slots={{
            toolbar: EditToolbar,
          }}
          experimentalFeatures={{ newEditingApi: true }}
        />

        <Snackbar
          open={successOpen}
          autoHideDuration={2000}
          onClose={handleClose}
        >
          <Alert
            onClose={handleClose}
            severity="success"
            sx={{ width: "100%" }}
          >
            Data saved successfully !
          </Alert>
        </Snackbar>
        <Snackbar open={failOpen} autoHideDuration={5000} onClose={handleClose}>
          <Tooltip title={error} arrow>
            <Alert
              onClose={handleClose}
              severity="error"
              sx={{ width: "100%" }}
            >
              Data not saved!
            </Alert>
          </Tooltip>
        </Snackbar>
      </Box>
    </>
  );
};
export default React.memo(ModifyRecords);
