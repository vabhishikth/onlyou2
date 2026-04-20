/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth_otp from "../auth/otp.js";
import type * as auth_otpDb from "../auth/otpDb.js";
import type * as auth_sender from "../auth/sender.js";
import type * as auth_sessions from "../auth/sessions.js";
import type * as biomarker_internalMutations from "../biomarker/internalMutations.js";
import type * as biomarker_internalQueries from "../biomarker/internalQueries.js";
import type * as biomarker_internal_classifyRow from "../biomarker/internal/classifyRow.js";
import type * as biomarker_internal_extractMarkers from "../biomarker/internal/extractMarkers.js";
import type * as biomarker_internal_generateNarrative from "../biomarker/internal/generateNarrative.js";
import type * as biomarker_internal_matchPatientName from "../biomarker/internal/matchPatientName.js";
import type * as biomarker_internal_normalizeUnit from "../biomarker/internal/normalizeUnit.js";
import type * as biomarker_internal_retryScheduler from "../biomarker/internal/retryScheduler.js";
import type * as biomarker_internal_seedRanges from "../biomarker/internal/seedRanges.js";
import type * as biomarker_internal_upsertCurationRow from "../biomarker/internal/upsertCurationRow.js";
import type * as biomarker_lib_createLabReport from "../biomarker/lib/createLabReport.js";
import type * as biomarker_lib_rateLimits from "../biomarker/lib/rateLimits.js";
import type * as biomarker_parseLabReport from "../biomarker/parseLabReport.js";
import type * as crons from "../crons.js";
import type * as featureFlags from "../featureFlags.js";
import type * as lib_claude from "../lib/claude.js";
import type * as lib_telemetry from "../lib/telemetry.js";
import type * as seed_fakeUsers from "../seed/fakeUsers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "auth/otp": typeof auth_otp;
  "auth/otpDb": typeof auth_otpDb;
  "auth/sender": typeof auth_sender;
  "auth/sessions": typeof auth_sessions;
  "biomarker/internalMutations": typeof biomarker_internalMutations;
  "biomarker/internalQueries": typeof biomarker_internalQueries;
  "biomarker/internal/classifyRow": typeof biomarker_internal_classifyRow;
  "biomarker/internal/extractMarkers": typeof biomarker_internal_extractMarkers;
  "biomarker/internal/generateNarrative": typeof biomarker_internal_generateNarrative;
  "biomarker/internal/matchPatientName": typeof biomarker_internal_matchPatientName;
  "biomarker/internal/normalizeUnit": typeof biomarker_internal_normalizeUnit;
  "biomarker/internal/retryScheduler": typeof biomarker_internal_retryScheduler;
  "biomarker/internal/seedRanges": typeof biomarker_internal_seedRanges;
  "biomarker/internal/upsertCurationRow": typeof biomarker_internal_upsertCurationRow;
  "biomarker/lib/createLabReport": typeof biomarker_lib_createLabReport;
  "biomarker/lib/rateLimits": typeof biomarker_lib_rateLimits;
  "biomarker/parseLabReport": typeof biomarker_parseLabReport;
  crons: typeof crons;
  featureFlags: typeof featureFlags;
  "lib/claude": typeof lib_claude;
  "lib/telemetry": typeof lib_telemetry;
  "seed/fakeUsers": typeof seed_fakeUsers;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
