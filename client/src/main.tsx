import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initCsrf } from "@/api/api-index";

initCsrf().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});