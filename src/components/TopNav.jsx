
import { useState, useEffect, useRef } from "react";
import { signOut, getInitials, getDisplayName } from "../lib/auth";

export default function TopNav({ user }) {
  // Dropdown open/closed
  const [menuOpen, setMenuOpen] = useState(false);

  // useRef gives us a stable reference to the DOM element.
  // We need it for the "click outside to close" behavior below.
  // Refs don't trigger re-renders when they change — they're
  // for grabbing DOM nodes or storing values across renders.
  const menuRef = useRef(null);

  // Close the menu when the user clicks anywhere outside it.
  useEffect(() => {
    function handleClick(e) {
      // If the click target is NOT inside our menu, close it.
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    await signOut();
    // App.jsx's auth listener handles the rest.
  }

  return (
    <header className="topnav">
      <div className="topnav-logo">
        <div className="topnav-logo-mark">P</div>
        <span className="topnav-logo-text">Prodash</span>
      </div>

      <div className="topnav-search">
        <span className="topnav-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search anything..."
          className="topnav-search-input"
        />
      </div>

      <div className="topnav-actions">
        <button className="topnav-icon-btn" title="Notifications">
          🔔
        </button>

        <button className="topnav-icon-btn" title="Toggle dark mode">
          🌙
        </button>

        {/* Avatar + dropdown.
            menuRef is attached to the wrapper so the
            "click outside" check works for the whole area. */}
        <div className="topnav-avatar-wrap" ref={menuRef}>
          <button
            className="topnav-avatar"
            onClick={() => setMenuOpen((open) => !open)}
            title={getDisplayName(user)}
          >
            {getInitials(user)}
          </button>

          {/* Only render the menu when it's open */}
          {menuOpen && (
            <div className="topnav-menu">
              <div className="topnav-menu-header">
                <div className="topnav-menu-name">{getDisplayName(user)}</div>
                <div className="topnav-menu-email">{user?.email}</div>
              </div>
              <button className="topnav-menu-item" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
