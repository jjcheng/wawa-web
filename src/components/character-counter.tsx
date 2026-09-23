export function CharacterCounter({
  value,
  maxLength,
}: {
  value: string;
  maxLength: number;
}) {
  return (
    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
      {value.length}/{maxLength}
    </span>
  );
}
