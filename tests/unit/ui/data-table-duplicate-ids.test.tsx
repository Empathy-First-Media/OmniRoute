// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataTableRow } from "../../../src/shared/components/DataTable";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const { default: DataTable } = await import("../../../src/shared/components/DataTable");

const columns = [{ key: "name", label: "Name" }];

describe("DataTable row ids", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders rows whose explicit ids collide with index fallbacks", () => {
    // id:0 used to collide with the String(index) fallback of an id-less row.
    const rows: DataTableRow[] = [
      { id: 0, name: "zero" },
      { name: "no-id" },
      { id: "", name: "empty" },
    ];
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <DataTable columns={columns} data={rows} renderCell={(row) => String(row.name)} />
      );
    });
    const texts = Array.from(container.querySelectorAll("td")).map((td) => td.textContent);
    expect(texts).toContain("zero");
    expect(texts).toContain("no-id");
    expect(texts).toContain("empty");
    const keyWarnings = err.mock.calls.filter((c) => String(c[0]).includes("same key"));
    expect(keyWarnings).toHaveLength(0);
    act(() => root.unmount());
  });
});
