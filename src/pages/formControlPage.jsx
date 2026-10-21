import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "react-bootstrap/Modal";
import ModalDialog from "react-bootstrap/ModalDialog";
import Draggable from "react-draggable";
import { Close } from "@mui/icons-material";
import {
  Button,
  TextField,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import { apiUrl } from "../api";

class DraggableModalDialog extends React.Component {
  render() {
    return (
      <Draggable handle=".modal-header">
        <ModalDialog {...this.props} />
      </Draggable>
    );
  }
}

export default function formControlPage({ show, setShow }) {
  const { officerList, contractorList, locationCode, locationList } =
    useSelector((state) => state.myApp);

  const [saveLoader, setSaveLoader] = useState(false);
  const [permitType, setPermitType] = useState("");
  const [workDesc, setWorkDesc] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [clrStart, setClrStart] = useState("");
  const [clrEnd, setClrEnd] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [permitNo, setPermitNo] = useState("");
  const contractorListForLocation = contractorList;

  const location_officerList = officerList.filter((item) =>
    ["ADMIN", "SUPER_ADMIN"].includes(item.ROLE),
  );
  const checkIfOfficerListHasDuplicates =
    location_officerList.length !=
    [...new Set(location_officerList.map((item) => item["OFFICER_NAME"]))]
      .length;

  const FinalOfficerList = checkIfOfficerListHasDuplicates
    ? [
        ...new Set(
          location_officerList.map(
            (item) => `${item["OFFICER_NAME"]}(${item["Emp_ID"]})`,
          ),
        ),
      ]
    : [...new Set(location_officerList.map((item) => item["OFFICER_NAME"]))];

  const officerName =
    receiverName !== ""
      ? checkIfOfficerListHasDuplicates
        ? receiverName.split("(")[0].trim()
        : receiverName
      : "";

  const findLocationName = (permitNo) => {
    const locCode = String(permitNo || "").match(/^\d{4}/)?.[0];
    if (!locCode) {
      return null;
    }
    return (
      locationList.find((location) => location["LOCATION_CODE"] == locCode)?.[
        "LOCATION_NAME"
      ] ?? null
    );
  };

  const handleResetForm = () => {
    setSaveLoader(false);
    setPermitType("");
    setWorkDesc("");
    setWorkLocation("");
    setReceiverName("");
    setClrStart("");
    setClrEnd("");
    setContractorName("");
    setPermitNo("");
  };

  const handleCloseModal = () => {
    handleResetForm();
    setShow(false);
  };

  const handlePostData = async () => {
    if (
      permitType == "" ||
      permitNo == "" ||
      workDesc == "" ||
      workLocation == "" ||
      receiverName == "" ||
      clrStart == "" ||
      clrEnd == "" ||
      contractorName == ""
    ) {
      alert("All fields must be filled");
      return;
    }
    if (!locationCode || !permitNo.startsWith(locationCode)) {
      alert(
        `Permit No must start with the location code: ${locationCode || "N/A"}`,
      );
      return;
    }
    if (!/^\d{4}[HCWE]\d{7}$/.test(permitNo.trim().toUpperCase())) {
      alert("Invalid Permit No!");
      return;
    }
    const permitLocationName = findLocationName(permitNo);
    if (permitLocationName == null) {
      alert("Unable to resolve a location for this Permit No.");
      return;
    }
    if (clrEnd <= clrStart) {
      alert(
        "Clearance End time must be after Clearance Start time. Check AM/PM format.",
      );
      return;
    }
    setSaveLoader(true);
    try {
      const payload = {
        "Permit Type": permitType,
        "Work Description": workDesc,
        "Work Location": workLocation,
        "Receiver Name": officerName,
        "Clearance From": clrStart,
        "Clearance Till": clrEnd,
        "Contractor Name": contractorName,
        "Permit No": permitNo,
        locationCode: String(locationCode),
      };

      const response = await fetch(apiUrl("/api/permits/manual"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to submit permit.");
      }
      alert(result.message || "Data submitted successfully");
      handleResetForm();
    } catch (error) {
      alert(error.message || "Unable to submit permit. Check your connection.");
    } finally {
      setSaveLoader(false);
    }
  };

  return (
    <Modal
      dialogAs={DraggableModalDialog}
      show={show}
      onHide={() => {
        handleCloseModal();
      }}
      size="lg"
      backdrop="static"
      centered
      style={{ userSelect: "none" }}
    >
      <Modal.Header style={{ cursor: "move" }}>
        <Modal.Title
          style={{
            fontSize: "25px",
            fontFamily: "Lucida Sans",
            fontWeight: "bolder",
            color: "black",
            width: "100%",
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Fill All Fields
        </Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >
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
        <div className="row w-100">
          <div
            className="col-4 text-right border-bottom"
            style={{
              fontSize: "18px",
              fontFamily: "Lucida Sans",
              color: "black",
              textAlign: "center",
              alignContent: "center",
            }}
          >
            Permit Type
          </div>
          <div className="col-8">
            <Autocomplete
              className="w-100"
              options={[
                "Hot Work",
                "Cold Work",
                "Height Work",
                "Electrical Work",
              ]}
              name="TTNo"
              value={permitType !== "" ? permitType : null}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) =>
                newValue !== null ? setPermitType(newValue) : setPermitType("")
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  error={permitType == ""}
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      fontSize: 20,
                    },
                  }}
                />
              )}
            />
          </div>
        </div>

        <div className="row w-100 mt-2">
          <div
            className="col-4 border-bottom"
            style={{
              fontSize: "18px",
              fontFamily: "Lucida Sans",
              color: "black",
              textAlign: "center",
              alignContent: "center",
            }}
          >
            Permit No
          </div>
          <div className="col-8">
            <TextField
              className="w-100"
              style={{ fontFamily: "Lucida Sans", fontSize: 20 }}
              value={permitNo}
              error={permitNo == ""}
              onChange={(e) => setPermitNo(e.target.value.toUpperCase())}
              InputProps={{
                sx: {
                  fontFamily: "Lucida Sans",
                  fontSize: "20px",
                },
                inputProps: { autoComplete: "off" },
              }}
            />
          </div>
        </div>

        <div className="row w-100 mt-2">
          <div
            className="col-4 border-bottom"
            style={{
              fontSize: "18px",
              fontFamily: "Lucida Sans",
              color: "black",
              textAlign: "center",
              alignContent: "center",
            }}
          >
            Work Description
          </div>
          <div className="col-8">
            <TextField
              className="w-100"
              style={{ fontFamily: "Lucida Sans", fontSize: 20 }}
              value={workDesc}
              error={workDesc == ""}
              onChange={(e) => setWorkDesc(e.target.value)}
              InputProps={{
                sx: {
                  fontFamily: "Lucida Sans",
                  fontSize: "20px",
                },
                inputProps: { autoComplete: "off" },
              }}
            />
          </div>
        </div>

        <div className="row w-100 mt-2">
          <div
            className="col-4 border-bottom"
            style={{
              fontSize: "18px",
              fontFamily: "Lucida Sans",
              color: "black",
              textAlign: "center",
              alignContent: "center",
            }}
          >
            Work Area
          </div>
          <div className="col-8">
            <TextField
              className="w-100"
              style={{ fontFamily: "Lucida Sans", fontSize: 20 }}
              value={workLocation}
              error={workLocation == ""}
              onChange={(e) => setWorkLocation(e.target.value)}
              InputProps={{
                sx: {
                  fontFamily: "Lucida Sans",
                  fontSize: "20px",
                },
                inputProps: { autoComplete: "off" },
              }}
            />
          </div>
        </div>

        <div className="row w-100 mt-2">
          <div
            className="col-4 border-bottom"
            style={{
              fontSize: "18px",
              fontFamily: "Lucida Sans",
              color: "black",
              textAlign: "center",
              alignContent: "center",
            }}
          >
            Officer Name
          </div>
          <div className="col-8">
            <Autocomplete
              className="w-100"
              options={FinalOfficerList}
              name="receiverName"
              value={receiverName !== "" ? receiverName : null}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) =>
                newValue !== null
                  ? setReceiverName(newValue)
                  : setReceiverName("")
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  error={receiverName == ""}
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      fontSize: 20,
                    },
                  }}
                />
              )}
            />
          </div>
        </div>

        <div className="row w-100 mt-2">
          <div
            className="col-4 border-bottom"
            style={{
              fontSize: "18px",
              fontFamily: "Lucida Sans",
              color: "black",
              textAlign: "center",
              alignContent: "center",
            }}
          >
            Clearance From
          </div>
          <div className="col-8">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DemoItem>
                <TimePicker
                  type="time"
                  name="clr-start-time"
                  value={
                    clrStart != ""
                      ? dayjs()
                          .hour(clrStart.split(":")[0])
                          .minute(clrStart.split(":")[1])
                      : dayjs("")
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      sx: {
                        "& .MuiInputBase-input": {
                          fontSize: "20px",
                          fontFamily: "Lucida Sans",
                          color: "black",
                        },
                      },
                    },
                  }}
                  onChange={(newValue) => {
                    if (newValue) {
                      setClrStart(newValue.format("HH:mm"));
                    }
                  }}
                />
              </DemoItem>
            </LocalizationProvider>
          </div>
        </div>

        <div className="row w-100 mt-2">
          <div
            className="col-4 border-bottom"
            style={{
              fontSize: "18px",
              fontFamily: "Lucida Sans",
              color: "black",
              textAlign: "center",
              alignContent: "center",
            }}
          >
            Clearance Till
          </div>
          <div className="col-8">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DemoItem>
                <TimePicker
                  type="time"
                  name="clr-end-time"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      sx: {
                        "& .MuiInputBase-input": {
                          fontSize: "20px",
                          fontFamily: "Lucida Sans",
                          color: "black",
                        },
                      },
                    },
                  }}
                  value={
                    clrEnd != ""
                      ? dayjs()
                          .hour(clrEnd.split(":")[0])
                          .minute(clrEnd.split(":")[1])
                      : dayjs("")
                  }
                  onChange={(newValue) => {
                    if (newValue) {
                      setClrEnd(newValue.format("HH:mm"));
                    }
                  }}
                />
              </DemoItem>
            </LocalizationProvider>
          </div>
        </div>

        <div className="row w-100 mt-2">
          <div
            className="col-4 border-bottom"
            style={{
              fontSize: "18px",
              fontFamily: "Lucida Sans",
              color: "black",
              textAlign: "center",
              alignContent: "center",
            }}
          >
            Contractor Name
          </div>
          <div className="col-8">
            <Autocomplete
              className="w-100"
              options={contractorListForLocation.map(
                (item) => item["CONTRACTOR_NAME"],
              )}
              name="contractorName"
              value={contractorName !== "" ? contractorName : null}
              isOptionEqualToValue={(option, value) => option === value}
              onInputChange={(event, newValue, reason) => {
                newValue !== null
                  ? setContractorName(newValue.toLocaleUpperCase().trim())
                  : setContractorName("");
              }}
              onChange={(e, newValue) =>
                newValue !== null
                  ? setContractorName(newValue)
                  : setContractorName("")
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={"Select From Dropdown or Type For New..."}
                  error={contractorName == ""}
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      fontFamily: "Lucida Sans",
                      fontSize: 20,
                    },
                  }}
                />
              )}
            />
          </div>
        </div>

        <Button
          color="success"
          variant="contained"
          style={{
            margin: "6px 5px 0px 5px",
            height: "48px",
            width: "200px",
            fontSize: "20px",
            fontWeight: "normal",
            fontFamily: "Lucida Sans",
          }}
          onClick={(e) => {
            handlePostData(e);
          }}
        >
          SUBMIT
        </Button>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-center">
        <Button
          variant="contained"
          style={{
            width: 150,
            fontSize: "18px",
            fontFamily: "Lucida Sans",
            fontWeight: "normal",
          }}
          onClick={() => {
            handleCloseModal();
          }}
        >
          <Close style={{ marginRight: "5px" }} />
          CLOSE
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
