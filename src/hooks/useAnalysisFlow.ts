'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messageFromError, requestAnalysis, type AnalyzeInput } from '@/lib/client/api';
import { compressImage } from '@/lib/client/files';
import type { Analysis } from '@/types';

export type FlowState =
  | { status: 'idle'; notice?: string }
  | { status: 'loading' }
  | { status: 'success'; analysis: Analysis }
  | { status: 'error'; message: string };

export interface AnalysisFlow {
  state: FlowState;
  run: (input: AnalyzeInput) => Promise<void>;
  cancel: () => void;
}

/**
 * Runs one analysis at a time. Starting a new one aborts the one in flight, and the
 * request is also aborted if the person cancels or leaves the page.
 */
export function useAnalysisFlow(): AnalysisFlow {
  const [state, setState] = useState<FlowState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(async (input: AnalyzeInput): Promise<void> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading' });
    try {
      const file = input.file ? await compressImage(input.file) : undefined;
      const analysis = await requestAnalysis({ ...input, file }, controller.signal);
      if (!controller.signal.aborted) setState({ status: 'success', analysis });
    } catch (error) {
      if (!controller.signal.aborted)
        setState({ status: 'error', message: messageFromError(error) });
    }
  }, []);

  const cancel = useCallback((): void => {
    controllerRef.current?.abort();
    setState({ status: 'idle', notice: 'Cancelled. You can try again when you are ready.' });
  }, []);

  return { state, run, cancel };
}
