// ============================================================
// CalendarPage.jsx — click events to edit, click empty cells to create
// ============================================================
import { useState, useEffect } from "react";
import { fetchEntriesInRange } from "../lib/entries";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildGrid(year, month) {
  const todayStr = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startWeekday);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const dateString = d.toISOString().split("T")[0];
    cells.push({
      date: d.getDate(),
      dateString,
      isOtherMonth: d.getMonth() !== month,
      isToday: dateString === todayStr,
      events: [],
    });
  }
  const rows = [];
  for (let i = 0; i < 6; i++) rows.push(cells.slice(i * 7, i * 7 + 7));
  return rows;
}

export default function CalendarPage({ openModal }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const dateFrom = new Date(year, month, 1).toISOString().split("T")[0];
      const dateTo   = new Date(year, month + 1, 0).toISOString().split("T")[0];
      const { data, error } = await fetchEntriesInRange({ dateFrom, dateTo });
      if (error) setError(error.message);
      else { setEntries(data || []); setError(null); }
      setLoading(false);
    }
    load();
  }, [year, month]);

  const grid = buildGrid(year, month);
  for (const entry of entries) {
    for (const row of grid) {
      for (const cell of row) {
        if (cell.dateString === entry.date) cell.events.push(entry);
      }
    }
  }

  return (
    <div className="page">
      <div className="calendar-header">
        <div className="calendar-month">
          <span>{MONTH_NAMES[month]} {year}</span>
          <button className="calendar-arrow" onClick={() => {
            if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
          }}>‹</button>
          <button className="calendar-arrow" onClick={() => {
            if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
          }}>›</button>
        </div>
        <div className="calendar-toolbar">
          <button className="calendar-view-btn" onClick={() => {
            const t = new Date();
            setYear(t.getFullYear()); setMonth(t.getMonth());
          }}>Today</button>
          <button className="btn-primary calendar-new-btn" onClick={() => openModal({})}>
            + New entry
          </button>
        </div>
      </div>

      {error && <div className="form-error">Error: {error}</div>}

      <div className="calendar-grid calendar-weekdays">
        {WEEKDAYS.map((day) => <div key={day} className="calendar-weekday">{day}</div>)}
      </div>

      <div className="calendar-grid calendar-cells">
        {grid.map((row, rowIndex) =>
          row.map((cell, cellIndex) => (
            <div
              key={`${rowIndex}-${cellIndex}`}
              className={`calendar-cell ${cell.isOtherMonth ? "other-month" : ""}`}
              onClick={() => openModal({ date: cell.dateString })}
            >
              <span className={`calendar-date ${cell.isToday ? "today" : ""}`}>
                {cell.date}
              </span>
              {cell.events.map((event) => (
                <div
                  key={event.id}
                  className="calendar-event"
                  style={{ background: event.color }}
                  title={event.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal({ editEntry: event });
                  }}
                >
                  {event.title}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {loading && <div className="loading-inline">Loading entries...</div>}
    </div>
  );
}
