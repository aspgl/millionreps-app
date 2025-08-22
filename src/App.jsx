import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <Header />

        {/* Hier erscheinen die Unterseiten */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-5xl mx-auto">
            <Outlet />   {/* 👈 wichtig */}
          </div>
        </main>
      </div>
    </div>
  );
}
