import { useRef, useCallback } from 'react';

export function useFormNav(fieldIds: string[]): {
  focusField: (id: string) => void;
  nextField: (currentId: string) => void;
  prevField: (currentId: string) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
} {
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    refs.current[id] = el;
  }, []);

  const focusField = useCallback((id: string) => {
    const el = refs.current[id] ?? document.getElementById(id);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.select();
      }
    }
  }, []);

  const nextField = useCallback(
    (currentId: string) => {
      const idx = fieldIds.indexOf(currentId);
      if (idx === -1) return;
      const nextId = fieldIds[idx + 1];
      if (nextId) {
        const el = refs.current[nextId] ?? document.getElementById(nextId);
        if (el) {
          el.focus();
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.select();
          }
        }
      }
    },
    [fieldIds]
  );

  const prevField = useCallback(
    (currentId: string) => {
      const idx = fieldIds.indexOf(currentId);
      if (idx <= 0) return;
      const prevId = fieldIds[idx - 1];
      if (prevId) {
        const el = refs.current[prevId] ?? document.getElementById(prevId);
        if (el) {
          el.focus();
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.select();
          }
        }
      }
    },
    [fieldIds]
  );

  return { focusField, nextField, prevField, registerRef };
}
