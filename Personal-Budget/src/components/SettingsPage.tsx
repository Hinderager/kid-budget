"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Category,
  CategoryRule,
  ImportHistory,
  MonthlyBudget,
} from "@/types/database";
import { format, startOfMonth } from "date-fns";
import { Save, Trash2, Plus, ChevronDown, ChevronRight, Pencil, Check, X } from "lucide-react";

// Simple category dropdown with subcategories
interface CategorySelectProps {
  categories: Category[];
  value: { categoryId: string; subcategory: string };
  onChange: (value: { categoryId: string; subcategory: string }) => void;
  placeholder?: string;
}

function CategorySelect({ categories, value, onChange, placeholder = "Select category..." }: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCategory = categories.find(c => c.id === value.categoryId);
  const displayText = selectedCategory
    ? value.subcategory
      ? `${selectedCategory.name} › ${value.subcategory}`
      : selectedCategory.name
    : "";

  const filteredCategories = categories.filter(cat => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    if (cat.name.toLowerCase().includes(term)) return true;
    if (cat.subcategories?.some(sub => sub.toLowerCase().includes(term))) return true;
    return false;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="w-full flex items-center px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayText}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 min-w-0 text-sm"
        />
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-72 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredCategories.map((cat) => (
            <div key={cat.id}>
              {/* Category header - clickable to select category without subcategory */}
              <button
                onClick={() => {
                  onChange({ categoryId: cat.id, subcategory: "" });
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-blue-50 ${
                  value.categoryId === cat.id && !value.subcategory ? 'bg-blue-100 text-blue-700' : 'text-gray-900'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-medium">{cat.name}</span>
              </button>
              {/* Subcategories */}
              {cat.subcategories?.map((subcat) => (
                <button
                  key={subcat}
                  onClick={() => {
                    onChange({ categoryId: cat.id, subcategory: subcat });
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`w-full flex items-center px-3 py-1.5 pl-8 text-sm hover:bg-blue-50 ${
                    value.categoryId === cat.id && value.subcategory === subcat ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                  }`}
                >
                  › {subcat}
                </button>
              ))}
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No categories match "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [imports, setImports] = useState<ImportHistory[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [monthlyPool, setMonthlyPool] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newRule, setNewRule] = useState({ pattern: "", categoryId: "", subcategory: "" });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState({ categoryId: "", subcategory: "" });
  const [budgetEdits, setBudgetEdits] = useState<Map<string, number>>(
    new Map()
  );
  const [expandedBudgetCategories, setExpandedBudgetCategories] = useState<Set<string>>(new Set());

  const currentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [categoriesRes, rulesRes, importsRes, budgetsRes, poolRes] =
      await Promise.all([
        supabase.from("budget_categories").select("*").order("sort_order"),
        supabase
          .from("budget_category_rules")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("budget_import_history")
          .select("*")
          .order("imported_at", { ascending: false })
          .limit(20),
        supabase
          .from("budget_monthly_budgets")
          .select("*")
          .eq("month", currentMonth),
        supabase
          .from("budget_settings")
          .select("value")
          .eq("key", "monthly_pool"),
      ]);

    setCategories(categoriesRes.data || []);
    setRules(rulesRes.data || []);
    setImports(importsRes.data || []);
    setBudgets(budgetsRes.data || []);
    const poolValue = poolRes.data?.[0]?.value as { amount?: number } | undefined;
    setMonthlyPool(poolValue?.amount || 0);

    // Initialize budget edits with composite keys for subcategories
    const editMap = new Map<string, number>();
    (budgetsRes.data || []).forEach((b: MonthlyBudget) => {
      const key = b.subcategory ? `${b.category_id}:${b.subcategory}` : b.category_id;
      editMap.set(key, b.budget_amount);
    });
    setBudgetEdits(editMap);

    setLoading(false);
  }

  async function saveMonthlyPool() {
    setSaving(true);
    await supabase
      .from("budget_settings")
      .upsert(
        { key: "monthly_pool", value: { amount: monthlyPool } },
        { onConflict: "key" }
      );
    setSaving(false);
  }

  async function saveBudgets() {
    setSaving(true);

    const budgetData = Array.from(budgetEdits.entries())
      .filter(([, amount]) => amount > 0)
      .map(([key, amount]) => {
        const [categoryId, subcategory] = key.includes(':')
          ? [key.split(':')[0], key.split(':')[1]]
          : [key, null];
        return {
          month: currentMonth,
          category_id: categoryId,
          subcategory: subcategory,
          budget_amount: amount,
        };
      });

    // Delete existing budgets for this month
    await supabase
      .from("budget_monthly_budgets")
      .delete()
      .eq("month", currentMonth);

    // Insert new budgets
    if (budgetData.length > 0) {
      await supabase.from("budget_monthly_budgets").insert(budgetData);
    }

    setSaving(false);
    loadData();
  }

  async function addRule() {
    if (!newRule.pattern || !newRule.categoryId) return;

    await supabase.from("budget_category_rules").insert({
      match_pattern: newRule.pattern,
      category_id: newRule.categoryId,
      subcategory: newRule.subcategory || null,
    });

    setNewRule({ pattern: "", categoryId: "", subcategory: "" });
    loadData();
  }

  async function updateRule(ruleId: string) {
    if (!editingRule.categoryId) return;

    await supabase
      .from("budget_category_rules")
      .update({
        category_id: editingRule.categoryId,
        subcategory: editingRule.subcategory || null,
      })
      .eq("id", ruleId);

    setEditingRuleId(null);
    loadData();
  }

  function startEditingRule(rule: CategoryRule) {
    setEditingRuleId(rule.id);
    setEditingRule({
      categoryId: rule.category_id,
      subcategory: rule.subcategory || "",
    });
  }

  async function deleteRule(ruleId: string) {
    await supabase.from("budget_category_rules").delete().eq("id", ruleId);
    loadData();
  }

  function toggleBudgetCategory(categoryId: string) {
    setExpandedBudgetCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }

  // Helper to get budget value for a category or subcategory
  function getBudgetValue(categoryId: string, subcategory?: string): number {
    const key = subcategory ? `${categoryId}:${subcategory}` : categoryId;
    return budgetEdits.get(key) || 0;
  }

  // Helper to set budget value for a category or subcategory
  function setBudgetValue(categoryId: string, value: number, subcategory?: string) {
    const key = subcategory ? `${categoryId}:${subcategory}` : categoryId;
    setBudgetEdits((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, value);
      return newMap;
    });
  }

  const totalBudgeted = Array.from(budgetEdits.values()).reduce(
    (sum, v) => sum + v,
    0
  );
  const unallocated = monthlyPool - totalBudgeted;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Monthly Pool */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Monthly Budget Pool
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Set the total amount of money available to budget each month.
        </p>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="number"
              value={monthlyPool}
              onChange={(e) => setMonthlyPool(parseFloat(e.target.value) || 0)}
              className="pl-8 pr-4 py-2 border rounded-lg w-40"
              min="0"
              step="100"
            />
          </div>
          <button
            onClick={saveMonthlyPool}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Category Budgets */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Category Budgets ({format(new Date(), "MMMM yyyy")})
        </h2>

        {unallocated !== 0 && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              unallocated > 0
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {unallocated > 0
              ? `$${unallocated.toLocaleString()} unallocated from your pool`
              : `$${Math.abs(unallocated).toLocaleString()} over-allocated`}
          </div>
        )}

        <div className="space-y-1">
          {categories.map((category) => {
            const hasSubcategories = category.subcategories && category.subcategories.length > 0;
            const isExpanded = expandedBudgetCategories.has(category.id);
            const categoryBudget = getBudgetValue(category.id);

            return (
              <div key={category.id}>
                {/* Category Row */}
                <div className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {hasSubcategories ? (
                      <button
                        onClick={() => toggleBudgetCategory(category.id)}
                        className="p-0.5 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    ) : (
                      <div className="w-5" />
                    )}
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium text-gray-900">
                      {category.name}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={categoryBudget || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setBudgetValue(category.id, value);
                      }}
                      placeholder="0"
                      className="pl-8 pr-4 py-1.5 border rounded-lg w-32 text-right"
                      min="0"
                      step="50"
                    />
                  </div>
                </div>

                {/* Subcategory Rows */}
                {hasSubcategories && isExpanded && (
                  <div className="ml-6 space-y-1 border-l-2 border-gray-200">
                    {category.subcategories!.map((subcat) => {
                      const subcatBudget = getBudgetValue(category.id, subcat);
                      return (
                        <div
                          key={subcat}
                          className="flex items-center justify-between py-1.5 px-3 ml-2 bg-green-50 rounded-lg"
                        >
                          <span className="text-sm text-gray-600">{subcat}</span>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                              $
                            </span>
                            <input
                              type="number"
                              value={subcatBudget || ""}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setBudgetValue(category.id, value, subcat);
                              }}
                              placeholder="0"
                              className="pl-7 pr-3 py-1 border rounded-lg w-28 text-right text-sm"
                              min="0"
                              step="25"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Total budgeted:{" "}
            <span className="font-semibold">
              ${totalBudgeted.toLocaleString()}
            </span>{" "}
            / ${monthlyPool.toLocaleString()}
          </div>
          <button
            onClick={saveBudgets}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Budgets
          </button>
        </div>
      </div>

      {/* Category Rules */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Category Rules
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Define rules to automatically categorize transactions based on
          merchant name patterns.
        </p>

        {/* Add new rule */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={newRule.pattern}
            onChange={(e) =>
              setNewRule((prev) => ({ ...prev, pattern: e.target.value }))
            }
            placeholder="Merchant pattern (e.g., AMAZON)"
            className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg"
          />
          <div className="w-64">
            <CategorySelect
              categories={categories}
              value={{ categoryId: newRule.categoryId, subcategory: newRule.subcategory }}
              onChange={(val) => setNewRule((prev) => ({ ...prev, categoryId: val.categoryId, subcategory: val.subcategory }))}
            />
          </div>
          <button
            onClick={addRule}
            disabled={!newRule.pattern || !newRule.categoryId}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        {/* Rules list */}
        <div className="space-y-2">
          {rules.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No rules defined yet. Create rules by changing transaction
              categories in the Ledger.
            </div>
          ) : (
            rules.map((rule) => {
              const category = categories.find(
                (c) => c.id === rule.category_id
              );
              const isEditing = editingRuleId === rule.id;

              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <code className="px-2 py-1 bg-gray-200 rounded text-sm">
                      {rule.match_pattern}
                    </code>
                    <span className="text-gray-400">→</span>
                    {isEditing ? (
                      <div className="w-56">
                        <CategorySelect
                          categories={categories}
                          value={{ categoryId: editingRule.categoryId, subcategory: editingRule.subcategory }}
                          onChange={(val) => setEditingRule({ categoryId: val.categoryId, subcategory: val.subcategory })}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category?.color }}
                        />
                        <span className="font-medium">
                          {category?.name}
                          {rule.subcategory && <span className="text-gray-500"> › {rule.subcategory}</span>}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => updateRule(rule.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingRuleId(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditingRule(rule)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Import History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Import History
        </h2>
        {imports.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No imports yet. Go to the Import page to upload CSV files.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    File
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                    Imported
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                    Duplicates
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {imports.map((imp) => (
                  <tr key={imp.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {format(new Date(imp.imported_at), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {imp.filename}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-green-600 font-medium">
                      {imp.transactions_imported}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-yellow-600">
                      {imp.duplicates_skipped}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
