import { useState, useEffect, useRef, useCallback } from "react";
import { Login } from "./components/Login";
import { Onboarding } from "./components/Onboarding";
import { MainLayout } from "./components/MainLayout";

type AuthState = "login" | "onboarding" | "authenticated";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("login");
  const [showDevBypass, setShowDevBypass] = useState(true);

  // Enable dark mode by default
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleLogin = () => {
    setAuthState("onboarding");
  };

  const handleOnboardingComplete = () => {
    setAuthState("authenticated");
    setShowDevBypass(false);
  };

  const handleDevBypass = () => {
    setAuthState("authenticated");
    setShowDevBypass(false);
  };

  // Show Login screen
  if (authState === "login") {
    return (
      <>
        <Login onLogin={handleLogin} />
        {showDevBypass && (
          <button
            onClick={handleDevBypass}
            className="fixed top-4 right-4 z-50 btn-premium"
          >
            Dev Bypass
          </button>
        )}
      </>
    );
  }

  // Show Onboarding screen
  if (authState === "onboarding") {
    return (
      <>
        <Onboarding onComplete={handleOnboardingComplete} />
        {showDevBypass && (
          <button
            onClick={handleDevBypass}
            className="fixed top-4 right-4 z-50 btn-premium"
          >
            Dev Bypass
          </button>
        )}
      </>
    );
  }

  // Show main application
  return <MainLayout />;
}