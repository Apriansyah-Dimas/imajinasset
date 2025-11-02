"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardData {
  totalAssets: number;
  totalCostByCategory: Array<{ name: string; value: number; cost: number }>;
  assetsBySite: Array<{ name: string; value: number }>;
  assetsByCategory: Array<{ name: string; value: number }>;
  assetsByDepartment: Array<{ name: string; value: number }>;
}

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#14B8A6",
];

export default function DashboardNew() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      } else {
        setData({
          totalAssets: 0,
          totalCostByCategory: [],
          assetsBySite: [],
          assetsByCategory: [],
          assetsByDepartment: [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setData({
        totalAssets: 0,
        totalCostByCategory: [],
        assetsBySite: [],
        assetsByCategory: [],
        assetsByDepartment: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">Failed to load dashboard data</p>
      </div>
    );
  }

  const totalAssetValue = data.totalCostByCategory.reduce(
    (sum, item) => sum + item.cost,
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const SimpleStatCard = ({ title, value, color, icon }: { title: string; value: string; color: string; icon?: React.ReactNode }) => (
    <div className={`p-4 rounded-lg border ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">{title}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>
    </div>
  );

  const SimpleChart = ({ data, title, colors, isLarge = false }: { data: any[]; title: string; colors: string[]; isLarge?: boolean }) => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={isLarge ? 300 : 160}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={isLarge ? 90 : 50}
                innerRadius={isLarge ? 45 : 25}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className={`${isLarge ? 'h-72' : 'h-40'} flex items-center justify-center`}>
            <div className="text-gray-400 text-sm">No data</div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Stats Grid - Only 2 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SimpleStatCard
          title="Total Assets"
          value={formatNumber(data.totalAssets)}
          color="bg-blue-50 border-blue-200"
          icon={
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <SimpleStatCard
          title="Assets by Value"
          value={formatCurrency(totalAssetValue)}
          color="bg-green-50 border-green-200"
          icon={
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts Grid - 50% ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Chart - 50% width */}
        <div className="lg:col-span-1">
          <SimpleChart
            data={data.assetsByDepartment}
            title="Assets by Department"
            colors={COLORS}
            isLarge={true}
          />
        </div>

        {/* Two Small Charts - 50% width combined */}
        <div className="space-y-6">
          <SimpleChart
            data={data.assetsByCategory}
            title="Assets by Category"
            colors={COLORS}
            isLarge={false}
          />
          <SimpleChart
            data={data.assetsBySite}
            title="Assets by Site"
            colors={COLORS}
            isLarge={false}
          />
        </div>
      </div>
    </div>
  );
}
