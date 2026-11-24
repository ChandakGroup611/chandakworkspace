import React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import NavTracker from "@/components/meet/NavTracker";

export default async function MeetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCachedUser();
  if (!user) {
    redirect("/login?next=/meet");
  }

  const { modules, isAdmin } = await getUserAllowedModules();
  const hasAccess = isAdmin || modules.some((m) => m.code === "CHANDAK_MEET");

  if (!hasAccess) {
    redirect("/select-module");
  }

  return (
    <>
      <NavTracker />
      {children}
    </>
  );
}
