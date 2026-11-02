-- Live chat between clients and support staff.
CREATE TYPE "support_conversation_status" AS ENUM ('open', 'closed');

CREATE TABLE "support_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "support_conversation_status" NOT NULL DEFAULT 'open',
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_last_read_at" TIMESTAMPTZ(6),
    "staff_last_read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "support_conversations_user_id_key" ON "support_conversations"("user_id");
CREATE INDEX "support_conversations_status_last_message_at_idx" ON "support_conversations"("status", "last_message_at" DESC);
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "from_staff" BOOLEAN NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "support_messages_body_not_blank_chk" CHECK (length(btrim("body")) > 0)
);
CREATE INDEX "support_messages_conversation_id_created_at_idx" ON "support_messages"("conversation_id", "created_at");
CREATE INDEX "support_messages_sender_id_created_at_idx" ON "support_messages"("sender_id", "created_at");
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "support_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
