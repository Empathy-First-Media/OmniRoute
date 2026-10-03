import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../server.ts";
import {
  SESSION_SNAPSHOT_RESOURCE_URI,
  SESSION_SNAPSHOT_RESOURCE_NAME,
} from "../tools/appResources.ts";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../audit.ts", () => ({
  logToolCall: vi.fn().mockResolvedValue(undefined),
}));

describe("MCP App views (SEP-1865)", () => {
  let client: Client;

  beforeEach(async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionStart: "2026-01-01T00:00:00Z",
        duration: "5m",
        requestCount: 42,
        totalCost: 1.2345,
        tokenCount: { prompt: 1000, completion: 500 },
        byModel: [{ model: "gpt-x", requests: 30 }],
        byProvider: [{ name: "openai", requests: 42 }],
        errorCount: 1,
        fallbackCount: 0,
      }),
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    await server.connect(serverTransport);
    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
  });

  it("advertises the session-snapshot ui:// resource", async () => {
    const { resources } = await client.listResources();
    const res = resources.find((r) => r.uri === SESSION_SNAPSHOT_RESOURCE_URI);
    expect(res).toBeDefined();
    expect(res!.name).toBe(SESSION_SNAPSHOT_RESOURCE_NAME);
    expect(res!.mimeType).toBe("text/html;profile=mcp-app");
    const meta = res!._meta as Record<string, { prefersBorder?: boolean }> | undefined;
    expect(meta?.ui?.prefersBorder).toBe(true);
  });

  it("serves self-contained view HTML via resources/read", async () => {
    const { contents } = await client.readResource({ uri: SESSION_SNAPSHOT_RESOURCE_URI });
    expect(contents).toHaveLength(1);
    expect(contents[0].mimeType).toBe("text/html;profile=mcp-app");
    const html = (contents[0] as { text?: string }).text ?? "";
    expect(html).toContain("ui/initialize");
    expect(html).toContain("ui/notifications/tool-result");
    expect(html).toContain("structuredContent");
    // No external network: the view must not fetch or import remote assets.
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("links the tool to the view via _meta.ui.resourceUri (nested + flat)", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "omniroute_get_session_snapshot");
    expect(tool).toBeDefined();
    const meta = tool!._meta as Record<string, unknown>;
    expect((meta.ui as { resourceUri: string }).resourceUri).toBe(SESSION_SNAPSHOT_RESOURCE_URI);
    expect(meta["ui/resourceUri"]).toBe(SESSION_SNAPSHOT_RESOURCE_URI);
  });

  it("returns structuredContent for the view to consume", async () => {
    const result = await client.callTool({
      name: "omniroute_get_session_snapshot",
      arguments: {},
    });
    const sc = (result as { structuredContent?: Record<string, unknown> }).structuredContent;
    expect(sc).toBeDefined();
    expect(sc!.requestCount).toBe(42);
    expect(sc!.costTotal).toBe(1.2345);
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(JSON.parse(text).requestCount).toBe(42);
  });
});
