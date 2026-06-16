// ============================================================
// AuthLayout.jsx
// ------------------------------------------------------------
// A React COMPONENT is just a function that returns JSX.
// JSX looks like HTML but it's really JavaScript — React turns
// it into real DOM nodes for you.
//
// This component is the "shell" used by both the Login and the
// Sign Up views:
//   - centered card on a dark page
//   - "P Prodash" logo at the top
//   - title + subtitle
//   - a slot for the form (this is what `children` is)
//   - a slot for the footer link
//
// Props (the inputs to this component):
//   title    - e.g. "Welcome back"
//   subtitle - e.g. "Sign in to your dashboard"
//   children - whatever JSX you put BETWEEN <AuthLayout>...</AuthLayout>
//              (children is a built-in React prop — magic name)
//   footer   - JSX shown under the form (the "No account?..." line)
// ============================================================

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    // Outer wrapper centers the card on screen.
    // Note: in JSX you write `className`, NOT `class` (because `class`
    // is a reserved word in JavaScript).
    <div className="auth-page">

      {/* The card itself */}
      <div className="auth-card">

        {/* --- LOGO ROW (purple square with "P" + "Prodash" word) --- */}
        <div className="auth-logo">
          <div className="auth-logo-mark">P</div>
          <span className="auth-logo-text">Prodash</span>
        </div>

        {/* --- TITLE + SUBTITLE --- */}
        {/* The curly braces {} in JSX mean "evaluate this JavaScript".
            So {title} prints whatever string was passed in as the prop. */}
        <div className="auth-title-block">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
        </div>

        {/* --- FORM SLOT ---
            {children} is whatever the parent put between the tags
            <AuthLayout> ... </AuthLayout>. It's how React lets you
            "wrap" content in another component. */}
        {children}

        {/* --- FOOTER SLOT --- */}
        <div className="auth-footer">{footer}</div>
      </div>
    </div>
  );
}
