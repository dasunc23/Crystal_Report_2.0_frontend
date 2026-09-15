import { useState } from "react";
import { BrowserRouter } from "react-router-dom";

import Login from "./pages/Login";
import AppRoutes from "./routes/AppRoutes";

import { logoutUser } from "./api/authApi";

function AuthenticatedApp({ onLogout }) {
    return (
        <div className="min-h-screen bg-[#f5fafc]">
            <header className="border-b border-[#d8e8f0] bg-white">
                <div className="mx-auto flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-8 2xl:px-10">
                    <div className="flex items-center gap-3">
                        <img
                            src="/crystal-id-logo.png"
                            alt="Crystal ID"
                            className="h-10 w-10 object-contain sm:h-11 sm:w-11"
                        />

                        <div>
                            <h1 className="text-lg font-bold text-[#07345d] sm:text-xl">
                                Crystal ID
                            </h1>

                            <p className="text-xs text-[#6b7d8c]">
                                Student ID Card Management
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onLogout}
                        className="rounded-lg border border-[#1688bd] px-3 py-2 text-sm font-semibold text-[#1688bd] transition hover:bg-[#1688bd] hover:text-white sm:px-4"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-10">
                <AppRoutes />
            </main>
        </div>
    );
}
export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(
        Boolean(localStorage.getItem("auth_token"))
    );

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("auth_token");
            setIsAuthenticated(false);
        }
    };

    return (
        <BrowserRouter>
            {isAuthenticated ? (
                <AuthenticatedApp onLogout={handleLogout} />
            ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
            )}
        </BrowserRouter>
    );
}
