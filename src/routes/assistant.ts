import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { trackPendoEvent } from "../analytics/pendoTrack.js";
import type { SessionRequest } from "./auth.js";

export const assistantRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AssistantBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

assistantRouter.post("/", async (req: SessionRequest, res) => {
  const body = AssistantBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid conversation" });
    return;
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You help Taskly users plan projects and tasks." },
      ...body.data.messages,
    ],
  });
  const choice = completion.choices[0];
  const reply = choice?.message.content ?? "";
  // The AI interaction succeeded: OpenAI returned a reply that the panel will show.
  trackPendoEvent({
    event: "Assistant reply received",
    visitorId: req.userId,
    accountId: req.accountId,
    properties: {
      model: completion.model,
      message_count: body.data.messages.length,
      reply_length: reply.length,
      finish_reason: choice?.finish_reason ?? "unknown",
      total_tokens: completion.usage?.total_tokens ?? 0,
    },
  });
  res.json({ reply });
});
