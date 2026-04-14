/**
 * Pluggable OTP delivery channel. Phase 2 uses ConsoleLogSender. Phase 3
 * swaps in GupshupSender (one file change). Do not import this file
 * from anywhere that ships in release builds without verifying the
 * active sender is production-safe.
 *
 * See docs/decisions/2026-04-14-phase-2-fixture-and-auth-pattern.md.
 */
declare const console: { log: (msg: string) => void };

export interface OtpSender {
  readonly name: string;
  send(phone: string, otp: string): Promise<void>;
}

export class ConsoleLogSender implements OtpSender {
  readonly name = "console-log";
  constructor(private readonly logger: (msg: string) => void = console.log) {}

  async send(phone: string, otp: string): Promise<void> {
    this.logger(`[OTP] ${phone} → ${otp}`);
  }
}
