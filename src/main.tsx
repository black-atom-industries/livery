import { createRoot } from "react-dom/client";
import { App } from "./containers/app.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
