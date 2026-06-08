import React from "react";
import { Metadata } from "next";
import UserProfileEditor from "@/components/settings/UserProfileEditor";

export const metadata: Metadata = {
  title: "My Profile | Chandak Workspace",
  description: "Manage your profile, update profile picture, and change password.",
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
          Manage your account details, profile picture, and security settings. Super Admins can edit all fields, while other users can only update their picture and password.
        </p>
      </header>

      {/* Profile Editor Component */}
      <UserProfileEditor />
    </div>
  );
}
