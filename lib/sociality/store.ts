import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { Session } from "./types";
const slice = createSlice({
  name: "session",
  initialState: { ready: false, session: null as Session | null },
  reducers: {
    restore(state, action: PayloadAction<Session | null>) {
      state.ready = true;
      state.session = action.payload;
    },
    setSession(state, action: PayloadAction<Session | null>) {
      state.session = action.payload;
      state.ready = true;
    },
  },
});
const ui = createSlice({
  name: "ui",
  initialState: { search: "", feed: "following" as "explore" | "following" },
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setFeed(state, action: PayloadAction<"explore" | "following">) {
      state.feed = action.payload;
    },
    resetUI(state) {
      state.search = "";
      state.feed = "following";
    },
  },
});
export const { restore, setSession } = slice.actions;
export const { setSearch, setFeed, resetUI } = ui.actions;
export const makeStore = () =>
  configureStore({ reducer: { auth: slice.reducer, ui: ui.reducer } });
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export const useAppDispatch = useDispatch.withTypes<AppStore["dispatch"]>();
export const useAppSelector = useSelector.withTypes<RootState>();
