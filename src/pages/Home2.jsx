import React, { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import {
  DisplaySettings,
  GridView,
  Dashboard,
  Approval,
  LocalShipping,
} from "@mui/icons-material";
import { Typography, CardActionArea, Box, Badge } from "@mui/material";
import {
  SetSelectedApplication,
  NavBarComponent,
  SetOfficerMasterList,
} from "../action/userSlice";
import { useDispatch, useSelector } from "react-redux";
import { apiUrl } from "../api";

export default function contacts() {
  const dispatch = useDispatch();
  const { selectedApplication } = useSelector(
    (state) => state.myApp,
  );
  const [selectedCard, setSelectedCard] = useState("");

  const handleSubmit = (e) => {
    if (selectedCard === "TT Crew Temporary Pass") {
      dispatch(SetSelectedApplication("TT Crew Temporary Pass"));
      dispatch(NavBarComponent("tempPassDashboard"));
    } else if (selectedCard === "Permit Dashboard") {
      dispatch(SetSelectedApplication("Permit Display Table View"));
      dispatch(NavBarComponent("permitDisplay"));
    } else if (selectedCard === "Labour Entry") {
      dispatch(SetSelectedApplication("Worker Pass Approval Centre"));
      dispatch(NavBarComponent("labourPassApproval"));
    } else if (selectedCard === "TT IN-OUT") {
      dispatch(SetSelectedApplication("TT In-Out"));
      dispatch(NavBarComponent("ttInOutDashboard"));
    }
  };

  return (
    <Box className="d-flex flex-column w-100 h-100 align-items-center justify-content-start justify-content-xxl-center">
      <Box className="d-flex flex-wrap w-100 mt-2 pb-2 justify-content-evenly align-items-center">
        <Card
          style={{ width: 250, height: 200, cursor: "pointer", margin: 10 }}
        >
          <CardActionArea
            onMouseDown={() => setSelectedCard("TT Crew Temporary Pass")}
            onClick={() => {
              handleSubmit();
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

        <Card
          style={{ width: 250, height: 200, cursor: "pointer", margin: 10 }}
        >
          <CardActionArea
            onMouseDown={() => setSelectedCard("Permit Dashboard")}
            onClick={() => {
              handleSubmit();
            }}
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

        <Card
          style={{ width: 250, height: 200, cursor: "not-allowed", margin: 10 }}
        >
          <CardActionArea
            onMouseDown={() => setSelectedCard("Labour Entry")}
            onClick={() => {
              handleSubmit();
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
                <Approval color="primary" sx={{ zoom: 3, mb: 1 }} />
                {"Worker Entry"}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card
          style={{ width: 250, height: 200, cursor: "not-allowed", margin: 10 }}
        >
          <CardActionArea
            disabled
            onMouseDown={() => setSelectedCard("Material Mangement")}
            onClick={() => {
              handleSubmit();
            }}
            data-active={selectedApplication === "Material Mangement"}
            sx={{
              height: "100%",
              backgroundColor: "white",
              transition: "background-color 0.3s",
              "&.MuiButtonBase-root, &.MuiCardActionArea-root": {
                backgroundColor:
                  selectedApplication === "Material Mangement"
                    ? "action.selected"
                    : "white !important",
              },
            }}
          >
            <CardContent className="w-100 h-100 text-center">
              <Typography className="app-name">
                <GridView color="primary" sx={{ zoom: 3, mb: 1 }} />
                <span style={{ opacity: 0.7 }}>Material Mangement</span>
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

        <Card
          style={{ width: 250, height: 200, cursor: "not-allowed", margin: 10 }}
        >
          <CardActionArea
            disabled
            onClick={() => {
              setSelectedCard("TT IN-OUT");
              handleSubmit();
            }}
            data-active={selectedApplication === "TT IN-OUT"}
            sx={{
              height: "100%",
              backgroundColor: "white",
              transition: "background-color 0.3s",
              "&.MuiButtonBase-root, &.MuiCardActionArea-root": {
                backgroundColor:
                  selectedApplication === "TT IN-OUT"
                    ? "action.selected"
                    : "white !important",
              },
            }}
          >
            <CardContent className="w-100 h-100 text-center">
              <Typography className="app-name">
                <LocalShipping color="primary" sx={{ zoom: 3, mb: 1 }} />
                <span style={{ opacity: 0.7 }}>TT IN-OUT</span>
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
    </Box>
  );
}
