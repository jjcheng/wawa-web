export function PageHeader({
  title,
  description,
  titleAction,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  titleAction?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {titleAction}
        </div>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full justify-start sm:w-auto sm:justify-end [&_[data-slot=button]]:h-7 [&_[data-slot=button]]:gap-1 [&_[data-slot=button]]:px-2.5 [&_[data-slot=button]]:text-[0.8rem] [&_[data-slot=button]_svg]:size-3.5">
          {action}
        </div>
      ) : null}
    </div>
  );
}
