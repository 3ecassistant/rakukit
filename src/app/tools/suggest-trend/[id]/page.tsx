"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import ProgressPanel from "@/components/tools/suggest/ProgressPanel";
import ProjectForm, { ProjectFormValues } from "@/components/tools/suggest-trend/ProjectForm";
import DiffTable from "@/components/tools/suggest-trend/DiffTable";
import SnapshotHistoryList from "@/components/tools/suggest-trend/SnapshotHistoryList";
import { useSuggestCollector } from "@/hooks/useSuggestCollector";
import {
  KeywordProject,
  SnapshotKeywordRecord,
  SuggestSnapshot,
  deleteProject,
  getProject,
  listSnapshots,
  saveSnapshot,
  setSnapshotExcluded,
  updateProject,
} from "@/lib/suggestTrendDb";
import { DiffStatus, computeDiff, determineSnapshotStatus } from "@/lib/suggestDiff";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";

type Tab = "diff" | "all" | "history" | "settings";
type DiffFilter = "all" | DiffStatus;

export default function SuggestTrendDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<KeywordProject | null | undefined>(undefined);
  const [snapshots, setSnapshots] = useState<SuggestSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("diff");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);

  const collector = useSuggestCollector();

  const load = useCallback(async () => {
    const p = await getProject(projectId);
    setProject(p ?? null);
    if (p) {
      const list = await listSnapshots(projectId);
      setSnapshots(list);
      setSelectedId((prev) => prev ?? list[0]?.id ?? null);
    }
  }, [projectId]);

  useEffect(() => {
    // IndexedDBからの初期読み込み。ネットワーク競合はないため単純なfire-and-forgetで問題ない。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleFetchLatest = async () => {
    if (!project) return;
    const result = await collector.start(project.rootKeyword, project.depth);
    if (!result) return;

    const keywords: SnapshotKeywordRecord[] = result.nodes.map((n) => ({
      keyword: n.keyword,
      parentKeyword: n.firstParent ?? "",
      depth: n.depth,
      order: n.order,
    }));

    const status = determineSnapshotStatus(result.stopReason, result.errors.length, result.summary.uniqueCount);

    const snapshot: SuggestSnapshot = {
      id: crypto.randomUUID(),
      projectId: project.id,
      fetchedAt: new Date().toISOString(),
      depth: project.depth,
      apiCount: result.summary.apiCount,
      totalCount: result.summary.beforeDedupe,
      uniqueCount: result.summary.uniqueCount,
      status,
      stopReason: result.stopReason,
      errorCount: result.errors.length,
      excludedFromComparison: false,
      keywords,
    };

    await saveSnapshot(snapshot);
    const list = await listSnapshots(project.id);
    setSnapshots(list);
    setSelectedId(snapshot.id);
    setTab("diff");
  };

  const selectedSnapshot = useMemo(
    () => snapshots.find((s) => s.id === selectedId) ?? null,
    [snapshots, selectedId]
  );

  const diff = useMemo(() => {
    if (!selectedSnapshot) return null;
    return computeDiff(selectedSnapshot, snapshots);
  }, [selectedSnapshot, snapshots]);

  const filteredEntries = useMemo(() => {
    if (!diff) return [];
    const excludeWords = project?.excludeWords ?? [];
    let list = diff.entries;
    if (diffFilter !== "all") list = list.filter((e) => e.status === diffFilter);
    if (search.trim()) list = list.filter((e) => e.keyword.includes(search.trim()));
    if (excludeWords.length > 0) {
      list = list.filter((e) => !excludeWords.some((w) => e.keyword.includes(w)));
    }
    const order: Record<DiffStatus, number> = { new: 0, out: 1, keep: 2 };
    return [...list].sort((a, b) => order[a.status] - order[b.status] || a.keyword.localeCompare(b.keyword, "ja"));
  }, [diff, diffFilter, search, project?.excludeWords]);

  const handleToggleExclude = async (id: string, excluded: boolean) => {
    await setSnapshotExcluded(id, excluded);
    const list = await listSnapshots(projectId);
    setSnapshots(list);
  };

  const handleUpdateSettings = async (values: ProjectFormValues) => {
    if (!project) return;
    const updated: KeywordProject = { ...project, ...values };
    await updateProject(updated);
    setProject(updated);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!confirm(`「${project.name}」を削除します。取得履歴もすべて削除されます。よろしいですか？`)) return;
    await deleteProject(project.id);
    router.push("/tools/suggest-trend");
  };

  const handleDownloadCsv = () => {
    if (!project || !diff) return;
    const header = ["起点キーワード", "キーワード", "ステータス", "階層", "親キーワード", "初出日", "最終確認日"];
    const rows = filteredEntries.map((e) => [
      project.rootKeyword,
      e.keyword,
      e.status.toUpperCase(),
      String(e.depth),
      e.parentKeyword,
      e.firstSeenAt ? new Date(e.firstSeenAt).toLocaleDateString("ja-JP") : "",
      e.lastSeenAt ? new Date(e.lastSeenAt).toLocaleDateString("ja-JP") : "",
    ]);
    const blob = buildCsvBlob([header, ...rows]);
    triggerBlobDownload(blob, `${project.name}_suggest_diff.csv`);
  };

  if (project === undefined) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm text-zinc-400">読み込み中…</p>
      </main>
    );
  }
  if (project === null) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm text-red-600">プロジェクトが見つかりませんでした。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">{project.name}</h1>
          <p className="text-sm text-zinc-500">
            起点: {project.rootKeyword}（{project.depth}階層）
          </p>
        </div>
        <button
          type="button"
          onClick={handleFetchLatest}
          disabled={collector.status === "running"}
          className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
        >
          最新情報を取得
        </button>
      </header>

      {collector.status === "running" && <ProgressPanel progress={collector.progress} onStop={collector.stop} />}

      {!selectedSnapshot && collector.status !== "running" && (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-400">
          まだ取得履歴がありません。「最新情報を取得」から開始してください。
        </p>
      )}

      {selectedSnapshot && diff && (
        <>
          {selectedSnapshot.status !== "completed" && (
            <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              この取得は{selectedSnapshot.status === "partial" ? "一部失敗（partial）" : "失敗（failed）"}
              しています。OUT判定は参考値です（取得できなかっただけの可能性があります）。
            </p>
          )}
          {diff.conditionMismatch && (
            <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              比較条件（取得階層）が前回のSnapshotと異なります。差分は参考値としてご覧ください。
            </p>
          )}
          {diff.anomalyDetected && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>
                前回（{diff.baseline?.uniqueCount}件）に比べてサジェスト数が大きく減少しています（
                {selectedSnapshot.uniqueCount}件）。API障害などの可能性があります。
              </span>
              <button
                type="button"
                onClick={() => handleToggleExclude(selectedSnapshot.id, true)}
                className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold hover:bg-red-100"
              >
                この取得を比較対象から除外する
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="現在KW" value={`${selectedSnapshot.uniqueCount}件`} />
            <StatTile label="NEW" value={`${diff.newCount}件`} />
            <StatTile label="OUT" value={`${diff.outCount}件`} />
            <StatTile label="KEEP" value={`${diff.keepCount}件`} />
          </div>
          <p className="text-xs text-zinc-400">
            取得日時: {new Date(selectedSnapshot.fetchedAt).toLocaleString("ja-JP")}
            {diff.isFirstFetch
              ? "（初回取得のため比較対象なし）"
              : diff.baseline && `　前回: ${new Date(diff.baseline.fetchedAt).toLocaleString("ja-JP")}`}
          </p>

          <div className="flex gap-2 border-b border-zinc-200">
            {(["diff", "all", "history", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === t ? "border-red-600 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {t === "diff" ? "差分" : t === "all" ? "全キーワード" : t === "history" ? "履歴" : "設定"}
              </button>
            ))}
          </div>

          {tab === "diff" && (
            <ToolSection step="●" title="差分一覧（NEWを優先表示）">
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "new", "out", "keep"] as DiffFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setDiffFilter(f)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      diffFilter === f
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-zinc-300 text-zinc-600 hover:border-red-400"
                    }`}
                  >
                    {f === "all" ? "すべて" : f.toUpperCase()}
                  </button>
                ))}
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="キーワードを検索"
                  className="w-48 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                />
              </div>
              <p className="text-xs text-zinc-400">{filteredEntries.length}件表示中</p>
              <DiffTable entries={filteredEntries} />
              <div className="flex flex-wrap gap-2">
                <CopyButton
                  getText={() => filteredEntries.map((e) => e.keyword).join("\n")}
                  label="表示中のキーワードをコピー"
                />
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  CSVダウンロード
                </button>
              </div>
            </ToolSection>
          )}

          {tab === "all" && (
            <ToolSection step="●" title={`全キーワード（${selectedSnapshot.keywords.length}件）`}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="キーワードを検索"
                className="w-48 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
                <table className="w-full min-w-max border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-zinc-100">
                    <tr>
                      <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">キーワード</th>
                      <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">階層</th>
                      <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">親</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSnapshot.keywords
                      .filter((k) => !search.trim() || k.keyword.includes(search.trim()))
                      .map((k, i) => (
                        <tr key={i} className="odd:bg-white even:bg-zinc-50">
                          <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-800">{k.keyword}</td>
                          <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{k.depth}</td>
                          <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{k.parentKeyword}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </ToolSection>
          )}

          {tab === "history" && (
            <ToolSection step="●" title="取得履歴（クリックで表示切替）">
              <SnapshotHistoryList
                snapshots={snapshots}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onToggleExclude={handleToggleExclude}
              />
            </ToolSection>
          )}

          {tab === "settings" && (
            <ToolSection step="●" title="プロジェクト設定">
              {editing ? (
                <ProjectForm
                  initial={project}
                  onSubmit={handleUpdateSettings}
                  onCancel={() => setEditing(false)}
                  submitLabel="更新する"
                />
              ) : (
                <div className="flex flex-col gap-3 text-sm text-zinc-600">
                  <p>メモ: {project.memo || "（なし）"}</p>
                  <p>除外キーワード: {project.excludeWords.join(", ") || "（なし）"}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:border-red-400"
                    >
                      編集する
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="self-start rounded-full border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      このプロジェクトを削除
                    </button>
                  </div>
                </div>
              )}
            </ToolSection>
          )}
        </>
      )}
    </main>
  );
}
