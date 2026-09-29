"use client";

import { useEffect, useState } from "react";
import type { GuestInvite, RSVPStatus } from "@/lib/types";

export function GuestPage({ inviteId }: { inviteId?: string }) {
  const [invite, setInvite] = useState<GuestInvite | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inviteId) {
      setLoading(false);
      return;
    }

    fetch(`/api/invites/${inviteId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data: GuestInvite) => {
        setInvite(data);
        setMessage(data.message || "");
      })
      .catch(() => setError("Convite não encontrado."))
      .finally(() => setLoading(false));
  }, [inviteId]);

  if (loading) {
    return (
      <main className="wrap">
        <Header />
        <div className="card">Carregando convite...</div>
      </main>
    );
  }

  if (error && !invite) {
    return (
      <main className="wrap">
        <Header />
        <div className="card">
          <h1 className="serif">Convite não encontrado</h1>
          <p className="status">Verifique se o link recebido está correto.</p>
        </div>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="wrap">
        <Header />
        <div className="card">
          <h1 className="serif">Bem-vindos</h1>
          <p className="status">
            Use o link individual recebido para acessar seu convite.
          </p>
        </div>
      </main>
    );
  }

  const setStatus = (personId: string, status: RSVPStatus) => {
    setInvite({
      ...invite,
      people: invite.people.map((person) =>
        person.id === personId ? { ...person, status } : person,
      ),
    });
  };

  const confirm = async () => {
    if (invite.people.some((person) => person.status === "PENDING")) {
      setError("Escolha Vai ou Não vai para todas as pessoas.");
      return;
    }

    setError("");
    try {
      const response = await fetch(`/api/invites/${invite.id}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          people: invite.people.map((person) => ({
            id: person.id,
            status: person.status,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível salvar.");
        return;
      }
      setInvite(data);
    } catch {
      setError("Não foi possível salvar sua confirmação. Tente novamente.");
    }
  };

  return (
    <main className="wrap">
      <Header />
      <section className="card">
        <h2 className="serif">{invite.label}</h2>
        <p className="status">
          {invite.confirmed
            ? "Obrigado por responder ao convite."
            : "Este convite é individual e válido somente para as pessoas listadas abaixo."}
        </p>
        <div className="deadline">
          <span className="script">
            {invite.confirmed
              ? "Obrigado por responder!"
              : "Sua confirmação é muito importante!"}
          </span>
          {invite.confirmed ? (
            <strong>Sua resposta foi registrada com sucesso.</strong>
          ) : (
            <>
              <strong>
                Confirme sua presença até 10 de outubro de 2026.
              </strong>
              <span className="status">
                Após essa data, encerraremos as confirmações para a organização
                da celebração.
              </span>
            </>
          )}
        </div>

        {!invite.confirmed &&
          invite.people.map((person) => (
            <div className="person" key={person.id}>
              <div>
                <b>{person.name}</b>
                <div className="status">
                  {person.status === "GO"
                    ? "Vai"
                    : person.status === "NO"
                      ? "Não vai"
                      : "Ainda não respondeu"}
                </div>
              </div>
              <div className="choices">
                <button
                  className={`choice ${person.status === "GO" ? "active" : ""}`}
                  onClick={() => setStatus(person.id, "GO")}
                >
                  Vai
                </button>
                <button
                  className={`choice ${person.status === "NO" ? "active" : ""}`}
                  onClick={() => setStatus(person.id, "NO")}
                >
                  Não vai
                </button>
              </div>
            </div>
          ))}

        {invite.confirmed ? (
          message && (
            <div>
              <h3 className="serif">Mensagem para os noivos</h3>
              <p>{message}</p>
            </div>
          )
        ) : (
          <>
            <label htmlFor="guest-message">
              Mensagem para os noivos{" "}
              <span className="status">(opcional)</span>
            </label>
            <textarea
              id="guest-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
            />
            {error && (
              <p role="alert" style={{ color: "var(--red)" }}>
                {error}
              </p>
            )}
            <br />
            <button className="btn" onClick={confirm}>
              Confirmar presença
            </button>
          </>
        )}
      </section>
      {invite.confirmed && (
        <section className="card">
          <Gifts />
        </section>
      )}
    </main>
  );
}

function Header() {
  return (
    <header className="hero">
      <div className="small">Com muito amor, vamos dizer o nosso SIM</div>
      <h1>Kelvia & Erick</h1>
      <p>26 de dezembro de 2026 · 18:30 · Capela São Francisco de Assis</p>
    </header>
  );
}

function Gifts() {
  const [pixKey, setPixKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar as configurações.");
        return response.json() as Promise<{ pixKey: string | null }>;
      })
      .then((settings) => setPixKey(settings.pixKey))
      .catch(() => setPixKey(null));
  }, []);

  return (
    <div className="gift-list">
      <p className="gift-intro">
        Para nós, o maior presente será compartilhar este momento especial ao
        seu lado. Caso queira nos presentear de outra forma, aceitamos seu
        carinho em forma de PIX.
      </p>
      <div className="gift-tier gift-tier-pix">
        <span>R$ 250,00, R$ 300,00</span>
        <small>OU MAIS</small>
      </div>
      <div className="pix-box">
        <strong>PIX</strong>
        <p>Use a chave PIX dos noivos para enviar seu presente.</p>
        <code>{pixKey ? `Chave PIX: ${pixKey}` : "Chave PIX ainda não cadastrada"}</code>
      </div>
    </div>
  );
}
