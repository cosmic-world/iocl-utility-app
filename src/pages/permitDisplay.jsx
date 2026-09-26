import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Table from "react-bootstrap/Table";
import "../css/page_layout.css";
import NavbarPermit from "../components/NavbarPermit";

export default function PermitDisplay({ handleReadMail }) {
  const { PermitList, officerList } =
    useSelector((state) => state.myApp);
  const [startIndex, setstartIndex] = useState(0);
  const $table = document.querySelector(".ttes_table_view");
  const $table_height = $table ? $table.clientHeight : 500;
  const $thead = document.querySelector(".table-head");
  const $thead_height = $thead ? $thead.clientHeight : 50;
  const tbody_rows_count = Math.floor(($table_height - $thead_height) / 45) - 1;
  const step = tbody_rows_count;
  const [show, setShow] = useState(false);
  const [clock, setClock] = React.useState(0);
  const officerListForLocation = officerList;

  useEffect(() => {
    setInterval(() => {
      if (clock > 5000) {
        setClock(0);
      } else {
        setClock((prevTemp) => prevTemp + 1);
      }
    }, 5000);
  }, []);

  useEffect(() => {
    setstartIndex((prevState) =>
      prevState + step < PermitList.length ? prevState + step : 0,
    );
  }, [clock]);
  const findOfficerName = (item) => {
    const filteredOfficerName = officerListForLocation.find(
      (officer) => officer["Emp_ID"] == item,
    );
    if (filteredOfficerName) {
      return filteredOfficerName["OFFICER_NAME"];
    } else {
      return item;
    }
  };
  const uniquePermitList = [
    ...new Map(PermitList.map((item) => [item["Permit No"], item])).values(),
  ];

  return (
    <div
      className={
        "d-flex flex-column justify-content-start align-items-start w-100 h-100 p-0"
      }
      style={{
        overflow: "none",
        overflowX: "auto",
        backgroundColor: "#dee4ea",
      }}
    >
      <NavbarPermit />

      <div className="ttes_table_view h-100 m-0">
        <Table bordered hover className="ttes_table">
          <thead className="table-head">
            <tr>
              <th style={{ width: 100 }}>SL NO</th>
              <th style={{ width: 150 }}>DATE</th>
              <th style={{ width: 150 }}>PERMIT TYPE</th>
              <th style={{ width: 150 }}>PERMIT NO</th>
              <th style={{ width: 200 }}>CONTRACTOR NAME</th>
              <th>WORK DESCRIPTION</th>
              <th>WORK LOCATION</th>
              <th style={{ width: 200 }}>OFFICER NAME</th>
              <th style={{ width: 140 }}>CLEARANCE FROM</th>
              <th style={{ width: 140 }}>CLEARANCE TILL</th>
            </tr>
          </thead>
          <tbody
            style={{
              overflow: "hidden",
            }}
          >
            {Array.from({ length: tbody_rows_count }, (_, i) => {
              const permit = uniquePermitList[i + startIndex];
              return (
                <tr key={i}>
                  <td style={{ textAlign: "center" }}>
                    {permit ? i + 1 + startIndex : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Date"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Permit Type"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Permit No"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Contractor Name"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit
                      ? (
                          permit["Work Description"]?.split("/")[1] ||
                          permit["Work Description"]
                        )?.slice(0, 100)
                      : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Work Location"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? findOfficerName(permit["Receiver Name"]) : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Clearance From"] : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {permit ? permit["Clearance Till"] : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
