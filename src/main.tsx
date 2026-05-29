import React from "react";
import ReactDOM from "react-dom/client";
import { Authenticator, View } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

import App from "./App";
import "./index.css";

const components = {
  Header() {
    return (
      <View textAlign="center" padding="2rem 0 1rem" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/logo.png" alt="Papo Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '16px', mixBlendMode: 'screen', filter: 'brightness(1.1)' }} />
        <h2 style={{ color: '#f4f4f5', fontSize: '22px', fontWeight: '600', margin: 0 }}>Papo AI</h2>
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