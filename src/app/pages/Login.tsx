import { useState } from "react";
import { useNavigate } from "react-router";
import { Linkedin, Facebook, Twitter, Youtube } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Jasmine");
  const [password, setPassword] = useState("password");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center bg-[#EDEBDD] relative z-10 p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#810100] to-[#630000] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-4 border-white"></div>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#4A7C59] rounded-full"></div>
              </div>
              <div>
                <h1 className="text-3xl">
                  <span className="text-[#810100]">Orange</span>
                  <span className="text-[#1B1717]">HRM</span>
                </h1>
              </div>
            </div>
            <p className="text-sm text-[#630000] uppercase tracking-wide">
              Open Source HR Management
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl text-center text-[#630000] mb-8">Login</h2>

            <div>
              <label className="block text-sm text-[#630000] mb-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 border-2 border-[#630000]/20 rounded-lg focus:outline-none focus:border-[#810100] text-[#1B1717]"
                placeholder="Username"
              />
            </div>

            <div>
              <label className="block text-sm text-[#630000] mb-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 border-2 border-[#630000]/20 rounded-lg focus:outline-none focus:border-[#810100] text-[#1B1717]"
                placeholder="••••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#810100] to-[#630000] text-white py-3 rounded-full hover:shadow-lg transition-shadow"
            >
              Login
            </button>

            <div className="text-center">
              <a href="#" className="text-sm text-[#810100] hover:underline">
                Forgot your password?
              </a>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-12 text-center text-xs text-[#1B1717]/60">
            <p>OrangeHRM OS 5.8</p>
            <p className="mt-1">
              © 2005 - 2026 OrangeHRM, Inc. All rights reserved.
            </p>
          </div>
        </div>

        {/* Social Icons */}
        <div className="absolute bottom-6 left-6 flex gap-3">
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-[#630000]/20 flex items-center justify-center hover:bg-[#630000]/30 transition-colors"
          >
            <Linkedin className="w-5 h-5 text-[#630000]" />
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-[#630000]/20 flex items-center justify-center hover:bg-[#630000]/30 transition-colors"
          >
            <Facebook className="w-5 h-5 text-[#630000]" />
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-[#630000]/20 flex items-center justify-center hover:bg-[#630000]/30 transition-colors"
          >
            <Twitter className="w-5 h-5 text-[#630000]" />
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-[#630000]/20 flex items-center justify-center hover:bg-[#630000]/30 transition-colors"
          >
            <Youtube className="w-5 h-5 text-[#630000]" />
          </a>
        </div>
      </div>

      {/* Right side - Decorative orange panel with logo */}
      <div className="hidden lg:block w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#810100] via-[#630000] to-[#810100]">
          <div className="absolute top-0 right-0 w-full h-full">
            <svg
              className="w-full h-full"
              viewBox="0 0 800 800"
              preserveAspectRatio="none"
            >
              <path
                d="M 0,0 L 800,0 L 800,800 L 200,800 Q 100,400 0,0 Z"
                fill="url(#gradient)"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#810100" />
                  <stop offset="50%" stopColor="#630000" />
                  <stop offset="100%" stopColor="#810100" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          {/* Centered Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-64 h-64 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <div className="relative">
                  <div className="w-48 h-48 rounded-full bg-white flex items-center justify-center shadow-2xl">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-8 border-[#810100]"></div>
                      <div className="absolute -top-2 -right-2 w-12 h-12 bg-[#4A7C59] rounded-full"></div>
                    </div>
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <p className="text-white text-sm uppercase tracking-widest font-semibold">
                      HR FOR ALL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
