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
  const { navBarComponent, selectedTerminal, PermitList, userType } = useSelector(
    (state) => state.myApp,
  );
  
  const permitListRef = useRef(PermitList);

  useEffect(() => {
    permitListRef.current = PermitList;
  }, [PermitList]);

  useEffect(() => {
    if (navBarComponent == "") {
      dispatch(NavBarComponent(""));
    }
  }, []);

  const handleReadMail = async () => {
    try {
      const response = await fetch(apiUrl("/api/permits"));
      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        return;
      }
      const currentPermitList = permitListRef.current;
      const zlist = result.data
        .map((item) => item["json"])
        .filter(Boolean)
        .filter((ele) => {
          const clearanceTill = ele["Clearance Till"];
          return clearanceTill > new Date().toLocaleTimeString("en-GB");
        });
      const unique_zlist = [
        ...new Map(zlist.map((item) => [item["Permit No"], item])).values(),
      ];
      const ylist = unique_zlist.filter((ele) => {
        const permitNo = ele["Permit No"];
        return currentPermitList.every(
          (existingEle) => existingEle["Permit No"] != permitNo,
        );
      });
      if (ylist.length > 0) {
        const sheet_url = `https://script.google.com/macros/s/AKfycbzFEbaJnXq5bVjQuYQjidG544bGBscOcKQaw5lalrCayipfE8xp7Jas4nlrK_OfElHl/exec`;
        for (const item of ylist) {
          try {
            await fetch(sheet_url, {
              method: "POST",
              mode: "no-cors",
              body: new URLSearchParams({
                data: JSON.stringify({
                  "Permit Type": item["Permit Type"],
                  "Work Description": item["Work Description"],
                  "Work Location": item["Work Location"],
                  "Receiver Name": item["Receiver Name"],
                  "Clearance From": item["Clearance From"],
                  "Clearance Till": item["Clearance Till"],
                  "Contractor Name": item["Contractor Name"],
                  "Permit No": item["Permit No"],
                  "Location Name": selectedTerminal[1],
                }),
              }),
            });
          } catch (error) {
            console.log(
              "error form...",
              `${error} and also check internet connection`,
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to load permits:", error);
    }
  };

  useEffect(() => {
    let intervalId;
    if (selectedTerminal !== "") {
      // handleReadMail();
      intervalId = setInterval(handleReadMail, 10000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedTerminal]);

  const locationName = selectedTerminal[selectedTerminal.length - 1];

  const SHEET_ID = "1Jj8ub1mBS0RylJmadtYn2MenjBHWfX7c4vM_Oci6ydc";

  useEffect(() => {
    let intervalId;
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
          (obj) => !(Object.keys(obj).length === 1 && obj[""] === ""),
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
      const response = await fetch(apiUrl("/api/contractor-master-data"));
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
                handleReadMail={handleReadMail}
                handleSyncContractor={handleSyncContractor}
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default React.memo(App);
