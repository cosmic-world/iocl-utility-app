import React, { useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogActions, Button } from "@mui/material";

const CameraModal = ({ open, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Request access to the webcam
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing camera: ", err);
          alert("Could not access the camera. Please check your permissions.");
          onClose();
        });
    }

    // Clean up and turn off webcam when modal closes
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [open, onClose]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert the canvas frame to a Blob file that matches your existing input system
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_capture_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onCapture(file);
          onClose();
        }
      }, "image/jpeg");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent
        style={{
          display: "flex",
          justifyContent: "center",
          backgroundColor: "#000",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: "100%", maxHeight: "400px" }}
        />
      </DialogContent>
      <DialogActions style={{ justifyContent: "center" }}>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={capturePhoto} variant="contained" color="secondary">
          Snap Photo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CameraModal;
