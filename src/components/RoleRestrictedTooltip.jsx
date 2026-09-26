import React from "react";
import { Tooltip } from "@mui/material";

export const ROLE_RESTRICTED_MESSAGE =
  "Your role is not authorized for this action.";

// Disabled elements don't fire pointer events, so MUI Tooltip needs a
// non-disabled wrapper (span) around the child to show the message on hover.
export default function RoleRestrictedTooltip({ show, children }) {
  if (!show) return children;
  return (
    <Tooltip title={ROLE_RESTRICTED_MESSAGE} arrow>
      <span>{children}</span>
    </Tooltip>
  );
}
