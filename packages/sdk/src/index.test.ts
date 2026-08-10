// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { execute, render, renderAll } from "./index";

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("TrustCaptcha SDK", () => {
  it("loads asynchronously and calls the callback once", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ siteKey: "tc_pk_test", theme: "light" }),
      )
      .mockResolvedValueOnce(
        response({
          challengeId: "C".repeat(32),
          expireAt: Date.now() + 300_000,
          success: true,
        }),
      )
      .mockResolvedValueOnce(
        response({
          challengePassed: true,
          success: true,
          token: "tc1.payload.signature",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const callback = vi.fn();
    const element = document.createElement("div");
    document.body.append(element);

    const handle = render({
      apiBaseUrl: "https://api.example.com",
      callback,
      element,
      siteKey: "tc_pk_abcdefghijklmnopqrstuvwx",
    });
    const button = element
      .querySelector(".trustcaptcha-host")
      ?.shadowRoot?.querySelector("button");
    await vi.waitFor(() => expect(button?.disabled).toBe(false));
    button?.click();
    button?.click();
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    expect(handle.getResponse()).toBe("tc1.payload.signature");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const createRequest = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(createRequest).toMatchObject({
      action: "generic",
      mode: "managed",
    });
    const completeRequest = JSON.parse(
      String(fetchMock.mock.calls[2]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(completeRequest.interaction).toMatchObject({
      inputMethod: "keyboard",
      moveEvents: 0,
      trustedEvent: false,
    });
    expect(completeRequest.interaction).not.toHaveProperty("coordinates");
    const shadow = element.querySelector(".trustcaptcha-host")?.shadowRoot;
    expect(shadow?.querySelector("svg.brand-mark")).not.toBeNull();
    expect(shadow?.querySelector(".brand-name")?.textContent).toBe(
      "TrustCaptcha",
    );
    const styles = shadow?.querySelector("style")?.textContent ?? "";
    expect(styles).toContain("button:disabled { cursor: default;");
    expect(styles).toContain(
      ':host([data-state="verifying"]) button:disabled { cursor: wait; }',
    );
  });

  it("runs an invisible challenge automatically without click telemetry", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ modes: ["invisible"] }))
      .mockResolvedValueOnce(
        response({
          challengeId: "I".repeat(32),
          expireAt: Date.now() + 300_000,
          mode: "invisible",
          success: true,
        }),
      )
      .mockResolvedValueOnce(
        response({
          challengePassed: true,
          success: true,
          token: "tc1.invisible.signature",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const callback = vi.fn();
    const element = document.createElement("div");
    document.body.append(element);

    render({
      action: "account/login",
      apiBaseUrl: "https://api.example.com",
      callback,
      element,
      mode: "invisible",
      siteKey: "tc_pk_abcdefghijklmnopqrstuvwx",
    });

    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    const completeRequest = JSON.parse(
      String(fetchMock.mock.calls[2]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(completeRequest).not.toHaveProperty("interaction");
    const createRequest = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(createRequest).toMatchObject({
      action: "account/login",
      mode: "invisible",
    });
  });

  it("returns the existing handle for duplicate renders", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ siteKey: "tc_pk_test" }))
      .mockResolvedValueOnce(
        response({
          challengeId: "C".repeat(32),
          expireAt: Date.now() + 300_000,
          success: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const element = document.createElement("div");
    document.body.append(element);
    const options = {
      apiBaseUrl: "https://api.example.com",
      callback: vi.fn(),
      element,
      siteKey: "tc_pk_abcdefghijklmnopqrstuvwx",
    };
    const first = render(options);
    const second = render(options);
    expect(second).toBe(first);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("aggregates pointer movement without transmitting raw coordinates", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ siteKey: "tc_pk_test" }))
      .mockResolvedValueOnce(
        response({
          challengeId: "C".repeat(32),
          expireAt: Date.now() + 300_000,
          success: true,
        }),
      )
      .mockResolvedValueOnce(
        response({
          challengePassed: true,
          success: true,
          token: "tc1.payload.signature",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const element = document.createElement("div");
    document.body.append(element);
    render({
      apiBaseUrl: "https://api.example.com",
      callback: vi.fn(),
      element,
      siteKey: "tc_pk_abcdefghijklmnopqrstuvwx",
    });
    const button = element
      .querySelector(".trustcaptcha-host")
      ?.shadowRoot?.querySelector("button");
    await vi.waitFor(() => expect(button?.disabled).toBe(false));

    document.dispatchEvent(pointerEvent("pointermove", 10, 10));
    document.dispatchEvent(pointerEvent("pointermove", 60, 18));
    document.dispatchEvent(pointerEvent("pointermove", 92, 54));
    button?.dispatchEvent(pointerEvent("pointerdown", 92, 54));
    button?.dispatchEvent(pointerEvent("pointerup", 92, 54));
    button?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, detail: 1 }),
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const completeRequest = JSON.parse(
      String(fetchMock.mock.calls[2]?.[1]?.body),
    ) as { interaction: Record<string, unknown> };
    expect(completeRequest.interaction).toMatchObject({
      inputMethod: "mouse",
      moveEvents: 3,
    });
    expect(
      Number(completeRequest.interaction.pointerDistancePx),
    ).toBeGreaterThan(0);
    expect(completeRequest.interaction).not.toHaveProperty("x");
    expect(completeRequest.interaction).not.toHaveProperty("y");
    expect(completeRequest.interaction).not.toHaveProperty("points");
  });

  it("supports reset and destroy lifecycle", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (url) => {
      if (String(url).includes("widget/config"))
        return response({ theme: "light" });
      return response({
        challengeId: "C".repeat(32),
        expireAt: Date.now() + 300_000,
        success: true,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const element = document.createElement("div");
    document.body.append(element);
    const handle = render({
      apiBaseUrl: "https://api.example.com",
      callback: vi.fn(),
      element,
      siteKey: "tc_pk_abcdefghijklmnopqrstuvwx",
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await handle.reset();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    handle.destroy();
    expect(element.childElementCount).toBe(0);
  });

  it("auto-renders declarative widgets and maintains a hidden form response", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ siteKey: "tc_pk_test" }))
      .mockResolvedValueOnce(
        response({
          challengeId: "D".repeat(32),
          expireAt: Date.now() + 300_000,
          success: true,
        }),
      )
      .mockResolvedValueOnce(
        response({
          challengePassed: true,
          success: true,
          token: "tc1.declarative.signature",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const form = document.createElement("form");
    form.innerHTML = `<div class="trust-captcha" data-sitekey="tc_pk_abcdefghijklmnopqrstuvwx" data-api-base="https://api.example.com" data-action="signup"></div>`;
    document.body.append(form);

    const handles = renderAll(form);
    expect(handles).toHaveLength(1);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await execute(form.querySelector<HTMLElement>(".trust-captcha")!);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const input = form.querySelector<HTMLInputElement>(
      'input[name="trustcaptcha-response"]',
    );
    expect(input?.value).toBe("tc1.declarative.signature");
    expect(new FormData(form).get("trustcaptcha-response")).toBe(
      "tc1.declarative.signature",
    );
  });
});

function pointerEvent(type: string, clientX: number, clientY: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX, clientY });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  return event;
}
