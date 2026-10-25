// src/hooks/useAutoLogout.ts
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebaseSetup";

export default function useAutoLogout(timeoutInMinutes: number = 5) {
  const navigate = useNavigate();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Function na maglo-logout sa user
    const handleLogout = async () => {
      try {
        await signOut(auth);
        console.log("Session expired. User logged out due to inactivity.");
        navigate("/"); // Ibabalik sa Login screen
      } catch (error) {
        console.error("Error logging out:", error);
      }
    };

    // Function na magre-reset ng timer kapag gumalaw ang user
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // I-set ang timer base sa minutes na pinasa
      timeoutId = setTimeout(handleLogout, timeoutInMinutes * 60 * 1000);
    };

    // Mga galaw na babantayan ng system
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    // Simulan ang pagbabantay
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    // Cleanup kapag umalis sa page
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [navigate, timeoutInMinutes]);
}