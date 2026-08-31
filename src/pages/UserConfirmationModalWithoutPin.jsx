import React from "react";
import Modal from "react-bootstrap/Modal";
import ModalDialog from "react-bootstrap/ModalDialog";
import Draggable from "react-draggable";
import { Button } from "@mui/material";

class DraggableModalDialog extends React.Component {
  render() {
    return (
      <Draggable handle=".modal-header">
        <ModalDialog {...this.props} />
      </Draggable>
    );
  }
}

export default function UserConfirmationFinalWithoutPin(props) {
  const { handleAction, show, setShow, selectedId } = props;

  return (
    <Modal
      contentClassName="Modal-userConfimation"
      aria-labelledby="contained-modal-title-vcenter"
      dialogClassName="modal-90w"
      show={show}
      backdrop="static"
      backdropClassName="no-backdrop"
      centered
      onHide={() => setShow(false)}
      dialogAs={DraggableModalDialog}
    >
      <Modal.Header
        closeButton
        style={{
          fontSize: "20px",
          fontFamily: "cambria",
          color: "black",
          width: "100%",
          cursor: "move",
        }}
      >
        <label className="w-100 text-center">
          {"Are you sure to delete it?"}
        </label>
      </Modal.Header>
      <Modal.Body
        style={{
          display: "flex",
          justifyContent: "space-evenly",
          color: "black",
          width: "100%",
        }}
      >
        <Button
          name={"YES"}
          variant={"contained"}
          sx={{ width: 150, height: 35, fontSize: 18, fontFamily: "calibri" }}
          onClick={(e) => {
            handleAction(selectedId);
            setShow(false);
          }}
        >
          YES
        </Button>

        <Button
          name={"NO"}
          variant={"contained"}
          sx={{ width: 150, height: 35, fontSize: 18, fontFamily: "calibri" }}
          onClick={(e) => setShow(false)}
        >
          NO
        </Button>
      </Modal.Body>
    </Modal>
  );
}
