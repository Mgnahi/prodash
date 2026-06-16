
export default function TextField({
  label,                // text shown above the input
  type = "text",        // "email", "password", "text" — defaults to "text"
  placeholder,          // grey hint text shown when empty
  value,                // current value (from the parent's state)
  onChange,             // function called when user types
}) {
  return (
    // <label> wraps the input so clicking the label focuses the input.
    // Old HTML/CSS habit — works the same in React.
    <label className="text-field">
      <span className="text-field-label">{label}</span>

      <input
        className="text-field-input"
        type={type}
        placeholder={placeholder}
        value={value}
        // When the user types, the browser fires an "onChange" event.
        // `e.target.value` is the new text in the box.
        // We call the parent's onChange function with that new value.
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
