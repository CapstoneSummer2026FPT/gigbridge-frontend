import { useState, useCallback, useRef } from 'react';
import { reportContractGetAPI } from '../../../api/reportContractAPI/GET';
import { reportContractPostAPI } from '../../../api/reportContractAPI/POST';
import type {
  ReportContract,
  ReportContractListItem,
} from '../../../types/models/ReportContract';
import type { ApiResponse } from '../../../types/common';

interface UseReportContractReturn {
  reports: ReportContractListItem[];
  isLoading: boolean;
  error: string | null;
  loadReports: (contractId: string) => Promise<void>;
  selectedReport: ReportContract | null;
  isLoadingDetail: boolean;
  isCreatingReport: boolean;
  isRespondingReport: boolean;
  isConfirmingReport: boolean;
  createReport: (
    contractId: string,
    input: {
      issueType: number;
      description: string;
      desiredResolution: string;
      milestoneId?: string | null;
      attachments?: File[];
    },
  ) => Promise<ApiResponse<ReportContract>>;
  loadReportDetail: (contractId: string, reportId: string) => Promise<ApiResponse<ReportContract>>;
  respondToReport: (
    contractId: string,
    reportId: string,
    input: {
      resolutionAction: number;
      explanation?: string | null;
      proposedResolution?: string | null;
      rejectReason?: string | null;
      attachments?: File[];
    },
  ) => Promise<ApiResponse<ReportContract>>;
  confirmResolution: (
    contractId: string,
    reportId: string,
    isAccepted: boolean,
  ) => Promise<ApiResponse<ReportContract>>;
  clearError: () => void;
  clearSelectedReport: () => void;
}

export function useReportContract(): UseReportContractReturn {
  const [reports, setReports] = useState<ReportContractListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportContract | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [isRespondingReport, setIsRespondingReport] = useState(false);
  const [isConfirmingReport, setIsConfirmingReport] = useState(false);
  const currentRequestId = useRef(0);

  const loadReports = useCallback(async (contractId: string) => {
    const requestId = ++currentRequestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await reportContractGetAPI.getContractReports(contractId);
      if (requestId !== currentRequestId.current) return;

      if (response.success) {
        setReports(response.data ?? []);
      } else {
        setError(response.message || 'Failed to load reports.');
      }
    } catch {
      if (requestId === currentRequestId.current) {
        setError('Failed to load reports.');
      }
    } finally {
      if (requestId === currentRequestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadReportDetail = useCallback(async (
    contractId: string,
    reportId: string,
  ): Promise<ApiResponse<ReportContract>> => {
    setIsLoadingDetail(true);
    setError(null);

    try {
      const response = await reportContractGetAPI.getReportById(contractId, reportId);
      if (response.success && response.data) {
        setSelectedReport(response.data);
      } else {
        setError(response.message || 'Failed to load report details.');
      }
      return response as ApiResponse<ReportContract>;
    } catch {
      const message = 'Failed to load report details.';
      setError(message);
      return { success: false, statusCode: 500, message, data: undefined };
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const createReport = useCallback(
    async (
      contractId: string,
      input: {
        issueType: number;
        description: string;
        desiredResolution: string;
        milestoneId?: string | null;
        attachments?: File[];
      },
    ): Promise<ApiResponse<ReportContract>> => {
      setIsCreatingReport(true);
      setError(null);

      try {
        const response = await reportContractPostAPI.createReport(contractId, input);
        if (response.success && response.data) {
          // Refresh the list after creation
          await loadReports(contractId);
        }
        return response as ApiResponse<ReportContract>;
      } catch (err) {
        const message = 'Failed to create report.';
        setError(message);
        return { success: false, statusCode: 500, message, data: undefined };
      } finally {
        setIsCreatingReport(false);
      }
    },
    [loadReports],
  );

  const respondToReport = useCallback(
    async (
      contractId: string,
      reportId: string,
      input: {
        resolutionAction: number;
        explanation?: string | null;
        proposedResolution?: string | null;
        rejectReason?: string | null;
        attachments?: File[];
      },
    ): Promise<ApiResponse<ReportContract>> => {
      setIsRespondingReport(true);
      setError(null);

      try {
        const response = await reportContractPostAPI.respondToReport(contractId, reportId, input);
        if (response.success && response.data) {
          setSelectedReport(response.data);
          await loadReports(contractId);
        }
        return response as ApiResponse<ReportContract>;
      } catch (err) {
        const message = 'Failed to respond to report.';
        setError(message);
        return { success: false, statusCode: 500, message, data: undefined };
      } finally {
        setIsRespondingReport(false);
      }
    },
    [loadReports],
  );

  const confirmResolution = useCallback(
    async (
      contractId: string,
      reportId: string,
      isAccepted: boolean,
    ): Promise<ApiResponse<ReportContract>> => {
      setIsConfirmingReport(true);
      setError(null);

      try {
        const response = await reportContractPostAPI.confirmResolution(contractId, reportId, {
          isAccepted,
        });
        if (response.success && response.data) {
          setSelectedReport(response.data);
          await loadReports(contractId);
        }
        return response as ApiResponse<ReportContract>;
      } catch (err) {
        const message = 'Failed to confirm resolution.';
        setError(message);
        return { success: false, statusCode: 500, message, data: undefined };
      } finally {
        setIsConfirmingReport(false);
      }
    },
    [loadReports],
  );

  const clearError = useCallback(() => setError(null), []);

  const clearSelectedReport = useCallback(() => setSelectedReport(null), []);

  return {
    reports,
    isLoading,
    error,
    loadReports,
    selectedReport,
    isLoadingDetail,
    isCreatingReport,
    isRespondingReport,
    isConfirmingReport,
    createReport,
    loadReportDetail,
    respondToReport,
    confirmResolution,
    clearError,
    clearSelectedReport,
  };
}
