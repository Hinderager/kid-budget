"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Category, Transaction, MonthlyBudget } from "@/types/database";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export function AnalyticsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState(6);

  useEffect(() => {
    loadData();
  }, [selectedMonths]);

  async function loadData() {
    setLoading(true);

    const startDate = format(
      subMonths(startOfMonth(new Date()), selectedMonths - 1),
      "yyyy-MM-dd"
    );

    const [categoriesRes, transactionsRes, budgetsRes] = await Promise.all([
      supabase.from("budget_categories").select("*").order("sort_order"),
      supabase
        .from("budget_transactions")
        .select("*")
        .gte("date", startDate)
        .eq("ignored", false)
        .order("date"),
      supabase.from("budget_monthly_budgets").select("*"),
    ]);

    setCategories(categoriesRes.data || []);
    setTransactions(transactionsRes.data || []);
    setBudgets(budgetsRes.data || []);
    setLoading(false);
  }

  // Current month spending by category (for pie chart)
  const currentMonth = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const currentMonthTransactions = transactions.filter(
    (t) =>
      t.date >= format(currentMonth, "yyyy-MM-dd") &&
      t.date <= format(currentMonthEnd, "yyyy-MM-dd")
  );

  const categorySpending = categories.map((cat) => {
    const spent = currentMonthTransactions
      .filter((t) => t.category_id === cat.id)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      name: cat.name,
      value: spent,
      color: cat.color,
    };
  }).filter((c) => c.value > 0);

  // Monthly trend data
  const monthlyTrend = [];
  for (let i = selectedMonths - 1; i >= 0; i--) {
    const month = subMonths(new Date(), i);
    const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");
    const monthTransactions = transactions.filter(
      (t) => t.date >= monthStart && t.date <= monthEnd
    );
    const total = monthTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    monthlyTrend.push({
      month: format(month, "MMM yyyy"),
      total,
    });
  }

  // Category trend data (stacked bar)
  const categoryTrend = [];
  for (let i = selectedMonths - 1; i >= 0; i--) {
    const month = subMonths(new Date(), i);
    const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");
    const monthTransactions = transactions.filter(
      (t) => t.date >= monthStart && t.date <= monthEnd
    );

    const dataPoint: Record<string, string | number> = {
      month: format(month, "MMM"),
    };

    categories.forEach((cat) => {
      const spent = monthTransactions
        .filter((t) => t.category_id === cat.id)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      dataPoint[cat.name] = spent;
    });

    categoryTrend.push(dataPoint);
  }

  // Budget vs Actual (current month)
  const currentMonthStr = format(currentMonth, "yyyy-MM-dd");
  const budgetVsActual = categories.map((cat) => {
    const budget = budgets.find(
      (b) => b.category_id === cat.id && b.month === currentMonthStr
    );
    const spent = currentMonthTransactions
      .filter((t) => t.category_id === cat.id)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      name: cat.name,
      budget: budget?.budget_amount || 0,
      actual: spent,
      color: cat.color,
    };
  }).filter((c) => c.budget > 0 || c.actual > 0);

  // Top merchants
  const merchantSpending = new Map<string, number>();
  currentMonthTransactions.forEach((t) => {
    const merchant = t.description.split(/\s+/).slice(0, 2).join(" ");
    merchantSpending.set(
      merchant,
      (merchantSpending.get(merchant) || 0) + Math.abs(t.amount)
    );
  });
  const topMerchants = Array.from(merchantSpending.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, amount]) => ({ name, amount }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <select
          value={selectedMonths}
          onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
          className="px-4 py-2 border rounded-lg"
        >
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown (Pie) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Spending by Category (This Month)
          </h2>
          {categorySpending.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No spending data for this month
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySpending}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {categorySpending.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `$${value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly Trend (Line) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Spending Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value: number) =>
                  `$${value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}`
                }
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Trends (Stacked Bar) */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Category Spending Over Time
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={categoryTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value: number) =>
                  `$${value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}`
                }
              />
              <Legend />
              {categories.map((cat) => (
                <Bar
                  key={cat.id}
                  dataKey={cat.name}
                  stackId="a"
                  fill={cat.color}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget vs Actual */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Budget vs Actual (This Month)
          </h2>
          {budgetVsActual.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No budget data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetVsActual} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip
                  formatter={(value: number) =>
                    `$${value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}`
                  }
                />
                <Legend />
                <Bar dataKey="budget" fill="#94A3B8" name="Budget" />
                <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Merchants */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Merchants (This Month)
          </h2>
          {topMerchants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No merchant data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMerchants} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip
                  formatter={(value: number) =>
                    `$${value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}`
                  }
                />
                <Bar dataKey="amount" fill="#22C55E" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
