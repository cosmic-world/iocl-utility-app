import React, { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography, Checkbox } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useSelector } from "react-redux";
import { apiUrl } from "../api";
import Table from "react-bootstrap/Table";

export default function LabourApprovalDashboard() {
  const { userType } = useSelector((state) => state.myApp);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const readOnly = userType === "user";
const [records, setRecords] = useState([]);
  const [selectedLabourIds, setSelectedLabourIds] = useState([]);
  const [seaching, setSearching] = useState(false);
const [saveLoader, setSaveLoader] = useState(false);

  const fetchRecords = async () => {
    setSaveLoader(true);
    setSearching(true);
    try {
      const params = new URLSearchParams();
      params.append("fetchdate", new Date('en-GB'));
      const url = apiUrl(`/api/labour-pass-requests?${params.toString()}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load records");
      }
      const data = await response.json();
      const zlist = Array.isArray(data) ? data : [];
      setRecords(zlist);
      zlist.length == 0
        ? alert("No records found matching the search criteria.")
        : null;
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setSaveLoader(false);
      setSearching(false);
    }
  };
  const toggleLabourSelection = (record) => {
    setSelectedLabourIds((current) =>
      current.includes(record.ID)
        ? current.filter((id) => id !== record.ID)
        : [...current, record.ID],
    );
  };

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "#f3f6f9", p: { xs: 2, md: 4 }, fontFamily: "Lucida Sans" }}>
      <Box sx={{ width: '100%', mx: "auto" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="center" alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#12324a" }}>Review pending requests and monitor approval status</Typography>
          </Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRecords} disabled={saveLoader}
          style={{ width: 200, backgroundColor: "white" }}>Refresh</Button>
          <Button
            color="primary"
            variant="outlined"
            sx={{ m: 2 }}
            style={{ width: 200, backgroundColor: "white" }}
            onClick={(e) => {
              setRecords([]);
              setSelectedLabourIds([]);
            }}
          >
           Clear Table
          </Button>
        </Stack>

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

      <div className="ttes_table_view">
        <Table bordered hover striped className="ttes_table">
          <thead className="table-head">
            <tr>
              <th style={{ width: 80 }}>
                SELECT
                <Checkbox
                  size="small"
                  style={{color:'white'}}
                  checked={records.length > 0 && selectedLabourIds.length === records.length}
                  indeterminate={selectedLabourIds.length > 0 && selectedLabourIds.length < records.length}
                  onChange={(event) => setSelectedLabourIds(event.target.checked ? records.map((record) => record.ID) : [])}
                />
              </th>
              <th>CONTRACTOR NAME</th>
              <th>LABOUR NAME</th>
              <th>MOBILE NO</th>
              <th>AADHAAR NO</th>
              <th>ADDRESS</th>
              <th style={{ width: 100 }}>REF DOC-1</th>
              <th style={{ width: 100 }}>REF DOC-2</th>
              <th style={{ width: 100 }}>REF DOC-3</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(
              {length: records.length > 0 ? records.length : 100},(_, i) => {
                const record = records[i];
                const getLink = (value) => {
                  if (!value) return "-";
                  const url = value.startsWith("http")
                    ? value
                    : `/uploads/${value}`;
                  return (
                    <a href={url} target="_blank" rel="noreferrer">
                      <Visibility color="secondary" />
                    </a>
                  );
                };
                return (
                  <tr key={i}>
                    <td style={{ textAlign: "center" }}>
                      {record ? (
                        <Checkbox
                          checked={selectedLabourIds.includes(record.ID)}
                          onChange={() => toggleLabourSelection(record)}
                        />
                      ) : ""}
                      {record ? i + 1 : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record ? record["CONTRACTOR"] : ""}
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
                      {record && showRecords
                        ? getLink(record.request_letter_path)
                        : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record && showRecords
                        ? getLink(record.id_proof_path)
                        : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {record && showRecords
                        ? getLink(record.driving_licence_path)
                        : ""}
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </Table>
      </div>

      </Box>
    </Box>
  );
}
