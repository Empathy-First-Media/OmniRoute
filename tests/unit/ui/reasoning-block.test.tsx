// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildResponseTurns } from "../../../src/mitm/inspector/conversationNormalizer.ts";
import type { InterceptedRequest } from "../../../src/mitm/inspector/types.ts";
import { MessageContent } from "../../../src/app/(dashboard)/dashboard/tools/traffic-inspector/components/chat/MessageContent.tsx";

const cleanups: Array<() => void> = [];

function makeRequest(responseBody: unknown): InterceptedRequest {
  return {
    id: "r1",
    source: "agent-bridge",
    timestamp: new Date().toISOString(),
    method: "POST",
    host: "api.openai.com",
    path: "/v1/responses",
    requestHeaders: {},
    requestBody: null,
    requestSize: 0,
    responseHeaders: {},
    responseBody: typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody),
    responseSize: 0,
    status: 200,
    detectedKind: "llm",
  };
}

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = "";
});

describe("reasoning blocks", () => {
  it("emits reasoning blocks for Responses reasoning summaries, not text", () => {
    const turns = buildResponseTurns(
      makeRequest({
        output: [
          {
            type: "reasoning",
            summary: [{ type: "summary_text", text: "I decided X because Y." }],
          },
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "Answer." }],
          },
        ],
      })
    );
    const blocks = turns.flatMap((t) => t.blocks);
    expect(blocks).toContainEqual({ type: "reasoning", text: "I decided X because Y." });
    expect(blocks).toContainEqual({ type: "text", text: "Answer." });
    expect(blocks.filter((b) => b.type === "text")).toHaveLength(1);
  });

  it("emits reasoning blocks for Anthropic thinking parts (previously dropped)", () => {
    const turns = buildResponseTurns(
      makeRequest({
        content: [
          { type: "thinking", thinking: "chain of thought here" },
          { type: "text", text: "Visible answer." },
        ],
      })
    );
    const blocks = turns.flatMap((t) => t.blocks);
    expect(blocks).toContainEqual({ type: "reasoning", text: "chain of thought here" });
  });

  it("renders reasoning blocks through the Reasoning element", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    cleanups.push(() => container.remove());
    const root = createRoot(container);
    cleanups.push(() => act(() => root.unmount()));

    act(() =>
      root.render(
        <MessageContent
          blocks={[
            { type: "reasoning", text: "deep thoughts" },
            { type: "text", text: "the answer" },
          ]}
        />
      )
    );
    await act(async () => {
      await Promise.resolve();
    });

    // Reasoning renders as a collapsed disclosure labelled "Reasoning".
    expect(container.textContent).toContain("Reasoning");
    expect(container.querySelector("button")).not.toBeNull();
    expect(container.textContent).toContain("the answer");
  });
});
