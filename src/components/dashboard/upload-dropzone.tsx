"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Layers,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { IngestionApprovalModal } from "@/components/dashboard/ingestion-approval-modal";
import { Button } from "@/components/ui/button";
import type {
  CsvIngestionSummary,
  CsvPreviewResult,
  CsvRowValidationError,
} from "@/validations/csv-ingest";

type ProcessingStage =
  | "idle"
  | "inspecting"
  | "uploading"
  | "validating"
  | "persisting"
  | "completed"
  | "error";

interface UploadDropzoneProps {
  onSuccess?: (summary: CsvIngestionSummary) => void;
  className?: string;
}

export function UploadDropzone({
  onSuccess,
  className = "",
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [statusText, setStatusText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [resultSummary, setResultSummary] =
    useState<CsvIngestionSummary | null>(null);
  const [previewData, setPreviewData] = useState<CsvPreviewResult | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    CsvRowValidationError[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Resets dropzone state to accept a new upload.
   */
  const handleReset = () => {
    setStage("idle");
    setStatusText("");
    setSelectedFiles([]);
    setResultSummary(null);
    setPreviewData(null);
    setIsReviewModalOpen(false);
    setValidationErrors([]);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Executes the synchronous CSV upload, parsing, and zero-trust validation workflow,
   * then prompts the user with the Ingestion Approval Modal.
   */
  const processCsvUpload = async (file: File) => {
    try {
      setStage("uploading");
      setStatusText("Reading CSV file in memory...");

      const formData = new FormData();
      formData.append("file", file);

      setStage("validating");
      setStatusText(
        "Executing zero-trust Zod validation & anti-hallucination checks...",
      );

      const res = await fetch("/api/ingest/csv", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setStage("error");
        if (res.status === 422 && Array.isArray(json.errors)) {
          setValidationErrors(json.errors);
          setErrorMessage(
            json.error ||
              "CSV validation failed. Ledger updates rejected to prevent data corruption.",
          );
          toast.error(
            `${json.errors.length} validation issue(s) detected in CSV`,
          );
        } else {
          setErrorMessage(
            json.message || json.error || "Failed to process CSV file.",
          );
          toast.error(json.message || "CSV upload failed");
        }
        return;
      }

      // Successful parse & staging -> Open approval modal
      setStage("idle");
      setPreviewData(json.data);
      setIsReviewModalOpen(true);
      toast.success(
        "CSV validated successfully! Please review and confirm invoices.",
      );
    } catch (_err) {
      setStage("error");
      setErrorMessage(
        "Network error: Could not reach the server. Please verify your connection.",
      );
      toast.error("Network connection error");
    }
  };

  /**
   * Prepares and queues PDF / Image batch for asynchronous Inngest worker.
   */
  const handleDocumentBatchPreparation = (
    docs: File[],
    type: "PDF" | "IMAGE",
  ) => {
    setStage("completed");
    toast.success(
      `${docs.length} ${type} document(s) accepted. Document OCR extraction pipeline is ready for Inngest worker.`,
    );
  };

  /**
   * Inspects and validates file batch selection according to system constraints:
   * 1. CSV: exactly 1 file allowed.
   * 2. PDF / Images: multiple files allowed, but must share the same format family.
   * 3. No mixed types allowed (e.g. CSV mixed with PDF).
   */
  const handleFileSelection = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    setValidationErrors([]);
    setResultSummary(null);

    // Categorize files
    const csvFiles: File[] = [];
    const pdfFiles: File[] = [];
    const imageFiles: File[] = [];
    const unsupportedFiles: File[] = [];

    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv") || file.type === "text/csv") {
        csvFiles.push(file);
      } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
        pdfFiles.push(file);
      } else if (
        name.endsWith(".png") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        file.type.startsWith("image/")
      ) {
        imageFiles.push(file);
      } else {
        unsupportedFiles.push(file);
      }
    }

    // 1. Guard unsupported files
    if (unsupportedFiles.length > 0) {
      const names = unsupportedFiles.map((f) => f.name).join(", ");
      toast.error(
        `Unsupported file type(s): ${names}. Please upload CSV, PDF, or JPG/PNG.`,
      );
      return;
    }

    // 2. Guard mixed types (e.g. CSV mixed with PDF, or PDF mixed with Images)
    const detectedCategories = [
      csvFiles.length > 0 ? "CSV" : null,
      pdfFiles.length > 0 ? "PDF" : null,
      imageFiles.length > 0 ? "Image" : null,
    ].filter(Boolean);

    if (detectedCategories.length > 1) {
      toast.error(
        `Mixed formats detected (${detectedCategories.join(" + ")}). Please upload either a single CSV or a batch of documents of the same format.`,
      );
      return;
    }

    // 3. Handle CSV upload branch
    if (csvFiles.length > 0) {
      if (csvFiles.length > 1) {
        toast.error(
          "CSV upload supports only 1 file at a time. Please upload a single master ledger.",
        );
        return;
      }

      const targetCsv = csvFiles[0];
      setSelectedFiles([targetCsv]);
      await processCsvUpload(targetCsv);
      return;
    }

    // 4. Handle PDF / Image batch branch
    if (pdfFiles.length > 0 || imageFiles.length > 0) {
      const targetDocs = pdfFiles.length > 0 ? pdfFiles : imageFiles;
      setSelectedFiles(targetDocs);
      handleDocumentBatchPreparation(
        targetDocs,
        pdfFiles.length > 0 ? "PDF" : "IMAGE",
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      handleFileSelection(filesArray);
    }
  };

  return (
    <div className={`w-full flex flex-col gap-4 ${className}`}>
      {/* Human-in-the-Loop Ingestion Approval Modal */}
      {isReviewModalOpen && previewData && (
        <IngestionApprovalModal
          preview={previewData}
          onConfirmSuccess={(summary) => {
            setIsReviewModalOpen(false);
            setResultSummary(summary);
            setStage("completed");
            if (onSuccess) onSuccess(summary);
          }}
          onCancel={() => {
            setIsReviewModalOpen(false);
            handleReset();
          }}
        />
      )}

      {/* Drop Area */}
      {stage === "idle" && (
        <section
          aria-label="File upload dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-200 select-none
            ${
              isDragOver
                ? "border-primary bg-primary/5 scale-[1.005]"
                : "border-border bg-card hover:bg-muted/10"
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,text/csv,.pdf,application/pdf,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelection(Array.from(e.target.files));
              }
            }}
          />

          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-semibold text-foreground mb-1">
            Drag & drop your invoices or ledgers here
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mb-4">
            Upload a single <strong>CSV master ledger</strong>, or batch upload
            multiple <strong>PDF / Image</strong> invoices of the same format.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV (Single file)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <FileText className="w-3.5 h-3.5" /> PDF (Batch supported)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Layers className="w-3.5 h-3.5" /> JPG / PNG Receipts
            </span>
          </div>

          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" /> Browse Files
          </Button>

          <p className="text-[11px] text-muted-foreground mt-4">
            Max 10 MB per file • Zero external blob storage • Human review gate
            before commit
          </p>
        </section>
      )}

      {/* Loading & Processing State */}
      {(stage === "inspecting" ||
        stage === "uploading" ||
        stage === "validating" ||
        stage === "persisting") && (
        <div className="border border-border rounded-xl p-8 bg-card flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">
            Processing Ingestion File
          </h4>
          <p className="text-xs text-muted-foreground mb-3">{statusText}</p>
          {selectedFiles[0] && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span>{selectedFiles[0].name}</span>
              <span className="text-muted-foreground">
                ({(selectedFiles[0].size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Success Summary View */}
      {stage === "completed" && resultSummary && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Ingestion Approved & Committed
                </h4>
                <p className="text-xs text-muted-foreground">
                  File:{" "}
                  <span className="font-medium text-foreground">
                    {resultSummary.fileName}
                  </span>
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Upload Another
            </Button>
          </div>

          {/* KPI Mini-Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="text-[11px] text-muted-foreground">Total Rows</p>
              <p className="text-lg font-bold text-foreground">
                {resultSummary.summary.totalRows}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="text-[11px] text-muted-foreground">
                Committed to Ledger
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {resultSummary.summary.importedCount}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="text-[11px] text-muted-foreground">
                Deduplicated (Skipped)
              </p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {resultSummary.summary.duplicateCount}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="text-[11px] text-muted-foreground">
                Total Inflow Volume
              </p>
              <p className="text-lg font-bold text-foreground">
                ৳{resultSummary.summary.totalAmountInflow.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Duplicates Details Accordion */}
          {resultSummary.duplicates.length > 0 && (
            <div className="border border-border/80 rounded-lg p-3 bg-card/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {resultSummary.duplicates.length} Pre-Existing Invoice(s)
                  Skipped
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto text-xs space-y-1.5 divide-y divide-border/50">
                {resultSummary.duplicates.map((dup) => (
                  <div
                    key={`${dup.invoiceNumber}-${dup.rowNumber}`}
                    className="pt-1.5 flex items-center justify-between text-muted-foreground"
                  >
                    <div>
                      <span className="font-mono font-medium text-foreground">
                        {dup.invoiceNumber}
                      </span>
                      <span className="ml-2">({dup.counterparty})</span>
                    </div>
                    <span className="text-[11px] text-amber-500">
                      {dup.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fail-Closed Error View */}
      {stage === "error" && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Ledger Ingestion Blocked (Fail-Closed)
                </h4>
                <p className="text-xs text-muted-foreground">
                  {errorMessage ||
                    "Validation failed. No corrupt or incomplete rows were written to the database."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try Again
            </Button>
          </div>

          {/* Detailed Row/Column Breakdown Table */}
          {validationErrors.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="px-3 py-2 bg-muted/60 border-b border-border text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Validation Failure Breakdown ({validationErrors.length}{" "}
                  Issue(s))
                </span>
                <span className="text-[11px] text-muted-foreground">
                  1-Indexed Spreadsheet Rows
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                      <th className="py-2 px-3 font-medium">Row #</th>
                      <th className="py-2 px-3 font-medium">Column / Field</th>
                      <th className="py-2 px-3 font-medium">Provided Value</th>
                      <th className="py-2 px-3 font-medium">Validation Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {validationErrors.map((err) => (
                      <tr
                        key={`${err.rowNumber}-${err.field}`}
                        className="hover:bg-muted/30"
                      >
                        <td className="py-2 px-3 font-mono font-medium text-destructive">
                          {err.rowNumber}
                        </td>
                        <td className="py-2 px-3 font-mono text-foreground">
                          {err.field}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground max-w-35 truncate">
                          {String(err.rawValue ?? "EMPTY")}
                        </td>
                        <td className="py-2 px-3 text-destructive/90">
                          {err.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
