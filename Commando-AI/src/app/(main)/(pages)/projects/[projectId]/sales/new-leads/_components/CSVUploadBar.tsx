"use client";

import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function CSVUploadBar({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<any>(null);
  const router = useRouter();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/leads/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload CSV");
      }

      setUploadStats({
        processed: data.stats?.processed || 0,
        newLeads: data.stats?.newLeads || 0,
        updated: data.stats?.updated || 0,
      });

      toast.success(
        `CSV processed successfully! ${data.stats?.newLeads || 0} new leads added, ${data.stats?.updated || 0} updated.`
      );

      router.refresh();
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload CSV");
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="bg-[#0a0a0a] border border-gray-800 h-full overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Upload className="h-4 w-4 text-purple-400" />
            Upload Sales Data
          </CardTitle>
          <p className="text-gray-400 text-sm mt-1">Import leads from a CSV file</p>
        </CardHeader>
        <CardContent className="p-6 h-full flex flex-col">
          <div className="space-y-3 flex-1">
            <AnimatePresence>
              {uploadStats && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-400">{uploadStats.processed}</span>
                    <span className="text-xs text-gray-400">processed</span>
                  </div>
                  {uploadStats.newLeads > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-xs text-gray-300 ml-6"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="font-semibold">+{uploadStats.newLeads}</span>
                      <span>new leads</span>
                    </motion.div>
                  )}
                  {uploadStats.updated > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center gap-2 text-xs text-gray-300 ml-6"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span className="font-semibold">{uploadStats.updated}</span>
                      <span>updated</span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="mt-auto pt-4">
            <label htmlFor="leads-csv-upload" className="w-full block">
              <Button
                asChild
                variant="outline"
                className="cursor-pointer w-full h-10 px-4 text-sm font-medium bg-[#0a0a0a] border-gray-700 text-white hover:bg-gray-900 hover:border-purple-500/50 transition-all"
                disabled={isUploading}
              >
                <span>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      Choose CSV File
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="leads-csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

