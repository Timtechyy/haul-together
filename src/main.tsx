import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import StripeProvider from "./stripe";
// Trigger rebuild

createRoot(document.getElementById("root")!).render(
  <StripeProvider>
    <App />
  </StripeProvider>
);
