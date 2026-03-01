"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getReports, getReport, triggerResearch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { ResearchReport } from "@/lib/types";

const POLL_INTERVAL_MS = 5_000;

interface UseReportsReturn {
  reports: ResearchReport[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  trigger: (date?: string) => Promise<void>;
  triggering: boolean;
}

export function useReports(): UseReportsReturn {
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchReports = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getReports(token);
      setReports(data.reports);
      setTotal(data.total);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch reports";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll while any report is still running
  useEffect(() => {
    const hasRunning = reports.some(
      (r) => r.result?.status === "running"
    );

    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(fetchReports, POLL_INTERVAL_MS);
    } else if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [reports, fetchReports]);

  const trigger = useCallback(async (date?: string) => {
    const token = getToken();
    if (!token) return;

    setTriggering(true);
    try {
      await triggerResearch(token, date);
      await fetchReports();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to trigger research";
      setError(message);
    } finally {
      setTriggering(false);
    }
  }, [fetchReports]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, total, loading, error, refresh: fetchReports, trigger, triggering };
}

interface UseReportDetailReturn {
  report: ResearchReport | null;
  loading: boolean;
  error: string | null;
}

export function useReportDetail(id: string): UseReportDetailReturn {
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchReport = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const data = await getReport(id, token);
      setReport(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch report";
      setError(message);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchReport().finally(() => setLoading(false));
  }, [fetchReport]);

  // Poll while report is running
  useEffect(() => {
    const isRunning = report?.result?.status === "running";

    if (isRunning && !pollRef.current) {
      pollRef.current = setInterval(fetchReport, POLL_INTERVAL_MS);
    } else if (!isRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [report, fetchReport]);

  return { report, loading, error };
}
