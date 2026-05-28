interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="bg-white border-b border-gray-200 py-3 px-6">
      <div className="max-w-layout mx-auto flex items-center gap-2 text-xs text-bmw-gray-muted">
        {items.map((it, i) => (
          <span key={i}>
            {it.href ? (
              <a href={it.href} className="text-bmw-blue hover:underline">{it.label}</a>
            ) : (
              <span>{it.label}</span>
            )}
            {i < items.length - 1 && <span className="mx-1">›</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
