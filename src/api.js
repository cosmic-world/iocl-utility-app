const apiBaseUrl = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

export const apiUrl = (path) => `${apiBaseUrl}${path}`;
