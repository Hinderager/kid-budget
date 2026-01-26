"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Category, Transaction, CategoryGroupAssignment } from "@/types/database";
import { format, subMonths, startOfMonth, endOfMonth, getDate, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ScheduledBill {
  id: string;
  name: string;
  category: Category;
  averageAmount: number;
  averageDay: number;
  lastThreeMonths: {
    month: string;
    amount: number;
    day: number;
  }[];
}

export function SchedulePage() {
  const [scheduledBills, setScheduledBills] = useState<ScheduledBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    loadScheduledBills();
  }, []);

  async function loadScheduledBills() {
    setLoading(true);

    const [categoriesRes, groupsRes] = await Promise.all([
      supabase.from("budget_categories").select("*"),
      supabase.from("budget_category_groups").select("*"),
    ]);

    const categories = categoriesRes.data || [];
    const groups = groupsRes.data || [];

    const fixedBillsCategoryIds = groups
      .filter((g: CategoryGroupAssignment) => g.group_name === "Fixed Bills")
      .map((g: CategoryGroupAssignment) => g.category_id);

    if (fixedBillsCategoryIds.length === 0) {
      setLoading(false);
      return;
    }

    const threeMonthsAgo = startOfMonth(subMonths(new Date(), 3));
    const now = endOfMonth(new Date());

    const { data: transactions } = await supabase
      .from("budget_transactions")
      .select("*")
      .in("category_id", fixedBillsCategoryIds)
      .gte("date", format(threeMonthsAgo, "yyyy-MM-dd"))
      .lte("date", format(now, "yyyy-MM-dd"))
      .eq("ignored", false)
      .order("date", { ascending: false });

    if (!transactions || transactions.length === 0) {
      setLoading(false);
      return;
    }

    const billGroups = new Map<string, Transaction[]>();

    transactions.forEach((tx: Transaction) => {
      const normalizedName = normalizePayeeName(tx.description);
      if (!billGroups.has(normalizedName)) {
        billGroups.set(normalizedName, []);
      }
      billGroups.get(normalizedName)!.push(tx);
    });

    const bills: ScheduledBill[] = [];

    billGroups.forEach((txs, name) => {
      if (txs.length < 2) return;

      const byMonth = new Map<string, Transaction>();
      txs.forEach((tx) => {
        const month = format(new Date(tx.date), "yyyy-MM");
        if (!byMonth.has(month)) {
          byMonth.set(month, tx);
        }
      });

      const monthlyTxs = Array.from(byMonth.values());
      if (monthlyTxs.length < 2) return;

      const amounts = monthlyTxs.map((tx) => Math.abs(tx.amount));
      const days = monthlyTxs.map((tx) => getDate(new Date(tx.date)));

      const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const averageDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length);

      const category = categories.find((c: Category) => c.id === monthlyTxs[0].category_id);
      if (!category) return;

      const lastThreeMonths = monthlyTxs.slice(0, 3).map((tx) => ({
        month: format(new Date(tx.date), "MMM yyyy"),
        amount: Math.abs(tx.amount),
        day: getDate(new Date(tx.date)),
      }));

      bills.push({
        id: name,
        name: formatBillName(name),
        category,
        averageAmount,
        averageDay,
        lastThreeMonths,
      });
    });

    bills.sort((a, b) => a.averageDay - b.averageDay);
    setScheduledBills(bills);
    setLoading(false);
  }

  function normalizePayeeName(description: string): string {
    return description
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/\d{3,}/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .split(" ")
      .slice(0, 3)
      .join(" ");
  }

  function formatBillName(name: string): string {
    return name
      .split(" ")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const billsOnSelectedDay = selectedDay
    ? scheduledBills.filter((b) => b.averageDay === selectedDay)
    : [];

  // Calculate total for the day
  const dayTotal = billsOnSelectedDay.reduce((sum, b) => sum + b.averageAmount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24 md:pb-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {format(selectedMonth, "MMMM yyyy")}
        </h1>
        <button
          onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronRight className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }, (_, i) => {
            const dayNum = i - firstDayOfMonth + 1;
            const isValidDay = dayNum > 0 && dayNum <= daysInMonth;
            const isToday = isCurrentMonth && dayNum === today.getDate();
            const billsOnDay = scheduledBills.filter((b) => b.averageDay === dayNum);
            const totalOnDay = billsOnDay.reduce((sum, b) => sum + b.averageAmount, 0);

            return (
              <div
                key={i}
                className={`min-h-[70px] md:min-h-[80px] p-1 border-b border-r relative ${
                  isValidDay ? "bg-white" : "bg-gray-50"
                }`}
              >
                {isValidDay && (
                  <>
                    {/* Day Number */}
                    <div
                      className={`text-sm mb-1 ${
                        isToday
                          ? "w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold"
                          : "text-gray-500 pl-1"
                      }`}
                    >
                      {dayNum}
                    </div>

                    {/* Bills Amount - Clickable */}
                    {billsOnDay.length > 0 && (
                      <button
                        onClick={() => setSelectedDay(dayNum)}
                        className="w-full px-1 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors"
                      >
                        ${totalOnDay.toFixed(0)}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Total */}
      <div className="mt-4 bg-gray-100 rounded-xl p-4 text-center">
        <p className="text-gray-500 text-sm">Estimated Monthly Bills</p>
        <p className="text-2xl font-bold text-gray-900">
          ${scheduledBills.reduce((sum, b) => sum + b.averageAmount, 0).toFixed(2)}
        </p>
      </div>

      {/* Detail Modal */}
      {selectedDay !== null && billsOnSelectedDay.length > 0 && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-lg text-gray-900">
                  {format(new Date(year, month, selectedDay), "MMMM d")}
                </h2>
                <p className="text-sm text-gray-500">
                  {billsOnSelectedDay.length} bill{billsOnSelectedDay.length !== 1 ? "s" : ""} • ${dayTotal.toFixed(2)} total
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Bills List */}
            <div className="p-4 space-y-3">
              {billsOnSelectedDay.map((bill) => (
                <div
                  key={bill.id}
                  className="bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: bill.category.color }}
                      />
                      <span className="font-medium text-gray-900">{bill.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">
                      ${bill.averageAmount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{bill.category.name}</p>

                  {/* Recent History */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {bill.lastThreeMonths.map((m, i) => (
                      <div key={i} className="bg-white rounded p-2 text-center">
                        <p className="text-xs text-gray-400">{m.month}</p>
                        <p className="text-sm font-medium text-gray-700">${m.amount.toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
