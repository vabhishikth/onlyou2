import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../../_generated/server";

export type NotificationKind =
  | "lab_report_ready"
  | "lab_report_parse_failed"
  | "lab_report_updated"
  | "lab_report_uploaded_for_you";

interface BaseArgs {
  userId: Id<"users">;
  biomarkerReportId?: Id<"biomarker_reports">;
  labReportId?: Id<"lab_reports">;
}

function copyFor(kind: NotificationKind): { title: string; body: string } {
  switch (kind) {
    case "lab_report_ready":
      return {
        title: "Your lab report is ready",
        body: "Tap to view your biomarkers and what they mean.",
      };
    case "lab_report_parse_failed":
      return {
        title: "We couldn't read your report",
        body: "Tap to try again or contact support.",
      };
    case "lab_report_updated":
      return {
        title: "Your biomarker classifications were updated",
        body: "Our reference ranges changed — tap to see what's different.",
      };
    case "lab_report_uploaded_for_you":
      return {
        title: "Your lab uploaded a report",
        body: "We're analyzing it — you'll be notified when it's ready.",
      };
  }
}

export async function writeNotificationFromMutation(
  ctx: MutationCtx,
  kind: NotificationKind,
  args: BaseArgs,
): Promise<Id<"notifications">> {
  const { title, body } = copyFor(kind);
  return await ctx.db.insert("notifications", {
    userId: args.userId,
    kind,
    biomarkerReportId: args.biomarkerReportId,
    labReportId: args.labReportId,
    title,
    body,
    createdAt: Date.now(),
  });
}

export async function writeNotificationFromAction(
  ctx: ActionCtx,
  kind: NotificationKind,
  args: BaseArgs,
): Promise<Id<"notifications">> {
  const { title, body } = copyFor(kind);
  return await ctx.runMutation(
    internal.biomarker.internalMutations.writeNotification,
    {
      userId: args.userId,
      kind,
      biomarkerReportId: args.biomarkerReportId,
      labReportId: args.labReportId,
      title,
      body,
      now: Date.now(),
    },
  );
}
