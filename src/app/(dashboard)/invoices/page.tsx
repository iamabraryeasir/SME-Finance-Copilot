"use client";

import { ChevronUp, UploadCloud } from "lucide-react";
import { Suspense, useState } from "react";
import { InvoiceLedgerTable } from "@/components/dashboard/invoice-ledger-table";
import { UploadDropzone } from "@/components/dashboard/upload-dropzone";
import { Button } from "@/components/ui/button";

export default function InvoicesPage() {
  const [showDropzone, setShowDropzone] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Invoices & Accounts Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage verified Accounts Receivable (AR) and Accounts Payable (AP)
            records in PostgreSQL.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setShowDropzone((prev) => !prev)}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs"
        >
          {showDropzone ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide Ingestion Box</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload CSV / Invoices</span>
            </>
          )}
        </Button>
      </div>

      {/* Ingestion Dropzone (Collapsible Drawer/Section) */}
      {showDropzone && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/2 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-primary-text" />
              <h3 className="text-sm font-semibold text-foreground">
                Ingest New Master Ledger
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowDropzone(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <UploadDropzone onSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Persistent Database Ledger Table */}
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse border border-border rounded-xl bg-card">
            Loading ledger...
          </div>
        }
      >
        <InvoiceLedgerTable refreshTrigger={refreshTrigger} />
      </Suspense>
    </div>
  );
}
