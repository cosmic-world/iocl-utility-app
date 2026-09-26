import { Cancel, Delete, Edit, Save } from "@mui/icons-material";
import { Box, Snackbar, Tooltip } from "@mui/material";
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
import { CircularProgress } from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import UserConfirmationModalWithoutPin from "./UserConfirmationModalWithoutPin";
import NavbarPermit from "../components/NavbarPermit";
import { apiUrl } from "../api";

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

const ModifyRecords = () => {
  const dispatch = useDispatch();
  const { selectedTerminal, userType, navBarComponent, locationCode } = useSelector(
    (state) => state.myApp,
  );
  const [rows, setRows] = React.useState([]);
  const [rowModesModel, setRowModesModel] = React.useState({});
  const [localID, setlocalID] = React.useState(0);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [failOpen, setFailOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const [pageSize, setPageSize] = React.useState(100);
  const [selectedId, setSelectedId] = useState("");
  const [saveLoader, setSaveLoader] = useState(false);
  const [show, setShow] = useState(false);
  const locationName = selectedTerminal[selectedTerminal.length - 1];

  const fetchSheetData = async () => {
    try {
      const response = await fetch(
        apiUrl(`/api/permit-records?locationCode=${encodeURIComponent(locationCode || "")}`),
      );
      if (!response.ok) throw new Error("Failed to load permit records");
      const result = await response.json();
      const records = Array.isArray(result.data) ? result.data : [];
      setRows(records.map((record) => ({ id: record["Unique ID"], ...record })));
      setlocalID(Math.max(0, ...records.map((record) => Number(record["Unique ID"]) || 0)) + 1);
    } catch (error) {
      console.log(
        "error admin...",
        `${error} and also check internet connection`,
      );
    }
  };

  useEffect(() => {
    if (selectedTerminal !== "") {
      fetchSheetData();
    }
  }, [locationName, locationCode]);

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

  const handleDeleteClick = async (id) => {
    setSaveLoader(true);
    try {
      const response = await fetch(
        apiUrl(`/api/permit-records/${id}?locationCode=${encodeURIComponent(locationCode)}`),
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Unable to delete permit record");
      setSaveLoader(false);
      setSuccessOpen(true);
      fetchSheetData();
    } catch (error) {
      setSaveLoader(false);
      setFailOpen(true);
      console.log(
        "error admin...",
        `${error} and also check internet connection`,
      );
    }
  };

  const [userFormshow, setUserFormShow] = useState(false);

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
      const response = await fetch(apiUrl(`/api/permit-records/${newRow["Unique ID"]}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationCode,
          "Permit Type": newRow["Permit Type"],
          "Work Description": newRow["Work Description"],
          "Work Location": newRow["Work Location"],
          "Receiver Name": newRow["Receiver Name"],
          "Clearance From": newRow["Clearance From"],
          "Clearance Till": newRow["Clearance Till"],
          "Contractor Name": newRow["Contractor Name"],
          "Permit No": newRow["Permit No"],
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Unable to update permit record");
      }
      fetchSheetData();
      setSaveLoader(false);
      setSuccessOpen(true);
    } catch (error) {
      setSaveLoader(false);
      setFailOpen(true);
      console.log(
        "error admin...",
        `${error} and also check internet connection`,
      );
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
      headerClassName: "header-class",
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
        ];
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
                onChange={(newValue) => handleChange(newValue)}
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
                onChange={(newValue) => handleChange(newValue)}
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
      field: "Permit No",
      headerName: "Permit No",
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
        const id = params.id;
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
              handleEditClick(id);
            }}
            color="inherit"
            style={{ color: "blue" }}
          />,
          <GridActionsCellItem
            icon={<Delete />}
            label="Delete"
            onClick={() => {
              setSelectedId(params.row["Unique ID"]);
              setShow(true);
            }}
            color="danger"
            style={{ color: "red" }}
          />,
        ];
      },
    },
  ];

  return (
    <>
      <UserConfirmationModalWithoutPin
        handleAction={handleDeleteClick}
        show={userFormshow}
        setShow={setUserFormShow}
        selectedId={selectedId}
      />

      <NavbarPermit />

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
