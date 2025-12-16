import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  accept?: string;
  maxSize?: number;
}

const FileUpload = ({ 
  onFileSelect, 
  isLoading = false,
  accept = '.csv,.json,.log',
  maxSize = 10 * 1024 * 1024 // 10MB
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${maxSize / 1024 / 1024}MB limit`;
    }
    const allowedTypes = accept.split(',').map(t => t.trim().replace('.', ''));
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt && !allowedTypes.includes(fileExt)) {
      return `Invalid file type. Allowed: ${accept}`;
    }
    return null;
  }, [accept, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [validateFile, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [validateFile, onFileSelect]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div className="w-full">
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        animate={{
          borderColor: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          backgroundColor: isDragging ? 'hsl(var(--primary) / 0.05)' : 'transparent',
        }}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 transition-colors',
          'flex flex-col items-center justify-center text-center',
          isLoading && 'pointer-events-none opacity-60'
        )}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        <AnimatePresence mode="wait">
          {selectedFile ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="p-4 rounded-xl bg-cyber-green/10 border border-cyber-green/30">
                <CheckCircle2 className="w-8 h-8 text-cyber-green" />
              </div>
              <div>
                <p className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {selectedFile.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {!isLoading && (
                <button
                  onClick={(e) => { e.preventDefault(); clearFile(); }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                  Remove file
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <div className={cn(
                'p-4 rounded-xl transition-colors',
                isDragging ? 'bg-primary/20' : 'bg-primary/10'
              )}>
                <Upload className={cn(
                  'w-8 h-8 transition-colors',
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="font-medium">
                  {isDragging ? 'Drop your file here' : 'Drag & drop your traffic logs'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse · CSV, JSON, LOG files up to {maxSize / 1024 / 1024}MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm font-medium">Analyzing traffic patterns...</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-lg bg-cyber-red/10 border border-cyber-red/30 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-cyber-red shrink-0" />
            <p className="text-sm text-cyber-red">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
