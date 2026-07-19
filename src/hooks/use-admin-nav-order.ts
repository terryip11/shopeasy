'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyAdminNavOrder,
  type AdminNavSection,
} from '@/lib/admin/nav-config';

const STORAGE_KEY = 'shopeasy.admin-nav-order.v1';

export type AdminNavOrderState = {
  sectionIds: string[];
  itemHrefs: Record<string, string[]>;
};

function readStored(): AdminNavOrderState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminNavOrderState;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      sectionIds: Array.isArray(parsed.sectionIds) ? parsed.sectionIds : [],
      itemHrefs: parsed.itemHrefs && typeof parsed.itemHrefs === 'object' ? parsed.itemHrefs : {},
    };
  } catch {
    return null;
  }
}

function writeStored(state: AdminNavOrderState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function snapshotFromSections(sections: AdminNavSection[]): AdminNavOrderState {
  return {
    sectionIds: sections.map((s) => s.id),
    itemHrefs: Object.fromEntries(sections.map((s) => [s.id, s.items.map((i) => i.href)])),
  };
}

function swap<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (next < 0 || next >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

export function useAdminNavOrder(defaultSections: AdminNavSection[]) {
  const [stored, setStored] = useState<AdminNavOrderState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setStored(readStored());
    setHydrated(true);
  }, []);

  const sections = applyAdminNavOrder(defaultSections, stored);

  const persist = useCallback((nextSections: AdminNavSection[]) => {
    const next = snapshotFromSections(nextSections);
    setStored(next);
    writeStored(next);
  }, []);

  const moveItem = useCallback(
    (sectionId: string, href: string, direction: -1 | 1) => {
      const next = sections.map((section) => {
        if (section.id !== sectionId) return section;
        const index = section.items.findIndex((i) => i.href === href);
        if (index < 0) return section;
        return { ...section, items: swap(section.items, index, direction) };
      });
      persist(next);
    },
    [sections, persist]
  );

  const moveSection = useCallback(
    (sectionId: string, direction: -1 | 1) => {
      const index = sections.findIndex((s) => s.id === sectionId);
      if (index < 0) return;
      persist(swap(sections, index, direction));
    },
    [sections, persist]
  );

  const resetOrder = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStored(null);
  }, []);

  return {
    sections,
    hydrated,
    editing,
    setEditing,
    moveItem,
    moveSection,
    resetOrder,
    hasCustomOrder: stored != null,
  };
}
