/**
 * Pluggable OTP delivery channel. Phase 2 uses ConsoleLogSender. Phase 3
 * swaps in GupshupSender (one file change). Do not import this file
 * from anywhere that ships in release builds without verifying the
 * active sender is production-safe.
 *
 * See docs/decisions/2026-04-14-phase-2-fixture-and-auth-pattern.md.
 */
export interface OtpSender {
  readonly name: string
  send(phone: string, otp: string): Promise<void>
}

export class ConsoleLogSender implements OtpSender {
  readonly name = 'console-log'
  constructor(private readonly logger?: (msg: string) => void) {}

  async send(phone: string, otp: string): Promise<void> {
    const msg = `[OTP] ${phone} → ${otp}`
    if (this.logger) {
      this.logger(msg)
    } else {
      // eslint-disable-next-line no-console
      // @ts-expect-error console is available in Convex runtime but not in ESNext lib
      console.log(msg)
    }
  }
}
