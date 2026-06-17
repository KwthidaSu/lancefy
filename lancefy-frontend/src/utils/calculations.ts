
export const PLATFORM_FEE_RATE = 0.05; // 5%


export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
}

export function calculateNetAmount(amount: number): number {
  return amount - calculatePlatformFee(amount);
}

export function calculateProjectEscrow(
  milestones: { amount: number }[],
): number {
  return milestones.reduce((sum, m) => sum + m.amount, 0);
}

export function calculateFundedAmount(
  milestones: { amount: number; funding_status: string }[],
): number {
  return milestones
    .filter(
      (m) => m.funding_status === "funded" || m.funding_status === "released",
    )
    .reduce((sum, m) => sum + m.amount, 0);
}

export function calculateReleasedAmount(
  milestones: { amount: number; funding_status: string }[],
): number {
  return milestones
    .filter((m) => m.funding_status === "released")
    .reduce((sum, m) => sum + m.amount, 0);
}
