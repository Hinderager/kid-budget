"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Upload, FileText, Check, AlertCircle, X } from "lucide-react";
import Papa from "papaparse";

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  transaction_id: string;
}

interface ImportResult {
  filename: string;
  total: number;
  imported: number;
  duplicates: number;
  errors: string[];
}

export function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Map<string, ParsedTransaction[]>>(
    new Map()
  );
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    date: string;
    description: string;
    amount: string;
  }>({ date: "", description: "", amount: "" });
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "text/csv" || file.name.endsWith(".csv")
    );

    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        processFiles(selectedFiles);
      }
    },
    []
  );

  function processFiles(newFiles: File[]) {
    setFiles((prev) => [...prev, ...newFiles]);
    setResults([]);

    newFiles.forEach((file) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const headers = result.meta.fields || [];
          setDetectedColumns(headers);

          // Auto-detect column mappings
          const dateCol = headers.find((h) =>
            /date|posted|trans/i.test(h)
          );
          const descCol = headers.find((h) =>
            /desc|memo|payee|merchant|name/i.test(h)
          );
          const amountCol = headers.find((h) =>
            /amount|debit|credit|sum/i.test(h)
          );

          if (dateCol && descCol && amountCol) {
            setColumnMapping({
              date: dateCol,
              description: descCol,
              amount: amountCol,
            });
          }

          // Parse preview data
          const parsed = parseTransactions(
            result.data as Record<string, string>[],
            {
              date: dateCol || "",
              description: descCol || "",
              amount: amountCol || "",
            }
          );

          setPreviews((prev) => new Map(prev).set(file.name, parsed));
        },
      });
    });
  }

  function parseTransactions(
    data: Record<string, string>[],
    mapping: { date: string; description: string; amount: string }
  ): ParsedTransaction[] {
    return data
      .map((row, index) => {
        const dateStr = row[mapping.date];
        const description = row[mapping.description];
        const amountStr = row[mapping.amount];

        if (!dateStr || !description || !amountStr) return null;

        // Parse date (try multiple formats)
        let date: Date;
        try {
          date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            // Try MM/DD/YYYY format
            const parts = dateStr.split(/[\/\-]/);
            if (parts.length === 3) {
              date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
            }
          }
        } catch {
          return null;
        }

        // Parse amount (remove currency symbols, handle negatives)
        const amount = parseFloat(
          amountStr.replace(/[$,]/g, "").replace(/\(([^)]+)\)/, "-$1")
        );

        if (isNaN(amount)) return null;

        // Generate transaction ID for deduplication
        const transaction_id = `${date.toISOString().split("T")[0]}_${description.substring(0, 30)}_${amount.toFixed(2)}`;

        return {
          date: date.toISOString().split("T")[0],
          description: description.trim(),
          amount,
          transaction_id,
        };
      })
      .filter((t): t is ParsedTransaction => t !== null);
  }

  // Patterns to auto-ignore on import
  const IGNORE_PATTERNS = [
    /AMAZON/i,  // Bank Amazon transactions (we itemize separately)
    /mobile payment/i,
    /mobile banking payment/i,
    /mobile banking transfer/i,
    /monthly maintenance fee/i,
  ];

  function shouldAutoIgnore(description: string): boolean {
    return IGNORE_PATTERNS.some(pattern => pattern.test(description));
  }

  async function handleImport() {
    setImporting(true);
    const importResults: ImportResult[] = [];

    for (const file of files) {
      const transactions = previews.get(file.name) || [];
      let imported = 0;
      let duplicates = 0;
      const errors: string[] = [];

      for (const t of transactions) {
        try {
          const autoIgnore = shouldAutoIgnore(t.description);
          const { error } = await supabase
            .from("budget_transactions")
            .upsert(
              {
                transaction_id: t.transaction_id,
                date: t.date,
                description: t.description,
                amount: t.amount,
                ignored: autoIgnore,
              },
              { onConflict: "transaction_id", ignoreDuplicates: true }
            );

          if (error) {
            if (error.code === "23505") {
              // Duplicate key
              duplicates++;
            } else {
              errors.push(`${t.description}: ${error.message}`);
            }
          } else {
            imported++;
          }
        } catch (err) {
          errors.push(`${t.description}: Unknown error`);
        }
      }

      // Record import history
      await supabase.from("budget_import_history").insert({
        filename: file.name,
        file_hash: `${file.name}_${file.size}_${file.lastModified}`,
        transactions_imported: imported,
        duplicates_skipped: duplicates,
      });

      importResults.push({
        filename: file.name,
        total: transactions.length,
        imported,
        duplicates,
        errors,
      });
    }

    setResults(importResults);
    setImporting(false);
  }

  function removeFile(filename: string) {
    setFiles((prev) => prev.filter((f) => f.name !== filename));
    setPreviews((prev) => {
      const newPreviews = new Map(prev);
      newPreviews.delete(filename);
      return newPreviews;
    });
  }

  const totalTransactions = Array.from(previews.values()).reduce(
    (sum, p) => sum + p.length,
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Import Transactions</h1>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`drop-zone cursor-pointer ${isDragging ? "drag-over" : ""}`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700">
          Drop CSV files here or click to browse
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Supports bank statements and credit card exports
        </p>
      </div>

      {/* Column Mapping */}
      {detectedColumns.length > 0 && files.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Column Mapping
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Column
              </label>
              <select
                value={columnMapping.date}
                onChange={(e) =>
                  setColumnMapping((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select...</option>
                {detectedColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description Column
              </label>
              <select
                value={columnMapping.description}
                onChange={(e) =>
                  setColumnMapping((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select...</option>
                {detectedColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Column
              </label>
              <select
                value={columnMapping.amount}
                onChange={(e) =>
                  setColumnMapping((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select...</option>
                {detectedColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Files to Import
          </h2>
          <div className="space-y-3">
            {files.map((file) => {
              const preview = previews.get(file.name);
              return (
                <div
                  key={file.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {file.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {preview?.length || 0} transactions detected
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Total: {totalTransactions} transactions
            </div>
            <button
              onClick={handleImport}
              disabled={importing || totalTransactions === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import All
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Import Results
          </h2>
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.filename}
                className="p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="font-medium">{result.filename}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Imported:</span>{" "}
                    <span className="text-green-600 font-medium">
                      {result.imported}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duplicates skipped:</span>{" "}
                    <span className="text-yellow-600 font-medium">
                      {result.duplicates}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Errors:</span>{" "}
                    <span className="text-red-600 font-medium">
                      {result.errors.length}
                    </span>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {err}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
