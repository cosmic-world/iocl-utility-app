import { createSlice } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
export const userSlice = createSlice({
  name: "myApp_redux",
  initialState: {
    // These variables are used to store initial sates and to be used in anywhere in the programmed like global variable.
    navBarComponent: "", // to store page name which is to be displayed. default is login
    masterList: [], // to store master data
    userType: "", // to store user type
    selectedApplication: "", // to store selected application
    labour_masterList: [], // to store master data
    officerList: [], // to store master data
    contractorList: [], // to store master data
        selectedTerminal: "", // to store selected material name
    PermitList: [], // to store Permit List data from Google Sheets
    locationList: [], // to store location list data from Google Sheets
  },
  reducers: {
    NavBarComponent: (state, action) => {
      state.navBarComponent = action.payload;
    },
    SetMasterList: (state, action) => {
      state.masterList = action.payload;
    },
    SetUserType: (state, action) => {
      state.userType = action.payload;
    },
    SetSelectedApplication: (state, action) => {
      state.selectedApplication = action.payload;
    },
    SetLabourMasterList: (state, action) => {
      state.labour_masterList = action.payload;
    },
    SetOfficerMasterList: (state, action) => {
      state.officerList = action.payload;
    },
    SetContractorMasterList: (state, action) => {
      state.contractorList = action.payload;
    },
        SelectedTerminal: (state, action) => {
      state.selectedTerminal = action.payload;
    },
    SetPermitList: (state, action) => {
      state.PermitList = action.payload;
    },
    SetLocationList: (state, action) => {
      state.locationList = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  NavBarComponent,
  SetMasterList,
  SetUserType,
  SetLabourMasterList,
  SetOfficerMasterList,
  SetContractorMasterList,
  SetSelectedApplication,
  SelectedTerminal,
  SetPermitList,
  SetLocationList,
} = userSlice.actions;

export default userSlice.reducer;
