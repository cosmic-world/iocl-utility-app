import { useEffect, useState } from "react";

export const OTP_COOLDOWN_SECONDS = 5 * 60;

export function useOtpCooldown() {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (secondsRemaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  const startCooldown = () => setSecondsRemaining(OTP_COOLDOWN_SECONDS);
  const resetCooldown = () => setSecondsRemaining(0);
  const timeLabel = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`;

  return {
    secondsRemaining,
    startCooldown,
    resetCooldown,
    canResend: secondsRemaining === 0,
    timeLabel,
  };
}
