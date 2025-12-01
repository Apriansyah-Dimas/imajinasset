'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#06B6D4']

type DashboardData = {
  assetsByDepartment: Array<{ name: string; value: number }>
  assetsBySite: Array<{ name: string; value: number }>
  assetsByCategory: Array<{ name: string; value: number }>
  totalCostByCategory: Array<{ name: string; value: number; cost: number }>
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-blue-600">Value: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

const CustomLegend = ({ data }: { data: Array<{ name: string; value: number }> }) => {
  const halfLength = Math.ceil(data.length / 2)
  const leftColumn = data.slice(0, halfLength)
  const rightColumn = data.slice(halfLength)

  return (
    <div className="flex justify-center gap-8 mt-4">
      <div className="space-y-2">
        {leftColumn.map((entry, index) => (
          <div key={`legend-left-${index}`} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="text-gray-700">{entry.name}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {rightColumn.map((entry, index) => (
          <div key={`legend-right-${index + halfLength}`} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[(index + halfLength) % COLORS.length] }} />
            <span className="text-gray-700">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardCharts({ data }: { data: DashboardData }) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#2c2c54' }}>
            Assets by Department
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.assetsByDepartment}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={4}
              >
                {data.assetsByDepartment.map((entry, index) => (
                  <Cell key={`cell-dept-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend data={data.assetsByDepartment} />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#2c2c54' }}>
            Assets by Site
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.assetsBySite}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#2c2c54' }}>
          Assets by Category
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data.assetsByCategory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
