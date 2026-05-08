type SubsetBadgeProps = Readonly<{
  subset: string | null;
}>;

export function SubsetBadge({ subset }: SubsetBadgeProps) {
  return (
    <span className="ml-2 rounded-sm border border-slate-600/50 bg-slate-900/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
      {subset || "-"}
    </span>
  );
}
