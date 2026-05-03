import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import type { Session, VersionSnapshot } from './types.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dataDir = process.env.REQFLOW_DATA_DIR || path.join(rootDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'reqflow.sqlite'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    stage TEXT NOT NULL,
    runtime_state TEXT NOT NULL,
    current_version INTEGER NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    session_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    summary TEXT NOT NULL,
    proposal_id TEXT,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (session_id, version),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
`);

export function saveSession(session: Session) {
  const payload = JSON.stringify(session);
  db.prepare(`
    INSERT INTO sessions (id, title, stage, runtime_state, current_version, payload, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      stage = excluded.stage,
      runtime_state = excluded.runtime_state,
      current_version = excluded.current_version,
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `).run(
    session.id,
    session.title,
    session.stage,
    session.runtimeState,
    session.currentVersion,
    payload,
    session.createdAt,
    session.updatedAt,
  );
}

export function getSession(id: string): Session | undefined {
  const row = db.prepare('SELECT payload FROM sessions WHERE id = ?').get(id) as { payload: string } | undefined;
  if (!row) return undefined;
  return JSON.parse(row.payload) as Session;
}

export function listSessions(): Session[] {
  const rows = db.prepare(`
    SELECT payload FROM sessions
    ORDER BY updated_at DESC
  `).all() as Array<{ payload: string }>;

  return rows.map((row) => JSON.parse(row.payload) as Session);
}

export function saveSnapshot(sessionId: string, snapshot: VersionSnapshot) {
  db.prepare(`
    INSERT INTO snapshots (session_id, version, summary, proposal_id, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id, version) DO UPDATE SET
      summary = excluded.summary,
      proposal_id = excluded.proposal_id,
      payload = excluded.payload,
      created_at = excluded.created_at
  `).run(
    sessionId,
    snapshot.version,
    snapshot.summary,
    snapshot.proposalId,
    JSON.stringify(snapshot),
    snapshot.createdAt,
  );
}

export function listSnapshots(sessionId: string): VersionSnapshot[] {
  const rows = db.prepare(`
    SELECT payload FROM snapshots
    WHERE session_id = ?
    ORDER BY version ASC
  `).all(sessionId) as Array<{ payload: string }>;

  return rows.map((row) => JSON.parse(row.payload) as VersionSnapshot);
}

export function getSnapshot(sessionId: string, version: number): VersionSnapshot | undefined {
  const row = db.prepare(`
    SELECT payload FROM snapshots
    WHERE session_id = ? AND version = ?
  `).get(sessionId, version) as { payload: string } | undefined;

  if (!row) return undefined;
  return JSON.parse(row.payload) as VersionSnapshot;
}

export function getStorageStatus() {
  try {
    db.prepare('SELECT 1 AS ok').get();
    fs.accessSync(dataDir, fs.constants.W_OK);
    return {
      ok: true,
      dataDir,
      error: null,
    };
  } catch (err: any) {
    return {
      ok: false,
      dataDir,
      error: err.message || 'storage check failed',
    };
  }
}
