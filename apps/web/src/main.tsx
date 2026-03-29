import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { createWebStorageProvider } from "./storage";
import type { StorageProvider } from "@flashcards/core";
import { ThemeProvider } from "./ThemeContext";

export const StorageContext = React.createContext<StorageProvider | null>(null);

export function useStorage(): StorageProvider {
  const ctx = React.useContext(StorageContext);
  if (!ctx) {
    throw new Error("StorageContext not provided");
  }
  return ctx;
}

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

const storage = createWebStorageProvider();

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <StorageContext.Provider value={storage}>
        <App />
      </StorageContext.Provider>
    </ThemeProvider>
  </React.StrictMode>
);

