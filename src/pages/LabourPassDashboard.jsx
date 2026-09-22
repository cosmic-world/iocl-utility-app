import React, { useState, useEffect } from "react";
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
  Checkbox,
} from "@mui/material";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import {
  SetLabourMasterList,
  SetOfficerMasterList,
  NavBarComponent,
  SetSelectedApplication,
  SetContractorMasterList,
} from "../action/userSlice";

export default function LabourPassDashboard({handleSyncContractor}) {
  const dispatch = useDispatch();
  const {
    labour_masterList,
    officerList,
    navBarComponent,
    userType,
    contractorList,
    locationCode,
    selectedTerminal,
  } = useSelector((state) => state.myApp);
  const locationName = selectedTerminal[selectedTerminal.length - 1];
  const [records, setRecords] = useState([]);
  const [recordsLaborsEntry, setRecordsLaborsEntry] = useState([]);
  const [saveLoader, setSaveLoader] = useState(false);
  const [contractor, setContractor] = useState("");
  const [labourName, setLabourName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [address, setAddress] = useState("");
  const [approvingOfficer, setApprovingOfficer] = useState("");
  const [purpose, setPurpose] = useState("");
  const [timeIn, setTimeIn] = useState("");
  const [searchContractor, setSearchContractor] = useState("");
  const [approvingOfficer_1, setApprovingOfficer_1] = useState("");
  const [multiPurpose, setMultiPurpose] = useState("");
  const [multiTimeIn, setMultiTimeIn] = useState("");
  const [selectedLabourIds, setSelectedLabourIds] = useState([]);
  const [selectedForwardLabourIds, setSelectedForwardLabourIds] = useState([]);
  const [seaching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitting_1, setSubmitting_1] = useState(false);

  useEffect(() => {
    handleSync();
    handleSyncContractor();
    handleSyncOfficerList();
    fetchLabourEntryRecords();
  }, []);

  const checkIfOfficerListHasDuplicates =
    officerList.length !=
    [...new Set(officerList.map((item) => item["OFFICER_NAME"]))].length;

  const FinalOfficerList = checkIfOfficerListHasDuplicates
    ? [
        ...new Set(
          officerList.filter(item=>['ADMIN','SUPER_ADMIN'].includes(item.ROLE)).map(
            (item) => `${item["OFFICER_NAME"]} - ${item["MAIL_ID"]}`,
          ),
        ),
      ]
    : [...new Set(officerList.map((item) => item["OFFICER_NAME"]))];

  const getTodayLabel = () =>
    new Date().toLocaleDateString("en-GB").replace(/\//g, "-");

  const handleSyncOfficerList = async () => {
    setSaveLoader(true);
    try {
      const response = await fetch(apiUrl("/api/officer-master-data"));
      if (!response.ok) {
        throw new Error("Failed to sync officer master records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];

      setSaveLoader(false);
      dispatch(SetOfficerMasterList(zlist));
      // zlist.length > 0
      //   ? alert("Syncing completed successfully.")
      //   : alert("No records found in the database.");
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
    }
  };

  const handleSync = async () => {
    setSaveLoader(true);
    try {
      const response = await fetch(apiUrl("/api/labour-master-data"));
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];

      setSaveLoader(false);
      dispatch(SetLabourMasterList(zlist));
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
    }
  };

  const officerName =
    approvingOfficer !== ""
      ? checkIfOfficerListHasDuplicates
        ? approvingOfficer.split("-")[0].trim()
        : approvingOfficer
      : "";
  const mailID =
    approvingOfficer !== ""
      ? checkIfOfficerListHasDuplicates
        ? approvingOfficer.split("-")[1].trim()
        : officerList.find((item) => item.OFFICER_NAME === approvingOfficer)
            ?.MAIL_ID || ""
      : "";

  const selectedOfficerName =
    approvingOfficer_1 !== ""
      ? checkIfOfficerListHasDuplicates
        ? approvingOfficer_1.split("-")[0].trim()
        : approvingOfficer_1
      : "";
  const selectedOfficerMail =
    approvingOfficer_1 !== ""
      ? checkIfOfficerListHasDuplicates
        ? approvingOfficer_1.split("-").slice(1).join("-").trim()
        : officerList.find((item) => item.OFFICER_NAME === approvingOfficer_1)
            ?.MAIL_ID || ""
      : "";

  const toggleLabourSelection = (record) => {
    setSelectedLabourIds((current) =>
      current.includes(record.ID)
        ? current.filter((id) => id !== record.ID)
        : [...current, record.ID],
    );
  };
  const [isNew, setIsNew] = useState(false);
  const handleReset = () => {
    setContractor("");
    setLabourName("");
    setMobileNo("");
    setAadhaarNo("");
    setAddress("");
    setPurpose("");
    setTimeIn("");
    setApprovingOfficer("");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contractor) {
      alert("Please select contractor.");
      return;
    }
    if (!labourName) {
      alert("Please select/enter labour name.");
      return;
    }
    const labourAlreadyRequestedToday = recordsLaborsEntry.filter(
      (val) => val["AADHAAR_NO"] == aadhaarNo,
    );
    if (labourAlreadyRequestedToday.length > 0) {
      alert("This labour name has already been requested today.");
      return;
    }
    if (!mobileNo) {
      alert("Please select/enter mobile no.");
      return;
    }
    if (!/^[0-9]{10}$/.test(mobileNo)) {
      alert("Mobile No should be exactly 10 digits.");
      return;
    }
    if (!aadhaarNo) {
      alert("Please select/enter aadhaar no.");
      return;
    }
    if (!address) {
      alert("Please select/enter address.");
      return;
    }
    if (!purpose) {
      alert("Please enter purpose.");
      return;
    }
    if (!timeIn) {
      alert("Please enter timeIn.");
      return;
    }
    if (!officerName) {
      alert("Please select approving officer.");
      return;
    }
    setSubmitting(true);
    setSaveLoader(true);
    try {
      const response = await fetch(apiUrl("/api/labour-pass-requests"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationCode: String(locationCode),
          contractor,
          purpose,
          timeIn,
          approvingOfficer: officerName,
          mailID,
          labours: [
            {
              labourName,
              mobileNo,
              aadhaarNo,
              address,
            },
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to submit request.");
      const uploadMaster = async (e) => {
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
          } else {
            const error = await response.text();
            console.error("Error submitting form:", error);
            // alert("Error submitting form: " + error);
          }
        } catch (error) {
          alert("Error: " + error.message);
        } finally {
          setIsNew(false);
          handleSync();
        }
      };
      isNew ? uploadMaster() : null;
      fetchLabourEntryRecords();
      alert(`Request sent to ${officerName} for approval.`);
      handleReset();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaveLoader(false);
      setSubmitting(false);
    }
  };

  const submitSelectedLabours = async () => {
    const selectedLabours = records.filter((record) =>
      selectedLabourIds.includes(record.ID),
    );
    if (!selectedLabours.length) return alert("Select at least one labour.");
    if (
      !multiPurpose ||
      !multiTimeIn ||
      !selectedOfficerName ||
      !selectedOfficerMail
    ) {
      return alert(
        "Enter purpose, time in and select an approving officer first.",
      );
    }

    setSubmitting_1(true);
    setSaveLoader(true);
    try {
      const response = await fetch(apiUrl("/api/labour-pass-requests"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationCode: String(locationCode),
          contractor: searchContractor,
          purpose: multiPurpose,
          timeIn: multiTimeIn,
          approvingOfficer: selectedOfficerName,
          mailID: selectedOfficerMail,
          labours: selectedLabours.map((record) => ({
            labourName: record.LABOUR_NAME,
            mobileNo: record.MOBILE_NO,
            aadhaarNo: record.AADHAAR_NO,
            address: record.ADDRESS,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to submit request.");
      fetchLabourEntryRecords();
      alert(`Request sent to ${selectedOfficerName} for approval.`);
      setSelectedLabourIds([]);
      setMultiPurpose("");
      setMultiTimeIn("");
      setApprovingOfficer_1("");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaveLoader(false);
      setSubmitting_1(false);
    }
  };

  const forwardSelectedRequest = async () => {
    const selectedRequests = recordsLaborsEntry.filter(
      (item) => selectedForwardLabourIds.includes(item.ID) && item.REQUEST_STATUS === "PENDING",
    );
    const requestTokens = [...new Set(selectedRequests.map((item) => item.REQUEST_TOKEN).filter(Boolean))];
    if (!selectedRequests.length || requestTokens.length !== 1) {
      alert("Select pending request only.");
      return;
    }
    if (!selectedOfficerName || !selectedOfficerMail) {
      alert("Select the next approving officer first.");
      return;
    }

    try {
      setSaveLoader(true);
      const response = await fetch(
        apiUrl(`/api/labour-pass-requests/${requestTokens[0]}/forward`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvingOfficer: selectedOfficerName,
            mailID: selectedOfficerMail,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to forward request.");
      await fetchLabourEntryRecords();
      setSelectedForwardLabourIds([]);
      alert(`Request forwarded to ${data.approvingOfficer} for approval.`);
    } catch (error) {
      alert(error.message);
    } finally {
      setSaveLoader(false);
    }
  };

  const fetchRecords = async () => {
    setSaveLoader(true);
    setSearching(true);
    try {
      const params = new URLSearchParams();
      params.append("location_code", String(locationCode));
      if (searchContractor) params.append("contractor", searchContractor);

      const url = apiUrl(`/api/labour-master-data?${params.toString()}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      setRecords(zlist);
      // zlist.length == 0
      //   ? alert("No records found matching the search criteria.")
      //   : null;
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSearching(false);
    }
  };

  const fetchLabourEntryRecords = async () => {
    try {
      const params = new URLSearchParams();
      params.append("location_code", String(locationCode));
      if (searchContractor) params.append("contractor", searchContractor);
      params.append(
        "fetchdate",
        getTodayLabel().split("-").reverse().join("-"),
      );

      const url = apiUrl(`/api/labour-pass-requests?${params.toString()}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      setRecordsLaborsEntry(zlist);
      // zlist.length == 0
      //   ? alert("No records found matching the search criteria.")
      //   : null;
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSearching(false);
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
                  dispatch(SetSelectedApplication("Worker Pass Approval History"));
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

      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ border: "1px solid black", width: "100%" }}
      >
        <Typography
          variant="h4"
          className="w-75 d-flex justify-content-center align-items-center"
          style={{ borderBottom: "1px dashed black" }}
        >
          Single Labour Pass Request
        </Typography>
        <Typography
          variant="h7"
          className="w-75 d-flex justify-content-center align-items-center"
          style={{ borderBottom: "1px dashed black" }}
        >
          If the Labour is new and expected to come regularly, please add in the
          Contractor Master Data for ease of apply.
        </Typography>
        <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-2">
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
          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Location Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={locationName}
              style={{ backgroundColor: "white" }}
              size="small"
              disabled
              sx={{
                "& .MuiOutlinedInput-root": {
                  paddingTop: "1px !important", // Reducer top whitespace
                  paddingBottom: "1px !important", // Keeps it centered vertically
                },
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  backgroundColor: "white",
                  textTransform: "uppercase",
                },
                "& .MuiInputBase-input::placeholder": {
                  fontFamily: "Lucida Sans",
                  fontSize: "0.8rem", // Optional: adjust placeholder size
                  fontStyle: "italic", // Optional: make placeholder italicized
                  textTransform: "none",
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Contractor Name</Typography>
            <Autocomplete
              className="w-100"
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
              name="contractor"
              value={contractor !== "" ? contractor : null}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) =>
                newValue !== null ? setContractor(newValue) : setContractor("")
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
            <Typography>Worker Name</Typography>
            <Autocomplete
              name="labourName"
              className="w-100"
              value={labourName !== "" ? labourName : null}
              onInputChange={(event, newValue, reason) => {
                newValue !== null
                  ? setLabourName(newValue.toLocaleUpperCase())
                  : setLabourName("");
                if (reason === "input") {
                  newValue !== null
                    ? !labour_masterList.length > 0
                      ? [
                          ...new Set(
                            labour_masterList
                              .filter(
                                (ele) =>
                                  ele.LOCATION_CODE == locationCode &&
                                  ele.CONTRACTOR == contractor,
                              )
                              .map((item) => item["LABOUR_NAME"]),
                          ),
                        ]
                      : [].includes(newValue)
                        ? setIsNew(true)
                        : setIsNew(false)
                    : setIsNew(false);
                }
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setLabourName(newValue) : setLabourName("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              options={
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.CONTRACTOR == contractor,
                          )
                          .map((item) => item["LABOUR_NAME"]),
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
                  placeholder={
                    contractor == ""
                      ? "Select Contractor First or Type For New..."
                      : "Select From Dropdown or Type For New..."
                  }
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      backgroundColor: "white",
                      textTransform: "uppercase",
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
            <Typography>Mobile No</Typography>
            <Autocomplete
              name="Mobile No"
              className="w-100"
              value={mobileNo !== "" ? mobileNo : null}
              onInputChange={(event, newValue) => {
                newValue !== null ? setMobileNo(newValue) : setMobileNo("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setMobileNo(newValue) : setMobileNo("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              disabled={labourName == ""}
              options={
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.LABOUR_NAME == labourName &&
                              ele.MOBILE_NO,
                          )
                          .map((item) => item["MOBILE_NO"]),
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
                  type="number"
                  placeholder={
                    labourName == ""
                      ? "Select Worker Name First"
                      : "Select From Dropdown or Type For New..."
                  }
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      backgroundColor: "white",
                      textTransform: "uppercase",
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
            <Typography>Aadhaar No / ID Proof No</Typography>
            <Autocomplete
              name="Aadhaar No"
              className="w-100"
              value={aadhaarNo !== "" ? aadhaarNo : null}
              onInputChange={(event, newValue) => {
                newValue !== null
                  ? setAadhaarNo(newValue.toLocaleUpperCase())
                  : setAadhaarNo("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setAadhaarNo(newValue) : setAadhaarNo("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              disabled={labourName == ""}
              options={
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.LABOUR_NAME == labourName &&
                              ele.AADHAAR_NO,
                          )
                          .map((item) => item["AADHAAR_NO"]),
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
                  placeholder={
                    labourName == ""
                      ? "Select Worker Name First"
                      : "Select From Dropdown or Type For New..."
                  }
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      backgroundColor: "white",
                      textTransform: "uppercase",
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
            <Typography>Address</Typography>
            <Autocomplete
              name="address"
              className="w-100"
              value={address !== "" ? address : null}
              onInputChange={(event, newValue) => {
                newValue !== null ? setAddress(newValue) : setAddress("");
              }}
              onChange={(event, newValue) => {
                newValue !== null ? setAddress(newValue) : setAddress("");
              }}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              disabled={labourName == ""}
              options={
                labour_masterList.length > 0
                  ? [
                      ...new Set(
                        labour_masterList
                          .filter(
                            (ele) =>
                              ele.LOCATION_CODE == locationCode &&
                              ele.LABOUR_NAME == labourName &&
                              ele.ADDRESS,
                          )
                          .map((item) => item["ADDRESS"]),
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
                  multiline
                  placeholder={
                    labourName == ""
                      ? "Select Worker Name First"
                      : "Select From Dropdown or Type For New..."
                  }
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      backgroundColor: "white",
                    },
                    sx: {
                      "& .MuiInputBase-input::placeholder": {
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
            <Typography>Purpose</Typography>
            <TextField
              fullWidth
              variant="outlined"
              multiline
              value={purpose}
              style={{ backgroundColor: "white" }}
              placeholder={"Type Purpose..."}
              onChange={(e) => setPurpose(e.target.value ? e.target.value : "")}
              sx={{
                "& .MuiOutlinedInput-root": {
                  paddingTop: "10px !important", // Reducer top whitespace
                  paddingBottom: "10px !important", // Keeps it centered vertically
                },
                // 1. Increase font size of the placeholder/input text
                "& .MuiInputBase-input": {
                  fontSize: "1rem",
                  fontFamily: "Lucida Sans",
                  backgroundColor: "white",
                },
                "& .MuiInputBase-input::placeholder": {
                  fontFamily: "Lucida Sans",
                  fontSize: "0.8rem", // Optional: adjust placeholder size
                  fontStyle: "italic", // Optional: make placeholder italicized
                  textTransform: "none",
                },
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
            <Typography>Time In</Typography>
            <div style={{ backgroundColor: "white" }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DemoItem>
                  <TimePicker
                    value={timeIn ? dayjs(timeIn, "HH:mm:ss") : null}
                    format="HH:mm:ss"
                    onChange={(newValue) => {
                      if (newValue) {
                        setTimeIn(newValue.format("HH:mm:ss"));
                      } else {
                        setTimeIn("");
                      }
                    }}
                    slotProps={{
                      textField: {
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
            <Typography>Approving Officer</Typography>
            <Autocomplete
              className="w-100"
              options={FinalOfficerList}
              name="Location Code"
              value={approvingOfficer !== "" ? approvingOfficer : null}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) =>
                newValue !== null
                  ? setApprovingOfficer(newValue)
                  : setApprovingOfficer("")
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
                  placeholder="Select Location Code"
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
        </div>
        <div
          className="d-flex flex-sm-row justify-content-center align-items-center position-relative pt-0"
          style={{ borderTop: "1px dashed", width: "90%" }}
        >
          <Button
            color="primary"
            variant="contained"
            sx={{ m: 1 }}
            style={{ width: 200 }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting..." : "SUBMIT"}
          </Button>
        </div>
      </div>

      <Typography
        variant="h4"
        className="w-75 d-flex justify-content-center align-items-center mt-3"
        style={{ borderBottom: "1px dashed black" }}
      >
        Multiple Labour Pass Request
      </Typography>

      <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-0">
        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Typography>Location Name</Typography>
          <TextField
            fullWidth
            variant="outlined"
            value={locationName}
            style={{ backgroundColor: "white" }}
            size="small"
            disabled
            sx={{
              "& .MuiOutlinedInput-root": {
                paddingTop: "1px !important", // Reducer top whitespace
                paddingBottom: "1px !important", // Keeps it centered vertically
              },
              // 1. Increase font size of the placeholder/input text
              "& .MuiInputBase-input": {
                fontSize: "1rem",
                fontFamily: "Lucida Sans",
                backgroundColor: "white",
                textTransform: "uppercase",
              },
              "& .MuiInputBase-input::placeholder": {
                fontFamily: "Lucida Sans",
                fontSize: "0.8rem", // Optional: adjust placeholder size
                fontStyle: "italic", // Optional: make placeholder italicized
                textTransform: "none",
              },
            }}
          />
        </div>

        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Typography>Contractor</Typography>
          <Autocomplete
            name="Search Contractor"
            className="w-100"
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
          color="primary"
          variant="contained"
          sx={{ m: 2, mt: 4 }}
          style={{ width: 200 }}
          disabled={seaching}
          onClick={(e) => {
            searchContractor != "" ? (
              <>
                {fetchRecords(e)}
                {fetchLabourEntryRecords()}
              </>
            ) : (
              alert("No contractor is selected!")
            );
          }}
        >
          {seaching ? "Searching..." : "SEARCH RECORDS"}
        </Button>

        <Button
          color="primary"
          variant="outlined"
          sx={{ m: 2, mt: 4 }}
          style={{ width: 200, backgroundColor: "white" }}
          onClick={(e) => {
            setRecords([]);
            setSearchContractor("");
            setSelectedLabourIds([]);
          }}
        >
          CLEAR VIEW
        </Button>
      </div>

      <div className="d-flex flex-wrap justify-content-center align-items-center w-100 p-0">
        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Typography>Purpose of Request</Typography>
          <TextField
            fullWidth
            variant="outlined"
            multiline
            value={multiPurpose}
            style={{ backgroundColor: "white" }}
            placeholder={"Type Purpose..."}
            onChange={(e) =>
              setMultiPurpose(e.target.value ? e.target.value : "")
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                paddingTop: "10px !important", // Reducer top whitespace
                paddingBottom: "10px !important", // Keeps it centered vertically
              },
              // 1. Increase font size of the placeholder/input text
              "& .MuiInputBase-input": {
                fontSize: "1rem",
                fontFamily: "Lucida Sans",
                backgroundColor: "white",
              },
              "& .MuiInputBase-input::placeholder": {
                fontFamily: "Lucida Sans",
                fontSize: "0.8rem", // Optional: adjust placeholder size
                fontStyle: "italic", // Optional: make placeholder italicized
                textTransform: "none",
              },
            }}
          />
        </div>
        <div style={{ width: "100%", maxWidth: 350, margin: 5 }}>
          <Typography>Time In</Typography>
          <div style={{ backgroundColor: "white" }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DemoItem>
                <TimePicker
                  value={multiTimeIn ? dayjs(multiTimeIn, "HH:mm:ss") : null}
                  format="HH:mm:ss"
                  onChange={(newValue) => {
                    if (newValue) {
                      setMultiTimeIn(newValue.format("HH:mm:ss"));
                    } else {
                      setMultiTimeIn("");
                    }
                  }}
                  slotProps={{
                    textField: {
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
          <Typography>Approving Officer</Typography>
          <Autocomplete
            className="w-100"
            options={FinalOfficerList}
            name="Select Approving Name"
            value={approvingOfficer_1 !== "" ? approvingOfficer_1 : null}
            isOptionEqualToValue={(option, value) => option === value}
            onChange={(e, newValue) =>
              newValue !== null
                ? setApprovingOfficer_1(newValue)
                : setApprovingOfficer_1("")
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
                placeholder="Select Location Code"
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
          color="success"
          variant="contained"
          sx={{ m: 2, mt: 4 }}
          style={{ width: 200 }}
          disabled={submitting_1}
          onClick={submitSelectedLabours}
        >
          {submitting_1 ? "Submitting..." : "SUBMIT SELECTED"}
        </Button>
        <Button
          color="warning"
          variant="outlined"
          sx={{ m: 2, mt: 4 }}
          style={{ width: 220, backgroundColor: "white" }}
          disabled={saveLoader || !selectedForwardLabourIds.length}
          onClick={forwardSelectedRequest}
        >
          FORWARD REQUEST
        </Button>
      </div>

      <div className="ttes_table_view">
        <Table bordered hover striped className="ttes_table">
          <thead className="table-head">
            <tr>
              <th style={{ width: 250 }}>CONTRACTOR</th>
              <th style={{ width: 120 }}>
                SELECT
                <Checkbox
                  size="small"
                  checked={
                    records.length > 0 &&
                    selectedLabourIds.length === records.length
                  }
                  indeterminate={
                    selectedLabourIds.length > 0 &&
                    selectedLabourIds.length < records.length
                  }
                  onChange={(event) =>
                    setSelectedLabourIds(
                      event.target.checked
                        ? records.map((record) => record.ID)
                        : [],
                    )
                  }
                />
              </th>
              <th style={{ width: 250 }}>WORKER NAME</th>
              <th style={{ width: 200 }}>MOBILE NO</th>
              <th style={{ width: 200 }}>AADHAAR NO</th>
              <th style={{ flex: 1 }}>ADDRESS</th>
              <th style={{ width: 250 }}>APPROVING OFFICER</th>
              <th style={{ width: 200 }}>APPROVAL STATUS</th>
            </tr>
          </thead>
          <tbody
            style={{
              overflow: "hidden",
            }}
          >
            {Array.from(
              { length: records.length > 0 ? records.length : 8 },
              (_, i) => {
                const record = records[i];
                const requestStatus = record? recordsLaborsEntry.find(
                              (item) => item.AADHAAR_NO === record.AADHAAR_NO,
                            )?.REQUEST_STATUS || "" : ""
                const labour_id = record? recordsLaborsEntry.find(
                              (item) => item.AADHAAR_NO === record.AADHAAR_NO,
                            )?.ID || "" : ""
                return (
                  <tr key={i}>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["CONTRACTOR"] : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? (
                        <Checkbox
                          checked={selectedLabourIds.includes(record.ID) || selectedForwardLabourIds.includes(labour_id)}
                          onChange={() => <>
                            {requestStatus === ""?toggleLabourSelection(record):''}
                            {requestStatus === "PENDING"?setSelectedForwardLabourIds(prev => 
                              selectedForwardLabourIds.includes(labour_id)
                                ? prev.filter(id => id !== labour_id)
                                : [...prev, labour_id]
                              ):null}
                            </>
                          }
                          disabled={requestStatus === "APPROVED"}
                        />
                      ) : (
                        ""
                      )}
                      {record ? i + 1 : ""}
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
                      {record
                        ? recordsLaborsEntry.find(
                            (item) => item.AADHAAR_NO === record.AADHAAR_NO,
                          )?.APPROVING_OFFICER || ""
                        : ""}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: "bold",
                        color: record
                          ? recordsLaborsEntry.find(
                              (item) => item.AADHAAR_NO === record.AADHAAR_NO,
                            )?.REQUEST_STATUS === "PENDING"
                            ? "blue"
                            : recordsLaborsEntry.find(
                                  (item) =>
                                    item.AADHAAR_NO === record.AADHAAR_NO,
                                )?.REQUEST_STATUS === "APPROVED"
                              ? "green"
                              : "black"
                          : "black",
                      }}
                    >
                      {record
                        ? recordsLaborsEntry.find(
                            (item) => item.AADHAAR_NO === record.AADHAAR_NO,
                          )?.REQUEST_STATUS || ""
                        : ""}
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
