import React, { useEffect, useMemo, useState } from "react";

/**
 * Rated Capacity Tab
 * - Top card: "Rated Capacity" (editable Installed Capacity + PLF)
 * - Historical Capacity card below (monthly comparison)
 *
 * IMPORTANT GUARANTEES:
 * - No formatting or behavior change to the Rated Capacity card
 * - Manual inputs preserved
 * - LocalStorage preserved
 * - Historical CSV supports MM/YYYY and DD/MM/YYYY (treated as monthly)
 */

type SourceKey =
  | "Coal"
  | "Oil & Gas"
  | "Nuclear"
  | "Hydro"
  | "Solar"
  | "Wind"
  | "Small-Hydro"
  | "Bio Power";

const SOURCES: SourceKey[] = [
  "Coal",
  "Oil & Gas",
  "Nuclear",
  "Hydro",
  "Solar",
  "Wind",
  "Small-Hydro",
  "Bio Power",
];

/* ------------------ Utilities ------------------ */

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt2 = (n: number) => round2(n).toFixed(2);
const safeNum = (x: unknown) => (Number.isFinite(Number(x)) ? Number(x) : 0);

const sumSources = (obj: Record<string, number>) =>
  SOURCES.reduce((a, s) => a + safeNum(obj[s]), 0);

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const parseLine = (l: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"' && l[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = !q;
      else if (c === "," && !q) {
        out.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    out.push(cur.trim());
    return out;
  };
  const header = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { header, rows };
}

/**
 * Normalize month input:
 * - MM/YYYY
 * - M/YYYY
 * - DD/MM/YYYY
 * - D/M/YYYY
 * - DD-MM-YYYY
 *
 * ALL treated as monthly → MM/YYYY
 */
function normalizeMonth(input: string | undefined | null) {
  if (!input) return null;
  const t = input.trim();

  // MM/YYYY or M/YYYY
  let m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return `${String(+m[1]).padStart(2, "0")}/${m[2]}`;

  // DD/MM/YYYY or D/M/YYYY
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${String(+m[2]).padStart(2, "0")}/${m[3]}`;

  // DD-MM-YYYY
  m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${String(+m[2]).padStart(2, "0")}/${m[3]}`;

  return null;
}

const compareMonth = (a: string, b: string) => {
  const [am, ay] = a.split("/").map(Number);
  const [bm, by] = b.split("/").map(Number);
  return ay !== by ? ay - by : am - bm;
};

const minusMonths = (m: string, n: number) => {
  let [mm, yy] = m.split("/").map(Number);
  while (n--) {
    mm--;
    if (mm === 0) {
      mm = 12;
      yy--;
    }
  }
  return `${String(mm).padStart(2, "0")}/${yy}`;
};

const netColor = (v: number) =>
  v > 0 ? "text-emerald-600" : v < 0 ? "text-rose-600" : "text-slate-700";

/* ------------------ UI helpers ------------------ */

