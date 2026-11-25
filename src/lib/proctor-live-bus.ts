// src/lib/proctor-live-bus.ts
// Bộ nhớ đệm sự kiện thời gian thực phục vụ đồng bộ giữa Học sinh và Giáo viên giám sát

export interface ILiveViolationEvent {
  id: string;
  room_id?: string;
  attempt_id: string;
  candidate_id: string;
  candidate_name: string;
  violation_type: string;
  description: string;
  violation_count: number;
  max_violations: number;
  evidence_snapshot?: string | null;
  timestamp: string;
  is_revoked: boolean;
}

export interface ITeacherAction {
  action_id: string;
  attempt_id: string;
  candidate_id: string;
  action_type: "warn" | "revoke" | "dismiss";
  message?: string;
  timestamp: string;
}

// Global state in-memory để chia sẻ giữa các Next.js API routes trong cùng server process
declare global {
  var __PROCTOR_LIVE_EVENTS__: ILiveViolationEvent[] | undefined;
  var __PROCTOR_TEACHER_ACTIONS__: ITeacherAction[] | undefined;
}

if (!global.__PROCTOR_LIVE_EVENTS__) {
  global.__PROCTOR_LIVE_EVENTS__ = [];
}

if (!global.__PROCTOR_TEACHER_ACTIONS__) {
  global.__PROCTOR_TEACHER_ACTIONS__ = [];
}

export function broadcastViolationEvent(event: ILiveViolationEvent) {
  if (!global.__PROCTOR_LIVE_EVENTS__) {
    global.__PROCTOR_LIVE_EVENTS__ = [];
  }
  global.__PROCTOR_LIVE_EVENTS__.unshift(event);
  // Giữ tối đa 50 sự kiện gần nhất
  if (global.__PROCTOR_LIVE_EVENTS__.length > 50) {
    global.__PROCTOR_LIVE_EVENTS__ = global.__PROCTOR_LIVE_EVENTS__.slice(0, 50);
  }
}

export function getRecentLiveViolations(limit = 20, roomId?: string): ILiveViolationEvent[] {
  const all = global.__PROCTOR_LIVE_EVENTS__ || [];
  if (roomId) {
    return all.filter((e) => String(e.room_id) === String(roomId)).slice(0, limit);
  }
  return all.slice(0, limit);
}

export function clearLiveViolationsForRoom(roomId: string) {
  if (!global.__PROCTOR_LIVE_EVENTS__) return;
  global.__PROCTOR_LIVE_EVENTS__ = global.__PROCTOR_LIVE_EVENTS__.filter(
    (e) => String(e.room_id) !== String(roomId)
  );
}

export function dispatchTeacherAction(action: ITeacherAction) {
  if (!global.__PROCTOR_TEACHER_ACTIONS__) {
    global.__PROCTOR_TEACHER_ACTIONS__ = [];
  }
  global.__PROCTOR_TEACHER_ACTIONS__.unshift(action);
}

export function getTeacherActionsForAttempt(attemptId: string): ITeacherAction[] {
  return (global.__PROCTOR_TEACHER_ACTIONS__ || []).filter(
    (a) => a.attempt_id === attemptId
  );
}
