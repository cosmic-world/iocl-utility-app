import React, { useState, useEffect, useRef } from "react";
import { apiUrl } from "../api";
import { useDispatch, useSelector } from "react-redux";
import Table from "react-bootstrap/Table";
import "../css/page_layout.css";
import {
  Button,
  TextField,
  CircularProgress,
  Autocomplete,
  Typography,
  Box,
} from "@mui/material";
import { Download, Edit, Save, Cancel, Delete } from "@mui/icons-material";
import {
  SetLabourMasterList,
  NavBarComponent,
  SetSelectedApplication,
} from "../action/userSlice";
import RoleRestrictedTooltip from "../components/RoleRestrictedTooltip";

export default function LabourMasterData({ handleSync }) {
  const dispatch = useDispatch();
  const {
    contractorList,
    navBarComponent,
    locationCode,
    selectedTerminal,
    userType,
    labour_masterList,
  } = useSelector((state) => state.myApp);
  const locationName = selectedTerminal[selectedTerminal.length - 1];
  const [saveLoader, setSaveLoader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [contractor, setContractor] = useState("");
  const [labourName, setLabourName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [address, setAddress] = useState("");
  const [editingLabourId, setEditingLabourId] = useState(null);
  const [editingLabour, setEditingLabour] = useState(null);
  const contractorsForLocation = contractorList;
  const fileInputRef = useRef(null);
  const isSuperUser = userType === "SUPER_ADMIN";

  const handleExcelChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleExcelSubmit = async (e) => {
    e.preventDefault();
    setSaveLoader(true);

    if (!file) return alert("Please select an Excel file first!");

    setLoading(true);
    const formData = new FormData();
    formData.append("excel_file", file); // Must match upload.single('excel_file') on backend

    try {
      const response = await fetch(apiUrl("/api/upload-labour-excel"), {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        handleSync();
      } else {
        alert("Upload failed: " + data.message);
      }
    } catch (error) {
      console.error("Error uploading excel:", error);
    } finally {
      setSaveLoader(false);
      setLoading(false);
      setFile(null); // Reset file input after submission
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // ◄ Forces the browser UI text to reset to "No file chosen"
      }
    }
  };

  const handlePostData = async (e) => {
    e.preventDefault();
    if (!contractor) {
      alert("Please enter/select Contractor.");
      return;
    }

    if (!labourName) {
      alert("Please enter Worker Name.");
      return;
    }

    if (!mobileNo) {
      alert("Please enter Mobile No.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobileNo)) {
      alert("Mobile No should be exactly 10 digits.");
      return;
    }

    if (!aadhaarNo) {
      alert("Please enter Aadhaar No or ID Proof No.");
      return;
    }

    if (!address) {
      alert("Please enter Address");
      return;
    }

    setSaveLoader(true);
    setSubmitting(true);

    try {
      const payload = {
        locationCode: String(locationCode),
        contractor,
        labourName,
        mobileNo,
        aadhaarNo,
        address,
      };
      // Submit to server
      const response = await fetch(apiUrl("/api/upload-labour-single"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // <-- ADD THIS CRITICAL LINE
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Record submitted successfully!");
        // Reset form
        setContractor("");
        setLabourName("");
        setMobileNo("");
        setAadhaarNo("");
        setAddress("");
        handleSync();
      } else {
        const error = await response.text();
        alert("Error submitting form: " + error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaveLoader(false);
      setSubmitting(false);
    }
  };

  const handleEditLabour = (record) => {
    setEditingLabourId(record.ID);
    setEditingLabour({
      contractor: record.CONTRACTOR || "",
      labourName: record.LABOUR_NAME || "",
      mobileNo: record.MOBILE_NO || "",
      aadhaarNo: record.AADHAAR_NO || "",
      address: record.ADDRESS || "",
    });
  };

  const handleSaveLabour = async (record) => {
    if (!isSuperUser) return;
    if (
      !editingLabour?.contractor ||
      !editingLabour.labourName ||
      !/^\d{10}$/.test(editingLabour.mobileNo) ||
      !editingLabour.aadhaarNo ||
      !editingLabour.address
    ) {
      alert("Enter valid worker details.");
      return;
    }

    setSaveLoader(true);
    try {
      const response = await fetch(
        apiUrl(`/api/labour-master-data/${record.ID}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": userType,
          },
          body: JSON.stringify({ locationCode, ...editingLabour }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to update worker.");
      const updatedRecord = {
        ...record,
        CONTRACTOR: editingLabour.contractor,
        LABOUR_NAME: editingLabour.labourName
          .trim()
          .replace(/\s+/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        MOBILE_NO: editingLabour.mobileNo,
        AADHAAR_NO: editingLabour.aadhaarNo.toUpperCase(),
        ADDRESS: editingLabour.address,
      };
      dispatch(
        SetLabourMasterList(
          labour_masterList.map((item) =>
            item.ID === record.ID ? updatedRecord : item,
          ),
        ),
      );
      setEditingLabourId(null);
      setEditingLabour(null);
      alert("Worker updated successfully.");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaveLoader(false);
    }
  };

  const handleDeleteLabour = async (record) => {
    if (
      !isSuperUser ||
      !window.confirm("Are you sure you want to delete this worker?")
    ) {
      return;
    }

    setSaveLoader(true);
    try {
      const response = await fetch(
        apiUrl(`/api/labour-master-data/${record.ID}`),
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": userType,
          },
          body: JSON.stringify({ locationCode }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to delete worker.");
      dispatch(
        SetLabourMasterList(
          labour_masterList.filter(
            (item) => String(item.ID) !== String(record.ID),
          ),
        ),
      );
      alert("Worker deleted successfully.");
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
        overflow: "none",
        overflowX: "auto",
      }}
    >
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

      <Box sx={{ p: 3, border: "1px dashed #ccc", m: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Bulk Upload of via Excel
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Please use our official excel template.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            href="/template_labour.xlsx" // Points directly to the file in your public folder
            download="Labour_Master_Template.xlsx" // Forces the browser to download it instead of opening it
          >
            Download Excel Template
          </Button>
        </Box>

        <hr style={{ border: "0.5px solid #eee", margin: "15px 0" }} />

        <form onSubmit={handleExcelSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelChange}
            style={{ marginBottom: "1rem" }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mb: 2 }}
            style={{ width: 150 }}
          >
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </Box>

      <div
        className="d-flex flex-column justify-content-center align-items-center w-100 p-2 mt-2"
        style={{ border: "1px dashed #ccc" }}
      >
        <div className="d-flex flex-wrap justify-content-center gap-2 align-items-center w-100 p-2">
          <div style={{ width: "100%", maxWidth: 350 }}>
            <Typography>Location Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={locationName}
              style={{ backgroundColor: "white" }}
              disabled
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350 }}>
            <Typography>Contractor Name</Typography>
            <Autocomplete
              name="Search Contractor"
              className="w-100"
              value={contractor !== "" ? contractor : null}
              onChange={(event, newValue) => {
                newValue !== null ? setContractor(newValue) : setContractor("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              options={contractorsForLocation}
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
            <Typography>Worker Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={labourName}
              style={{ backgroundColor: "white" }}
              onChange={(e) =>
                setLabourName(
                  e.target.value?.toLowerCase().replace(/\b\w/g, (char) =>
                    char
                      .trim()
                      .replace(/\s+/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (char) => char.toUpperCase()),
                  ) || "",
                )
              }
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350 }}>
            <Typography>Mobile No (10-digit)</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={mobileNo}
              type="text"
              inputProps={{ inputMode: "numeric", maxLength: 10 }}
              style={{ backgroundColor: "white" }}
              error={mobileNo && mobileNo.length !== 10}
              onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, ""))}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350 }}>
            <Typography>Aadhaar No (12-digit)</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={aadhaarNo}
              type="text"
              inputProps={{ inputMode: "numeric", maxLength: 12 }}
              error={aadhaarNo && aadhaarNo.length !== 12}
              style={{ backgroundColor: "white" }}
              onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, ""))}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350 }}>
            <Typography>Address</Typography>
            <TextField
              fullWidth
              multiline
              variant="outlined"
              value={address}
              style={{ backgroundColor: "white" }}
              onChange={(e) => setAddress(e.target.value ? e.target.value : "")}
              sx={{
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                },
              }}
            />
          </div>
        </div>

        <Button
          color="primary"
          variant="contained"
          sx={{ m: 2 }}
          style={{ width: 200 }}
          disabled={submitting}
          onClick={(e) => {
            handlePostData(e);
          }}
        >
          {submitting ? "Submitting..." : "SUBMIT"}
        </Button>
      </div>

      <Typography variant="h6" sx={{ mt: 2 }}>
        Workers for Selected Contractor
      </Typography>
      <Table bordered hover striped className="ttes_table">
        <thead className="table-head">
          <tr>
            <th style={{ minWidth: "100px" }}>LOCATION CODE</th>
            <th>CONTRACTOR</th>
            <th>WORKER NAME</th>
            <th>MOBILE NO</th>
            <th>AADHAAR / ID PROOF</th>
            <th>ADDRESS</th>
            {isSuperUser ? <th>ACTION</th> : null}
          </tr>
        </thead>
        <tbody>
          {labour_masterList.map((record) => {
            const isEditing = editingLabourId === record.ID;
            return (
              <tr key={record.ID}>
                <td>{record.LOCATION_CODE}</td>
                <td>
                  {isEditing ? (
                    <TextField
                      select
                      size="small"
                      value={editingLabour.contractor}
                      SelectProps={{ native: true }}
                      sx={{
                        minWidth: 180,
                        "& .MuiInputBase-input": {
                          textAlign: "center",
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                      onChange={(e) =>
                        setEditingLabour({
                          ...editingLabour,
                          contractor: e.target.value,
                        })
                      }
                    >
                      {contractorsForLocation.map((contractorRecord) => (
                        <option
                          key={contractorRecord.ID}
                          value={contractorRecord.CONTRACTOR_NAME}
                        >
                          {contractorRecord.CONTRACTOR_NAME}
                        </option>
                      ))}
                    </TextField>
                  ) : (
                    record.CONTRACTOR
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <TextField
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          textAlign: "center",
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                      value={editingLabour.labourName}
                      onChange={(e) =>
                        setEditingLabour({
                          ...editingLabour,
                          labourName: e.target.value,
                        })
                      }
                    />
                  ) : (
                    record.LABOUR_NAME
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <TextField
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          textAlign: "center",
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                      value={editingLabour.mobileNo}
                      inputProps={{ maxLength: 10, inputMode: "numeric" }}
                      onChange={(e) =>
                        setEditingLabour({
                          ...editingLabour,
                          mobileNo: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                  ) : (
                    record.MOBILE_NO
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <TextField
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          textAlign: "center",
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                      value={editingLabour.aadhaarNo}
                      onChange={(e) =>
                        setEditingLabour({
                          ...editingLabour,
                          aadhaarNo: e.target.value,
                        })
                      }
                    />
                  ) : (
                    record.AADHAAR_NO
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <TextField
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          textAlign: "center",
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                      value={editingLabour.address}
                      onChange={(e) =>
                        setEditingLabour({
                          ...editingLabour,
                          address: e.target.value,
                        })
                      }
                    />
                  ) : (
                    record.ADDRESS
                  )}
                </td>
                {isSuperUser ? (
                  <td>
                    {isEditing ? (
                      <>
                        <Button
                          startIcon={<Save />}
                          onClick={() => handleSaveLabour(record)}
                        >
                          Save
                        </Button>
                        <Button
                          startIcon={<Cancel />}
                          onClick={() => {
                            setEditingLabourId(null);
                            setEditingLabour(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          startIcon={<Edit />}
                          onClick={() => handleEditLabour(record)}
                          disabled={saveLoader}
                        >
                          Edit
                        </Button>
                        <Button
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => handleDeleteLabour(record)}
                          disabled={saveLoader}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
