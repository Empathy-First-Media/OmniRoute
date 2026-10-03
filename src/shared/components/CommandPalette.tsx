"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  SIDEBAR_SECTIONS,
  HIDDEN_SIDEBAR_ITEMS_SETTING_KEY,
  SIDEBAR_PRESET_KEY,
  ESSENTIALS_ADVANCED_TOOL_IDS,
  normalizeHiddenSidebarItems,
  resolveRuntimeSidebarSections,
  type HideableSidebarItemId,
  type SidebarItemDefinition,
  type SidebarSectionChild,
} from "@/shared/constants/sidebarVisibility";

function isSidebarGroup(
  child: SidebarSectionChild
): child is Extract<SidebarSectionChild, { type: "group" }> {
  return "type" in child && child.type === "group";
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  if (!isOpen) return null;
  return <CommandPaletteDialog onClose={onClose} />;
}

interface PaletteItem {
  id: string;
  href: string;
  icon: string;
  label: string;
  subtitle?: string;
  external: boolean;
  sectionId: string;
  sectionLabel: string;
  subgroupId?: string;
  subgroupLabel?: string;
}

/**
 * cmdk owns: fuzzy filtering (better than the old substring match), arrow-key
 * navigation, Enter selection, combobox/listbox ARIA, scroll-into-view, and
 * hover selection. This wrapper keeps the OmniRoute shell (overlay, footer
 * hints), the sidebar-item resolution, and i18n.
 */
function CommandPaletteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations("sidebar");
  const [query, setQuery] = useState("");
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [radarAdminUrl, setRadarAdminUrl] = useState<unknown>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/settings", { signal: ctrl.signal })
      .then((res) => res.json())
      .then((data) => {
        setHiddenItems(
          new Set(normalizeHiddenSidebarItems(data?.[HIDDEN_SIDEBAR_ITEMS_SETTING_KEY]))
        );
        setActivePreset(
          typeof data?.[SIDEBAR_PRESET_KEY] === "string" ? data[SIDEBAR_PRESET_KEY] : null
        );
        setRadarAdminUrl(data?.radarAdminUrl ?? null);
      })
      .catch(() => {
        // ignore aborts and fetch failures; palette still works with empty hidden set
      });
    return () => ctrl.abort();
  }, []);

  const safeTranslate = useCallback(
    (key: string, fallback: string) => {
      try {
        if (typeof t.has === "function" && !t.has(key)) return fallback;
        return t(key);
      } catch {
        return fallback;
      }
    },
    [t]
  );

  const allItems = useMemo<PaletteItem[]>(
    () =>
      resolveRuntimeSidebarSections(SIDEBAR_SECTIONS, { radarAdminUrl }).flatMap((section) => {
        const sectionLabel = safeTranslate(section.titleKey, section.titleFallback);
        return section.children.flatMap<PaletteItem>((child) => {
          if (isSidebarGroup(child)) {
            const subgroupLabel = safeTranslate(child.titleKey, child.titleFallback);
            return child.items
              .filter((item) => {
                if (!hiddenItems.has(item.id)) return true;
                return (
                  activePreset === "essentials" &&
                  ESSENTIALS_ADVANCED_TOOL_IDS.has(item.id as HideableSidebarItemId)
                );
              })
              .map<PaletteItem>((item) => ({
                id: item.id,
                href: item.href,
                icon: item.icon,
                label: safeTranslate(item.i18nKey, item.labelFallback ?? item.id),
                subtitle: item.subtitleKey
                  ? safeTranslate(item.subtitleKey, item.subtitleFallback ?? "")
                  : item.subtitleFallback,
                external: item.external ?? false,
                sectionId: section.id,
                sectionLabel,
                subgroupId: child.id,
                subgroupLabel,
              }));
          }
          const item = child as SidebarItemDefinition;
          if (hiddenItems.has(item.id)) {
            const keepForEssentials =
              activePreset === "essentials" &&
              ESSENTIALS_ADVANCED_TOOL_IDS.has(item.id as HideableSidebarItemId);
            if (!keepForEssentials) return [];
          }
          return [
            {
              id: item.id,
              href: item.href,
              icon: item.icon,
              label: safeTranslate(item.i18nKey, item.labelFallback ?? item.id),
              subtitle: item.subtitleKey
                ? safeTranslate(item.subtitleKey, item.subtitleFallback ?? "")
                : item.subtitleFallback,
              external: item.external ?? false,
              sectionId: section.id,
              sectionLabel,
            },
          ];
        });
      }),
    [hiddenItems, radarAdminUrl, safeTranslate, activePreset]
  );

  const handleNavigate = useCallback(
    (href: string, external: boolean) => {
      onClose();
      if (external) {
        window.open(href, "_blank", "noopener,noreferrer");
      } else {
        router.push(href);
      }
    },
    [onClose, router]
  );

  // One cmdk Group per (section, subgroup) — cmdk auto-hides a group when all
  // its items are filtered out, which keeps subgroup headings from going
  // stale the way a flat render would.
  const groups = useMemo(() => {
    const seen = new Map<string, { heading: string; items: PaletteItem[] }>();
    for (const item of allItems) {
      const key = `${item.sectionId}::${item.subgroupId ?? "_root"}`;
      const heading = item.subgroupLabel
        ? `${item.sectionLabel} · ${item.subgroupLabel}`
        : item.sectionLabel;
      const existing = seen.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        seen.set(key, { heading, items: [item] });
      }
    }
    return [...seen.entries()];
  }, [allItems]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <Command
        label={t("commandPalette.title")}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        className="relative w-full max-w-3xl bg-surface border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-black/5 dark:border-white/5">
          <span className="material-symbols-outlined text-[20px] text-text-muted shrink-0">
            search
          </span>
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-base"
            placeholder={t("commandPalette.searchPlaceholder")}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              className="text-text-muted hover:text-text transition-colors"
              onClick={() => setQuery("")}
              tabIndex={-1}
              aria-label={t("commandPalette.clearSearch")}
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 text-text-muted border border-black/10 dark:border-white/10 shrink-0">
            Esc
          </kbd>
        </div>

        <Command.List className="py-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <Command.Empty>
            <div className="py-10 text-center text-text-muted text-sm">{t("noResults")}</div>
          </Command.Empty>
          {groups.map(([key, group]) => (
            <Command.Group
              key={key}
              heading={group.heading}
              className="[&_[cmdk-group-heading]]:sticky [&_[cmdk-group-heading]]:top-0 [&_[cmdk-group-heading]]:z-10 [&_[cmdk-group-heading]]:bg-surface/95 [&_[cmdk-group-heading]]:backdrop-blur-sm [&_[cmdk-group-heading]]:px-6 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:border-b [&_[cmdk-group-heading]]:border-black/5 [&_[cmdk-group-heading]]:dark:border-white/5"
            >
              {group.items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  keywords={[
                    item.label,
                    item.subtitle ?? "",
                    item.sectionLabel,
                    item.subgroupLabel ?? "",
                  ]}
                  onSelect={() => handleNavigate(item.href, item.external)}
                  className="w-full flex items-center gap-3 px-6 py-2.5 text-left transition-colors cursor-pointer text-text data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent data-[selected=true]:ring-1 data-[selected=true]:ring-inset data-[selected=true]:ring-accent/20"
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0 text-text-muted">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    {item.subtitle && (
                      <p className="text-xs truncate text-text-muted">{item.subtitle}</p>
                    )}
                  </div>
                  {item.external && (
                    <span className="material-symbols-outlined text-[14px] text-text-muted shrink-0">
                      open_in_new
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-black/5 dark:border-white/5 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-mono">
              ↑↓
            </kbd>
            {t("commandPalette.navigate")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-mono">
              ↵
            </kbd>
            {t("commandPalette.open")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-mono">
              Esc
            </kbd>
            {t("commandPalette.close")}
          </span>
        </div>
      </Command>
    </div>
  );
}