const Card = ({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
    <div className="flex justify-between border-b p-4">
      <div className="font-semibold">{title}</div>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const inputCls =
  "w-full rounded-lg border px-2 py-1 text-right text-sm tabular-nums focus:ring-2 focus:ring-slate-300";

/* ------------------ Component ------------------ */

export default function RatedCapacity() {
  /* ---------- Rated Capacity (top card) ---------- */

  const INST_KEY = "ratedCapacity_installed";
  const PLF_KEY = "ratedCapacity_plf";

  const [installed, setInstalled] = useState<Record<SourceKey, number>>(() => {
    const base = Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<
      SourceKey,
      number
    >;
    try {
      const raw = localStorage.getItem(INST_KEY);
      if (raw) Object.assign(base, JSON.parse(raw));
    } catch {}
    return base;
  });

  const [plf, setPlf] = useState<Record<SourceKey, number>>(() => {
    const base = Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<
      SourceKey,
      number
    >;
    try {
      const raw = localStorage.getItem(PLF_KEY);
      if (raw) Object.assign(base, JSON.parse(raw));
    } catch {}
    return base;
  });

  useEffect(() => {
    localStorage.setItem(INST_KEY, JSON.stringify(installed));
  }, [installed]);

  useEffect(() => {
    localStorage.setItem(PLF_KEY, JSON.stringify(plf));
  }, [plf]);

  const rated = useMemo(() => {
    const out: Record<SourceKey, number> = {} as any;
    SOURCES.forEach(
      (s) => (out[s] = round2(installed[s] * (plf[s] / 100)))
    );
    return out;
  }, [installed, plf]);

  /* ---------- Historical Capacity (new card) ---------- */

  const [history, setHistory] = useState<
    { month: string; values: Record<SourceKey, number> }[]
  >([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res =
          (await fetch("/data/capacity.csv")) ||
          (await fetch("/data/Capacity.csv"));
        if (!res.ok) throw new Error();
        const txt = await res.text();
        const { header, rows } = parseCSV(txt);

        const mIdx = header.findIndex(
          (h) => h.trim().toLowerCase() === "month"
        );
        if (mIdx < 0) throw new Error();

        const data: typeof history = [];
        for (const r of rows) {
          const mk = normalizeMonth(r[mIdx]);
          if (!mk) continue;
          const vals: Record<SourceKey, number> = {} as any;
          SOURCES.forEach((s) => {
            const i = header.indexOf(s);
            vals[s] = i >= 0 ? safeNum(r[i]) : 0;
          });
          data.push({ month: mk, values: vals });
        }
        data.sort((a, b) => compareMonth(a.month, b.month));
        setHistory(data);
      } catch {
        setErr(
          "capacity.csv not loaded – ensure /public/data/capacity.csv exists with Month + source columns."
        );
      }
    })();
  }, []);

  const months = history.map((d) => d.month);
  const latest = months[months.length - 1];
  const defaultStart = latest ? minusMonths(latest, 12) : "";

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(latest);

  useEffect(() => {
    if (compareMonth(start, end) > 0) setStart(end);
  }, [start, end]);

  const sRow = history.find((h) => h.month === start);
  const eRow = history.find((h) => h.month === end);

  /* ------------------ Render ------------------ */

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Rated Capacity */}
      <Card title="Rated Capacity" right="GW">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Capacity (GW)</th>
              {SOURCES.map((s) => (
                <th key={s} className="text-right">
                  {s}
                </th>
              ))}
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">Capacity as on current date</td>
              {SOURCES.map((s) => (
                <td key={s}>
                  <input
                    className={inputCls}
                    value={installed[s]}
                    onChange={(e) =>
                      setInstalled({ ...installed, [s]: +e.target.value })
                    }
                  />
                </td>
              ))}
              <td className="text-right font-semibold">
                {fmt2(sumSources(installed))}
              </td>
            </tr>
            <tr>
              <td className="font-bold">PLF %</td>
              {SOURCES.map((s) => (
                <td key={s}>
                  <input
                    className={inputCls}
                    value={plf[s]}
                    onChange={(e) =>
                      setPlf({ ...plf, [s]: +e.target.value })
                    }
                  />
                </td>
              ))}
              <td className="text-right">—</td>
            </tr>
            <tr>
              <td className="font-bold">Rated Capacity</td>
              {SOURCES.map((s) => (
                <td key={s} className="text-right font-semibold">
                  {fmt2(rated[s])}
                </td>
              ))}
              <td className="text-right font-semibold">
                {fmt2(sumSources(rated))}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Historical Capacity */}
      <Card title="Historical Capacity" right="GW">
        {err && <div className="mb-3 rounded bg-rose-50 p-3 text-rose-700">{err}</div>}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <select value={start} onChange={(e) => setStart(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select value={end} onChange={(e) => setEnd(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {[
              ["Capacity as on Start Date", sRow],
              ["Capacity as on End Date", eRow],
            ].map(([label, row]: any) => (
              <tr key={label}>
                <td className="font-bold">{label}</td>
                {SOURCES.map((s) => (
                  <td key={s} className="text-right">
                    {row ? fmt2(row.values[s]) : "—"}
                  </td>
                ))}
                <td className="text-right font-semibold">
                  {row ? fmt2(sumSources(row.values)) : "—"}
                </td>
              </tr>
            ))}
            <tr>
              <td className="font-bold">Net Addition (GW)</td>
              {SOURCES.map((s) => {
                const v =
                  sRow && eRow ? eRow.values[s] - sRow.values[s] : 0;
                return (
                  <td key={s} className={`text-right ${netColor(v)}`}>
                    {sRow && eRow ? fmt2(v) : "—"}
                  </td>
                );
              })}
              <td
                className={`text-right font-semibold ${
                  sRow && eRow
                    ? netColor(sumSources(eRow.values) - sumSources(sRow.values))
                    : ""
                }`}
              >
                {sRow && eRow
                  ? fmt2(sumSources(eRow.values) - sumSources(sRow.values))
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-2 text-xs text-slate-600">
          Net Addition (GW) = Capacity at End Date − Capacity at Start Date. Data
          sourced from monthly capacity.csv.
        </div>
      </Card>
    </div>
  );
}
