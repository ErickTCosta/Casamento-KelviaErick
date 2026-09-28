CREATE TYPE "RSVPStatus" AS ENUM ('PENDING', 'GO', 'NO');

CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "coupleName" TEXT NOT NULL DEFAULT 'Kelvia & Erick',
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Setting_id_check" CHECK ("id" = 1)
);

CREATE TABLE "Invite" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "message" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Person" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RSVPStatus" NOT NULL DEFAULT 'PENDING',
    "answeredAt" TIMESTAMPTZ(3),
    "inviteId" UUID NOT NULL,
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Gift" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Person_inviteId_idx" ON "Person"("inviteId");

ALTER TABLE "Person"
    ADD CONSTRAINT "Person_inviteId_fkey"
    FOREIGN KEY ("inviteId") REFERENCES "Invite"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Gift" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "Setting", "Invite", "Person", "Gift"
    FROM anon, authenticated;
GRANT ALL ON TABLE "Setting", "Invite", "Person", "Gift" TO service_role;

CREATE FUNCTION public.create_invite_with_people(p_label TEXT, p_names TEXT[])
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    new_invite_id UUID;
BEGIN
    IF NULLIF(TRIM(p_label), '') IS NULL
       OR p_names IS NULL
       OR CARDINALITY(p_names) = 0
       OR EXISTS (
           SELECT 1 FROM UNNEST(p_names) AS names(name)
           WHERE NULLIF(TRIM(name), '') IS NULL
       )
    THEN
        RAISE EXCEPTION 'Informe o rótulo e os nomes do convite.';
    END IF;

    INSERT INTO public."Invite" (label)
    VALUES (TRIM(p_label))
    RETURNING id INTO new_invite_id;

    INSERT INTO public."Person" ("inviteId", name)
    SELECT new_invite_id, TRIM(name)
    FROM UNNEST(p_names) AS names(name);

    RETURN new_invite_id;
END;
$$;

CREATE FUNCTION public.submit_invite_response(
    p_invite_id UUID,
    p_message TEXT,
    p_people JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    invite_people_count INTEGER;
    submitted_people_count INTEGER;
    updated_people_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invite_people_count
    FROM public."Person"
    WHERE "inviteId" = p_invite_id;

    IF NOT EXISTS (SELECT 1 FROM public."Invite" WHERE id = p_invite_id) THEN
        RAISE EXCEPTION 'Convite não encontrado.';
    END IF;

    IF JSONB_TYPEOF(p_people) <> 'array' THEN
        RAISE EXCEPTION 'Respostas inválidas.';
    END IF;

    SELECT COUNT(*) INTO submitted_people_count
    FROM JSONB_TO_RECORDSET(p_people) AS submitted(id UUID, status TEXT);

    IF submitted_people_count <> invite_people_count
       OR EXISTS (
           SELECT 1
           FROM JSONB_TO_RECORDSET(p_people) AS submitted(id UUID, status TEXT)
           WHERE submitted.status NOT IN ('GO', 'NO')
       )
       OR EXISTS (
           SELECT 1
           FROM JSONB_TO_RECORDSET(p_people) AS submitted(id UUID, status TEXT)
           GROUP BY submitted.id
           HAVING COUNT(*) > 1
       )
    THEN
        RAISE EXCEPTION 'Responda todas as pessoas do convite.';
    END IF;

    UPDATE public."Person" AS person
    SET status = submitted.status::public."RSVPStatus",
        "answeredAt" = NOW()
    FROM JSONB_TO_RECORDSET(p_people) AS submitted(id UUID, status TEXT)
    WHERE person.id = submitted.id
      AND person."inviteId" = p_invite_id;

    GET DIAGNOSTICS updated_people_count = ROW_COUNT;
    IF updated_people_count <> invite_people_count THEN
        RAISE EXCEPTION 'As respostas não correspondem às pessoas deste convite.';
    END IF;

    UPDATE public."Invite"
    SET message = NULLIF(p_message, ''),
        confirmed = true,
        "updatedAt" = NOW()
    WHERE id = p_invite_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invite_with_people(TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_invite_response(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invite_with_people(TEXT, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_invite_response(UUID, TEXT, JSONB) TO service_role;
