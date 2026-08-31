import { configureStore } from "@reduxjs/toolkit"; // This is a function provided by Redux Toolkit for configuring a Redux store with simplified setup and sensible defaults
import { combineReducers } from "redux"; // This is a function from Redux that combines multiple reducers into a single reducer function
import { persistReducer } from "redux-persist"; // This function from Redux Persist allows you to create a persisted version of your root reducer
import sessionStorage from "redux-persist/lib/storage/session";
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist"; // needed to ignore non-serializable actions
import userReducer from "../action/userSlice";

const reducers = combineReducers({
  myApp: userReducer,
});

const persistConfig = {
  key: "root",
  storage: sessionStorage,
};

const persistedReducer = persistReducer(persistConfig, reducers);

export default configureStore({
  reducer: persistedReducer,
  devTools: process.env.NODE_ENV == "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// persistReducer takes two arguments:

// persistConfig: An object specifying the configuration for persisting the state.
// reducers: The root reducer of Redux application, here combineReducers()

// The devTools option with the process.env.NODE_ENV !== "production" condition ensures that Redux DevTools are enabled during development but disabled in production,
// following best practices for debugging and performance in different environments

// Including thunk middleware enables Redux to handle asynchronous actions, making it easier to manage side effects in Redux applications,
// such as fetching data from an API, handling timers, or interacting with browser APIs.
// It's a common choice for handling asynchronous behavior in Redux applications due to its simplicity and flexibility

// key: A string that serves as the key prefix for the stored state. This is used to namespace the persisted state within the storage.
// storage: The storage engine to be used for persisting the state. It can be sessionStorage, sessionStorage, or a custom storage engine compatible with the Redux Persist library
