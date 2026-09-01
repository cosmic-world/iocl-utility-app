import { useSelector } from "react-redux";
import TempPassDashboard from "./tempPassRecords";
import TempPassHistoryTable from "./TempPassHistoryTable";
import Home from "./Home";
import Home2 from "./Home2";
import ProgressPage from "./ProgressPage";
import Contacts from "./contacts";
import MasterData from "./MasterData";
import LabourMasterData from "./LabourMasterData";
import LabourPassDashboard from "./LabourPassDashboard";
import ContractorCredentials from "./ContractorCredentials";
import OfficerCredentials from "./OfficerCredentials";
import FormControlPage from "./formControlPage";
import PermitDisplay from "./permitDisplay";
import LayoutDisplay from "./layoutDisplay";
import ModifyRecords from "./modifyRecords";

export default function LandingPage({ state }) {
  const navBarComponent = useSelector((state) => state.myApp.navBarComponent);
  return (
    <div className="w-100" style={{ height: "calc(100% - 50px)", overflowY: "auto" }}>
      {navBarComponent === "" ? <ProgressPage /> : null}
      {navBarComponent === "home" ? <Home /> : null}
      {navBarComponent === "home2" ? <Home2 /> : null}
      {navBarComponent === "tempPassDashboard" ? <TempPassDashboard /> : null}
      {navBarComponent === "tempPassHistory" ? <TempPassHistoryTable /> : null}
      {navBarComponent === "masterData" ? <MasterData /> : null}
      {navBarComponent === "labourPassDashboard" ? (
        <LabourPassDashboard />
      ) : null}
      {navBarComponent === "contractor_masterData" ? (
        <LabourMasterData />
      ) : null}
      {navBarComponent === "contractor_cred" ? <ContractorCredentials /> : null}
      {navBarComponent === "officer_cred" ? <OfficerCredentials /> : null}
      {navBarComponent === "contacts" ? <Contacts /> : null}
      {navBarComponent === "formControl" ? <FormControlPage /> : null}
      {navBarComponent === "permitDisplay" ? <PermitDisplay /> : null}
      {navBarComponent === "layoutDisplay" ? (
        <LayoutDisplay state={state} />
      ) : null}
      {navBarComponent === "modifyRecords" ? <ModifyRecords /> : null}
    </div>
  );
}
