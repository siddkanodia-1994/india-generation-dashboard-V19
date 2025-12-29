// src/App.tsx

import React from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

import ElectricityDashboard from "./ElectricityDashboard";
import RatedCapacity from "./RatedCapacity";
import LatestNews from "./LatestNews";
import LatestReports from "./LatestReports";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <Tabs>
          <div className="mt-2">
            <TabList>
              <Tab>Generation</Tab>
              <Tab>Peak Demand Met</Tab>
              <Tab>Supply</Tab>
              <Tab>Coal PLF</Tab>
              <Tab>RTM Prices</Tab>
              <Tab>Rated Capacity</Tab>
              <Tab>Latest News</Tab>
              <Tab>Latest Reports</Tab>
            </TabList>
          </div>

          {/* =======================
              GENERATION (Sub-tabs)
              ======================= */}
          <TabPanel>
            {/* Sub-tabs ONLY: Thermal + Renewable (no repeated "Generation") */}
            <Tabs>
              <div className="mt-2">
                <TabList>
                  {/* Renamed Coal -> Thermal (label only) */}
                  <Tab>Thermal</Tab>
                  <Tab>Renewable</Tab>
                </TabList>
              </div>

              {/* THERMAL (was Coal) */}
              <TabPanel>
                <ElectricityDashboard
                  type="generation-thermal"
                  title="India Electricity Generation Dashboard"
                  subtitle="Daily generation data, trends, and YoY/MoM analytics"
                  seriesLabel="Coal"
                  unitLabel="MU"
                  // IMPORTANT: uses the same CSV path as before (no file/data changes)
                  defaultCsvPath="/data/generation.csv"
                  // If your CSV uses a different column name for thermal/coal, change ONLY this key.
                  valueColumnKey="coal_gwh"
                  enableAutoFetch={true}
                  calcMode="sum"
                  valueDisplay={{
                    suffix: " MU",
                    decimals: 2,
                  }}
                />
              </TabPanel>

              {/* RENEWABLE */}
              <TabPanel>
                <ElectricityDashboard
                  type="generation-renewable"
                  title="India Electricity Generation Dashboard"
                  subtitle="Daily generation data, trends, and YoY/MoM analytics"
                  seriesLabel="Renewable"
                  unitLabel="MU"
                  // IMPORTANT: uses the same CSV path as before (no file/data changes)
                  defaultCsvPath="/data/generation.csv"
                  // If your CSV uses a different column name for renewables, change ONLY this key.
                  valueColumnKey="renewable_gwh"
                  enableAutoFetch={true}
                  calcMode="sum"
                  valueDisplay={{
                    suffix: " MU",
                    decimals: 2,
                  }}
                />
              </TabPanel>
            </Tabs>
          </TabPanel>

          {/* PEAK DEMAND MET */}
          <TabPanel>
            <ElectricityDashboard
              type="demand"
              title="India Peak Demand Met Dashboard"
              subtitle="Daily peak demand met data (GW), trends, and YoY/MoM analytics"
              seriesLabel="Peak Demand Met"
              unitLabel="GW"
              valueColumnKey="demand_gwh"
              defaultCsvPath="/data/Peak Demand.csv"
              enableAutoFetch={false}
              calcMode="avg"
              valueDisplay={{
                suffix: " GW",
                decimals: 2,
              }}
            />
          </TabPanel>

          {/* SUPPLY */}
          <TabPanel>
            <ElectricityDashboard
              type="supply"
              title="India Electricity Supply Dashboard"
              subtitle="Daily supply data, trends, and YoY/MoM analytics"
              seriesLabel="Supply"
              unitLabel="MU"
              valueColumnKey="supply_gwh"
              defaultCsvPath="/data/supply.csv"
              enableAutoFetch={false}
              calcMode="sum"
              valueDisplay={{
                suffix: " MU",
                decimals: 2,
              }}
            />
          </TabPanel>

          {/* COAL PLF */}
          <TabPanel>
            <ElectricityDashboard
              type="coal-plf"
              title="India Coal PLF Dashboard"
              subtitle="Coal PLF trends, period averages, and YoY/WoW analytics"
              seriesLabel="Coal PLF"
              unitLabel="%"
              valueColumnKey="coal_plf"
              defaultCsvPath="/data/Coal PLF.csv"
              enableAutoFetch={false}
              calcMode="avg"
              valueDisplay={{
                suffix: "%",
                decimals: 2,
              }}
            />
          </TabPanel>

          {/* RTM PRICES */}
          <TabPanel>
            <ElectricityDashboard
              type="rtm-prices"
              title="India RTM Prices Dashboard"
              subtitle="RTM price trends, period averages, and YoY/WoW analytics"
              seriesLabel="RTM Prices"
              unitLabel="Rs/Unit"
              valueColumnKey="rtm_price"
              defaultCsvPath="/data/RTM Prices.csv"
              enableAutoFetch={false}
              calcMode="avg"
              valueDisplay={{
                suffix: " Rs/Unit",
                decimals: 2,
              }}
            />
          </TabPanel>

          {/* RATED CAPACITY */}
          <TabPanel>
            <RatedCapacity />
          </TabPanel>

          {/* LATEST NEWS */}
          <TabPanel>
            <LatestNews />
          </TabPanel>

          {/* LATEST REPORTS */}
          <TabPanel>
            <LatestReports />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
