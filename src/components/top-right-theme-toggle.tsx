import { ThemeToggle } from "@/components/theme-toggle";

/** Fixed-position theme toggle used on standalone auth-style pages (login, set-password, embedded-signup). */
export function TopRightThemeToggle() {
  return (
    <div className="fixed top-4 right-4">
      <ThemeToggle />
    </div>
  );
}
