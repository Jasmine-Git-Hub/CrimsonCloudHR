import { useLocation } from "react-router";
import { Construction } from "lucide-react";

export default function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname
    .split("/")
    .pop()
    ?.split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="p-8 flex items-center justify-center min-h-full">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Construction className="w-24 h-24 text-[#810100] mx-auto mb-4" />
          <h1 className="text-3xl text-[#1B1717] mb-2">{pageName || "Page"}</h1>
          <p className="text-[#1B1717]/60">This page is under construction.</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-[#1B1717]/60">
            This feature will be available soon. Please check back later.
          </p>
        </div>
      </div>
    </div>
  );
}
