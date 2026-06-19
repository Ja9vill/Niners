import React, { useState, useMemo } from 'react';
import { AwardBadge, AwardAssignment, Host } from '../types';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';

interface BadgeAssignmentTabsProps {
  opsHosts: Host[];
  opsAwards: AwardBadge[];
  opsAwardAssignments: AwardAssignment[];
  onRefresh: () => void;
}

export const BadgeAssignmentTabs: React.FC<BadgeAssignmentTabsProps> = ({
  opsHosts,
  opsAwards,
  opsAwardAssignments,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'assign' | 'create'>('assign');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [assignHostId, setAssignHostId] = useState('');
  const [awardStartDate, setAwardStartDate] = useState('');
  const [awardEndDate, setAwardEndDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAwardName, setNewAwardName] = useState('');
  const [newAwardColor, setNewAwardColor] = useState('Gold');
  const [newAwardStartDate, setNewAwardStartDate] = useState('');
  const [newAwardEndDate, setNewAwardEndDate] = useState('');

  // Filter hosts based on search term (nickname or poppo_id)
  const filteredHosts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return opsHosts.filter(
      (h) =>
        (h.nickname && h.nickname.toLowerCase().includes(term)) ||
        (h.poppo_id && String(h.poppo_id).toLowerCase().includes(term))
    );
  }, [searchTerm, opsHosts]);

  // Unassigned badges are those not present in assignments
  const unassignedBadges = useMemo(() => {
    const assignedIds = new Set(opsAwardAssignments.map((a) => a.awardId));
    return opsAwards.filter((b) => !assignedIds.has(b.id));
  }, [opsAwards, opsAwardAssignments]);

  const assignedBadges = useMemo(() => {
    const assignmentsMap = new Map<string, AwardAssignment>();
    opsAwardAssignments.forEach((a) => assignmentsMap.set(a.id, a));
    return opsAwardAssignments.map((a) => ({ assignment: a, badge: opsAwards.find((b) => b.id === a.awardId) }));
  }, [opsAwardAssignments, opsAwards]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBadgeId || !assignHostId || !awardStartDate || !awardEndDate) return;
    setIsAssigning(true);
    try {
      const badge = opsAwards.find((b) => b.id === selectedBadgeId);
      const host = opsHosts.find((h) => h.id === assignHostId);
      if (!badge || !host) throw new Error('Invalid selection');
      const assignmentId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const assignment = {
        id: assignmentId,
        awardId: badge.id,
        awardName: badge.name,
        awardColor: badge.color,
        hostId: host.id,
        hostNickname: host.nickname || host.name,
        startDate: awardStartDate,
        endDate: awardEndDate,
        assignedAt: new Date().toISOString(),
      } as AwardAssignment;
      await FirebaseService.saveAwardAssignments([assignment]);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAwardName || !newAwardStartDate || !newAwardEndDate) return;
    setIsCreating(true);
    try {
      const awardId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const award: AwardBadge = {
        id: awardId,
        name: newAwardName,
        color: newAwardColor,
        startDate: newAwardStartDate,
        endDate: newAwardEndDate,
        createdAt: new Date().toISOString(),
      };
      await FirebaseService.saveAwards([award]);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Delete this badge assignment?')) return;
    try {
      await FirebaseService.deleteAwardAssignment(assignmentId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-black/20 backdrop-blur-xl rounded-3xl border border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.05)] p-4">
      <div className="flex space-x-4 mb-4">
        <button
          className={cn('px-3 py-1 rounded', activeTab === 'assign' && 'bg-[#D4AF37]/20')}
          onClick={() => setActiveTab('assign')}
        >
          Assign
        </button>
        <button
          className={cn('px-3 py-1 rounded', activeTab === 'create' && 'bg-[#D4AF37]/20')}
          onClick={() => setActiveTab('create')}
        >
          Create
        </button>
      </div>

      {activeTab === 'assign' && (
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search member by nickname or Poppo ID"
              className="flex-1 bg-black/40 border border-[#D4AF37]/20 rounded px-3 py-2 text-sm text-[#F0EFE8]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={assignHostId}
              onChange={(e) => setAssignHostId(e.target.value)}
              className="bg-black/40 border border-[#D4AF37]/20 rounded px-3 py-2 text-sm text-[#F0EFE8]"
            >
              <option value="">-- Select Member --</option>
              {filteredHosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nickname || h.name} ({h.poppo_id || h.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedBadgeId}
              onChange={(e) => setSelectedBadgeId(e.target.value)}
              className="w-full bg-black/40 border border-[#D4AF37]/20 rounded px-3 py-2 text-sm text-[#F0EFE8]"
            >
              <option value="">-- Unassigned Badges --</option>
              {unassignedBadges.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.color})
                </option>
              ))}
            </select>
          </div>
          <div className="flex space-x-2">
            <input
              type="date"
              value={awardStartDate}
              onChange={(e) => setAwardStartDate(e.target.value)}
              className="bg-black/40 border border-[#D4AF37]/20 rounded px-3 py-2 text-sm text-[#F0EFE8]"
            />
            <input
              type="date"
              value={awardEndDate}
              onChange={(e) => setAwardEndDate(e.target.value)}
              className="bg-black/40 border border-[#D4AF37]/20 rounded px-3 py-2 text-sm text-[#F0EFE8]"
            />
          </div>
          <button
            type="submit"
            disabled={isAssigning}
            className="w-full bg-[#D4AF37]/30 hover:bg-[#D4AF37]/40 text-[#F0EFE8] font-bold py-2 rounded"
          >
            {isAssigning ? 'Assigning...' : 'Assign Badge'}
          </button>
        </form>
      )}

      {activeTab === 'create' && (
        <form onSubmit={handleCreateBadge} className="space-y-4">
          <input
            type="text"
            placeholder="Badge Name"
            className="w-full bg-black/40 border border-[#D4AF37]/20 rounded px-3 py-2 text-sm text-[#F0EFE8]"
            value={newAwardName}
            onChange={(e) => setNewAwardName(e.target.value)}
          />
          <input
            type="color"
            title="Badge Color"
            value={newAwardColor}
            onChange={(e) => setNewAwardColor(e.target.value)}
            className="w-10 h-10 p-0 border border-[#D4AF37]/20 rounded"
          />
          <div className="flex space-x-2">
            <input
              type="date"
              value={newAwardStartDate}
              onChange={(e) => setNewAwardStartDate(e.target.value)}
              className="flex-1 bg-black/40 border border-[#D4AF37]/20 rounded px-3 py-2 text-sm text-[#F0EFE8]"
            />
            <input
              type="date"
              value={newAwardEndDate}
              onChange={(e) => setNewAwardEndDate(e.target.value)}
              className="flex-1 bg-black/40 border border-[#D4AF37]/20 rounded px-3 py-2 text-sm text-[#F0EFE8]"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-[#D4AF37]/30 hover:bg-[#D4AF37]/40 text-[#F0EFE8] font-bold py-2 rounded"
          >
            {isCreating ? 'Creating...' : 'Create Badge'}
          </button>
        </form>
      )}

      {/* Assigned Badges List */}
      <div className="mt-6">
        <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] mb-2">Assigned</h4>
        <ul className="space-y-2">
          {assignedBadges.map(({ assignment, badge }) => (
            <li key={assignment.id} className="flex items-center justify-between bg-black/30 px-3 py-2 rounded">
              <span className="text-sm text-[#F0EFE8]">
                {badge?.name || 'Unknown'} – {assignment.hostNickname}
              </span>
              <button
                onClick={() => handleDeleteAssignment(assignment.id)}
                className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
              >
                Delete
              </button>
            </li>
          ))}
          {assignedBadges.length === 0 && (
            <li className="text-xs text-[#A09E9A]/40">No assigned badges</li>
          )}
        </ul>
      </div>
    </div>
  );
};
