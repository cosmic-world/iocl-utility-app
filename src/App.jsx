import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState, useRef } from "react";
import { apiUrl } from "./api";
import "react-bootstrap-table-next/dist/react-bootstrap-table2.min.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Header from "./pages/Header";
import LandingPage from "./pages/landingPage";
import { useDispatch, useSelector } from "react-redux";
import LabourApproval from "./pages/LabourApproval";
import {
  NavBarComponent,
  SetPermitList,
  SetContractorMasterList,
  SetLabourMasterList,
  SetOfficerMasterList,
} from "./action/userSlice";

function formatDate(date1) {
  const date = new Date(...date1.slice(5, -1).split(","));
  return date.toLocaleDateString("en-GB").replace(",", "").replaceAll("/", "-");
}
function formatTime(dateStr) {
  const parts = dateStr.match(/\d+/g);
  const hour = parts[3].padStart(2, "0");
  const minute = parts[4].padStart(2, "0");
  return `${hour}:${minute}`;
}

function App() {
  const dispatch = useDispatch();
  const {
    navBarComponent,
    selectedTerminal,
    PermitList,
    officerList,
    locationList,
    locationCode,
  } = useSelector((state) => state.myApp);

  const locationName = selectedTerminal[selectedTerminal.length - 1];

  const permit_type_array =
    PermitList.length > 0 ? PermitList.map((val) => val["Permit Type"]) : [];
  const permit_labels = [
    "Hot Work ",
    "Cold Work ",
    "Electrical Work ",
    "Height Work",
  ];
  const series = permit_labels.map((type) => {
    return permit_type_array.filter((item) => item == type.trim()).length;
  });

  const [state, setState] = useState({
    series: series,
    options: {
      chart: {
        width: 380,
        type: "pie",
      },
      legend: {
        show: false,
      },
      colors: ["#e7028c", "#d9d90b", "#6ccded", "#b9b5b5"],
      fill: {
        type: "gradient",
        gradient: {
          type: "horizontal",
          gradientToColors: [
            "#e7028c", // solid
            "#d9d90b", // solid
            "#6ccded",
            "#b9b5b5",
          ],
          stops: [0, 100],
        },
      },
      dataLabels: {
        style: {
          fontSize: "16px",
          fontFamily: "Lucida Sans",
          colors: ["#ffffff"],
        },
      },
      plotOptions: {
        pie: {
          dataLabels: {
            offset: -20,
          },
        },
      },
      labels: permit_labels,
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 200,
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],
    },
  });

  const handleSyncContractor = async () => {
    try {
      const response = await fetch(
        apiUrl(
          `/api/contractor-master-data?locationCode=${locationCode || ""}`,
        ),
      );
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      dispatch(SetContractorMasterList(zlist));
    } catch (error) {
      console.error("Failed to fetch records", error);
    }
  };
  const handleSync = async () => {
    try {
      const response = await fetch(
        apiUrl(`/api/labour-master-data?location_code=${locationCode || ""}`),
      );
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      dispatch(SetLabourMasterList(zlist));
    } catch (error) {
      console.error("Failed to fetch records", error);
    }
  };

  const handleSyncOfficer = async () => {
    try {
      const response = await fetch(
        apiUrl(`/api/officer-master-data?locationCode=${locationCode || ""}`),
      );
      if (!response.ok) {
        throw new Error("Failed to load officer records");
      }
      const data = await response.json();
      const officerRecords = Array.isArray(data) ? data : [];
      dispatch(SetOfficerMasterList(officerRecords));
    } catch (error) {
      console.error("Failed to fetch officer records", error);
    }
  };

  useEffect(() => {
    let intervalId;
    const fetchSheetData = async () => {
      try {
        const response = await fetch(apiUrl("/api/permit-sheet"));
        if (!response.ok) {
          throw new Error("Failed to load permit records");
        }
        const result = await response.json();
        const formattedData = Array.isArray(result.data) ? result.data : [];
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
                .filter((ele) => {
                  return (
                    formatTime(ele["Clearance Till"]) >
                    new Date().toLocaleTimeString("en-GB")
                  );
                })
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
        dispatch(SetPermitList(filteredData));
        const permit_type_array = filteredData.map((val) => val["Permit Type"]);
        const permit_labels = [
          "Hot Work ",
          "Cold Work ",
          "Electrical Work ",
          "Height Work ",
        ];
        const series = permit_labels.map((type) => {
          return permit_type_array.filter((item) => item == type.trim()).length;
        });

        setState((prev) => ({
          ...prev,
          series: series,
        }));
      } catch (error) {
        console.log(
          "error app...",
          `${error} and also check internet connection`,
        );
      }
    };
    if (selectedTerminal !== "") {
      fetchSheetData(); // optional: run immediately
      intervalId = setInterval(fetchSheetData, 5000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedTerminal]);

  useEffect(() => {
    if (navBarComponent == "") {
      dispatch(NavBarComponent(""));
    }
  }, []);

  useEffect(() => {
    handleSyncOfficer();
    handleSync();
    handleSyncContractor();
  }, [selectedTerminal, locationCode]);

    useEffect(() => {
    const channel = new BroadcastChannel("iocl_utility_app");

    // Send a message that this tab is active
    channel.postMessage("tab_opened");

    // Handle incoming messages
    channel.onmessage = (event) => {
      if (event.data === "tab_opened") {
        alert("A duplicate tab is detected. Click OK to close this session");
        window.location.href = "about:blank"; // Redirect the duplicate tab
      }
    };

    // Cleanup
    return () => {
      channel.close();
    };
  }, []);
  
  return (
    <div className="App d-flex flex-column vh-100 vw-100">
      <Header />
      <BrowserRouter>
        <Routes>
          <Route path="/approve-labour/:token" element={<LabourApproval />} />
          <Route
            path="/"
            element={
              <LandingPage
                state={state}
                handleSyncContractor={handleSyncContractor}
                handleSync={handleSync}
                handleSyncOfficer={handleSyncOfficer}
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default React.memo(App);
