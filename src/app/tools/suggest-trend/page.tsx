"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProjectForm, { ProjectFormValues } from "@/components/tools/suggest-trend/ProjectForm";
import {
  KeywordProject,
  SuggestSnapshot,
  createProject,
  listProjects,
  listSnapshots,
} from "@/lib/suggestTrendDb";
import { computeDiff } from "@/lib/suggestDiff";

interface ProjectCardData {
  project: KeywordProject;
  latest: SuggestSnapshot | null;
  newCount: number;
  outCount: number;
}

export default function SuggestTrendListPage() {
  const [cards, setCards] = useState<ProjectCardData[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const projects = await listProjects();
    const data = await Promise.all(
      projects.map(async (project) => {
        const snapshots = await listSnapshots(project.id);
        const latest = snapshots[0] ?? null;
        if (!latest) return { project, latest: null, newCount: 0, outCount: 0 };
        const diff = computeDiff(latest, snapshots);
        return { project, latest, newCount: diff.newCount, outCount: diff.outCount };
      })
    );
    setCards(data);
  };

  useEffect(() => {
    // IndexedDBからの初期読み込み。ネットワーク競合はないため単純なfire-and-forgetで問題ない。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const handleCreate = async (values: ProjectFormValues) => {
    await createProject(values);
    setShowForm(false);
    load();
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">サジェスト差分・トレンド</h1>
        <p className="text-sm text-zinc-500">
          起点キーワードを登録し、取得のたびにサジェストを保存。前回との差分（NEW / OUT /
          KEEP）を継続的に確認できます。データはこのブラウザ内（IndexedDB）にのみ保存されます。
        </p>
      </header>

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        ＋ キーワードを追加
      </button>

      {showForm && (
        <ProjectForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="登録する" />
      )}

      {cards === null ? (
        <p className="text-sm text-zinc-400">読み込み中…</p>
      ) : cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-400">
          まだキーワードが登録されていません。「＋ キーワードを追加」から始めてください。
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map(({ project, latest, newCount, outCount }) => (
            <Link
              key={project.id}
              href={`/tools/suggest-trend/${project.id}`}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-red-400 hover:shadow-sm"
            >
              <p className="font-semibold text-zinc-900">{project.name}</p>
              <p className="text-xs text-zinc-400">起点: {project.rootKeyword}（{project.depth}階層）</p>
              {latest ? (
                <>
                  <p className="text-xs text-zinc-400">
                    最新取得: {new Date(latest.fetchedAt).toLocaleString("ja-JP")}
                    {latest.status !== "completed" && (
                      <span className="ml-1 text-yellow-600">（{latest.status}）</span>
                    )}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-zinc-700">サジェスト {latest.uniqueCount}件</span>
                    <span className="text-red-600">NEW {newCount}</span>
                    <span className="text-zinc-500">OUT {outCount}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-400">まだ取得していません</p>
              )}
              <span className="mt-1 self-start rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                詳細
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
