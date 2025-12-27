import React, { useEffect, useMemo, useState } from "react";

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

const LS_INSTALLED = "ratedCapacity_installed";
const LS_PLF = "ratedCapacity_plf";

function safeNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v.trim()) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function fmt2(n: number) {
  return round2(n).toFixed(2);
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-800">
      <div className="border-b border-slate-100 p-4 dark:border-gray-700">
        <div className="text-sm font-semibold text-slate-800 dark:text-gray-100">
          {title}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/**
 * Capacity.csv format:
 * headers: Coal,Oil & Gas,Nuclear,Hydro,Solar,Wind,Small-Hydro,Bio Power
 * one data row of numbers (GW)
 */
function parseCapacityCSV(text: string): Record<SourceKey, number> | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const headers = lines[0].split(",").map((h) => h.trim());
  const values = lines[1].split(",").map((v) => v.trim());

  const map: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    map[headers[i]] = values[i] ?? "";
  }

  for (const k of SOURCES) {
    if (!(k in map)) return null;
  }

  const out: Record<SourceKey, number> = {
    "Coal": safeNum(map["Coal"]),
    "Oil & Gas": safeNum(map["Oil & Gas"]),
    "Nuclear": safeNum(map["Nuclear"]),
    "Hydro": safeNum(map["Hydro"]),
    "Solar": safeNum(map["Solar"]),
    "Wind": safeNum(map["Wind"]),
    "Small-Hydro": safeNum(map["Small-Hydro"]),
    "Bio Power": safeNum(map["Bio Power"]),
  };

  return out;
}

function loadLS(key: string): Partial<Record<SourceKey, number>> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;

    const out: Partial<Record<SourceKey, number>> = {};
    for (const k of SOURCES) {
      if (k in obj) out[k] = safeNum((obj as any)[k]);
    }
    return out;
  } catch {
    return null;
  }
}

function saveLS(key: string, obj: Record<SourceKey, number>) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

export default function RatedCapacity() {
  const [installed, setInstalled] = useState<Record<SourceKey, number>>(() => {
    const base: Record<SourceKey, number> = {} as any;
    for (const k of SOURCES) base[k] = 0;
    return base;
  });

  const [plf, setPlf] = useState<Record<SourceKey, number>>(() => {
    const base: Record<SourceKey, number> = {} as any;
    for (const k of SOURCES) base[k] = 0;
    return base;
  });

  const [csvLoaded, setCsvLoaded] = useState(true);

  useEffect(() => {
    // Load PLF from localStorage
    const plfLS = loadLS(LS_PLF);
    if (plfLS) {
      setPlf((prev) => {
        const next = { ...prev };
        for (const k of SOURCES) {
          if (plfLS[k] != null) next[k] = safeNum(plfLS[k]);
        }
        return next;
      });
    }

    // Installed: localStorage takes priority
    const instLS = loadLS(LS_INSTALLED);
    if (instLS) {
      setInstalled((prev) => {
        const next = { ...prev };
        for (const k of SOURCES) {
          if (instLS[k] != null) next[k] = safeNum(instLS[k]);
        }
        return next;
      });
      setCsvLoaded(true);
      return;
    }

    // Otherwise try to load CSV
    (async () => {
      try {
        const res = await fetch(`/data/Capacity.csv?v=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();

        const parsed = parseCapacityCSV(text);
        if (!parsed) throw new Error("Parse failed");

        setInstalled(parsed);
        setCsvLoaded(true);
      } catch {
        setCsvLoaded(false);
        // installed remains zeros, editable
      }
    })();
  }, []);

  useEffect(() => {
    saveLS(LS_INSTALLED, installed);
  }, [installed]);

  useEffect(() => {
    saveLS(LS_PLF, plf);
  }, [plf]);

  const installedTotal = useMemo(() => {
    return round2(SOURCES.reduce((s, k) => s + safeNum(installed[k]), 0));
  }, [installed]);

  const ratedBySource = useMemo(() => {
    const out: Record<SourceKey, number> = {} as any;
    for (const k of SOURCES) {
      out[k] = round2(safeNum(installed[k]) * (safeNum(plf[k]) / 100));
    }
    return out;
  }, [installed, plf]);

  const ratedTotal = useMemo(() => {
    return round2(SOURCES.reduce((s, k) => s + safeNum(ratedBySource[k]), 0));
  }, [ratedBySource]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Card title="Rated Capacity">
          {!csvLoaded ? (
            <div className="mb-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-200">
              Capacity.csv not loaded – enter values manually.
            </div>
          ) : null}

          <div className="overflow-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full border-collapse bg-white text-sm dark:bg-gray-800">
              <thead className="bg-slate-50 dark:bg-gray-900">
                <tr className="border-b border-slate-200 dark:border-gray-700">
                  <th className="min-w-[220px] px-3 py-3 text-left font-bold text-slate-800 dark:text-gray-100">
                    Capacity (GW)
                  </th>

                  {SOURCES.map((h) => (
                    <th
                      key={h}
                      className="min-w-[130px] px-3 py-3 text-center font-bold text-slate-800 dark:text-gray-100"
                    >
                      {h}
                    </th>
                  ))}

                  <th className="min-w-[120px] px-3 py-3 text-center font-bold text-slate-800 dark:text-gray-100">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* Row 1 */}
                <tr className="border-b border-slate-100 dark:border-gray-700">
                  <td className="px-3 py-3 font-bold text-slate-800 dark:text-gray-100">
                    Capacity as on current date
                  </td>

                  {SOURCES.map((k) => (
                    <td key={k} className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={installed[k]}
                        onChange={(e) => {
                          setInstalled((prev) => ({
                            ...prev,
                            [k]: safeNum(e.target.value),
                          }));
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </td>
                  ))}

                  <td className="px-3 py-3 text-right font-semibold text-slate-900 dark:text-gray-100 tabular-nums">
                    {fmt2(installedTotal)}
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="border-b border-slate-100 dark:border-gray-700">
                  <td className="px-3 py-3 font-bold text-slate-800 dark:text-gray-100">
                    PLF %
                  </td>

                  {SOURCES.map((k) => (
                    <td key={k} className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        value={plf[k]}
                        onChange={(e) => {
                          const raw = safeNum(e.target.value);
                          const bounded = Math.min(100, Math.max(0, raw));
                          setPlf((prev) => ({ ...prev, [k]: bounded }));
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      />
                    </td>
                  ))}

                  <td className="px-3 py-3 text-center font-semibold text-slate-600 dark:text-gray-300">
                    -
                  </td>
                </tr>

                {/* Row 3 */}
                <tr>
                  <td className="px-3 py-3 font-bold text-slate-800 dark:text-gray-100">
                    Rated Capacity
                  </td>

                  {SOURCES.map((k) => (
                    <td
                      key={k}
                      className="px-3 py-3 text-right font-semibold text-slate-900 dark:text-gray-100 tabular-nums"
                    >
                      {fmt2(ratedBySource[k])}
                    </td>
                  ))}

                  <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-gray-100 tabular-nums">
                    {fmt2(ratedTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-sm text-slate-600 dark:text-gray-300">
            Rated Capacity (GW) = Installed Capacity × (PLF / 100). Values are
            editable and saved locally in your browser.
          </div>
        </Card>
      </div>
    </div>
  );
}
