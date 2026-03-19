import { useRef, useEffect, useCallback } from "react";

export interface SectionMetrics {
  sectionId: string;
  totalTimeMs: number;
  maxScrollDepth: number;
  mouseMovements: number;
  firstSeenAt: number | null;
  lastSeenAt: number | null;
  visits: number;
}

export interface ReadingSession {
  sessionId: string;
  startedAt: number;
  sections: Record<string, SectionMetrics>;
  totalMouseMovements: number;
}

function createSession(): ReadingSession {
  return {
    sessionId: crypto.randomUUID(),
    startedAt: Date.now(),
    sections: {},
    totalMouseMovements: 0,
  };
}

function initSection(sectionId: string): SectionMetrics {
  return {
    sectionId,
    totalTimeMs: 0,
    maxScrollDepth: 0,
    mouseMovements: 0,
    firstSeenAt: null,
    lastSeenAt: null,
    visits: 0,
  };
}

export function useReadingTracker(sectionIds: string[]) {
  const sessionRef = useRef<ReadingSession>(createSession());
  const activeTimersRef = useRef<Record<string, number>>({});
  const visibleSectionsRef = useRef<Set<string>>(new Set());

  const startTimer = useCallback((sectionId: string) => {
    if (activeTimersRef.current[sectionId]) return;
    activeTimersRef.current[sectionId] = Date.now();
    const section = sessionRef.current.sections[sectionId];
    if (section) {
      section.visits += 1;
      if (!section.firstSeenAt) section.firstSeenAt = Date.now();
    }
  }, []);

  const stopTimer = useCallback((sectionId: string) => {
    const start = activeTimersRef.current[sectionId];
    if (!start) return;
    const elapsed = Date.now() - start;
    delete activeTimersRef.current[sectionId];
    const section = sessionRef.current.sections[sectionId];
    if (section) {
      section.totalTimeMs += elapsed;
      section.lastSeenAt = Date.now();
    }
  }, []);

  // Set up IntersectionObserver. This hook is only ever called from ReadingView,
  // which mounts *after* all section elements are already in the DOM, so
  // querySelector will find them immediately on first run.
  useEffect(() => {
    // Initialise section records
    sectionIds.forEach((id) => {
      if (!sessionRef.current.sections[id]) {
        sessionRef.current.sections[id] = initSection(id);
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-section-id");
          if (!id) return;
          if (!sessionRef.current.sections[id]) {
            sessionRef.current.sections[id] = initSection(id);
          }
          const section = sessionRef.current.sections[id];
          if (entry.isIntersecting) {
            visibleSectionsRef.current.add(id);
            startTimer(id);
            section.maxScrollDepth = Math.max(section.maxScrollDepth, entry.intersectionRatio);
          } else {
            visibleSectionsRef.current.delete(id);
            stopTimer(id);
          }
        });
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }
    );

    sectionIds.forEach((id) => {
      const el = document.querySelector(`[data-section-id="${id}"]`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — sections are guaranteed to exist at this point

  // Mouse movement tracker
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      sessionRef.current.totalMouseMovements += 1;
      visibleSectionsRef.current.forEach((id) => {
        const el = document.querySelector(`[data-section-id="${id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top  && e.clientY <= rect.bottom
        ) {
          const section = sessionRef.current.sections[id];
          if (section) section.mouseMovements += 1;
        }
      });
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Flush timers when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) visibleSectionsRef.current.forEach(stopTimer);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [stopTimer]);

  const getSnapshot = useCallback((): ReadingSession => {
    const snap: ReadingSession = JSON.parse(JSON.stringify(sessionRef.current));
    visibleSectionsRef.current.forEach((id) => {
      const start = activeTimersRef.current[id];
      if (start && snap.sections[id]) {
        snap.sections[id].totalTimeMs += Date.now() - start;
      }
    });
    return snap;
  }, []);

  const reset = useCallback(() => {
    visibleSectionsRef.current.forEach(stopTimer);
    sessionRef.current = createSession();
    sectionIds.forEach((id) => {
      sessionRef.current.sections[id] = initSection(id);
    });
  }, [sectionIds, stopTimer]);

  return { getSnapshot, reset };
}
