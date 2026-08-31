import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import PhoneIcon from "@mui/icons-material/Phone";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";

export default function contacts() {
  return (
    <div className="d-flex w-100 h-100 justify-content-center align-items-center">
      <Card className="card-style">
        <CardContent
          className="card-content w-100 h-100 d-flex flex-column justify-content-center align-items-center"
          style={{
            color: "black",
            fontFamily: "Lucida Sans",
            fontStyle: "italic",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          <label className="brand-name">Manas Roy</label>
          <label
            style={{ color: "#0458d4", fontStyle: "normal", margin: "1rem" }}
          >
            <span>
              <PhoneIcon className="icon-size" />
            </span>
            +91 7980749529
          </label>
          <label
            style={{ color: "#d40404", fontStyle: "normal", margin: "1rem" }}
          >
            <span>
              <AlternateEmailIcon className="icon-size" />
            </span>
            roym1@indianoil.in
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
