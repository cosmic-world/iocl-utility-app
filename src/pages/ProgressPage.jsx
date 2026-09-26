import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  NavBarComponent,
  SetSelectedApplication,
  SetLocationList,
} from "../action/userSlice";
import { Box } from "@mui/material";
import { apiUrl } from "../api";

function App() {
  const [progress, setProgress] = useState(0);
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
      dispatch(NavBarComponent("sign-in"));
      dispatch(SetSelectedApplication("Sign In"));
    }
  }, [progress]);

  const handleGetLocations = async () => {
    try {
      const response = await fetch(apiUrl("/api/utility-locations"));
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      dispatch(SetLocationList(zlist));
    } catch (error) {
      console.error("Failed to fetch records", error);
    }
  };

  useEffect(() => {
    handleGetLocations();
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
              background: "linear-gradient(90deg, #1976d2, #6610f2)",
              transition: "width 0.1s ease",
            }}
          />
        </div>
      </div>
    </Box>
  );
}

export default App;
