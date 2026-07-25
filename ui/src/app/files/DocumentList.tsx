'use client';

import { FileText, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  deleteDocumentApiV1KnowledgeBaseDocumentsDocumentUuidDelete,
  listDocumentsApiV1KnowledgeBaseDocumentsGet,
} from '@/client/sdk.gen';
import type { DocumentResponseSchema } from '@/client/types.gen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizationTimezone } from '@/hooks/useOrganizationTimezone';
import { formatDateTime } from '@/lib/dateTime';
import logger from '@/lib/logger';

interface DocumentListProps {
  refreshTrigger: number;
}

export default function DocumentList({ refreshTrigger }: DocumentListProps) {
  const organizationTimezone = useOrganizationTimezone();
  const [documents, setDocuments] = useState<DocumentResponseSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await listDocumentsApiV1KnowledgeBaseDocumentsGet({
        query: {
          limit: 100,
          offset: 0,
        },
      });

      if (response.error || !response.data) {
        throw new Error('Failed to fetch documents');
      }

      setDocuments(response.data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      logger.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch documents on mount and when refreshTrigger changes
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshTrigger]);

  // Poll for documents that are processing
  useEffect(() => {
    const processingDocs = documents.filter(
      (doc) => doc.processing_status === 'processing' || doc.processing_status === 'pending'
    );

    if (processingDocs.length === 0) return;

    const pollInterval = setInterval(() => {
      logger.info(`Polling for ${processingDocs.length} processing documents...`);
      fetchDocuments();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [documents, fetchDocuments]);

  const handleDelete = async (documentUuid: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      const response = await deleteDocumentApiV1KnowledgeBaseDocumentsDocumentUuidDelete({
        path: {
          document_uuid: documentUuid,
        },
      });

      if (response.error) {
        throw new Error('Failed to delete document');
      }

      toast.success(`Deleted "${filename}"`);
      fetchDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
      logger.error('Error deleting document:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'processing':
        return (
          <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse">
            Processing
          </Badge>
        );
      case 'pending':
        return <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40 text-muted-foreground">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && documents.length === 0) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search and Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-lg border-border bg-background text-xs"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg border-border bg-background"
          onClick={fetchDocuments}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="flex items-center justify-center w-full py-12">
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm w-full border border-border bg-card rounded-xl shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-xs font-bold text-foreground tracking-tight mb-2 uppercase">No documents found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {searchQuery ? 'No documents match your search criteria.' : 'No documents uploaded yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.document_uuid}
              className="flex items-center justify-between p-4 border border-border bg-card hover:bg-card/90 transition-all rounded-xl shadow-xs group"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-sm text-foreground truncate">{doc.filename}</span>
                    {getStatusBadge(doc.processing_status)}
                    {doc.retrieval_mode === 'full_document' ? (
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40">Full Document</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40">Chunked</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/60 flex-wrap">
                    <span>{formatFileSize(doc.file_size_bytes)}</span>
                    {doc.processing_status === 'completed' && doc.retrieval_mode !== 'full_document' && (
                      <span>{doc.total_chunks} chunks</span>
                    )}
                    <span>{formatDateTime(doc.created_at, organizationTimezone)}</span>
                  </div>
                  {doc.processing_error && (
                    <p className="text-xs text-destructive mt-1">
                      Error: {doc.processing_error}
                    </p>
                  )}
                  {doc.docling_metadata &&
                   typeof doc.docling_metadata === 'object' &&
                   'duplicate_of' in doc.docling_metadata && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Duplicate of another document
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(doc.document_uuid, doc.filename)}
                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
