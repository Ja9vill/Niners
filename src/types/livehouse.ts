export interface LivehouseSlot {
  available: boolean;
  poppo_id: string | null;
}

export interface LivehouseDataRow {
  date: string;
  timeslot: string;
  slot_1: LivehouseSlot;
  slot_2: LivehouseSlot;
}
