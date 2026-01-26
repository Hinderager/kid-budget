"use client";

import { AlertTriangle } from "lucide-react";

interface BudgetProgressBarProps {
  name: string;
  color: string;
  spent: number;
  budget: number;
}

export function BudgetProgressBar({
  name,
  color,
  spent,
  budget,
}: BudgetProgressBarProps) {
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const isOverBudget = spent > budget && budget > 0;
  const isNearBudget = percentage >= 80 && percentage < 100;

  // Determine bar color based on percentage
  let barColor = color;
  if (isOverBudget) {
    barColor = "#EF4444"; // red
  } else if (isNearBudget) {
    barColor = "#F59E0B"; // amber
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium text-gray-900">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOverBudget && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm ${isOverBudget ? "text-red-600 font-semibold" : "text-gray-600"}`}>
            ${spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} / $
            {budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      <div className="progress-bar bg-gray-200">
        <div
          className="progress-bar-fill"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      {budget === 0 && (
        <div className="text-xs text-gray-400">No budget set</div>
      )}
    </div>
  );
}
