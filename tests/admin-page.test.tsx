// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPage } from "@/components/AdminPage";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("AdminPage authentication interface", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lets Erick set a first password, then opens the monitoring panel", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/admin/auth/session") {
          return jsonResponse({
            authenticated: false,
            setupRequired: true,
            setupEnabled: true,
          });
        }
        if (url === "/api/admin/auth/setup") {
          expect(init?.method).toBe("POST");
          expect(JSON.parse(String(init?.body))).toEqual({
            setupToken: "one-time-setup-token",
            password: "this-is-a-strong-password",
            confirmation: "this-is-a-strong-password",
          });
          return jsonResponse({ authenticated: true, username: "Erick" });
        }
        if (url === "/api/admin/invites") {
          return jsonResponse({ invites: [], gifts: [] });
        }
        if (url === "/api/admin/settings") {
          return jsonResponse({ coupleName: "Kelvia & Erick" });
        }
        throw new Error(`Unexpected URL: ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);
    expect(await screen.findByRole("heading", { name: "Configurar administrador" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Código de configuração"), {
      target: { value: "one-time-setup-token" },
    });
    fireEvent.change(screen.getByLabelText(/Crie uma senha/), {
      target: { value: "this-is-a-strong-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirme a senha"), {
      target: { value: "this-is-a-strong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar administrador" }));

    expect(
      await screen.findByRole("heading", { name: "Acompanhamento de presença" }),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/auth/setup",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not allow first setup without the one-time setup token being enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/admin/auth/session") {
          return jsonResponse({
            authenticated: false,
            setupRequired: true,
            setupEnabled: false,
          });
        }
        throw new Error(`Unexpected URL: ${String(input)}`);
      }),
    );

    render(<AdminPage />);

    expect(await screen.findByText(/Configure ADMIN_SETUP_TOKEN/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Criar administrador" }).hasAttribute("disabled"),
    ).toBe(true);
    await waitFor(() => {
      expect(screen.getByLabelText("Código de configuração")).toBeTruthy();
    });
  });
});
