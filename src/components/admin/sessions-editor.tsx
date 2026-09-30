"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import type { RunSession } from "@/db/schema";
import { useFieldError } from "./admin-form";

/** Edits the list of training days; serialized into a hidden "sessions" JSON field. */
export function SessionsEditor({ initial }: { initial: RunSession[] }) {
  const [rows, setRows] = useState<RunSession[]>(
    initial.length ? initial : [{ date: "", start: "09:00", end: "17:00", mode: "in_person", location: "" }],
  );
  const listError = useFieldError("sessions");
  const dateError = useFieldError("sessions.0.date");
  const error = listError ?? dateError;
  const update = (i: number, patch: Partial<RunSession>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">Sessions (training days) <span className="text-danger">*</span></p>
      <input type="hidden" name="sessions" value={JSON.stringify(rows)} />
      <div className="space-y-2">
        {rows.map((s, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_6.5rem_6.5rem_8.5rem_1fr_auto]">
            <Input type="date" value={s.date} onChange={(e) => update(i, { date: e.target.value })} aria-label={`Day ${i + 1} date`} />
            <Input type="time" value={s.start} onChange={(e) => update(i, { start: e.target.value })} aria-label="Start time" />
            <Input type="time" value={s.end} onChange={(e) => update(i, { end: e.target.value })} aria-label="End time" />
            <Select value={s.mode} onChange={(e) => update(i, { mode: e.target.value as RunSession["mode"] })} aria-label="Mode">
              <option value="in_person">In person</option>
              <option value="online">Online</option>
            </Select>
            <Input value={s.location ?? ""} placeholder={s.mode === "online" ? "Zoom" : "BGC, Taguig"} onChange={(e) => update(i, { location: e.target.value })} aria-label="Location label" />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove day" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} disabled={rows.length === 1}>
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => {
          const last = rows[rows.length - 1];
          let date = "";
          if (last?.date) {
            const d = new Date(`${last.date}T12:00:00Z`);
            d.setUTCDate(d.getUTCDate() + 7);
            date = d.toISOString().slice(0, 10);
          }
          setRows((r) => [...r, { ...(last ?? { start: "09:00", end: "17:00", mode: "in_person" }), date }]);
        }}
      >
        <Plus /> Add day (+1 week)
      </Button>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
