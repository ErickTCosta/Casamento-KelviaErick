// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuestPage } from "@/components/GuestPage";

const pendingInvite = {
  id: "invite-1",
  label: "Convite de teste",
  message: null,
  confirmed: false,
  people: [
    { id: "person-1", name: "Convidada Principal", status: "PENDING" },
    { id: "person-2", name: "Acompanhante", status: "PENDING" },
  ],
};

const confirmedInvite = {
  ...pendingInvite,
  confirmed: true,
  message: "Obrigado pelo convite!",
  people: [
    { id: "person-1", name: "Convidada Principal", status: "GO" },
    { id: "person-2", name: "Acompanhante", status: "NO" },
  ],
};

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

describe("GuestPage RSVP interface", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows invitees and RSVP controls while the invite is pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/invites/invite-1") return jsonResponse(pendingInvite);
        if (url === "/api/invites/gifts") return jsonResponse([]);
        throw new Error(`Unexpected URL: ${url}`);
      }),
    );

    render(<GuestPage inviteId="invite-1" />);

    expect(await screen.findByText("Convidada Principal")).toBeTruthy();
    expect(screen.getByText("Acompanhante")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Vai" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Confirmar presença" })).toBeTruthy();
    expect(screen.getByLabelText(/Mensagem para os noivos/)).toBeTruthy();
  });

  it("hides invitee names, RSVP answers, and response form after confirmation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/invites/invite-1") return jsonResponse(confirmedInvite);
        if (url === "/api/invites/gifts") return jsonResponse([]);
        throw new Error(`Unexpected URL: ${url}`);
      }),
    );

    render(<GuestPage inviteId="invite-1" />);

    await screen.findByText("Obrigado por responder ao convite.");
    expect(
      screen.queryByText("Sua resposta foi registrada com sucesso."),
    ).toBeNull();
    expect(screen.queryByText("Convidada Principal")).toBeNull();
    expect(screen.queryByText("Acompanhante")).toBeNull();
    expect(screen.queryByText("Vai")).toBeNull();
    expect(screen.queryByText("Não vai")).toBeNull();
    expect(screen.queryByLabelText(/Mensagem para os noivos/)).toBeNull();
    expect(screen.getByText("Obrigado pelo convite!")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar presença" })).toBeNull();
    expect(screen.queryByText("Lista de presentes")).toBeNull();
    expect(screen.queryByText("Obrigado por confirmar! Nossa lista de presentes está disponível abaixo.")).toBeNull();
    expect(screen.queryByText("CONTRIBUIÇÃO")).toBeNull();
    expect(screen.getByText("R$ 250,00, R$ 300,00")).toBeTruthy();
    expect(screen.getByText("OU MAIS")).toBeTruthy();
  });

  it("submits all invitee choices and switches to the confirmation-only view", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/invites/invite-1") return jsonResponse(pendingInvite);
        if (url === "/api/invites/invite-1/response") {
          expect(init?.method).toBe("POST");
          const submitted = JSON.parse(String(init?.body));
          expect(submitted.people).toEqual([
            { id: "person-1", status: "GO" },
            { id: "person-2", status: "GO" },
          ]);
          return jsonResponse(confirmedInvite);
        }
        if (url === "/api/invites/gifts") return jsonResponse([]);
        throw new Error(`Unexpected URL: ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<GuestPage inviteId="invite-1" />);
    await screen.findByText("Convidada Principal");
    fireEvent.click(screen.getAllByRole("button", { name: "Vai" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Vai" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar presença" }));

    await waitFor(() => {
      expect(screen.getByText("Obrigado por responder ao convite.")).toBeTruthy();
    });
    expect(
      screen.queryByText("Sua resposta foi registrada com sucesso."),
    ).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/invites/invite-1/response",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.queryByText("Convidada Principal")).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirmar presença" })).toBeNull();
  });
});
