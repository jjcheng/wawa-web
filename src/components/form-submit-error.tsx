export function FormSubmitError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}
