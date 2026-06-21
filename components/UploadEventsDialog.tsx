import { Suspense } from "Suspense";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";

// Assuming these props or equivalent states are available in your parent component
interface EventsUploadDialogProps {
  eventsUploadDialogOpen: boolean;
  setEventsUploadDialogOpen: (open: boolean) => void;
  isProcessing: boolean;
  uploadSuccess: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  containerVariants: any; // Your custom framer-motion variants
}

export default function EventsUploadDialog({
  eventsUploadDialogOpen,
  setEventsUploadDialogOpen,
  isProcessing,
  uploadSuccess,
  onFileSelect,
  containerVariants
}: EventsUploadDialogProps) {
  return (
    <AnimatePresence>
      {eventsUploadDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/80 backdrop-blur-xl"
            onClick={() => !isProcessing && setEventsUploadDialogOpen(false)} 
          />

          {/* Modal Content Wrapper */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] z-10 p-8 sm:p-10"
          > 
            {/* Close Button */}
            <button 
              onClick={() => setEventsUploadDialogOpen(false)}
              disabled={isProcessing}
              className="absolute top-6 right-6 p-3 hover:bg-gray-100 rounded-2xl transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Header Content */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Import Events Spreadsheet</h2>
              <p className="text-gray-500 text-sm mt-1">
                Upload your schedules or event listings to populate the dashboard.
              </p>
            </div>

            {/* Suspense Wraps the Interactive Upload Area */}
            <Suspense fallback={<div className="py-12 text-center text-sm text-gray-500">Loading upload engine...</div>}>
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-[2rem] bg-gray-50/50 transition-colors">
                
                {/* Status Animated Icon Wrapper */}
                <div className="rounded-2xl bg-white shadow-sm p-4 mb-4 border border-gray-100">
                  {isProcessing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
                  ) : uploadSuccess ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : (
                    <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                  )}
                </div>

                {/* Status Text */}
                <div className="text-center mb-6 px-4">
                  <p className="text-base font-semibold text-gray-900">
                    {isProcessing ? "Processing Data..." : uploadSuccess ? "Upload Complete!" : "Click to select file"}
                  </p>
                </div>

                {/* Hidden Native Input */}
                <input
                  type="file"
                  id="modal-sheet-upload"
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={onFileSelect}
                  disabled={isProcessing}
                />
                
                {/* Action Trigger Button */}
                {!uploadSuccess && (
                  <button 
                    disabled={isProcessing} 
                    className="bg-gray-950 text-white font-medium text-sm px-6 py-3 rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <label htmlFor="modal-sheet-upload" className="cursor-pointer block w-full h-full">
                      {isProcessing ? "Wait a moment..." : "Choose File"}
                    </label>
                  </button>
                )}
              </div>

              {/* Bottom Success Message */}
              {uploadSuccess && (
                <p className="text-center text-sm text-green-600 font-medium animate-pulse mt-4">
                  Events updated successfully.
                </p>
              )}
            </Suspense>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}