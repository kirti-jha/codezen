console.log("%c🚀 [Frontend] GenPay Application Loaded", "color: #00ff00; font-weight: bold; font-size: 16px;");
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
