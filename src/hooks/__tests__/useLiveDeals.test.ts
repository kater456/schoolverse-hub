import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTimeParts, timeLeft } from "../useLiveDeals";

describe("useLiveDeals - countdown utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("timeLeft", () => {
    it("should return Ended if expired", () => {
      const now = new Date("2026-03-10T12:00:00.000Z");
      vi.setSystemTime(now);

      const expiresAt = "2026-03-10T11:59:00.000Z";
      expect(timeLeft(expiresAt)).toBe("Ended");
    });

    it("should format minutes, hours, or days remaining correctly", () => {
      const now = new Date("2026-03-10T12:00:00.000Z");
      vi.setSystemTime(now);

      // Under an hour
      expect(timeLeft("2026-03-10T12:45:00.000Z")).toBe("45m left");

      // Under a day
      expect(timeLeft("2026-03-10T15:30:00.000Z")).toBe("3h 30m left");

      // More than a day
      expect(timeLeft("2026-03-12T15:30:00.000Z")).toBe("2d 3h left");
    });
  });

  describe("getTimeParts", () => {
    it("should return isEnded: true if expired", () => {
      const now = new Date("2026-03-10T12:00:00.000Z");
      vi.setSystemTime(now);

      const expiresAt = "2026-03-10T11:59:00.000Z";
      expect(getTimeParts(expiresAt)).toEqual({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isEnded: true,
      });
    });

    it("should return correct broken down parts", () => {
      const now = new Date("2026-03-10T12:00:00.000Z");
      vi.setSystemTime(now);

      // 1 day, 2 hours, 3 minutes, 4 seconds left
      const expiresAt = "2026-03-11T14:03:04.000Z";
      expect(getTimeParts(expiresAt)).toEqual({
        days: 1,
        hours: 2,
        minutes: 3,
        seconds: 4,
        isEnded: false,
      });
    });
  });
});
