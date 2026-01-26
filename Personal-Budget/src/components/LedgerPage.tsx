"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Category, Transaction, CategoryGroupAssignment, MonthlyBudget, TransactionSplit } from "@/types/database";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  Search,
  Plus,
  Upload,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronDown,
  Flag,
  Split,
  Trash2
} from "lucide-react";

type GroupName = "Fixed Bills" | "Expenses" | "Wants" | "Income";

const GROUP_ORDER: GroupName[] = ["Fixed Bills", "Expenses", "Wants", "Income"];

interface CategoryWithBudget extends Category {
  available: number;
  groupName?: GroupName;
}

export function LedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groupAssignments, setGroupAssignments] = useState<CategoryGroupAssignment[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [splits, setSplits] = useState<TransactionSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showIgnored, setShowIgnored] = useState(false);

  // Split modal state
  const [splitModalTransaction, setSplitModalTransaction] = useState<Transaction | null>(null);

  // Ignore confirmation modal state
  const [ignoreConfirmTransaction, setIgnoreConfirmTransaction] = useState<Transaction | null>(null);

  // Rule creation confirmation modal state
  const [ruleConfirmData, setRuleConfirmData] = useState<{
    transaction: Transaction;
    categoryId: string;
    subcategory: string | null;
    pattern: string;
  } | null>(null);

  // Add transaction form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    payee: "",
    category_id: "",
    subcategory: null as string | null,
    memo: "",
    outflow: "",
    inflow: "",
  });

  // Selected transactions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const currentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const [categoriesRes, transactionsRes, groupsRes, budgetsRes, monthTransactionsRes, splitsRes] = await Promise.all([
      supabase.from("budget_categories").select("*").order("sort_order"),
      supabase
        .from("budget_transactions")
        .select("*")
        .order("date", { ascending: false }),
      supabase.from("budget_category_groups").select("*"),
      supabase
        .from("budget_monthly_budgets")
        .select("*")
        .eq("month", currentMonth),
      supabase
        .from("budget_transactions")
        .select("*")
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .eq("ignored", false),
      supabase.from("budget_transaction_splits").select("*"),
    ]);

    setCategories(categoriesRes.data || []);
    setTransactions(transactionsRes.data || []);
    setGroupAssignments(groupsRes.data || []);
    setBudgets(budgetsRes.data || []);
    setSplits(splitsRes.data || []);
    setLoading(false);
  }

  // Get category with budget info
  function getCategoriesWithBudget(): CategoryWithBudget[] {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    return categories.map((cat) => {
      const budget = budgets.find((b) => b.category_id === cat.id);
      const assigned = budget?.budget_amount || 0;

      // Calculate activity for this month
      const activity = transactions
        .filter((t) =>
          t.category_id === cat.id &&
          !t.ignored &&
          t.date >= format(monthStart, "yyyy-MM-dd") &&
          t.date <= format(monthEnd, "yyyy-MM-dd")
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const available = assigned - activity;
      const group = groupAssignments.find((g) => g.category_id === cat.id);

      return {
        ...cat,
        available,
        groupName: group?.group_name as GroupName | undefined,
      };
    });
  }

  // Group categories by group name
  function getGroupedCategories(): Record<GroupName | "Ungrouped", CategoryWithBudget[]> {
    const catsWithBudget = getCategoriesWithBudget();
    const grouped: Record<GroupName | "Ungrouped", CategoryWithBudget[]> = {
      "Fixed Bills": [],
      "Expenses": [],
      Wants: [],
      Income: [],
      Ungrouped: [],
    };

    catsWithBudget.forEach((cat) => {
      if (cat.groupName) {
        grouped[cat.groupName].push(cat);
      } else {
        grouped.Ungrouped.push(cat);
      }
    });

    return grouped;
  }

  async function updateCategory(
    transactionId: string,
    categoryId: string | null,
    subcategory: string | null = null,
    createRule: boolean = false
  ) {
    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction) return;

    if (createRule && categoryId) {
      // Normalize the description to find similar transactions
      const normalizedDesc = transaction.description
        .toUpperCase()
        .replace(/\s+/g, " ")
        .replace(/\d{3,}/g, "") // Remove long numbers
        .replace(/\s{2,}/g, " ")
        .trim();

      // Find all transactions with similar descriptions
      const matchingIds = transactions
        .filter((t) => {
          const tNormalized = t.description
            .toUpperCase()
            .replace(/\s+/g, " ")
            .replace(/\d{3,}/g, "")
            .replace(/\s{2,}/g, " ")
            .trim();
          return tNormalized === normalizedDesc;
        })
        .map((t) => t.id);

      // Update all matching transactions in database
      await supabase
        .from("budget_transactions")
        .update({ category_id: categoryId, subcategory: subcategory })
        .in("id", matchingIds);

      // Create the rule for future transactions - use full normalized description
      const pattern = transaction.description.replace(/\s+/g, " ").trim();
      await supabase.from("budget_category_rules").upsert(
        {
          match_pattern: pattern,
          category_id: categoryId,
          subcategory: subcategory,
        },
        { onConflict: "match_pattern" }
      );

      // Update local state for all matching transactions
      setTransactions((prev) =>
        prev.map((t) =>
          matchingIds.includes(t.id) ? { ...t, category_id: categoryId, subcategory: subcategory } : t
        )
      );
    } else {
      // Just update this one transaction
      await supabase
        .from("budget_transactions")
        .update({ category_id: categoryId, subcategory: subcategory })
        .eq("id", transactionId);

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, category_id: categoryId, subcategory: subcategory } : t
        )
      );
    }
  }

  // Show rule confirmation modal with editable pattern
  function initiateRuleCreation(transactionId: string, categoryId: string, subcategory: string | null) {
    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction || !categoryId) return;

    // Use the full description as the default pattern
    const pattern = transaction.description.replace(/\s+/g, " ").trim();
    setRuleConfirmData({ transaction, categoryId, subcategory, pattern });
  }

  // Create the rule after user confirms the pattern
  async function confirmRuleCreation(pattern: string) {
    if (!ruleConfirmData) return;

    const { transaction, categoryId, subcategory } = ruleConfirmData;
    const normalizedPattern = pattern.toUpperCase().replace(/\s+/g, " ").trim();

    // Find all transactions with descriptions that match the pattern
    const matchingIds = transactions
      .filter((t) => {
        const tNormalized = t.description.toUpperCase().replace(/\s+/g, " ").trim();
        return tNormalized.includes(normalizedPattern) || normalizedPattern.includes(tNormalized) || tNormalized === normalizedPattern;
      })
      .map((t) => t.id);

    // Update all matching transactions in database
    await supabase
      .from("budget_transactions")
      .update({ category_id: categoryId, subcategory: subcategory })
      .in("id", matchingIds);

    // Create the rule for future transactions
    await supabase.from("budget_category_rules").upsert(
      {
        match_pattern: pattern,
        category_id: categoryId,
        subcategory: subcategory,
      },
      { onConflict: "match_pattern" }
    );

    // Update local state for all matching transactions
    setTransactions((prev) =>
      prev.map((t) =>
        matchingIds.includes(t.id) ? { ...t, category_id: categoryId, subcategory: subcategory } : t
      )
    );

    setRuleConfirmData(null);
  }

  async function toggleIgnore(transactionId: string) {
    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction) return;

    const newIgnored = !transaction.ignored;

    // If ignoring an inflow, ask if user wants to ignore all from this payee
    if (newIgnored && transaction.amount > 0) {
      setIgnoreConfirmTransaction(transaction);
      return;
    }

    await supabase
      .from("budget_transactions")
      .update({ ignored: newIgnored })
      .eq("id", transactionId);

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId ? { ...t, ignored: newIgnored } : t
      )
    );
  }

  // Ignore just this one transaction
  async function ignoreJustThis(transaction: Transaction) {
    await supabase
      .from("budget_transactions")
      .update({ ignored: true })
      .eq("id", transaction.id);

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transaction.id ? { ...t, ignored: true } : t
      )
    );
    setIgnoreConfirmTransaction(null);
  }

  // Ignore all transactions from similar payee
  async function ignoreAllFromPayee(transaction: Transaction) {
    // Normalize the description to match similar transactions - use full description
    const normalizedDesc = transaction.description
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/\d{3,}/g, "") // Remove long numbers
      .replace(/\s{2,}/g, " ")
      .trim();

    // Find all transactions with similar descriptions
    const matchingIds = transactions
      .filter((t) => {
        const tNormalized = t.description
          .toUpperCase()
          .replace(/\s+/g, " ")
          .replace(/\d{3,}/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        return tNormalized === normalizedDesc;
      })
      .map((t) => t.id);

    // Update all matching transactions in database
    await supabase
      .from("budget_transactions")
      .update({ ignored: true })
      .in("id", matchingIds);

    // Update local state
    setTransactions((prev) =>
      prev.map((t) =>
        matchingIds.includes(t.id) ? { ...t, ignored: true } : t
      )
    );
    setIgnoreConfirmTransaction(null);
  }

  async function updateMemo(transactionId: string, memo: string) {
    await supabase
      .from("budget_transactions")
      .update({ memo: memo || null })
      .eq("id", transactionId);

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId ? { ...t, memo: memo || null } : t
      )
    );
  }

  async function saveSplits(transactionId: string, newSplits: { category_id: string; amount: number; memo?: string }[]) {
    // Delete existing splits for this transaction
    await supabase
      .from("budget_transaction_splits")
      .delete()
      .eq("transaction_id", transactionId);

    // Insert new splits
    if (newSplits.length > 0) {
      const { data: insertedSplits } = await supabase
        .from("budget_transaction_splits")
        .insert(
          newSplits.map((s) => ({
            transaction_id: transactionId,
            category_id: s.category_id,
            amount: s.amount,
            memo: s.memo || null,
          }))
        )
        .select();

      // Mark transaction as split and clear its category_id
      await supabase
        .from("budget_transactions")
        .update({ is_split: true, category_id: null })
        .eq("id", transactionId);

      // Update local state
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, is_split: true, category_id: null } : t
        )
      );

      setSplits((prev) => [
        ...prev.filter((s) => s.transaction_id !== transactionId),
        ...(insertedSplits || []),
      ]);
    } else {
      // If no splits, mark transaction as not split
      await supabase
        .from("budget_transactions")
        .update({ is_split: false })
        .eq("id", transactionId);

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, is_split: false } : t
        )
      );

      setSplits((prev) => prev.filter((s) => s.transaction_id !== transactionId));
    }

    setSplitModalTransaction(null);
  }

  function getTransactionSplits(transactionId: string): TransactionSplit[] {
    return splits.filter((s) => s.transaction_id === transactionId);
  }

  async function addTransaction() {
    const amount = newTransaction.outflow
      ? -Math.abs(parseFloat(newTransaction.outflow))
      : parseFloat(newTransaction.inflow) || 0;

    const transaction_id = `${newTransaction.date}_${newTransaction.payee.substring(0, 30)}_${amount.toFixed(2)}_${Date.now()}`;

    const { data, error } = await supabase
      .from("budget_transactions")
      .insert({
        transaction_id,
        date: newTransaction.date,
        description: newTransaction.payee,
        amount,
        category_id: newTransaction.category_id || null,
        subcategory: newTransaction.subcategory,
        ignored: false,
      })
      .select()
      .single();

    if (!error && data) {
      setTransactions((prev) => [data, ...prev]);
      setNewTransaction({
        date: format(new Date(), "yyyy-MM-dd"),
        payee: "",
        category_id: "",
        subcategory: null,
        memo: "",
        outflow: "",
        inflow: "",
      });
      setShowAddForm(false);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  }

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  // Calculate totals
  const totalOutflow = transactions
    .filter((t) => !t.ignored && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalInflow = transactions
    .filter((t) => !t.ignored && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const workingBalance = totalInflow - totalOutflow;

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (!showIgnored && t.ignored) return false;
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      return false;
    return true;
  });

  const groupedCategories = getGroupedCategories();

  function formatCurrency(amount: number): string {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        {/* Mobile Header */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Transactions</h1>
            <span className="text-sm text-gray-500">{filteredTransactions.length} total</span>
          </div>
          {/* Mobile Balance Summary */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <div className="text-xs text-red-600">Outflow</div>
              <div className="text-sm font-semibold text-red-700">{formatCurrency(totalOutflow)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-xs text-green-600">Inflow</div>
              <div className="text-sm font-semibold text-green-700">{formatCurrency(totalInflow)}</div>
            </div>
            <div className={`rounded-lg p-2 text-center ${workingBalance >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <div className={`text-xs ${workingBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Balance</div>
              <div className={`text-sm font-semibold ${workingBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatCurrency(workingBalance)}</div>
            </div>
          </div>
          {/* Mobile Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Mobile Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
            <a
              href="/import"
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border hover:bg-gray-50 rounded-lg"
            >
              <Upload className="w-4 h-4" />
              Import
            </a>
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              className={`p-2 rounded-lg border ${showIgnored ? "bg-gray-100" : ""}`}
              title={showIgnored ? "Hide ignored" : "Show ignored"}
            >
              {showIgnored ? <Eye className="w-4 h-4 text-gray-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">All Transactions</h1>
              <div className="text-sm text-gray-500">{filteredTransactions.length} transactions</div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-500">Outflow: </span>
                <span className="text-red-600 font-medium">{formatCurrency(totalOutflow)}</span>
              </div>
              <div>
                <span className="text-gray-500">Inflow: </span>
                <span className="text-green-600 font-medium">{formatCurrency(totalInflow)}</span>
              </div>
              <div className={`px-3 py-1 rounded-full ${workingBalance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <span className="font-medium">{formatCurrency(workingBalance)}</span>
                <span className="text-xs ml-1">Balance</span>
              </div>
            </div>
          </div>

          {/* Desktop Toolbar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </button>
            <a
              href="/import"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Upload className="w-4 h-4" />
              File Import
            </a>
            <div className="flex-1" />
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${
                showIgnored ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {showIgnored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showIgnored ? "Showing Ignored" : "Hiding Ignored"}
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white">
        {/* Table Header - Desktop Only */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
          <div className="col-span-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300"
            />
            <Flag className="w-3 h-3" />
          </div>
          <div className="col-span-1">Date</div>
          <div className="col-span-3">Payee</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-2">Memo</div>
          <div className="col-span-1 text-right">Outflow</div>
          <div className="col-span-1 text-right">Inflow</div>
        </div>

        {/* Add Transaction Row - Mobile */}
        {showAddForm && (
          <>
            <div className="md:hidden px-4 py-4 bg-blue-50 border-b space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Payee"
                  value={newTransaction.payee}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, payee: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
              <CategoryDropdown
                value={newTransaction.category_id}
                subcategory={newTransaction.subcategory}
                onChange={(id, subcat) => setNewTransaction((prev) => ({ ...prev, category_id: id, subcategory: subcat }))}
                groupedCategories={groupedCategories}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Outflow</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newTransaction.outflow}
                    onChange={(e) => setNewTransaction((prev) => ({ ...prev, outflow: e.target.value, inflow: "" }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Inflow</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newTransaction.inflow}
                    onChange={(e) => setNewTransaction((prev) => ({ ...prev, inflow: e.target.value, outflow: "" }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={addTransaction}
                  disabled={!newTransaction.payee || (!newTransaction.outflow && !newTransaction.inflow)}
                  className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Add Transaction Row - Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-blue-50 border-b items-center">
              <div className="col-span-1"></div>
              <div className="col-span-1">
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="text"
                  placeholder="Payee"
                  value={newTransaction.payee}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, payee: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
              <div className="col-span-3">
                <CategoryDropdown
                  value={newTransaction.category_id}
                  subcategory={newTransaction.subcategory}
                  onChange={(id, subcat) => setNewTransaction((prev) => ({ ...prev, category_id: id, subcategory: subcat }))}
                  groupedCategories={groupedCategories}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Memo"
                  value={newTransaction.memo}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, memo: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
              <div className="col-span-1">
                <input
                  type="number"
                  placeholder="0.00"
                  value={newTransaction.outflow}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, outflow: e.target.value, inflow: "" }))}
                  className="w-full px-2 py-1 text-sm border rounded text-right"
                />
              </div>
              <div className="col-span-1 flex items-center gap-1">
                <input
                  type="number"
                  placeholder="0.00"
                  value={newTransaction.inflow}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, inflow: e.target.value, outflow: "" }))}
                  className="w-full px-2 py-1 text-sm border rounded text-right"
                />
              </div>
              <div className="col-span-12 flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 text-sm text-gray-600 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={addTransaction}
                  disabled={!newTransaction.payee || (!newTransaction.outflow && !newTransaction.inflow)}
                  className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </>
        )}

        {/* Transaction Rows */}
        <div className="divide-y">
          {filteredTransactions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No transactions found.
            </div>
          ) : (
            filteredTransactions.map((transaction, index) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                groupedCategories={groupedCategories}
                splits={getTransactionSplits(transaction.id)}
                categories={categories}
                isSelected={selectedIds.has(transaction.id)}
                index={index}
                onToggleSelect={() => toggleSelect(transaction.id)}
                onCategoryChange={updateCategory}
                onInitiateRule={initiateRuleCreation}
                onToggleIgnore={toggleIgnore}
                onMemoChange={updateMemo}
                onSplit={() => setSplitModalTransaction(transaction)}
              />
            ))
          )}
        </div>
      </div>

      {/* Split Modal */}
      {splitModalTransaction && (
        <SplitModal
          transaction={splitModalTransaction}
          existingSplits={getTransactionSplits(splitModalTransaction.id)}
          groupedCategories={groupedCategories}
          onSave={(newSplits) => saveSplits(splitModalTransaction.id, newSplits)}
          onClose={() => setSplitModalTransaction(null)}
        />
      )}

      {/* Ignore Confirmation Modal */}
      {ignoreConfirmTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Ignore Inflow</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-2">
                <span className="font-medium">{ignoreConfirmTransaction.description}</span>
              </p>
              <p className="text-green-600 font-semibold mb-4">
                +${Math.abs(ignoreConfirmTransaction.amount).toFixed(2)}
              </p>
              <p className="text-gray-600">
                Would you like to ignore all transactions from this payee, or just this one?
              </p>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex flex-col gap-2">
              <button
                onClick={() => ignoreAllFromPayee(ignoreConfirmTransaction)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Ignore All from This Payee
              </button>
              <button
                onClick={() => ignoreJustThis(ignoreConfirmTransaction)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Ignore Just This One
              </button>
              <button
                onClick={() => setIgnoreConfirmTransaction(null)}
                className="w-full px-4 py-2 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rule Creation Confirmation Modal */}
      {ruleConfirmData && (
        <RuleConfirmModal
          transaction={ruleConfirmData.transaction}
          categoryId={ruleConfirmData.categoryId}
          subcategory={ruleConfirmData.subcategory}
          initialPattern={ruleConfirmData.pattern}
          categories={categories}
          onConfirm={confirmRuleCreation}
          onCancel={() => setRuleConfirmData(null)}
        />
      )}
    </div>
  );
}

interface SplitModalProps {
  transaction: Transaction;
  existingSplits: TransactionSplit[];
  groupedCategories: Record<GroupName | "Ungrouped", CategoryWithBudget[]>;
  onSave: (splits: { category_id: string; amount: number; memo?: string }[]) => void;
  onClose: () => void;
}

function SplitModal({ transaction, existingSplits, groupedCategories, onSave, onClose }: SplitModalProps) {
  const [splitRows, setSplitRows] = useState<{ category_id: string; amount: string; memo: string }[]>(() => {
    if (existingSplits.length > 0) {
      return existingSplits.map((s) => ({
        category_id: s.category_id,
        amount: Math.abs(s.amount).toFixed(2),
        memo: s.memo || "",
      }));
    }
    // Initialize with one empty row
    return [{ category_id: "", amount: "", memo: "" }];
  });

  const totalAmount = Math.abs(transaction.amount);
  const allocatedAmount = splitRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const remainingAmount = totalAmount - allocatedAmount;

  function addRow() {
    setSplitRows([...splitRows, { category_id: "", amount: "", memo: "" }]);
  }

  function removeRow(index: number) {
    if (splitRows.length > 1) {
      setSplitRows(splitRows.filter((_, i) => i !== index));
    }
  }

  function updateRow(index: number, field: string, value: string) {
    setSplitRows(
      splitRows.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  }

  function autoFillRemaining(index: number) {
    if (remainingAmount > 0) {
      updateRow(index, "amount", remainingAmount.toFixed(2));
    }
  }

  function handleSave() {
    const validSplits = splitRows
      .filter((row) => row.category_id && parseFloat(row.amount) > 0)
      .map((row) => ({
        category_id: row.category_id,
        amount: transaction.amount < 0 ? -Math.abs(parseFloat(row.amount)) : parseFloat(row.amount),
        memo: row.memo || undefined,
      }));

    onSave(validSplits);
  }

  const canSave = Math.abs(remainingAmount) < 0.01 && splitRows.some((r) => r.category_id && parseFloat(r.amount) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Split Transaction</h2>
              <p className="text-sm text-gray-500 mt-0.5">{transaction.description}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="px-6 py-3 border-b bg-blue-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Total Amount:</span>
            <span className="font-semibold text-blue-900">${totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-blue-700">Allocated:</span>
            <span className="font-medium text-blue-800">${allocatedAmount.toFixed(2)}</span>
          </div>
          <div className={`flex items-center justify-between text-sm mt-1 ${Math.abs(remainingAmount) < 0.01 ? 'text-green-700' : 'text-amber-700'}`}>
            <span>Remaining:</span>
            <span className="font-semibold">${remainingAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Split Rows */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {splitRows.map((row, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <CategoryDropdown
                    value={row.category_id}
                    subcategory={null}
                    onChange={(id, _subcat) => updateRow(index, "category_id", id)}
                    groupedCategories={groupedCategories}
                    showAvailable={false}
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateRow(index, "amount", e.target.value)}
                      onFocus={() => {
                        if (!row.amount && remainingAmount > 0) {
                          autoFillRemaining(index);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Memo (optional)</label>
                  <input
                    type="text"
                    value={row.memo}
                    onChange={(e) => updateRow(index, "memo", e.target.value)}
                    placeholder="Note..."
                    className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => removeRow(index)}
                  disabled={splitRows.length === 1}
                  className="mt-6 p-1.5 hover:bg-red-100 rounded text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Another Split
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => {
              onSave([]);
            }}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            Remove Split
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Split
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RuleConfirmModalProps {
  transaction: Transaction;
  categoryId: string;
  subcategory: string | null;
  initialPattern: string;
  categories: Category[];
  onConfirm: (pattern: string) => void;
  onCancel: () => void;
}

function RuleConfirmModal({
  transaction,
  categoryId,
  subcategory,
  initialPattern,
  categories,
  onConfirm,
  onCancel,
}: RuleConfirmModalProps) {
  const [pattern, setPattern] = useState(initialPattern);
  const category = categories.find((c) => c.id === categoryId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Create Category Rule</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            This will create a rule to automatically categorize future transactions matching this pattern as{" "}
            <span className="font-medium text-gray-900">
              {category?.name}{subcategory ? ` › ${subcategory}` : ""}
            </span>
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Match Pattern
          </label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter pattern to match"
          />
          <p className="text-xs text-gray-500 mt-2">
            Transactions containing this text will be automatically categorized.
          </p>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(pattern)}
            disabled={!pattern.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Rule
          </button>
        </div>
      </div>
    </div>
  );
}

interface CategoryDropdownProps {
  value: string;
  subcategory?: string | null;
  onChange: (categoryId: string, subcategory: string | null) => void;
  groupedCategories: Record<GroupName | "Ungrouped", CategoryWithBudget[]>;
  showAvailable?: boolean;
}

function CategoryDropdown({ value, subcategory, onChange, groupedCategories, showAvailable = true }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Find selected category
  const allCategories = [...Object.values(groupedCategories)].flat();
  const selectedCategory = allCategories.find((c) => c.id === value);

  // Build display text
  const displayText = selectedCategory
    ? subcategory
      ? `${selectedCategory.name} › ${subcategory}`
      : selectedCategory.name
    : "";

  // Filter categories based on search term
  const filterCategories = (cats: CategoryWithBudget[]) => {
    if (!searchTerm) return cats;
    const term = searchTerm.toLowerCase();
    return cats.filter(cat => {
      // Match category name
      if (cat.name.toLowerCase().includes(term)) return true;
      // Match any subcategory
      if (cat.subcategories.some(sub => sub.toLowerCase().includes(term))) return true;
      return false;
    });
  };

  // Filter subcategories based on search term
  const filterSubcategories = (subcats: string[]) => {
    if (!searchTerm) return subcats;
    const term = searchTerm.toLowerCase();
    return subcats.filter(sub => sub.toLowerCase().includes(term));
  };

  // Check if search matches category name (to show all subcategories)
  const categoryNameMatches = (catName: string) => {
    if (!searchTerm) return true;
    return catName.toLowerCase().includes(searchTerm.toLowerCase());
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="w-full flex items-center px-2 py-1 text-sm border rounded bg-white hover:bg-gray-50 cursor-text"
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
          placeholder="Select category..."
          className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 min-w-0 text-right"
          style={{ direction: isOpen ? 'ltr' : 'rtl' }}
        />
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-80 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Uncategorized option - only show if search is empty or matches */}
          {(!searchTerm || "uncategorized".includes(searchTerm.toLowerCase())) && (
            <button
              onClick={() => {
                onChange("", null);
                setIsOpen(false);
                setSearchTerm("");
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 text-gray-500"
            >
              Uncategorized
            </button>
          )}

          {GROUP_ORDER.map((groupName) => {
            const cats = filterCategories(groupedCategories[groupName]);
            if (cats.length === 0) return null;

            return (
              <div key={groupName}>
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50 uppercase sticky top-0">
                  {groupName}
                </div>
                {cats.map((cat) => {
                  const matchesCatName = categoryNameMatches(cat.name);
                  const filteredSubs = matchesCatName ? cat.subcategories : filterSubcategories(cat.subcategories);

                  return (
                    <div key={cat.id}>
                      {/* Main category - only show if no subcategories */}
                      {cat.subcategories.length === 0 ? (
                        <button
                          onClick={() => {
                            onChange(cat.id, null);
                            setIsOpen(false);
                            setSearchTerm("");
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>{cat.name}</span>
                          </div>
                          {showAvailable && (
                            <span className={`text-xs ${cat.available >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${cat.available.toFixed(2)}
                            </span>
                          )}
                        </button>
                      ) : (
                        <>
                          {/* Category header with subcategories */}
                          <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50/50">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>{cat.name}</span>
                            {showAvailable && (
                              <span className={`ml-auto text-xs ${cat.available >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${cat.available.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {/* Subcategories */}
                          {filteredSubs.map((subcat) => (
                            <button
                              key={`${cat.id}-${subcat}`}
                              onClick={() => {
                                onChange(cat.id, subcat);
                                setIsOpen(false);
                                setSearchTerm("");
                              }}
                              className={`w-full flex items-center px-3 py-1.5 pl-8 text-sm hover:bg-blue-50 ${
                                value === cat.id && subcategory === subcat ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                              }`}
                            >
                              <span className="text-gray-400 mr-2">›</span>
                              {subcat}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filterCategories(groupedCategories.Ungrouped).length > 0 && (
            <div>
              <div className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-50 uppercase sticky top-0">
                Other
              </div>
              {filterCategories(groupedCategories.Ungrouped).map((cat) => {
                const matchesCatName = categoryNameMatches(cat.name);
                const filteredSubs = matchesCatName ? cat.subcategories : filterSubcategories(cat.subcategories);

                return (
                  <div key={cat.id}>
                    {cat.subcategories.length === 0 ? (
                      <button
                        onClick={() => {
                          onChange(cat.id, null);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span>{cat.name}</span>
                        </div>
                        {showAvailable && (
                          <span className={`text-xs ${cat.available >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${cat.available.toFixed(2)}
                          </span>
                        )}
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50/50">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span>{cat.name}</span>
                          {showAvailable && (
                            <span className={`ml-auto text-xs ${cat.available >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${cat.available.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {filteredSubs.map((subcat) => (
                          <button
                            key={`${cat.id}-${subcat}`}
                            onClick={() => {
                              onChange(cat.id, subcat);
                              setIsOpen(false);
                              setSearchTerm("");
                            }}
                            className={`w-full flex items-center px-3 py-1.5 pl-8 text-sm hover:bg-blue-50 ${
                              value === cat.id && subcategory === subcat ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                            }`}
                          >
                            <span className="text-gray-400 mr-2">›</span>
                            {subcat}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* No results message */}
          {searchTerm &&
           filterCategories(groupedCategories["Fixed Bills"]).length === 0 &&
           filterCategories(groupedCategories["Expenses"]).length === 0 &&
           filterCategories(groupedCategories.Wants).length === 0 &&
           filterCategories(groupedCategories.Income).length === 0 &&
           filterCategories(groupedCategories.Ungrouped).length === 0 &&
           !("uncategorized".includes(searchTerm.toLowerCase())) && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No categories match "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TransactionRowProps {
  transaction: Transaction;
  groupedCategories: Record<GroupName | "Ungrouped", CategoryWithBudget[]>;
  splits: TransactionSplit[];
  categories: Category[];
  isSelected: boolean;
  index: number;
  onToggleSelect: () => void;
  onCategoryChange: (
    transactionId: string,
    categoryId: string | null,
    subcategory: string | null,
    createRule?: boolean
  ) => void;
  onInitiateRule: (transactionId: string, categoryId: string, subcategory: string | null) => void;
  onToggleIgnore: (transactionId: string) => void;
  onMemoChange: (transactionId: string, memo: string) => void;
  onSplit: () => void;
}

function TransactionRow({
  transaction,
  groupedCategories,
  splits,
  categories,
  isSelected,
  index,
  onToggleSelect,
  onCategoryChange,
  onInitiateRule,
  onToggleIgnore,
  onMemoChange,
  onSplit,
}: TransactionRowProps) {
  const [showRuleOption, setShowRuleOption] = useState(false);
  const [showMobileCategory, setShowMobileCategory] = useState(false);
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoValue, setMemoValue] = useState(transaction.memo || "");

  const allCategories = [...Object.values(groupedCategories)].flat();
  const category = allCategories.find((c) => c.id === transaction.category_id);

  const isOutflow = transaction.amount < 0;
  const displayAmount = Math.abs(transaction.amount).toFixed(2);

  return (
    <>
      {/* Mobile Row */}
      <div
        className={`md:hidden px-4 py-3 active:bg-gray-50 ${
          transaction.ignored ? "opacity-50 bg-gray-100" : index % 2 === 1 ? "bg-gray-50" : "bg-white"
        }`}
        onClick={() => setShowMobileCategory(!showMobileCategory)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">
                {transaction.description}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{format(parseISO(transaction.date), "MMM d")}</span>
              {transaction.is_split && splits.length > 0 ? (
                <span className="flex items-center gap-1 text-purple-600">
                  <Split className="w-3 h-3" />
                  Split ({splits.length})
                </span>
              ) : category ? (
                <span className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}{transaction.subcategory ? ` › ${transaction.subcategory}` : ''}
                </span>
              ) : (
                <span className="text-yellow-600">Uncategorized</span>
              )}
            </div>
          </div>
          <div className="text-right">
            {isOutflow ? (
              <span className="text-sm font-medium text-red-600">-${displayAmount}</span>
            ) : transaction.amount > 0 ? (
              <span className="text-sm font-medium text-green-600">+${displayAmount}</span>
            ) : null}
          </div>
        </div>

        {/* Mobile Category Selector (expandable) */}
        {showMobileCategory && (
          <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
            <CategoryDropdown
              value={transaction.category_id || ""}
              subcategory={transaction.subcategory}
              onChange={(id, subcat) => {
                if (id !== transaction.category_id || subcat !== transaction.subcategory) {
                  setShowRuleOption(true);
                  onCategoryChange(transaction.id, id || null, subcat, false);
                }
              }}
              groupedCategories={groupedCategories}
            />
            {showRuleOption && transaction.category_id && (
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => {
                    onInitiateRule(transaction.id, transaction.category_id!, transaction.subcategory);
                    setShowRuleOption(false);
                  }}
                  className="w-full text-left text-sm px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-blue-500" />
                  Always categorize similar as "{category?.name}{transaction.subcategory ? ` › ${transaction.subcategory}` : ''}"
                </button>
                <button
                  onClick={() => setShowRuleOption(false)}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-500"
                >
                  Just this once
                </button>
              </div>
            )}
            {/* Split Details (if split) */}
            {transaction.is_split && splits.length > 0 && (
              <div className="mt-2 space-y-1 bg-purple-50 rounded-lg p-2">
                <div className="text-xs font-medium text-purple-700 mb-1">Split into {splits.length} categories:</div>
                {splits.map((split) => {
                  const splitCat = categories.find((c) => c.id === split.category_id);
                  return (
                    <div key={split.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: splitCat?.color || "#888" }}
                        />
                        <span>{splitCat?.name || "Unknown"}</span>
                      </div>
                      <span className="text-purple-600">${Math.abs(split.amount).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSplit();
                }}
                className="flex-1 px-3 py-2 text-sm border rounded-lg hover:bg-purple-50 flex items-center justify-center gap-1"
              >
                <Split className="w-4 h-4" />
                {transaction.is_split ? "Edit Split" : "Split"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleIgnore(transaction.id);
                }}
                className="flex-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                {transaction.ignored ? "Unignore" : "Ignore"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Row */}
      <div
        className={`hidden md:grid grid-cols-12 gap-2 px-4 py-3 hover:bg-blue-50 items-center ${
          transaction.ignored ? "opacity-50 bg-gray-100" : index % 2 === 1 ? "bg-gray-50" : "bg-white"
        }`}
      >
        {/* Checkbox & Flag */}
        <div className="col-span-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-gray-300"
          />
          <button
            onClick={() => onToggleIgnore(transaction.id)}
            className="p-1 rounded hover:bg-gray-200"
            title={transaction.ignored ? "Unignore" : "Ignore"}
          >
            {transaction.ignored ? (
              <Eye className="w-3 h-3 text-gray-400" />
            ) : (
              <EyeOff className="w-3 h-3 text-gray-400" />
            )}
          </button>
        </div>

        {/* Date */}
        <div className="col-span-1 text-sm text-gray-600">
          {format(parseISO(transaction.date), "MM/dd/yyyy")}
        </div>

        {/* Payee */}
        <div className="col-span-3 text-sm font-medium text-gray-900 truncate">
          {transaction.description}
        </div>

        {/* Category */}
        <div className="col-span-3 relative">
          {transaction.is_split && splits.length > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onSplit}
                className="flex-1 flex items-center gap-2 px-2 py-1 text-sm bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 text-left"
                title="Edit split"
              >
                <Split className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <div className="flex-1 truncate">
                  <span className="text-purple-700 font-medium">Split</span>
                  <span className="text-purple-500 ml-1">
                    ({splits.map((s) => {
                      const cat = categories.find((c) => c.id === s.category_id);
                      return cat?.name || "?";
                    }).join(", ")})
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="flex-1">
                <CategoryDropdown
                  value={transaction.category_id || ""}
                  subcategory={transaction.subcategory}
                  onChange={(id, subcat) => {
                    if (id !== transaction.category_id || subcat !== transaction.subcategory) {
                      setShowRuleOption(true);
                      onCategoryChange(transaction.id, id || null, subcat, false);
                    }
                  }}
                  groupedCategories={groupedCategories}
                />
              </div>
              <button
                onClick={onSplit}
                className="p-1.5 hover:bg-purple-100 rounded text-purple-500"
                title="Split transaction"
              >
                <Split className="w-4 h-4" />
              </button>
            </div>
          )}
          {showRuleOption && transaction.category_id && !transaction.is_split && (
            <div className="absolute z-30 mt-1 w-64 bg-white border rounded-lg shadow-lg p-2">
              <button
                onClick={() => {
                  onInitiateRule(transaction.id, transaction.category_id!, transaction.subcategory);
                  setShowRuleOption(false);
                }}
                className="w-full text-left text-sm px-2 py-1 hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-blue-500" />
                Always categorize similar as "{category?.name}{transaction.subcategory ? ` › ${transaction.subcategory}` : ''}"
              </button>
              <button
                onClick={() => setShowRuleOption(false)}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-50 rounded text-gray-500"
              >
                Just this once
              </button>
            </div>
          )}
        </div>

        {/* Memo (editable) */}
        <div className="col-span-2">
          {editingMemo ? (
            <input
              type="text"
              value={memoValue}
              onChange={(e) => setMemoValue(e.target.value)}
              onBlur={() => {
                onMemoChange(transaction.id, memoValue);
                setEditingMemo(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onMemoChange(transaction.id, memoValue);
                  setEditingMemo(false);
                } else if (e.key === "Escape") {
                  setMemoValue(transaction.memo || "");
                  setEditingMemo(false);
                }
              }}
              className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              placeholder="Add memo..."
            />
          ) : (
            <button
              onClick={() => setEditingMemo(true)}
              className="w-full px-2 py-1 text-sm text-left hover:bg-blue-50 rounded cursor-text truncate"
            >
              {transaction.memo ? (
                <span className="text-gray-700">{transaction.memo}</span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </button>
          )}
        </div>

        {/* Outflow */}
        <div className="col-span-1 text-right">
          {isOutflow && (
            <span className="text-sm text-red-600">${displayAmount}</span>
          )}
        </div>

        {/* Inflow */}
        <div className="col-span-1 text-right">
          {!isOutflow && transaction.amount > 0 && (
            <span className="text-sm text-green-600">${displayAmount}</span>
          )}
        </div>
      </div>
    </>
  );
}
