import { openDB, DBSchema, IDBPDatabase } from "idb";

export type SnapshotStatus = "completed" | "partial" | "failed";

export interface KeywordProject {
  id: string;
  name: string;
  rootKeyword: string;
  depth: 1 | 2 | 3;
  memo: string;
  excludeWords: string[];
  createdAt: string;
}

export interface SnapshotKeywordRecord {
  keyword: string;
  parentKeyword: string;
  depth: number;
  order: number;
}

export interface SuggestSnapshot {
  id: string;
  projectId: string;
  fetchedAt: string;
  depth: number;
  apiCount: number;
  totalCount: number;
  uniqueCount: number;
  status: SnapshotStatus;
  stopReason: string | null;
  errorCount: number;
  excludedFromComparison: boolean;
  keywords: SnapshotKeywordRecord[];
}

interface SuggestTrendDBSchema extends DBSchema {
  projects: { key: string; value: KeywordProject };
  snapshots: {
    key: string;
    value: SuggestSnapshot;
    indexes: { projectId: string };
  };
}

const DB_NAME = "rakukit-suggest-trend";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SuggestTrendDBSchema>> | null = null;

function getDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("このブラウザはIndexedDBに対応していません");
  }
  if (!dbPromise) {
    dbPromise = openDB<SuggestTrendDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("projects")) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("snapshots")) {
          const store = db.createObjectStore("snapshots", { keyPath: "id" });
          store.createIndex("projectId", "projectId");
        }
      },
    });
  }
  return dbPromise;
}

export async function listProjects(): Promise<KeywordProject[]> {
  const db = await getDb();
  const all = await db.getAll("projects");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProject(id: string): Promise<KeywordProject | undefined> {
  const db = await getDb();
  return db.get("projects", id);
}

export async function createProject(input: {
  name: string;
  rootKeyword: string;
  depth: 1 | 2 | 3;
  memo: string;
  excludeWords: string[];
}): Promise<KeywordProject> {
  const db = await getDb();
  const project: KeywordProject = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  await db.put("projects", project);
  return project;
}

export async function updateProject(project: KeywordProject): Promise<void> {
  const db = await getDb();
  await db.put("projects", project);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["projects", "snapshots"], "readwrite");
  await tx.objectStore("projects").delete(id);
  const snapshotStore = tx.objectStore("snapshots");
  const index = snapshotStore.index("projectId");
  let cursor = await index.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function saveSnapshot(snapshot: SuggestSnapshot): Promise<void> {
  const db = await getDb();
  await db.put("snapshots", snapshot);
}

export async function listSnapshots(projectId: string): Promise<SuggestSnapshot[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("snapshots", "projectId", projectId);
  return all.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
}

export async function getSnapshot(id: string): Promise<SuggestSnapshot | undefined> {
  const db = await getDb();
  return db.get("snapshots", id);
}

export async function setSnapshotExcluded(id: string, excluded: boolean): Promise<void> {
  const db = await getDb();
  const snapshot = await db.get("snapshots", id);
  if (!snapshot) return;
  snapshot.excludedFromComparison = excluded;
  await db.put("snapshots", snapshot);
}
