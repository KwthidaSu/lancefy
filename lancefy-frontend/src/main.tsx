import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import { I18nextProvider } from "react-i18next";

import App from "./app";
import keycloak from "@/lib/keycloak";
import i18n from "@/i18n";

import "react-day-picker/dist/style.css";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReactKeycloakProvider authClient={keycloak}>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </BrowserRouter>
    </ReactKeycloakProvider>
  </React.StrictMode>
);
