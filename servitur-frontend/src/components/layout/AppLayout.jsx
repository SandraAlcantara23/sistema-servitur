import { useState } from "react";
import { X } from "lucide-react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
export default function AppLayout({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-servitur-fondo">
      <Sidebar />
      {/* Sidebar en móvil, como panel deslizable */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64">
            <Sidebar forceVisible />
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-4 right-3 text-white/80 p-2"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onToggleSidebar={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
