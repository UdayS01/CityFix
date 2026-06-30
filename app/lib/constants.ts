export const EMERGENCY_VOTE_THRESHOLD = 5;

export function getEscalatedSeverity(currentSeverity: string, newVoteCount: number, alreadyEscalated: boolean): string | null {
  if (newVoteCount >= EMERGENCY_VOTE_THRESHOLD && !alreadyEscalated && currentSeverity !== 'high') {
    if (currentSeverity === 'low') return 'medium';
    if (currentSeverity === 'medium') return 'high';
  }
  return null;
}
