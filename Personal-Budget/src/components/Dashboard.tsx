"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Category, Transaction, MonthlyBudget, CategoryGroupAssignment } from "@/types/database";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Category Row Component
interface SortableCategoryRowProps {
  category: Category;
  assigned: number;
  activity: number;
  available: number;
  isExpanded: boolean;
  categoryTxs: Transaction[];
  editingBudget: string | null;
  editValue: string;
  groupName: string;
  onToggleCategory: () => void;
  onEditBudget: () => void;
  onEditValueChange: (value: string) => void;
  onSaveBudget: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  getAvailableColor: (available: number, assigned: number) => string;
  formatCurrency: (amount: number) => string;
  getSubcategoryActivity: (categoryId: string, subcategory: string) => number;
  getCategoryTransactions: (categoryId: string, subcategory?: string) => Transaction[];
}

function SortableCategoryRow({
  category,
  assigned,
  activity,
  available,
  isExpanded,
  categoryTxs,
  editingBudget,
  editValue,
  groupName,
  onToggleCategory,
  onEditBudget,
  onEditValueChange,
  onSaveBudget,
  onKeyDown,
  getAvailableColor,
  formatCurrency,
  getSubcategoryActivity,
  getCategoryTransactions,
}: SortableCategoryRowProps) {
  const isIncome = groupName === "Income";
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const subcategories = category.subcategories || [];

  // Calculate progress percentage for progress bars
  function getProgressPercent(activity: number, assigned: number): number {
    if (assigned === 0) return 0;
    return Math.min((activity / assigned) * 100, 100);
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Desktop Row */}
      <div
        className={`hidden md:grid grid-cols-12 gap-2 px-4 py-2 border-t border-gray-100 hover:bg-gray-50 items-center ${
          activity > 0 ? "cursor-pointer" : ""
        }`}
        onClick={activity > 0 ? onToggleCategory : undefined}
      >
        <div className="col-span-5 flex items-center gap-2">
          {/* Drag Handle */}
          <button
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded touch-none"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
          {activity > 0 ? (
            isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )
          ) : (
            <div className="w-4" />
          )}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />
          <span className="font-medium text-gray-900">{category.name}</span>
        </div>

        {/* Assigned (Editable) */}
        <div className="col-span-2 text-right" onClick={(e) => e.stopPropagation()}>
          {editingBudget === category.id ? (
            <input
              type="number"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onBlur={onSaveBudget}
              onKeyDown={onKeyDown}
              className="w-full px-2 py-1 text-right border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              placeholder="0.00"
            />
          ) : (
            <button
              onClick={onEditBudget}
              className="w-full px-2 py-1 text-right hover:bg-blue-50 rounded cursor-text"
            >
              {assigned > 0 ? formatCurrency(assigned) : (
                <span className="text-gray-400">$0.00</span>
              )}
            </button>
          )}
        </div>

        {/* Activity */}
        <div className="col-span-2 text-right">
          {activity > 0 ? (
            isIncome ? (
              <span className="text-green-600">+{formatCurrency(activity)}</span>
            ) : (
              <span className="text-red-600">-{formatCurrency(activity)}</span>
            )
          ) : (
            <span className="text-gray-400">$0.00</span>
          )}
        </div>

        {/* Available */}
        <div className="col-span-3 text-right">
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getAvailableColor(
              available,
              assigned
            )}`}
          >
            {formatCurrency(available)}
          </span>
        </div>
      </div>

      {/* Expanded Content - Desktop */}
      {isExpanded && activity > 0 && (
        <div className="hidden md:block bg-gray-50 border-t border-gray-200">
          {/* Show subcategories if they exist */}
          {subcategories.length > 0 ? (
            subcategories.map((subcat: string) => {
              const subcatActivity = getSubcategoryActivity(category.id, subcat);
              const subcatTxs = getCategoryTransactions(category.id, subcat);
              if (subcatTxs.length === 0) return null;

              return (
                <div key={subcat} className="border-b border-gray-200 last:border-b-0">
                  <div className="px-4 py-2 pl-16 bg-green-50 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{subcat}</span>
                    <span className={`text-sm ${isIncome ? "text-green-600" : "text-red-600"}`}>
                      {isIncome ? "+" : "-"}{formatCurrency(subcatActivity)}
                    </span>
                  </div>
                  {subcatTxs.map((tx) => (
                    <div key={tx.id} className="px-4 py-2 pl-20 text-sm border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 w-16">{format(parseISO(tx.date), "MMM d")}</span>
                          <span className="text-gray-700">{tx.description}</span>
                          {tx.memo && <span className="text-gray-400 text-xs">• {tx.memo}</span>}
                        </div>
                        <span className={isIncome ? "text-green-600" : "text-red-600"}>
                          {isIncome ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          ) : (
            /* No subcategories - just show transactions */
            categoryTxs.map((tx) => (
              <div key={tx.id} className="px-4 py-2 pl-16 text-sm border-b border-gray-200 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 w-16">{format(parseISO(tx.date), "MMM d")}</span>
                    <span className="text-gray-700">{tx.description}</span>
                    {tx.memo && <span className="text-gray-400 text-xs">• {tx.memo}</span>}
                  </div>
                  <span className={isIncome ? "text-green-600" : "text-red-600"}>
                    {isIncome ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Show uncategorized transactions (no subcategory) if subcategories exist */}
          {subcategories.length > 0 && (() => {
            const uncatTxs = categoryTxs.filter(tx => !tx.subcategory || tx.subcategory === '');
            if (uncatTxs.length === 0) return null;
            const uncatActivity = uncatTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            return (
              <div className="border-b border-gray-200 last:border-b-0">
                <div className="px-4 py-2 pl-16 bg-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500 italic">Uncategorized</span>
                  <span className={`text-sm ${isIncome ? "text-green-600" : "text-red-600"}`}>
                    {isIncome ? "+" : "-"}{formatCurrency(uncatActivity)}
                  </span>
                </div>
                {uncatTxs.map((tx) => (
                  <div key={tx.id} className="px-4 py-2 pl-20 text-sm border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 w-16">{format(parseISO(tx.date), "MMM d")}</span>
                        <span className="text-gray-700">{tx.description}</span>
                        {tx.memo && <span className="text-gray-400 text-xs">• {tx.memo}</span>}
                      </div>
                      <span className={isIncome ? "text-green-600" : "text-red-600"}>
                        {isIncome ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Mobile Row */}
      <div
        className="md:hidden px-4 py-3 border-t border-gray-100 active:bg-gray-50"
        onClick={onToggleCategory}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Drag Handle - Mobile */}
            <button
              className="cursor-grab active:cursor-grabbing p-1 touch-none"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </button>
            {activity > 0 ? (
              isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )
            ) : (
              <div className="w-4" />
            )}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <span className="font-medium text-gray-900">{category.name}</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-sm font-medium ${getAvailableColor(
              available,
              assigned
            )}`}
          >
            {formatCurrency(available)}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all ${
              available < 0 ? "bg-red-500" : available < assigned * 0.2 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${getProgressPercent(activity, assigned)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500" onClick={(e) => e.stopPropagation()}>
          <span className={isIncome ? "text-green-600" : ""}>
            {isIncome ? "Earned" : "Spent"}: {isIncome ? "+" : ""}{formatCurrency(activity)}
          </span>
          {editingBudget === category.id ? (
            <input
              type="number"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onBlur={onSaveBudget}
              onKeyDown={onKeyDown}
              className="w-24 px-2 py-0.5 text-right border rounded text-sm"
              autoFocus
              placeholder="0.00"
            />
          ) : (
            <button
              onClick={onEditBudget}
              className="text-blue-600"
            >
              Budget: {formatCurrency(assigned)}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content - Mobile */}
      {isExpanded && activity > 0 && (
        <div className="md:hidden bg-gray-50 border-t border-gray-200">
          {/* Show subcategories if they exist */}
          {subcategories.length > 0 ? (
            subcategories.map((subcat: string) => {
              const subcatActivity = getSubcategoryActivity(category.id, subcat);
              const subcatTxs = getCategoryTransactions(category.id, subcat);
              if (subcatTxs.length === 0) return null;

              return (
                <div key={subcat} className="border-b border-gray-200 last:border-b-0">
                  <div className="px-4 py-2 bg-green-50 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{subcat}</span>
                    <span className={`text-sm ${isIncome ? "text-green-600" : "text-red-600"}`}>
                      {isIncome ? "+" : "-"}{formatCurrency(subcatActivity)}
                    </span>
                  </div>
                  {subcatTxs.map((tx) => (
                    <div key={tx.id} className="px-4 py-2 pl-6 text-sm border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-400 text-xs">{format(parseISO(tx.date), "MMM d")} </span>
                          <span className="text-gray-700">{tx.description}</span>
                        </div>
                        <span className={`ml-2 ${isIncome ? "text-green-600" : "text-red-600"}`}>
                          {isIncome ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                        </span>
                      </div>
                      {tx.memo && (
                        <div className="text-xs text-gray-500 mt-0.5 pl-12 truncate">{tx.memo}</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          ) : (
            /* No subcategories - just show transactions */
            categoryTxs.map((tx) => (
              <div key={tx.id} className="px-4 py-2 text-sm border-b border-gray-200 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-400 text-xs">{format(parseISO(tx.date), "MMM d")} </span>
                    <span className="text-gray-700">{tx.description}</span>
                  </div>
                  <span className={`ml-2 ${isIncome ? "text-green-600" : "text-red-600"}`}>
                    {isIncome ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
                {tx.memo && (
                  <div className="text-xs text-gray-500 mt-0.5 pl-12 truncate">{tx.memo}</div>
                )}
              </div>
            ))
          )}

          {/* Show uncategorized transactions (no subcategory) if subcategories exist */}
          {subcategories.length > 0 && (() => {
            const uncatTxs = categoryTxs.filter(tx => !tx.subcategory || tx.subcategory === '');
            if (uncatTxs.length === 0) return null;
            const uncatActivity = uncatTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            return (
              <div className="border-b border-gray-200 last:border-b-0">
                <div className="px-4 py-2 bg-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500 italic">Uncategorized</span>
                  <span className={`text-sm ${isIncome ? "text-green-600" : "text-red-600"}`}>
                    {isIncome ? "+" : "-"}{formatCurrency(uncatActivity)}
                  </span>
                </div>
                {uncatTxs.map((tx) => (
                  <div key={tx.id} className="px-4 py-2 pl-6 text-sm border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-400 text-xs">{format(parseISO(tx.date), "MMM d")} </span>
                        <span className="text-gray-700">{tx.description}</span>
                      </div>
                      <span className={`ml-2 ${isIncome ? "text-green-600" : "text-red-600"}`}>
                        {isIncome ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                    {tx.memo && (
                      <div className="text-xs text-gray-500 mt-0.5 pl-12 truncate">{tx.memo}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

interface CategoryBudget {
  category: Category;
  assigned: number;
  activity: number;
  available: number;
}

type GroupName = "Fixed Bills" | "Expenses" | "Wants" | "Income";

const GROUP_COLORS: Record<GroupName, string> = {
  "Fixed Bills": "#ef4444", // red
  "Expenses": "#3b82f6", // blue
  "Wants": "#8b5cf6", // purple
  "Income": "#22c55e", // green
};

const GROUP_ORDER: GroupName[] = ["Fixed Bills", "Expenses", "Wants", "Income"];

export function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [groupAssignments, setGroupAssignments] = useState<CategoryGroupAssignment[]>([]);
  const [monthlyPool, setMonthlyPool] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Fixed Bills", "Expenses", "Wants", "Income"]));
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const monthStr = format(selectedMonth, "MMMM yyyy");
  // Use a fixed date for budgets so assigned amounts are consistent across all months
  const budgetKey = "2000-01-01";

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  async function loadData() {
    setLoading(true);

    const monthStart = selectedMonth;
    const monthEnd = endOfMonth(selectedMonth);

    const [categoriesRes, transactionsRes, budgetsRes, poolRes, groupsRes] = await Promise.all([
      supabase.from("budget_categories").select("*").order("sort_order"),
      supabase
        .from("budget_transactions")
        .select("*")
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .eq("ignored", false),
      supabase
        .from("budget_monthly_budgets")
        .select("*")
        .eq("month", budgetKey),
      supabase
        .from("budget_settings")
        .select("value")
        .eq("key", "monthly_pool"),
      supabase
        .from("budget_category_groups")
        .select("*"),
    ]);

    setCategories(categoriesRes.data || []);
    setTransactions(transactionsRes.data || []);
    setBudgets(budgetsRes.data || []);
    setGroupAssignments(groupsRes.data || []);
    const poolValue = poolRes.data?.[0]?.value as { amount?: number } | undefined;
    setMonthlyPool(poolValue?.amount || 0);
    setLoading(false);
  }

  // Get categories for a specific group (from database assignments)
  function getGroupCategoryIds(groupName: GroupName): string[] {
    return groupAssignments
      .filter((g) => g.group_name === groupName)
      .map((g) => g.category_id);
  }

  // Calculate budget data per category
  const categoryBudgets: CategoryBudget[] = categories.map((category) => {
    const budget = budgets.find((b) => b.category_id === category.id);
    const categoryTransactions = transactions.filter(
      (t) => t.category_id === category.id
    );
    const isIncomeCategory = category.name === "Income";

    // For income: positive amounts are earnings
    // For expenses: negative amounts are spending, positive amounts are refunds/credits
    const activity = isIncomeCategory
      ? categoryTransactions.reduce((sum, t) => sum + Math.max(0, t.amount), 0) // Only count positive (income)
      : categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount < 0 ? t.amount : 0) - Math.max(0, t.amount), 0); // Spending minus refunds

    const assigned = budget?.budget_amount || 0;
    const available = isIncomeCategory ? assigned + activity : assigned - Math.abs(activity);

    return {
      category,
      assigned,
      activity: Math.abs(activity),
      available,
    };
  });

  const totalAssigned = categoryBudgets.reduce((sum, cb) => sum + cb.assigned, 0);

  // Calculate income and expense activity separately for correct totals
  const incomeCategory = categoryBudgets.find((cb) => cb.category.name === "Income");
  const totalIncomeActivity = incomeCategory?.activity || 0;
  const totalExpenseActivity = categoryBudgets
    .filter((cb) => cb.category.name !== "Income")
    .reduce((sum, cb) => sum + cb.activity, 0);
  // Net activity: positive = net spending, negative = net earning
  const netActivity = totalExpenseActivity - totalIncomeActivity;

  const totalAvailable = categoryBudgets.reduce((sum, cb) => sum + cb.available, 0);
  const readyToAssign = monthlyPool - totalAssigned;

  async function updateBudget(categoryId: string, amount: number) {
    const existingBudget = budgets.find((b) => b.category_id === categoryId);

    if (existingBudget) {
      await supabase
        .from("budget_monthly_budgets")
        .update({ budget_amount: amount })
        .eq("id", existingBudget.id);
    } else {
      await supabase.from("budget_monthly_budgets").insert({
        month: budgetKey,
        category_id: categoryId,
        budget_amount: amount,
      });
    }

    // Update local state
    setBudgets((prev) => {
      const existing = prev.find((b) => b.category_id === categoryId);
      if (existing) {
        return prev.map((b) =>
          b.category_id === categoryId ? { ...b, budget_amount: amount } : b
        );
      } else {
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            month: budgetKey,
            category_id: categoryId,
            subcategory: null,
            budget_amount: amount,
          },
        ];
      }
    });
  }

  function handleBudgetEdit(categoryId: string, currentValue: number) {
    setEditingBudget(categoryId);
    setEditValue(currentValue > 0 ? currentValue.toString() : "");
  }

  function handleBudgetSave(categoryId: string) {
    const amount = parseFloat(editValue) || 0;
    updateBudget(categoryId, amount);
    setEditingBudget(null);
    setEditValue("");
  }

  function handleBudgetKeyDown(e: React.KeyboardEvent, categoryId: string) {
    if (e.key === "Enter") {
      handleBudgetSave(categoryId);
    } else if (e.key === "Escape") {
      setEditingBudget(null);
      setEditValue("");
    }
  }

  function getAvailableColor(available: number, assigned: number): string {
    if (available < 0) return "bg-red-100 text-red-700"; // Overspent
    if (available === 0 && assigned === 0) return "text-gray-400"; // No budget
    if (available === 0) return "bg-gray-100 text-gray-600"; // Fully spent
    if (available < assigned * 0.2) return "bg-yellow-100 text-yellow-700"; // Low
    return "bg-green-100 text-green-700"; // Good
  }

  function toggleGroup(groupName: string) {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  }

  // Get categories for a specific group (using database assignments)
  function getGroupCategories(groupName: GroupName): CategoryBudget[] {
    const categoryIds = getGroupCategoryIds(groupName);
    return categoryBudgets
      .filter((cb) => categoryIds.includes(cb.category.id))
      .sort((a, b) => (a.category.sort_order || 0) - (b.category.sort_order || 0));
  }

  // Handle drag end - update sort order
  async function handleDragEnd(event: DragEndEvent, groupName: GroupName) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const groupCats = getGroupCategories(groupName);
      const oldIndex = groupCats.findIndex((cb) => cb.category.id === active.id);
      const newIndex = groupCats.findIndex((cb) => cb.category.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(groupCats, oldIndex, newIndex);

        // Update local state immediately for smooth UI
        const newCategories = categories.map((cat) => {
          const newOrder = reordered.findIndex((cb) => cb.category.id === cat.id);
          if (newOrder !== -1) {
            return { ...cat, sort_order: newOrder };
          }
          return cat;
        });
        setCategories(newCategories);

        // Update database
        for (let i = 0; i < reordered.length; i++) {
          await supabase
            .from("budget_categories")
            .update({ sort_order: i })
            .eq("id", reordered[i].category.id);
        }
      }
    }
  }

  // Calculate group totals
  function getGroupTotals(groupName: GroupName) {
    const groupCats = getGroupCategories(groupName);
    return {
      assigned: groupCats.reduce((sum, cb) => sum + cb.assigned, 0),
      activity: groupCats.reduce((sum, cb) => sum + cb.activity, 0),
      available: groupCats.reduce((sum, cb) => sum + cb.available, 0),
    };
  }

  function formatCurrency(amount: number): string {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  }

  // Get transactions for a specific category and optional subcategory
  function getCategoryTransactions(categoryId: string, subcategory?: string): Transaction[] {
    return transactions.filter((t) => {
      if (t.category_id !== categoryId) return false;
      if (subcategory !== undefined) {
        return t.subcategory === subcategory;
      }
      return true;
    }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }

  // Get activity amount for a specific subcategory
  function getSubcategoryActivity(categoryId: string, subcategory: string): number {
    return transactions
      .filter((t) => t.category_id === categoryId && t.subcategory === subcategory)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Calculate progress percentage for progress bars
  function getProgressPercent(activity: number, assigned: number): number {
    if (assigned === 0) return 0;
    return Math.min((activity / assigned) * 100, 100);
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        {/* Mobile Header */}
        <div className="md:hidden">
          {/* Ready to Assign - Mobile */}
          <div
            className={`px-4 py-3 ${
              readyToAssign > 0
                ? "bg-green-500"
                : readyToAssign < 0
                ? "bg-red-500"
                : "bg-gray-500"
            }`}
          >
            <div className="text-center text-white">
              <div className="text-2xl font-bold">{formatCurrency(readyToAssign)}</div>
              <div className="text-sm opacity-90">Ready to Assign</div>
            </div>
          </div>
          {/* Month Selector - Mobile */}
          <div className="flex items-center justify-center gap-4 py-3 bg-white">
            <button
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 min-w-[140px] text-center">
              {monthStr}
            </h1>
            <button
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between px-4 py-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 min-w-[140px] text-center">
              {monthStr}
            </h1>
            <button
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Ready to Assign */}
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-full ${
              readyToAssign > 0
                ? "bg-green-100"
                : readyToAssign < 0
                ? "bg-red-100"
                : "bg-gray-100"
            }`}
          >
            <span
              className={`text-lg font-bold ${
                readyToAssign > 0
                  ? "text-green-700"
                  : readyToAssign < 0
                  ? "text-red-700"
                  : "text-gray-600"
              }`}
            >
              {formatCurrency(readyToAssign)}
            </span>
            <span className="text-sm text-gray-600">Ready to Assign</span>
          </div>
        </div>
      </div>

      {/* Budget Table */}
      <div className="bg-white">
        {/* Table Header - Desktop Only */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b text-sm font-medium text-gray-500 uppercase tracking-wide">
          <div className="col-span-5">Category</div>
          <div className="col-span-2 text-right">Assigned</div>
          <div className="col-span-2 text-right">Activity</div>
          <div className="col-span-3 text-right">Available</div>
        </div>

        {/* Category Groups */}
        <div className="divide-y">
          {GROUP_ORDER.map((groupName) => {
            const groupTotals = getGroupTotals(groupName);
            const groupCategories = getGroupCategories(groupName);
            const isExpanded = expandedGroups.has(groupName);

            return (
              <div key={groupName}>
                {/* Group Header - Desktop */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-100 items-center">
                  <div className="col-span-5 flex items-center gap-2">
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="flex items-center gap-2 hover:bg-gray-200 rounded p-1 -ml-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: GROUP_COLORS[groupName] }}
                      />
                      <span className="font-semibold text-gray-800">{groupName}</span>
                    </button>
                  </div>
                  <div className="col-span-2 text-right font-medium text-gray-700">
                    {formatCurrency(groupTotals.assigned)}
                  </div>
                  <div className={`col-span-2 text-right font-medium ${groupName === "Income" ? "text-green-600" : "text-red-600"}`}>
                    {groupTotals.activity > 0
                      ? `${groupName === "Income" ? "+" : "-"}${formatCurrency(groupTotals.activity)}`
                      : "$0.00"}
                  </div>
                  <div className="col-span-3 text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getAvailableColor(
                        groupTotals.available,
                        groupTotals.assigned
                      )}`}
                    >
                      {formatCurrency(groupTotals.available)}
                    </span>
                  </div>
                </div>

                {/* Group Header - Mobile */}
                <div className="md:hidden px-4 py-3 bg-gray-100">
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: GROUP_COLORS[groupName] }}
                      />
                      <span className="font-semibold text-gray-800">{groupName}</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getAvailableColor(
                        groupTotals.available,
                        groupTotals.assigned
                      )}`}
                    >
                      {formatCurrency(groupTotals.available)}
                    </span>
                  </button>
                </div>

                {/* Category Rows (when expanded) */}
                {isExpanded && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, groupName)}
                  >
                    <SortableContext
                      items={groupCategories.map((cb) => cb.category.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {groupCategories.map(({ category, assigned, activity, available }) => (
                        <SortableCategoryRow
                          key={category.id}
                          category={category}
                          assigned={assigned}
                          activity={activity}
                          available={available}
                          isExpanded={expandedCategory === category.id}
                          categoryTxs={getCategoryTransactions(category.id)}
                          editingBudget={editingBudget}
                          editValue={editValue}
                          groupName={groupName}
                          onToggleCategory={() => toggleCategory(category.id)}
                          onEditBudget={() => handleBudgetEdit(category.id, assigned)}
                          onEditValueChange={setEditValue}
                          onSaveBudget={() => handleBudgetSave(category.id)}
                          onKeyDown={(e) => handleBudgetKeyDown(e, category.id)}
                          getAvailableColor={getAvailableColor}
                          formatCurrency={formatCurrency}
                          getSubcategoryActivity={getSubcategoryActivity}
                          getCategoryTransactions={getCategoryTransactions}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            );
          })}

        </div>

        {/* Totals Row - Desktop */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-100 border-t-2 font-semibold">
          <div className="col-span-5 text-gray-700">Total</div>
          <div className="col-span-2 text-right text-gray-900">
            {formatCurrency(totalAssigned)}
          </div>
          <div className={`col-span-2 text-right ${netActivity >= 0 ? "text-red-600" : "text-green-600"}`}>
            {netActivity !== 0
              ? `${netActivity >= 0 ? "-" : "+"}${formatCurrency(Math.abs(netActivity))}`
              : "$0.00"}
          </div>
          <div className="col-span-3 text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                totalAvailable >= 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {formatCurrency(totalAvailable)}
            </span>
          </div>
        </div>

        {/* Totals Row - Mobile */}
        <div className="md:hidden px-4 py-4 bg-gray-100 border-t-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700">Total Available</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                totalAvailable >= 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {formatCurrency(totalAvailable)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
            <span>Budgeted: {formatCurrency(totalAssigned)}</span>
            <span className={netActivity >= 0 ? "text-red-600" : "text-green-600"}>
              {netActivity >= 0 ? "Net Spent" : "Net Earned"}: {netActivity >= 0 ? "" : "+"}{formatCurrency(Math.abs(netActivity))}
            </span>
          </div>
        </div>
      </div>

      {/* Help Text */}
      {monthlyPool === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          Set your monthly budget pool in{" "}
          <a href="/settings" className="underline font-medium">
            Settings
          </a>{" "}
          to see how much you have ready to assign.
        </div>
      )}
    </div>
  );
}
