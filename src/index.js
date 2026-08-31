import React from "react";
import { createRoot } from "react-dom/client"; // This imports the createRoot function from react-dom/client, which is used to create a root for rendering React components
import { Provider } from "react-redux"; // This imports the Provider component from react-redux, which wraps the application and provides access to the Redux store to all components
import { persistStore } from "redux-persist"; // This imports the persistStore function from redux-persist, which is used to create a Redux Persist store enhancer
import { PersistGate } from "redux-persist/integration/react"; //This imports the PersistGate component from redux-persist/integration/react,
// which delays the rendering of the application's UI until persisted state has been retrieved and saved to redux
import App from "./App";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import store from "./redux/store";

let persistor = persistStore(store);

const LoadingComponent = () => <div>Loading...</div>;

{
  /* <PersistGate loading={<LoadingComponent />} persistor={persistor}> */
}
{
  /* <PersistGate loading={null} persistor={persistor}> */
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <PersistGate loading={<LoadingComponent />} persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>,
);
