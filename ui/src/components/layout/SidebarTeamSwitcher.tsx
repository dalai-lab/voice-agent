"use client";

import type { CurrentUser, Team } from "@stackframe/stack";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import SpinLoader from "@/components/SpinLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { reloadApp } from "@/lib/browserReload";
import logger from "@/lib/logger";

// Lazy load Stack's SelectedTeamSwitcher, but own the selected-team write here.
// The stock component re-applies the selectedTeam prop asynchronously, which
// can pin the sidebar to the previous team while the user switch is in flight.
const StackTeamSwitcher = React.lazy(() =>
  import("@stackframe/stack").then((mod) => ({
    default: mod.SelectedTeamSwitcher,
  }))
);

export function SidebarTeamSwitcher() {
  const { provider, user } = useAuth();

  // The !user guard is load-bearing (Sentry JAVASCRIPT-NEXTJS-2Z): Stack's
  // TeamSwitcher calls user?.useTeams() — a hook behind optional chaining — so
  // if useUser() flips to null mid-session (token expiry, sign-out from
  // another tab) its re-render throws React #300 "Rendered fewer hooks than
  // expected". Unmounting it here re-renders the ancestor first, removing the
  // switcher before it can re-render with a null user.
  if (provider !== "stack" || !user) {
    return null;
  }

  return <SidebarTeamSwitcherContent user={user as CurrentUser} />;
}

function SidebarTeamSwitcherContent({ user }: { user: CurrentUser }) {
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();

  const handleChange = async (team: Team | null) => {
    setIsSwitching(true);

    try {
      await user.setSelectedTeam(team);
      reloadApp();
    } catch (error) {
      logger.error("Failed to switch Stack team", error);
      toast.error("Could not switch teams. Please try again.");
      setIsSwitching(false);
    }
  };

  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      const newTeam = await user.createTeam({ displayName: newTeamName });
      await user.setSelectedTeam(newTeam);
      setDialogOpen(false);
      setNewTeamName("");
      reloadApp();
    } catch (error: any) {
      logger.error("Failed to create Stack team", error);
      toast.error(error.message || "Could not create workspace. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative">
      <React.Suspense
        fallback={<div className="h-9 w-full animate-pulse rounded bg-muted" />}
      >
        <StackTeamSwitcher
          selectedTeam={user.selectedTeam || undefined}
          noUpdateSelectedTeam
          onChange={(team) => {
            void handleChange(team);
          }}
          triggerClassName="w-full"
        />
      </React.Suspense>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start mt-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="mr-2 h-3 w-3" />
            New Workspace
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              A workspace gives you a dedicated agent and billing context. You can switch between workspaces at any time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Workspace Name</Label>
              <Input
                id="teamName"
                placeholder="e.g. Acme Corp Support"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !newTeamName.trim()}>
                {isCreating ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isSwitching && (
        <div
          className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-background/90 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <SpinLoader label="Switching workspaces..." />
        </div>
      )}
    </div>
  );
}
