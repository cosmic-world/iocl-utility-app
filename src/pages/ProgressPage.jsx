import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  NavBarComponent,
  SetSelectedApplication,
  SetLocationList,
} from "../action/userSlice";
import {Box} from "@mui/material";

function App() {
  const [progress, setProgress] = useState(0);
  const SHEET_ID = "1Jj8ub1mBS0RylJmadtYn2MenjBHWfX7c4vM_Oci6ydc";
  const dispatch = useDispatch();
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      dispatch(NavBarComponent("home"));
      dispatch(SetSelectedApplication("USER TYPE"));
    }
  }, [progress]);

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
          (val) => val["Active"] == "Y",
        );
        dispatch(
          SetLocationList(
            filteredData.map((obj) =>
              Object.fromEntries(
                Object.entries(obj).filter(
                  ([key]) => !["Passcode", "Admin_pass"].includes(key),
                ),
              ),
            ),
          ),
        );
      } catch (error) {
        console.log(
          "error progress...",
          `${error} and also check internet connection`,
        );
      }
    };
    fetchSheetData();
  }, []);

  return (
    <Box
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f4f6f9",
      }}
    >
      <div
        style={{
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h1
          style={{ marginBottom: "5rem", color: "#333", fontStyle: "italic" }}
        >
          WELCOME TO IOCL UTILITY APP...
        </h1>
        <h3>Loading... {progress}%</h3>
        <div
          className="progress-bar"
          style={{
            height: "30px",
            backgroundColor: "#ddd",
            borderRadius: "25px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #0d6efd, #6610f2)",
              transition: "width 0.1s ease",
            }}
          />
        </div>
      </div>
    </Box>
  );
}

export default App;
