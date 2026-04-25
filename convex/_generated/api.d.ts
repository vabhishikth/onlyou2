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
import type * as biomarker_intakeUpload from "../biomarker/intakeUpload.js";
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
import type * as biomarker_lib_auditValidators from "../biomarker/lib/auditValidators.js";
import type * as biomarker_lib_autoDraftRange from "../biomarker/lib/autoDraftRange.js";
import type * as biomarker_lib_createLabReport from "../biomarker/lib/createLabReport.js";
import type * as biomarker_lib_findByContentHash from "../biomarker/lib/findByContentHash.js";
import type * as biomarker_lib_fuzzyAliasMatch from "../biomarker/lib/fuzzyAliasMatch.js";
import type * as biomarker_lib_jaroWinkler from "../biomarker/lib/jaroWinkler.js";
import type * as biomarker_lib_normalizeCollectionDate from "../biomarker/lib/normalizeCollectionDate.js";
import type * as biomarker_lib_normalizeKey from "../biomarker/lib/normalizeKey.js";
import type * as biomarker_lib_notifications from "../biomarker/lib/notifications.js";
import type * as biomarker_lib_panelCodeDetect from "../biomarker/lib/panelCodeDetect.js";
import type * as biomarker_lib_portalGates from "../biomarker/lib/portalGates.js";
import type * as biomarker_lib_rateLimits from "../biomarker/lib/rateLimits.js";
import type * as biomarker_lib_reclassifyLock from "../biomarker/lib/reclassifyLock.js";
import type * as biomarker_parseLabReport from "../biomarker/parseLabReport.js";
import type * as biomarker_patient_myBiomarkerReports from "../biomarker/patient/myBiomarkerReports.js";
import type * as biomarker_portal_biomarkerReportsForPatient from "../biomarker/portal/biomarkerReportsForPatient.js";
import type * as biomarker_portal_labUploadResult from "../biomarker/portal/labUploadResult.js";
import type * as biomarker_reclassifyAllReports from "../biomarker/reclassifyAllReports.js";
import type * as biomarker_reclassifyForCanonicalId from "../biomarker/reclassifyForCanonicalId.js";
import type * as biomarker_retryParseLabReport from "../biomarker/retryParseLabReport.js";
import type * as consultations_photos from "../consultations/photos.js";
import type * as consultations_transitions from "../consultations/transitions.js";
import type * as crons from "../crons.js";
import type * as featureFlags from "../featureFlags.js";
import type * as lib_claude from "../lib/claude.js";
import type * as lib_envGuards from "../lib/envGuards.js";
import type * as lib_photoSlot from "../lib/photoSlot.js";
import type * as lib_telemetry from "../lib/telemetry.js";
import type * as migrations_phase3a_normalizePhones from "../migrations/phase3a/normalizePhones.js";
import type * as seed_devBiomarkerReport from "../seed/devBiomarkerReport.js";
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
  "biomarker/intakeUpload": typeof biomarker_intakeUpload;
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
  "biomarker/lib/auditValidators": typeof biomarker_lib_auditValidators;
  "biomarker/lib/autoDraftRange": typeof biomarker_lib_autoDraftRange;
  "biomarker/lib/createLabReport": typeof biomarker_lib_createLabReport;
  "biomarker/lib/findByContentHash": typeof biomarker_lib_findByContentHash;
  "biomarker/lib/fuzzyAliasMatch": typeof biomarker_lib_fuzzyAliasMatch;
  "biomarker/lib/jaroWinkler": typeof biomarker_lib_jaroWinkler;
  "biomarker/lib/normalizeCollectionDate": typeof biomarker_lib_normalizeCollectionDate;
  "biomarker/lib/normalizeKey": typeof biomarker_lib_normalizeKey;
  "biomarker/lib/notifications": typeof biomarker_lib_notifications;
  "biomarker/lib/panelCodeDetect": typeof biomarker_lib_panelCodeDetect;
  "biomarker/lib/portalGates": typeof biomarker_lib_portalGates;
  "biomarker/lib/rateLimits": typeof biomarker_lib_rateLimits;
  "biomarker/lib/reclassifyLock": typeof biomarker_lib_reclassifyLock;
  "biomarker/parseLabReport": typeof biomarker_parseLabReport;
  "biomarker/patient/myBiomarkerReports": typeof biomarker_patient_myBiomarkerReports;
  "biomarker/portal/biomarkerReportsForPatient": typeof biomarker_portal_biomarkerReportsForPatient;
  "biomarker/portal/labUploadResult": typeof biomarker_portal_labUploadResult;
  "biomarker/reclassifyAllReports": typeof biomarker_reclassifyAllReports;
  "biomarker/reclassifyForCanonicalId": typeof biomarker_reclassifyForCanonicalId;
  "biomarker/retryParseLabReport": typeof biomarker_retryParseLabReport;
  "consultations/photos": typeof consultations_photos;
  "consultations/transitions": typeof consultations_transitions;
  crons: typeof crons;
  featureFlags: typeof featureFlags;
  "lib/claude": typeof lib_claude;
  "lib/envGuards": typeof lib_envGuards;
  "lib/photoSlot": typeof lib_photoSlot;
  "lib/telemetry": typeof lib_telemetry;
  "migrations/phase3a/normalizePhones": typeof migrations_phase3a_normalizePhones;
  "seed/devBiomarkerReport": typeof seed_devBiomarkerReport;
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
