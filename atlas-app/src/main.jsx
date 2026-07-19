import { createRoot } from "react-dom/client";
import Atlas from "./app/App.jsx";
import { ErrorBoundary } from "./components/error-boundary/index.jsx";
import "./styles/global.css";
createRoot(document.getElementById("root")).render(<ErrorBoundary><Atlas /></ErrorBoundary>);
