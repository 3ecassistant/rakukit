"use client";

import { useState } from "react";
import { TreeNode } from "@/lib/suggestExport";

function TreeNodeItem({ node }: { node: TreeNode }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className="flex items-center gap-1.5 py-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs text-zinc-400 hover:bg-zinc-100"
          >
            {open ? "−" : "+"}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="text-sm text-zinc-700">{node.keyword}</span>
        {hasChildren && <span className="text-xs text-zinc-400">（{node.children.length}）</span>}
      </div>
      {hasChildren && open && (
        <ul className="ml-5 border-l border-zinc-200 pl-3">
          {node.children.map((child, i) => (
            <TreeNodeItem key={`${child.keyword}-${i}`} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function KeywordTree({ tree }: { tree: TreeNode }) {
  if (tree.children.length === 0) {
    return <p className="text-sm text-zinc-400">サジェストが見つかりませんでした。</p>;
  }

  return (
    <ul className="flex flex-col">
      <li>
        <p className="py-1 text-sm font-bold text-zinc-900">{tree.keyword}</p>
        <ul className="ml-5 border-l border-zinc-200 pl-3">
          {tree.children.map((child, i) => (
            <TreeNodeItem key={`${child.keyword}-${i}`} node={child} />
          ))}
        </ul>
      </li>
    </ul>
  );
}
