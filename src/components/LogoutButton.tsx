import React from "react";

const LogoutButton: React.FC = () => {
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
  if (!hasToken) return null;

  const handleLogout = () =>:
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        padding: "8px 14px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        background: "#10b981",
        color: "#fff",
        fontWeight: 600,
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
      }}
      aria-label="Wyloguj się"
      title="Wyloguj się"
    >
      Wyloguj
    </button>
  );
};

export default LogoutButton;
