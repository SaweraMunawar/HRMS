"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS, isRoleCode } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { OrgNode } from "@/lib/queries/org";

/** Kisi bhi node ke neeche kitne log hain (direct + indirect) */
function countReports(node: OrgNode): number {
  return node.reports.reduce((sum, r) => sum + 1 + countReports(r), 0);
}

/** Search: sirf woh shakhen rakho jin mein match ho (ya jin ke neeche match ho) */
function filterTree(nodes: OrgNode[], query: string): OrgNode[] {
  const q = query.toLowerCase();
  const match = (n: OrgNode) =>
    n.name.toLowerCase().includes(q) || n.title.toLowerCase().includes(q) || n.department.toLowerCase().includes(q);

  return nodes
    .map((n) => ({ ...n, reports: filterTree(n.reports, query) }))
    .filter((n) => match(n) || n.reports.length > 0);
}

function collectIds(nodes: OrgNode[], into: Set<number>) {
  for (const n of nodes) {
    into.add(n.id);
    collectIds(n.reports, into);
  }
  return into;
}

function NodeRow({
  node,
  depth,
  expanded,
  onToggle,
  currentUserId,
}: {
  node: OrgNode;
  depth: number;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  currentUserId: number;
}) {
  const hasReports = node.reports.length > 0;
  const isOpen = expanded.has(node.id);
  const isMe = node.id === currentUserId;
  const total = hasReports ? countReports(node) : 0;

  return (
    <li>
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2",
          isMe ? "border-primary bg-primary/5" : "bg-card",
          node.status === "TERMINATED" && "opacity-60",
        )}
      >
        {hasReports ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            onClick={() => onToggle(node.id)}
            aria-expanded={isOpen}
            aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
          >
            <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
          </Button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{node.name}</span>
            {isMe && <Badge variant="secondary">You</Badge>}
            {node.isHead && <Badge variant="outline">Dept head</Badge>}
            {node.status === "TERMINATED" && <Badge variant="outline">Inactive</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {node.title}, {node.department}
          </p>
          {isRoleCode(node.roleCode) && (
            <p className="text-xs text-muted-foreground">
              {ROLE_LABELS[node.roleCode]} in {node.subsidiary}
            </p>
          )}
        </div>

        {hasReports && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" aria-hidden />
            {total}
          </span>
        )}
      </div>

      {hasReports && isOpen && (
        <ul className="ml-3 flex flex-col gap-2 border-l pl-4 pt-2 sm:ml-4 sm:pl-6">
          {node.reports.map((child) => (
            <NodeRow key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} currentUserId={currentUserId} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgTree({ tree, currentUserId }: { tree: OrgNode[]; currentUserId: number }) {
  const allIds = useMemo(() => collectIds(tree, new Set<number>()), [tree]);
  const [expanded, setExpanded] = useState<Set<number>>(() => collectIds(tree, new Set<number>()));
  const [query, setQuery] = useState("");

  const visible = useMemo(() => (query.trim() ? filterTree(tree, query.trim()) : tree), [tree, query]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Search ke waqt sab khol do, taake match nazar aaye
  const effectiveExpanded = query.trim() ? allIds : expanded;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, title or department"
            className="pl-9"
            aria-label="Search the organization chart"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set(allIds))} disabled={!!query.trim()}>
          Expand all
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set())} disabled={!!query.trim()}>
          Collapse all
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nobody matches “{query}”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((node) => (
            <NodeRow key={node.id} node={node} depth={0} expanded={effectiveExpanded} onToggle={toggle} currentUserId={currentUserId} />
          ))}
        </ul>
      )}
    </div>
  );
}
