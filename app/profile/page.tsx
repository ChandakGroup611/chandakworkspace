import React from "react";
import { Metadata } from "next";
import UserProfileEditor from "@/components/settings/UserProfileEditor";

export const metadata: Metadata = {
  title: "My Profile | Chandak Workspace",
  description: "View your profile and update your profile picture.",
};

export default function ProfilePage() {
  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-500">
      {/* Semantic main header wrapper */}
      <header className="border-b border-white/5 pb-4">
        <h1 id="profile-page-title" className="text-xl font-bold tracking-tight">
          My Profile Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          View your account details and update your profile picture. Most of your profile information is managed centrally via Single Sign-On (SSO).
        </p>
      </header>

      {/* Profile Editor Component */}
      <UserProfileEditor />
    </div>
  );
}
