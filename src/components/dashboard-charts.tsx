"use client";

import React, { memo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ChartDatum {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  assetsByDepartment: ChartDatum[];
  assetsBySite: ChartDatum[];
  assetsByCategory: ChartDatum[];
}

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#06B6D4",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-blue-600">Value: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = memo(
  ({ data }: { data: Array<{ name: string; value: number }> }) => {
    const halfLength = Math.ceil(data.length / 2);
    const leftColumn = data.slice(0, halfLength);
    const rightColumn = data.slice(halfLength);

    return (
      <div className="flex justify-center gap-8 mt-4">
        <div className="space-y-2">
          {leftColumn.map((entry, index) => (
            <div
              key={`legend-left-${entry.name}-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-700">{entry.name}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {rightColumn.map((entry, index) => (
            <div
              key={`legend-right-${entry.name}-${index + halfLength}`}
              className="flex items-center gap-2 text-sm"
            >
              <div
                className="w-3 h-3 rounded"
                style={{
                  backgroundColor:
                    COLORS[(index + halfLength) % COLORS.length],
                }}
              />
              <span className="text-gray-700">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

CustomLegend.displayName = "CustomLegend";

function DashboardCharts({
  assetsByDepartment,
  assetsBySite,
  assetsByCategory,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: "#2c2c54" }}>
          Assets by Department
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={assetsByDepartment}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
            >
              {assetsByDepartment.map((entry, index) => (
                <Cell
                  key={`dept-cell-${entry.name}-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <CustomLegend data={assetsByDepartment} />
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: "#2c2c54" }}>
            Assets by Site
          </h3>
          <ResponsiveContainer width="100%" height={135}>
            <PieChart>
              <Pie
                data={assetsBySite}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={50}
                innerRadius={20}
                fill="#8884d8"
                dataKey="value"
              >
                {assetsBySite.map((entry, index) => (
                  <Cell
                    key={`site-cell-${entry.name}-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend data={assetsBySite} />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: "#2c2c54" }}>
            Assets by Category
          </h3>
          <ResponsiveContainer width="100%" height={135}>
            <PieChart>
              <Pie
                data={assetsByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={50}
                innerRadius={20}
                fill="#8884d8"
                dataKey="value"
              >
                {assetsByCategory.map((entry, index) => (
                  <Cell
                    key={`cat-cell-${entry.name}-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend data={assetsByCategory} />
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardCharts);
