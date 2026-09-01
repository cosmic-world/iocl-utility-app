import React, { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { DisplaySettings, GridView, Dashboard,
  Password, LocationOn
 } from "@mui/icons-material";
import { Typography, CardActionArea, Box, Badge } from "@mui/material";
import { SetSelectedApplication, NavBarComponent, SelectedTerminal } from "../action/userSlice";
import { useDispatch, useSelector } from "react-redux";
import { Cascader } from "antd";
import { Button, TextField, Select, InputAdornment, OutlinedInput } from "@mui/material";

export default function contacts() {
  const dispatch = useDispatch();
  const { selectedApplication, selectedTerminal, locationList, userType } = useSelector((state) => state.myApp);
  const [pass, SetPass] = useState("");
  const [passcode, setPasscode] = useState("");
  const locationName = selectedTerminal[selectedTerminal.length - 1];
  const SHEET_ID = "1Jj8ub1mBS0RylJmadtYn2MenjBHWfX7c4vM_Oci6ydc";
 const [permitDashClicked, setPermitDashClicked] = useState(false);
  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=credentials`,
        );
        const text = await response.text();
        // Remove unwanted characters from response
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const rows = json.table.rows.map((row) => row.c.map((ele) => ele.v));
        const cols = json.table.cols.map((col) => col.label);

        // Convert rows into simple array
        const formattedData = rows.map((row) => {
          const obj = {};
          row.forEach((cell, index) => {
            obj[cols[index]] = cell;
          });
          return obj;
        });
        const filteredData = formattedData.filter(
          (ele) =>
            ele["Location Name"].toLowerCase() ===
            ((locationName !== "") & (locationName != undefined)
              ? locationName.toLowerCase()
              : "test"),
        );
        setPasscode(filteredData.length > 0 ? filteredData[0]["Passcode"] : "");
        setAdmin_Passcode(
          filteredData.length > 0 ? filteredData[0]["Admin_pass"] : "",
        );
      } catch (error) {
        console.error("Error fetching sheet data:", error);
      }
    };
    if (selectedTerminal != "") {
      fetchSheetData();
    }
  }, [locationName]);
  const zlist = [];

  locationList.forEach((obj) => {
    const existing = zlist.find((item) => item.value === obj["State Office"]);

    if (existing) {
      existing.children.push({
        label: obj["Location Name"],
        value: obj["Location Name"],
      });
    } else {
      zlist.push({
        label: obj["State Office"],
        value: obj["State Office"],
        children: [
          {
            label: obj["Location Name"],
            value: obj["Location Name"],
          },
        ],
      });
    }
  });

  const stateOfficeList = zlist;

  return (
    <Box className="d-flex flex-column w-100 h-100 align-items-center justify-content-start">
    <Box className="d-flex flex-wrap w-100 mt-5 mb-5 justify-content-evenly align-items-center">

      <Card style={{ width: 250, height: 200, cursor: "pointer", margin: 10 }}>
        <CardActionArea
          onClick={() => {
            dispatch(SetSelectedApplication("TT Crew Temporary Pass"));
            dispatch(NavBarComponent("tempPassDashboard"));
          }}
          data-active={selectedApplication === "TT Crew Temporary Pass"}
          sx={{
            height: "100%",
            backgroundColor: "white",
            transition: "background-color 0.3s",
            "&.MuiButtonBase-root, &.MuiCardActionArea-root": {
              backgroundColor:
                selectedApplication === "TT Crew Temporary Pass"
                  ? "action.selected"
                  : "white !important",
            },
          }}
        >
          <CardContent className="w-100 h-100 text-center">
            <Typography className="app-name">
              <Dashboard color="primary" sx={{ zoom: 3, mb: 1 }} />
              {"TT Crew Temporary Pass"}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Card style={{ width: 250, height: 200, cursor: "pointer", margin: 10 }}>
        <CardActionArea
          // disabled
          // onClick={() => dispatch(SetSelectedApplication("Permit Dashboard"))}
          onClick={() => setPermitDashClicked(true)}
          data-active={selectedApplication === "Permit Dashboard"}
          sx={{
            height: "100%",
            backgroundColor: "white",
            transition: "background-color 0.3s",
            "&.MuiButtonBase-root, &.MuiCardActionArea-root": {
              backgroundColor:
                selectedApplication === "Permit Dashboard"
                  ? "action.selected"
                  : "white !important",
            },
          }}
        >
          <CardContent className="w-100 h-100 text-center">
            <Typography className="app-name">
              <DisplaySettings color="primary" sx={{ zoom: 3, mb: 1 }} />
              {"Permit Dashboard"}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Card style={{ width: 250, height: 200, cursor: "not-allowed", margin: 10 }}>
        <CardActionArea
          disabled
          onClick={() => {
            dispatch(SetSelectedApplication("Labour Entry"));
            dispatch(NavBarComponent("labourPassDashboard"));
          }}
          data-active={selectedApplication === "Labour Entry"}
          sx={{
            height: "100%",
            backgroundColor: "white",
            transition: "background-color 0.3s",
            "&.MuiButtonBase-root, &.MuiCardActionArea-root": {
              backgroundColor:
                selectedApplication === "Labour Entry"
                  ? "action.selected"
                  : "white !important",
            },
          }}
        >
          <CardContent className="w-100 h-100 text-center">
            <Typography className="app-name">
              <GridView color="primary" sx={{ zoom: 3, mb: 1 }} />
              <span style={{ opacity: 0.7 }}>Labour Entry</span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  color: "gray",
                  opacity: 0.7,
                }}
              >
                Under Development
              </span>
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Box>
    {permitDashClicked ? (
        <Box sx={{ mt: 0, width: "100%", maxWidth: 420 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Location Selection
              </Typography>

      <Cascader
        className="custom-cascader"
        popupClassName="custom-cascader-dropdown"
        options={stateOfficeList}
        expandTrigger="hover"
        placeholder={
          selectedTerminal === "" || selectedTerminal === undefined
            ? "Select Terminal..."
            : `${selectedTerminal[0]} / ${selectedTerminal[selectedTerminal.length - 1]}`
        }
        style={{
          width: '360px',
          height: '60px',
          marginBottom: '20px',
        }}
        prefix={<LocationOn style={{ color: "#0046bb" }} />}
        onChange={(newValue) => {
          newValue
            ? dispatch(SelectedTerminal(newValue))
            : dispatch(SelectedTerminal(""));
        }}
      />
      <TextField
        id="passcode"
        placeholder="Enter Passcode For This Location"
        size="large"
        value={pass}
        error={pass!="" && pass!=passcode}
        style={{ marginBottom: 20, width: 360, backgroundColor: "white" }}
        type={"password"}
        required
        onChange={(e) => SetPass(e.target.value.trim())}
        InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Password style={{ color: "#0046bb" }} />
              </InputAdornment>
            ),
            inputProps: {
              autoComplete: "off",
            },
        }}
      />
      <Button
        variant="contained"
        color="success"
        onClick={(e) => {
          dispatch(SetSelectedApplication("Permit Dashboard"));
          setPermitDashClicked(false);
          dispatch(NavBarComponent("formControl"));
        }}
        disabled={
          selectedTerminal === "" ||
          selectedTerminal === undefined ||
          userType=='user'? (pass === "" || pass != passcode) : false
        }
                    >
                      {"Submit"}
                    </Button>
            </CardContent>
          </Card>
        </Box>
      ) : null}
    </Box>
  );
}
