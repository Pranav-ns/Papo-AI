import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import { Authenticator, View } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

import { getWebInstrumentations, initializeFaro, ReactIntegration } from '@grafana/faro-react';

initializeFaro({
  url: import.meta.env.VITE_GRAFANA_FARO_ENDPOINT || '',
  app: {
    name: 'papo-frontend',
    version: '1.0.0',
    environment: 'production'
  },
  instrumentations: [
    ...getWebInstrumentations(),
    new ReactIntegration(),
  ],
});

import App from "./App";
import "./index.css";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

const components = {
  Header() {
    return (
      <View
        textAlign="center"
        padding="2rem 1rem"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <img
          src="/logo.png"
          alt="Papo Logo"
          style={{
            width: "64px",
            height: "64px",
            objectFit: "contain",
            marginBottom: "16px",
            mixBlendMode: "screen",
            filter: "brightness(1.1)",
          }}
        />

        <h2
          style={{
            color: "#f4f4f5",
            fontSize: "22px",
            fontWeight: 600,
            margin: 0,
          }}
        >
          Papo AI
        </h2>
      </View>
    );
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Authenticator components={components}>
      <App />
    </Authenticator>
  </React.StrictMode>
);