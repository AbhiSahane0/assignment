import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { TreeNode } from '../types';
import { Alert, Avatar, Card, RoleBadge, Spinner, StatusBadge } from '../components/ui';

function Node({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasReports = node.directReports.length > 0;

  return (
    <li>
      <div
        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {hasReports ? (
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <Avatar src={node.profileImage} name={node.name} size={9} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{node.name}</span>
            <RoleBadge role={node.role} />
            <StatusBadge status={node.status} />
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {node.designation} · {node.department} · {node.employeeId}
          </div>
        </div>
        {hasReports && (
          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {node.directReports.length} report{node.directReports.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {hasReports && open && (
        <ul className="ml-6 mt-2 space-y-2 border-l-2 border-slate-200 pl-4 dark:border-slate-800">
          {node.directReports.map((child) => (
            <Node key={child._id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChart() {
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/organization/tree')
      .then((res) => setTree(res.data.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!tree) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Organization Chart</h1>
      <Card className="bg-slate-50/50 dark:bg-slate-950/50">
        <ul className="space-y-2">
          {tree.map((root) => (
            <Node key={root._id} node={root} depth={0} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
