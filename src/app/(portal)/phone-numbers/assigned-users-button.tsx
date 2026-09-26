import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { User } from "@/lib/api/types";

function userDisplayName(user: User) {
  return user.name || user.phone_number || "Unnamed user";
}

export function AssignedUsersSummary({ users }: { users: User[] }) {
  if (users.length === 0) return <span className="text-sm">—</span>;

  const firstUserName = userDisplayName(users[0]);
  const additionalUsers = users.length - 1;
  const assignedNames = `${firstUserName}${additionalUsers > 0 ? ` and ${additionalUsers} more` : ""}`;

  return (
    <div className="min-w-0 max-w-[190px] text-sm">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="block min-w-0 max-w-full truncate cursor-pointer text-left text-primary underline underline-offset-2 decoration-from-font"
            aria-label={`Assigned to: ${users.map(userDisplayName).join(", ")}`}
          >
            {assignedNames}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Assigned to users</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {users.map((user) => (
                <li key={user.id}>{userDisplayName(user)}</li>
              ))}
            </ul>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}