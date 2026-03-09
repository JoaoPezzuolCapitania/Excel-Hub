"use client";

import { signOut, useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <DropdownMenu
      align="right"
      trigger={
        <button className="flex items-center gap-2 rounded-full hover:opacity-80">
          <Avatar
            src={session.user.image}
            alt={session.user.name || "User"}
            size="md"
          />
        </button>
      }
    >
      <div className="border-b border-gray-100 px-4 py-2">
        <p className="text-sm font-medium text-gray-900">
          {session.user.name}
        </p>
        <p className="text-xs text-gray-500">{session.user.email}</p>
      </div>
      <Link href="/dashboard">
        <DropdownItem>
          <User className="mr-2 h-4 w-4" />
          Your repositories
        </DropdownItem>
      </Link>
      <Link href="/settings">
        <DropdownItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownItem>
      </Link>
      <div className="border-t border-gray-100">
        <DropdownItem danger onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownItem>
      </div>
    </DropdownMenu>
  );
}
