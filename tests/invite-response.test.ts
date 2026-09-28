import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/invites/[id]/response/route";

const inviteId = "invite-1";
const people = [
  { id: "person-1", status: "GO" as const },
  { id: "person-2", status: "NO" as const },
];

function request(body: unknown) {
  return new Request(`http://localhost/api/invites/${inviteId}/response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("guest RSVP response", () => {
  const transaction = {
    invite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    person: {
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    transaction.invite.findUnique.mockReset();
    transaction.invite.update.mockReset();
    transaction.person.update.mockReset();
    prismaMock.$transaction.mockReset();
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
  });

  it("rejects malformed or incomplete person responses before opening a transaction", async () => {
    const malformed = await POST(request({ people: [{ id: "person-1" }] }), {
      params: Promise.resolve({ id: inviteId }),
    });
    const pending = await POST(
      request({ people: [{ id: "person-1", status: "PENDING" }] }),
      { params: Promise.resolve({ id: inviteId }) },
    );

    expect(malformed.status).toBe(400);
    expect(pending.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 when the invite does not exist", async () => {
    transaction.invite.findUnique.mockResolvedValue(null);

    const response = await POST(request({ people }), {
      params: Promise.resolve({ id: inviteId }),
    });

    expect(response.status).toBe(404);
    expect(transaction.person.update).not.toHaveBeenCalled();
  });

  it.each([
    [people.slice(0, 1), [{ id: "person-1" }, { id: "person-2" }]],
    [[...people, people[0]], [{ id: "person-1" }, { id: "person-2" }]],
    [
      [
        { id: "person-1", status: "GO" },
        { id: "someone-else", status: "NO" },
      ],
      [{ id: "person-1" }, { id: "person-2" }],
    ],
  ])(
    "rejects responses that do not match all invitees",
    async (submitted, invitePeople) => {
      transaction.invite.findUnique.mockResolvedValue({
        id: inviteId,
        people: invitePeople,
      });

      const response = await POST(request({ people: submitted }), {
        params: Promise.resolve({ id: inviteId }),
      });

      expect(response.status).toBe(400);
      expect(transaction.person.update).not.toHaveBeenCalled();
      expect(transaction.invite.update).not.toHaveBeenCalled();
    },
  );

  it("updates each person and marks the invite confirmed in one transaction", async () => {
    const confirmedInvite = {
      id: inviteId,
      label: "Família",
      confirmed: true,
      people: [
        { id: "person-1", status: "GO" },
        { id: "person-2", status: "NO" },
      ],
    };
    transaction.invite.findUnique.mockResolvedValue({
      id: inviteId,
      people: people.map(({ id }) => ({ id })),
    });
    transaction.person.update.mockResolvedValue({});
    transaction.invite.update.mockResolvedValue(confirmedInvite);

    const response = await POST(
      request({ people, message: "Nos vemos em breve!" }),
      { params: Promise.resolve({ id: inviteId }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(confirmedInvite);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(transaction.person.update).toHaveBeenCalledTimes(2);
    expect(transaction.person.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "person-1", inviteId },
        data: expect.objectContaining({
          status: "GO",
          answeredAt: expect.any(Date),
        }),
      }),
    );
    expect(transaction.invite.update).toHaveBeenCalledWith({
      where: { id: inviteId },
      data: { message: "Nos vemos em breve!", confirmed: true },
      include: { people: true },
    });
  });
});
