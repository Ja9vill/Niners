import { FirebaseService } from './firebaseService';
import { TopNinersEarningsSummary } from '../types';

export class AwardsService {
  /**
   * Assigns a badge to a host for a specific month.
   * Modifies the TopNinersEarningsSummary profilePhotoUrl to act as the badge string.
   */
  static async assignBadge(
    hostId: string,
    hostName: string,
    hostRole: string,
    monthStr: string,
    badgeName: string,
    auditLog: (actionType: string, before: any, after: any) => Promise<void>
  ): Promise<TopNinersEarningsSummary> {
    // Check if summary exists for monthStr
    const summaries = await FirebaseService.getTopNinersSummary(monthStr);
    const existingSummary = summaries.find(s => s.poppoId === hostId);

    const original = existingSummary ? { ...existingSummary } : null;
    
    let updatedSummary: TopNinersEarningsSummary;
    if (existingSummary) {
      updatedSummary = {
        ...existingSummary,
        profilePhotoUrl: badgeName
      };
    } else {
      updatedSummary = {
        summaryId: `${hostId}_${monthStr}`,
        periodKey: monthStr,
        month: parseInt(monthStr.split('-')[1], 10),
        year: parseInt(monthStr.split('-')[0], 10),
        poppoId: hostId,
        nickname: hostName,
        role: hostRole || 'Host',
        totalEarningsPoints: 0,
        rank: 99,
        isPublished: true,
        profilePhotoUrl: badgeName
      };
    }

    await FirebaseService.saveTopNinersSummary([updatedSummary]);
    if (auditLog) {
      await auditLog('ASSIGN_AWARD', original, updatedSummary);
    }
    
    return updatedSummary;
  }
}
