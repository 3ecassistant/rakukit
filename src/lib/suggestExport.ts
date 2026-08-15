import { SuggestRelation, comparisonKey } from "./suggestTypes";

export interface TreeNode {
  keyword: string;
  depth: number;
  children: TreeNode[];
}

function buildChildrenIndex(relations: SuggestRelation[]): Map<string, SuggestRelation[]> {
  const childrenByParent = new Map<string, SuggestRelation[]>();
  relations.forEach((r) => {
    const key = comparisonKey(r.parent);
    const list = childrenByParent.get(key) ?? [];
    list.push(r);
    childrenByParent.set(key, list);
  });
  return childrenByParent;
}

function buildSubtree(
  keyword: string,
  depth: number,
  ancestors: Set<string>,
  childrenByParent: Map<string, SuggestRelation[]>
): TreeNode {
  const key = comparisonKey(keyword);
  const childRelations = childrenByParent.get(key) ?? [];
  const nextAncestors = new Set(ancestors).add(key);
  return {
    keyword,
    depth,
    children: childRelations
      .filter((r) => !nextAncestors.has(comparisonKey(r.child)))
      .map((r) => buildSubtree(r.child, r.depth, nextAncestors, childrenByParent)),
  };
}

export function buildTree(root: string, relations: SuggestRelation[]): TreeNode {
  return buildSubtree(root, 0, new Set(), buildChildrenIndex(relations));
}

/**
 * アルファベット・数字展開モードのように、複数の起点キーワード（seeds）を
 * それぞれ独立した3階層ツリーとして持つ場合に、表示用の仮想ルート1本へまとめる。
 */
export function buildForestTree(virtualRootLabel: string, seeds: string[], relations: SuggestRelation[]): TreeNode {
  const childrenByParent = buildChildrenIndex(relations);
  const rootAncestor = new Set([comparisonKey(virtualRootLabel)]);
  return {
    keyword: virtualRootLabel,
    depth: 0,
    children: seeds.map((seed) => buildSubtree(seed, 1, rootAncestor, childrenByParent)),
  };
}

interface JsonTreeNode {
  keyword: string;
  children?: JsonTreeNode[];
}

function toJsonNode(node: TreeNode): JsonTreeNode {
  if (node.children.length === 0) return { keyword: node.keyword };
  return { keyword: node.keyword, children: node.children.map(toJsonNode) };
}

export function buildSuggestJson(root: string, relations: SuggestRelation[]): object {
  const tree = buildTree(root, relations);
  return {
    root,
    children: tree.children.map(toJsonNode),
  };
}

export function buildSuggestJsonForest(virtualRootLabel: string, seeds: string[], relations: SuggestRelation[]): object {
  const tree = buildForestTree(virtualRootLabel, seeds, relations);
  return {
    root: virtualRootLabel,
    children: tree.children.map(toJsonNode),
  };
}

export function relationsToCsvRows(rootKeyword: string, relations: SuggestRelation[]): string[][] {
  const header = ["起点キーワード", "キーワード", "親キーワード", "階層", "取得順", "取得日時"];
  const rows = relations.map((r) => [
    rootKeyword,
    r.child,
    r.parent,
    String(r.depth),
    String(r.order),
    r.seenAt,
  ]);
  return [header, ...rows];
}
