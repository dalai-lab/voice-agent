"use client";

import type { CurrentUser, Team } from "@stackframe/stack";
import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, ChevronsUpDown, UserRound } from "lucide-react";

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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { reloadApp } from "@/lib/browserReload";
import logger from "@/lib/logger";

export function SidebarTeamSwitcher() {
  const { provider, user } = useAuth();

  // Guard for stack context/user loading states
  if (provider !== "stack" || !user) {
    return null;
  }

  return <SidebarTeamSwitcherContent user={user as CurrentUser} />;
}

function SidebarTeamSwitcherContent({ user }: { user: CurrentUser }) {
  const [isSwitching, setIsSwitching] = useState(false);

  const handleChange = async (team: Team | null) => {
    setIsSwitching(true);

    try {
      await user.setSelectedTeam(team);
      reloadApp();
    } catch (error) {
      logger.error("Failed to switch Stack team", error);
      toast.error("Could not switch agents. Please try again.");
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
      toast.error(error.message || "Could not request new agent. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const teams = user.useTeams() || [];
  const selectedTeam = user.selectedTeam;

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-10 border-border/50 bg-background text-foreground text-xs font-semibold rounded-lg px-3 shadow-xs hover:bg-accent"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-5 h-5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <UserRound className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">{selectedTeam?.displayName || "Select Agent"}</span>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-popover border-border/85 text-popover-foreground rounded-lg p-1 shadow-md" align="start">
          <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
            Active Agents
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/50" />
          
          {teams.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => {
                if (t.id !== selectedTeam?.id) {
                  void handleChange(t);
                }
              }}
              className="flex items-center justify-between px-2 py-2 text-xs rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              <span className="truncate pr-4">{t.displayName}</span>
              {t.id === selectedTeam?.id && (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator className="bg-border/50" />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setDialogOpen(true);
            }}
            className="flex items-center gap-2 px-2 py-2 text-xs rounded-md cursor-pointer text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 hover:text-orange-600 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Request New Agent
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-popover border-border/80 text-popover-foreground">
          <DialogHeader>
            <DialogTitle>Request New Agent</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              An agent has its own dedicated billing and configuration. You can switch between agents at any time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="teamName" className="text-xs font-semibold text-muted-foreground">Agent Name</Label>
              <Input
                id="teamName"
                placeholder="e.g. Support Agent"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                autoFocus
                required
                className="h-10 bg-background border-border text-foreground rounded-md px-3 text-sm focus:border-primary w-full"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isCreating} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !newTeamName.trim()} className="bg-primary text-primary-foreground hover:opacity-90 text-xs h-9 font-semibold">
                {isCreating ? "Requesting..." : "Request Agent"}
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
          <SpinLoader label="Switching agents..." />
        </div>
      )}
    </div>
  );
}
