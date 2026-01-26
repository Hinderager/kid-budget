export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      budget_transactions: {
        Row: {
          id: string;
          transaction_id: string;
          date: string;
          description: string;
          amount: number;
          category_id: string | null;
          subcategory: string | null;
          ignored: boolean;
          memo: string | null;
          is_split: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          date: string;
          description: string;
          amount: number;
          category_id?: string | null;
          subcategory?: string | null;
          ignored?: boolean;
          memo?: string | null;
          is_split?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          date?: string;
          description?: string;
          amount?: number;
          category_id?: string | null;
          subcategory?: string | null;
          ignored?: boolean;
          memo?: string | null;
          is_split?: boolean;
          created_at?: string;
        };
      };
      budget_transaction_splits: {
        Row: {
          id: string;
          transaction_id: string;
          category_id: string;
          amount: number;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          category_id: string;
          amount: number;
          memo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          category_id?: string;
          amount?: number;
          memo?: string | null;
          created_at?: string;
        };
      };
      budget_categories: {
        Row: {
          id: string;
          name: string;
          subcategories: string[];
          color: string;
          icon: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          subcategories?: string[];
          color: string;
          icon?: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          subcategories?: string[];
          color?: string;
          icon?: string;
          sort_order?: number;
        };
      };
      budget_category_rules: {
        Row: {
          id: string;
          match_pattern: string;
          category_id: string;
          subcategory: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_pattern: string;
          category_id: string;
          subcategory?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_pattern?: string;
          category_id?: string;
          subcategory?: string | null;
          created_at?: string;
        };
      };
      budget_import_history: {
        Row: {
          id: string;
          filename: string;
          file_hash: string;
          transactions_imported: number;
          duplicates_skipped: number;
          imported_at: string;
        };
        Insert: {
          id?: string;
          filename: string;
          file_hash: string;
          transactions_imported: number;
          duplicates_skipped: number;
          imported_at?: string;
        };
        Update: {
          id?: string;
          filename?: string;
          file_hash?: string;
          transactions_imported?: number;
          duplicates_skipped?: number;
          imported_at?: string;
        };
      };
      budget_monthly_budgets: {
        Row: {
          id: string;
          month: string;
          category_id: string;
          subcategory: string | null;
          budget_amount: number;
        };
        Insert: {
          id?: string;
          month: string;
          category_id: string;
          subcategory?: string | null;
          budget_amount: number;
        };
        Update: {
          id?: string;
          month?: string;
          category_id?: string;
          subcategory?: string | null;
          budget_amount?: number;
        };
      };
      budget_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
        };
      };
      budget_category_groups: {
        Row: {
          id: string;
          category_id: string;
          group_name: "Fixed Bills" | "Expenses" | "Wants";
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          group_name: "Fixed Bills" | "Expenses" | "Wants";
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          group_name?: "Fixed Bills" | "Expenses" | "Wants";
          created_at?: string;
        };
      };
    };
  };
}

// Helper types
export type Transaction = Database["public"]["Tables"]["budget_transactions"]["Row"];
export type Category = Database["public"]["Tables"]["budget_categories"]["Row"];
export type CategoryRule = Database["public"]["Tables"]["budget_category_rules"]["Row"];
export type ImportHistory = Database["public"]["Tables"]["budget_import_history"]["Row"];
export type MonthlyBudget = Database["public"]["Tables"]["budget_monthly_budgets"]["Row"];
export type Setting = Database["public"]["Tables"]["budget_settings"]["Row"];
export type CategoryGroupAssignment = Database["public"]["Tables"]["budget_category_groups"]["Row"];
export type TransactionSplit = Database["public"]["Tables"]["budget_transaction_splits"]["Row"];

// Extended types with relations
export type TransactionWithCategory = Transaction & {
  category: Category | null;
};

export type CategoryWithBudget = Category & {
  budget_amount: number;
  spent: number;
  remaining: number;
  percentage: number;
};
