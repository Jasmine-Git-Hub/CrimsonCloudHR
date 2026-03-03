import { useNavigate } from "react-router";
import { Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl text-[#810100] mb-4">404</h1>
          <h2 className="text-3xl text-[#1B1717] mb-2">Page Not Found</h2>
          <p className="text-[#1B1717]/60">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <button
          onClick={() => navigate("/app")}
          className="flex items-center gap-2 bg-[#810100] text-white px-6 py-3 rounded-lg hover:bg-[#630000] transition-colors mx-auto"
        >
          <Home className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
