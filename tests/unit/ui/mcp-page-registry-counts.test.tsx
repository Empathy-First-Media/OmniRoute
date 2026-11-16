// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const translate = (key: string, values?: Record<string, string | number>) => {
      if (key === "mcpIntro") {
        return `Model Context Protocol — ${values?.tools} tools across ${values?.scopes} scopes, ${values?.transports} transports`;
      }
      return key;
    };
    Object.assign(translate, { rich: (key: string) => key });
    return translate;
  },
}));
vi.mock("@/shared/components", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/shared/utils/clipboard", () => ({ copyToClipboard: vi.fn() }));
vi.mock("../../../src/app/(dashboard)/dashboard/endpoint/components/MCPDashboard", () => ({
  default: () => <div />,
}));

const { default: McpPage } = await import("../../../src/app/(dashboard)/dashboard/mcp/page");
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("MCP dashboard registry summary", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings")
          return jsonResponse({ mcpEnabled: false, mcpTransport: "stdio" });
        if (url === "/api/mcp/status") return jsonResponse({ online: false });
        if (url === "/api/mcp/tools") {
          return jsonResponse({
            total: 2,
            mappedTotal: 2,
            tools: [
              { name: "read_one", scopes: ["read:one"] },
              { name: "read_two", scopes: ["read:two", "read:one"] },
            ],
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      })
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("shows tool and distinct scope counts from the management registry", async () => {
    await act(async () => {
      root.render(<McpPage />);
    });
    expect(container.textContent).toContain(
      "Model Context Protocol — 2 tools across 2 scopes, 3 transports"
    );
    expect(container.textContent).not.toContain("37 tools");
    expect(container.textContent).not.toContain("13 scopes");
  });

  it("does not claim counts when registry metadata cannot be loaded", async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/mcp/tools") return new Response(null, { status: 503 });
      if (url === "/api/settings")
        return jsonResponse({ mcpEnabled: false, mcpTransport: "stdio" });
      if (url === "/api/mcp/status") return jsonResponse({ online: false });
      throw new Error(`Unexpected request: ${url}`);
    });
    await act(async () => {
      root.render(<McpPage />);
    });
    expect(container.textContent).toContain(
      "Model Context Protocol — N/A tools across N/A scopes, 3 transports"
    );
    expect(container.textContent).not.toContain("37 tools");
    expect(container.textContent).not.toContain("13 scopes");
  });
  it("does not claim counts when registry tools metadata is malformed", async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/mcp/tools") return jsonResponse({ tools: "not-an-array" });
      if (url === "/api/settings")
        return jsonResponse({ mcpEnabled: false, mcpTransport: "stdio" });
      if (url === "/api/mcp/status") return jsonResponse({ online: false });
      throw new Error(`Unexpected request: ${url}`);
    });
    await act(async () => {
      root.render(<McpPage />);
    });
    expect(container.textContent).toContain(
      "Model Context Protocol — N/A tools across N/A scopes, 3 transports"
    );
    expect(container.textContent).not.toContain("37 tools");
    expect(container.textContent).not.toContain("13 scopes");
  });
});
