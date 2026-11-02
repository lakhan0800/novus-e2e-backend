import { Router } from "express";
import { z } from "zod";
import { trackPendoEvent } from "../analytics/pendoTrack.js";
import { db } from "../db.js";
import type { SessionRequest } from "./auth.js";

export const accountRouter = Router();

accountRouter.post("/invitations", (req: SessionRequest, res) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  // Team-expansion outcome: the server accepted the invitation request.
  const account = req.accountId ? db.accounts.get(req.accountId) : undefined;
  const inviter = req.userId ? db.users.get(req.userId) : undefined;
  trackPendoEvent({
    event: "Invitation sent",
    visitorId: req.userId,
    accountId: req.accountId,
    properties: {
      invitee_email_domain: body.data.email.split("@")[1] ?? "unknown",
      inviter_role: inviter?.role ?? "unknown",
      account_plan: account?.plan ?? "unknown",
      account_seats: account?.seats ?? 0,
    },
  });
  res.status(202).json({ invited: body.data.email });
});

accountRouter.post("/upgrade", (req: SessionRequest, res) => {
  const body = z.object({ plan: z.enum(["team", "enterprise"]) }).safeParse(req.body);
  const account = db.accounts.get(req.accountId!);
  if (!body.success || !account) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }
  const previousPlan = account.plan;
  const previousSeats = account.seats;
  account.plan = body.data.plan;
  account.seats = body.data.plan === "team" ? 25 : 500;
  // Only fire when the plan actually changes, not on a repeated request for the same plan.
  if (previousPlan !== account.plan) {
    trackPendoEvent({
      event: "Plan upgraded",
      visitorId: req.userId,
      accountId: account.id,
      properties: {
        previous_plan: previousPlan,
        new_plan: account.plan,
        previous_seats: previousSeats,
        new_seats: account.seats,
      },
    });
  }
  res.json(account);
});
