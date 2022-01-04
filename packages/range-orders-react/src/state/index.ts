import rapplication from "./gapplication/reducer";
import ruser from "./guser/reducer";
import granger from "./gorder/reducer";
import rmulticall from "./gmulticall/reducer";
import rlists from "./glists/reducer";
import rtransactions from "./gtransactions/reducer";
import { configureStore } from "@reduxjs/toolkit";

export const GELATO_RANGE_PERSISTED_KEYS: string[] = [
  "rtransactions",
  "rlists",
  "ruser",
];

export const gelatoRangeOrderReducers = {
  rapplication,
  ruser,
  granger,
  rmulticall,
  rlists,
  rtransactions,
};

const store = configureStore({
  reducer: gelatoRangeOrderReducers,
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
