import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import AuthWrapper from "./components/AuthWrapper";
import Settings from "./Settings";
import Dashboard from "./Dashboard";
import KlausurBuilder from "./KlausurBuilder";
import MeineLerninhalte from "./MeineLerninhalte";
import KlausurUeben from "./KlausurUeben";
import Activities from "./Activities"; // 👈 neu importiert
import MeineHistorie from "./MeineHistorie";
import AI from "./AI";
import Leaderboard from "./Leaderboard";
import Network from "./Network";
import Organization from "./Organization";
import DeepWorkTracker from "./DeepWorkTracker";
import Aufgaben from "./Aufgaben";
import GoalTracker from "./GoalTracker";
import Kalender from "./Kalender";
import Documents from "./Documents.jsx";
import "./index.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

function ProtectedAppRoutes() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Routes>
      {/* Layout mit Sidebar+Header */}
      <Route path="/" element={<App />}>
        <Route index element={<Dashboard />} />
        <Route path="klausur" element={<KlausurBuilder />} />
        <Route path="settings" element={<Settings />} />
        <Route path="meine-lern-inhalte" element={<MeineLerninhalte />} />
        <Route path="klausur/ueben/:examId" element={<KlausurUeben />} />
        <Route path="activities" element={<Activities />} /> {/* 👈 neue Seite */}
        <Route path="meine-historie" element={<MeineHistorie />} /> {/* 👈 neue Seite */}
        <Route path="ai" element={<AI />} /> {/* 👈 neue Seite */}
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="network" element={<Network />} />
        <Route path="organization" element={<Organization />} />
        <Route path="deepwork" element={<DeepWorkTracker />} />
        <Route path="aufgaben" element={<Aufgaben />} />
        <Route path="goals" element={<GoalTracker />} />
        <Route path="kalender" element={<Kalender />} />
        <Route path="documents" element={<Documents />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RootRouter() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<AuthWrapper />} />
        <Route path="/signup" element={<AuthWrapper />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return <ProtectedAppRoutes />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <RootRouter />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
