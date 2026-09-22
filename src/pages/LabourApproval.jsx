import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { apiUrl } from "../api";
import { SetSelectedApplication } from "../action/userSlice";

export default function LabourApproval() {
  const { token } = useParams();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const readOnly = searchParams.get("view") === "status";
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [selectedLabourIds, setSelectedLabourIds] = useState([]);

  useEffect(() => {
    fetch(apiUrl(`/api/labour-pass-requests/${token}`))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to load request.");
        setRequest(data);
      })
      .catch((loadError) => setError(loadError.message));
  }, [token]);

  const decideSelectedLabours = async (decision) => {
    if (!selectedLabourIds.length) {
      setError("Select at least one pending labour first.");
      return;
    }
    setProcessingId(decision);
    setError("");
    try {
      const response = await fetch(
        apiUrl(`/api/labour-pass-requests/${token}/decision`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            labourIds: selectedLabourIds,
            decidedBy: request.rows[0].APPROVING_OFFICER,
          }),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Approval failed.");
      }
      const data = await response.json();
      setRequest((current) => ({
        ...current,
        rows: current.rows.map((row) =>
          selectedLabourIds.includes(row.ID)
            ? {
                ...row,
                REQUEST_STATUS:
                  decision === "APPROVE" ? "APPROVED" : "REJECTED",
              }
            : row,
        ),
        status: data.status,
      }));
      setSelectedLabourIds([]);
    } catch (approvalError) {
      setError(approvalError.message);
    } finally {
      setProcessingId(null);
    }
  };
  useEffect(() => {
    dispatch(SetSelectedApplication("IOCL Utility App"));
  }, []);
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f3f6f9",
        py: { xs: 3, md: 8 },
        px: 2,
        fontFamily: "Lucida Sans",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 980,
          mx: "auto",
          border: "1px solid #d8e1ea",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            bgcolor: "#0b5cab",
            color: "white",
            px: { xs: 3, md: 6 },
            py: 4,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Labour Entry Approval
          </Typography>
          <Typography sx={{ mt: 1, opacity: 0.86 }}>
            Review the temporary pass request before approving.
          </Typography>
        </Box>
        <Box sx={{ p: { xs: 3, md: 6 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          {!request && !error && (
            <Stack alignItems="center" py={8}>
              <CircularProgress />
            </Stack>
          )}
          {request && (
            <>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={2}
                sx={{ mb: 4 }}
              >
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    CONTRACTOR
                  </Typography>
                  <Typography variant="h6">
                    {request.rows[0].CONTRACTOR}
                  </Typography>
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    REQUEST STATUS
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color:
                        request.status === "APPROVED" ? "#16803c" : "#b26a00",
                    }}
                  >
                    {request.status}
                  </Typography>
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    LABOUR COUNT
                  </Typography>
                  <Typography variant="h6">{request.rows.length}</Typography>
                </Box>
              </Stack>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Requested labour
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ mb: 2 }}
              >
                {!readOnly && (
                  <>
                    <input
                      type="checkbox"
                      aria-label="Select all pending workers"
                      checked={
                        request.rows.some((row) => row.REQUEST_STATUS === "PENDING") &&
                        request.rows.filter((row) => row.REQUEST_STATUS === "PENDING")
                          .every((row) => selectedLabourIds.includes(row.ID))
                      }
                      ref={(element) => {
                        if (element) {
                          const pendingRows = request.rows.filter(
                            (row) => row.REQUEST_STATUS === "PENDING",
                          );
                          element.indeterminate =
                            selectedLabourIds.length > 0 &&
                            selectedLabourIds.length < pendingRows.length;
                        }
                      }}
                      onChange={(event) => {
                        const pendingIds = request.rows
                          .filter((row) => row.REQUEST_STATUS === "PENDING")
                          .map((row) => row.ID);
                        setSelectedLabourIds(
                          event.target.checked ? pendingIds : [],
                        );
                      }}
                    />
                    <Typography variant="body2" sx={{ alignSelf: "center", mr: 1 }}>
                      Select all pending
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleOutlineIcon />}
                      disabled={processingId !== null}
                      onClick={() => decideSelectedLabours("APPROVE")}
                    >
                      Approve selected
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<CancelOutlinedIcon />}
                      disabled={processingId !== null}
                      onClick={() => decideSelectedLabours("REJECT")}
                    >
                      Reject selected
                    </Button>
                  </>
                )}
                {readOnly && (
                  <Typography variant="body2" color="text.secondary">
                    Read-only status view
                  </Typography>
                )}
              </Stack>
              <Stack spacing={2}>
                {request.rows.map((row, index) => (
                  <Paper
                    key={row.ID}
                    variant="outlined"
                    sx={{ p: 2.5, bgcolor: "#fbfcfe" }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {!readOnly && row.REQUEST_STATUS === "PENDING" && (
                        <input
                          type="checkbox"
                          checked={selectedLabourIds.includes(row.ID)}
                          onChange={() =>
                            setSelectedLabourIds((current) =>
                              current.includes(row.ID)
                                ? current.filter((id) => id !== row.ID)
                                : [...current, row.ID],
                            )
                          }
                        />
                      )}
                      <Typography fontWeight={700}>
                        {index + 1}. {row.LABOUR_NAME}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Mobile: {row.MOBILE_NO || "Not provided"} &nbsp; | &nbsp;
                      ID proof: {row.AADHAAR_NO || "Not provided"}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {row.ADDRESS || "Address not provided"}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      {row.REQUEST_STATUS !== "PENDING" && (
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={
                            row.REQUEST_STATUS === "APPROVED"
                              ? "success.main"
                              : "error.main"
                          }
                        >
                          {row.REQUEST_STATUS}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Paper
                variant="outlined"
                sx={{ mt: 3, p: 2.5, bgcolor: "#f8fafc" }}
              >
                <Typography>
                  <strong>Purpose:</strong> {request.rows[0].PURPOSE}
                </Typography>
                <Typography sx={{ mt: 1 }}>
                  <strong>Time in:</strong> {request.rows[0].TIME_IN}
                </Typography>
                <Typography sx={{ mt: 1 }}>
                  <strong>Approving officer:</strong>{" "}
                  {request.rows[0].APPROVING_OFFICER}
                </Typography>
              </Paper>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
