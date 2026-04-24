import { describe, expect, it } from "vitest";

import { ConsoleLogSender, type OtpSender } from "../sender";

describe("OtpSender", () => {
  it("ConsoleLogSender logs phone + otp to the provided logger", async () => {
    const logs: string[] = [];
    const sender: OtpSender = new ConsoleLogSender((msg) => logs.push(msg));
    await sender.send("+919999900001", "000000");
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("+919999900001");
    expect(logs[0]).toContain("000000");
  });
});
