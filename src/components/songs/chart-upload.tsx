"use client";

import { useState, useRef, useCallback } from "react";
import { useGenerateUploadUrl, useStorageUrl, useDeleteFile } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";

type ChartUploadProps = {
  currentFileId?: string;
  onUpload: (fileId: string) => void;
  onRemove: () => void;
};

export function ChartUpload({ currentFileId, onUpload, onRemove }: ChartUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useGenerateUploadUrl();
  const deleteFile = useDeleteFile();
  const fileUrl = useStorageUrl(currentFileId ?? null);

  const validTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ];

  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!validTypes.includes(file.type)) {
      setError("Please select a PDF or image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be less than 10MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // Delete old file if exists
      if (currentFileId) {
        try {
          await deleteFile({ storageId: currentFileId as any });
        } catch {
          // Ignore errors deleting old file
        }
      }

      onUpload(storageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [generateUploadUrl, deleteFile, currentFileId, onUpload]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  }, [uploading, processFile]);

  const handleRemove = async () => {
    if (currentFileId) {
      try {
        await deleteFile({ storageId: currentFileId as any });
      } catch {
        // Ignore errors
      }
    }
    onRemove();
  };

  if (currentFileId && fileUrl) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
        <FileText className="h-8 w-8 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Chart uploaded</p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View file
          </a>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRemove}>
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
          isDragOver
            ? "border-primary bg-primary/10"
            : "border-border bg-card/50 hover:bg-card"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : isDragOver ? (
          <>
            <Upload className="h-8 w-8 text-primary" />
            <p className="text-sm text-primary font-medium">
              Drop file here
            </p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click or drag file to upload
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG up to 10MB
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
