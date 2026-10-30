import { Router } from "express";
import { z } from "zod";
import { pendoTrack } from "../analytics/pendoTrack.js";
import { db } from "../db.js";
import type { SessionRequest } from "./auth.js";

export const accountRouter = Router();

accountRouter.post("/invitations", (req: SessionRequest, res) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  const inviter = req.userId ? db.users.get(req.userId) : undefined;
  const account = req.accountId ? db.accounts.get(req.accountId) : undefined;
  // Invitation accepted (202) for a valid email.
  pendoTrack("Teammate invited", req.userId, req.accountId, {
    inviter_role: inviter?.role ?? "unknown",
    account_plan: account?.plan ?? "unknown",
    account_seats: account?.seats ?? 0,
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
  // Only fire when the plan actually changes, not when the same plan is re-submitted.
  if (previousPlan !== account.plan) {
    pendoTrack("Plan upgraded", req.userId, account.id, {
      previous_plan: previousPlan,
      new_plan: account.plan,
      previous_seats: previousSeats,
      new_seats: account.seats,
    });
  }
  res.json(account);
});
