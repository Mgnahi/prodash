// ============================================================
// EmptyState.jsx
// ------------------------------------------------------------
// A reusable "you don't have anything yet" panel. Used by
// every page when the data fetch returns an empty array.
//
// Props:
//   icon       - emoji or small element to show at the top
//   title      - main heading
//   message    - explanation text
//   actionLabel - optional button text
//   onAction   - optional callback when button is clicked
// ============================================================

export default function EmptyState({
  icon = "✨",
  title,
  message,
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-message">{message}</div>
      {actionLabel && onAction && (
        <button className="btn-primary empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
