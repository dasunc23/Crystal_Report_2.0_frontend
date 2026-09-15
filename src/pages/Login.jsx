import { useState } from "react";
import { loginUser } from "../api/authApi";
import crystalIdLogo from "../assets/crystal-id-logo.png";

function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        setLoading(true);
        setError("");

        try {
            const data = await loginUser({
                email,
                password,
            });

            const token = data.token;

            if (!token) {
                throw new Error("Login token was not returned.");
            }

            localStorage.setItem("auth_token", token);

            onLoginSuccess();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                err.message ||
                "Login failed. Please check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f4f9fc] px-5 py-10">
            <section className="w-full max-w-md rounded-3xl border border-[#d8e8f0] bg-white p-8 shadow-xl">
                <div className="mb-8 text-center">
                    <img
                        src={crystalIdLogo}
                        alt="Crystal ID logo"
                        className="mx-auto mb-5 h-28 w-28 object-contain"
                    />

                    <h1 className="text-3xl font-bold text-[#07345d]">
                        Welcome Back
                    </h1>

                </div>

                {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-semibold text-[#17324d]"
                        >
                            Email Address
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="Enter your email"
                            required
                            className="w-full rounded-lg border border-[#cbdde7] px-4 py-3 outline-none transition focus:border-[#1688bd] focus:ring-2 focus:ring-[#eaf7fc]"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-semibold text-[#17324d]"
                        >
                            Password
                        </label>

                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="Enter your password"
                                required
                                className="w-full rounded-lg border border-[#cbdde7] px-4 py-3 pr-24 outline-none transition focus:border-[#1688bd] focus:ring-2 focus:ring-[#eaf7fc]"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword((current) => !current)
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1688bd]"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-[#1688bd] px-4 py-3 font-semibold text-white transition hover:bg-[#07345d] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-[#6b7d8c]">
                    Crystal ID Student Card Management System
                </p>
            </section>
        </main>
    );
}

export default Login;
