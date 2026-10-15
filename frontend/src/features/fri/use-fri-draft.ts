"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { defaults, type FriFormValues } from "./schema";
import { FRI_DRAFT_KEY, readDraft, serializeDraft } from "./draft";

type DraftForm = Pick<
  UseFormReturn<FriFormValues>,
  "reset" | "subscribe" | "getValues"
>;
export function useFriDraft({
  enabled,
  reset,
  subscribe,
  getValues,
}: DraftForm & { enabled: boolean }) {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(!enabled);
  const [restored, setRestored] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const currentStep = useRef(0);
  const submitted = useRef(false);

  const save = useCallback((values: Partial<FriFormValues>) => {
    if (submitted.current) return;
    try {
      localStorage.setItem(
        FRI_DRAFT_KEY,
        serializeDraft(values, currentStep.current),
      );
    } catch {
      // El formulario sigue funcionando si el navegador bloquea el almacenamiento.
      queueMicrotask(() => setStorageError(true));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const draft = readDraft(localStorage.getItem(FRI_DRAFT_KEY));
        if (draft) {
          reset({ ...defaults, ...draft.values }, { keepDefaultValues: true });
          currentStep.current = draft.step;
          setStep(draft.step);
          setRestored(true);
        }
      } catch {
        setStorageError(true);
      }
      unsubscribe = subscribe({
        formState: { values: true },
        callback: ({ values }) => save(values),
      });
      setReady(true);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [enabled, reset, subscribe, save]);

  useEffect(() => {
    if (!enabled || !ready) return;
    currentStep.current = step;
    save(getValues());
  }, [enabled, ready, step, getValues, save]);

  const clearDraft = useCallback(() => {
    submitted.current = true;
    try {
      localStorage.removeItem(FRI_DRAFT_KEY);
    } catch {
      /* No interrumpir un envío exitoso. */
    }
  }, []);

  const startOver = useCallback(() => {
    reset(defaults);
    currentStep.current = 0;
    setStep(0);
    setRestored(false);
    setStorageError(false);
    save(getValues());
  }, [reset, save, getValues]);

  return {
    step,
    setStep,
    ready,
    restored,
    storageError,
    clearDraft,
    startOver,
  };
}
