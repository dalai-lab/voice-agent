"use client";

import {
  AlertTriangle,
  ArrowUpCircle,
  AudioLines,
  Brain,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  TrendingUp,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { SidebarTeamSwitcher } from "@/components/layout/SidebarTeamSwitcher";
import ThemeToggle from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppConfig } from "@/context/AppConfigContext";
import { useLeadForms } from "@/context/LeadFormsContext";
import { useTelephonyConfigWarnings } from "@/context/TelephonyConfigWarningsContext";
import { useLatestReleaseVersion } from "@/hooks/useLatestReleaseVersion";
import type { LocalUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

import * as PhosphorIcons from "@phosphor-icons/react";

type SidebarNavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  showsTelephonyWarning?: boolean;
};

type SidebarNavSection = {
  label?: string;
  items: SidebarNavItem[];
};

const TELEPHONY_WARNING_COPY = "Action required";

const NAV_SECTIONS: SidebarNavSection[] = [
  {
    items: [
      {
        title: "Overview",
        url: "/overview",
        icon: PhosphorIcons.SquaresFour,
      },
    ],
  },
  {
    label: "BUILD",
    items: [
      {
        title: "Voice Agents",
        url: "/workflow",
        icon: PhosphorIcons.Robot,
      },
      {
        title: "Campaigns",
        url: "/campaigns",
        icon: PhosphorIcons.Megaphone,
      },
      {
        title: "Callbacks",
        url: "/callbacks",
        icon: PhosphorIcons.PhoneCall,
      },
      {
        title: "Tools",
        url: "/tools",
        icon: PhosphorIcons.Wrench,
      },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      {
        title: "Knowledge Base",
        url: "/files",
        icon: PhosphorIcons.Database,
      },
      {
        title: "Audio Recordings",
        url: "/recordings",
        icon: PhosphorIcons.VinylRecord,
      },
    ],
  },
  {
    label: "CONFIGURE",
    items: [
      {
        title: "AI Models",
        url: "/model-configurations",
        icon: PhosphorIcons.Brain,
      },
      {
        title: "Telephony",
        url: "/telephony-configurations",
        icon: PhosphorIcons.Phone,
        showsTelephonyWarning: true,
      },
      {
        title: "Developers",
        url: "/api-keys",
        icon: PhosphorIcons.Key,
      },
      {
        title: "Platform Settings",
        url: "/settings",
        icon: PhosphorIcons.Gear,
      },
    ],
  },
  {
    label: "MANAGE",
    items: [
      {
        title: "Agent Logs",
        url: "/runs",
        icon: PhosphorIcons.ClockCounterClockwise,
      },
      {
        title: "Usage",
        url: "/usage",
        icon: PhosphorIcons.TrendUp,
      },
      {
        title: "Billing",
        url: "/billing",
        icon: PhosphorIcons.CreditCard,
      },
      {
        title: "Reports",
        url: "/reports",
        icon: PhosphorIcons.ChartBar,
      }
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { provider, logout, user } = useAuth();
  const { config } = useAppConfig();
  const { openHireExpert } = useLeadForms();
  const {
    telnyxMissingWebhookPublicKeyCount,
    vonageMissingSignatureSecretCount,
  } = useTelephonyConfigWarnings();
  const hasTelephonyWarning =
    telnyxMissingWebhookPublicKeyCount > 0 ||
    vonageMissingSignatureSecretCount > 0;
  const isCollapsed = !isMobile && state === "collapsed";

  const versionInfo = config ? { ui: config.uiVersion, api: config.apiVersion } : null;

  const { latest: latestRelease, isBehind, isLatest } = useLatestReleaseVersion(
    versionInfo?.ui,
    { enabled: config?.deploymentMode === "oss" },
  );

  const isActive = (path: string) => pathname.startsWith(path);

  const handleMobileNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const SidebarLink = ({ item }: { item: SidebarNavItem }) => {
    const isItemActive = isActive(item.url);
    const Icon = item.icon;
    const showWarningDot = item.showsTelephonyWarning && hasTelephonyWarning;
    const tooltip = {
      children: (
        <div className="notranslate" translate="no">
          <p>{item.title}</p>
          {showWarningDot && (
            <p className="text-rose-500">{TELEPHONY_WARNING_COPY}</p>
          )}
        </div>
      ),
    };
    const warningIndicator = (
      <AlertTriangle
        aria-label="Action required on a telephony configuration"
        className={cn(
          "text-rose-500",
          isCollapsed ? "absolute -right-0.5 -top-0.5 h-3 w-3" : "ml-auto h-3.5 w-3.5"
        )}
      />
    );

    return (
      <SidebarMenuButton
        asChild
        tooltip={tooltip}
        className={cn(
          "rounded-lg transition-all duration-150 text-xs font-medium select-none border relative",
          isCollapsed ? "mx-auto h-8.5" : "mx-2 w-[calc(100%-16px)] h-8.5",
          isItemActive
            ? "bg-cta/[0.05] border-transparent text-cta font-semibold before:absolute before:left-0.5 before:top-[20%] before:h-[60%] before:w-0.75 before:rounded-full before:bg-cta"
            : "border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
        )}
      >
        <Link
          href={item.url}
          onClick={handleMobileNavClick}
          className={cn("flex items-center gap-3 px-3", isCollapsed && "justify-center px-0 w-full h-full")}
          translate="no"
        >
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isItemActive ? "text-cta" : "text-muted-foreground group-hover:text-sidebar-foreground"
            )}
          />
          <span
            className={cn("notranslate truncate font-sans text-xs tracking-tight", isCollapsed && "hidden")}
            translate="no"
          >
            {item.title}
          </span>
          {showWarningDot && (
            isCollapsed ? (
              warningIndicator
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  {warningIndicator}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{TELEPHONY_WARNING_COPY}</p>
                </TooltipContent>
              </Tooltip>
            )
          )}
        </Link>
      </SidebarMenuButton>
    );
  };

  const displayIdentity =
    user?.displayName ||
    (user as { primaryEmail?: string } | undefined)?.primaryEmail ||
    (user as LocalUser | undefined)?.email ||
    "";
  const userInitials =
    displayIdentity
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s: string) => s[0]?.toUpperCase())
      .join("") || "U";

  const userChipTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
    >
      <span className="text-xs font-semibold">{userInitials}</span>
    </Button>
  );

  const hireExpertButton = isCollapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="hidden h-8 w-8 rounded-lg border-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
          onClick={() => openHireExpert("sidebar")}
          aria-label="Hire an Expert"
        >
          <UserRound className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Hire an Expert</p>
      </TooltipContent>
    </Tooltip>
  ) : (
    <Button
      size="sm"
      variant="outline"
      className="hidden h-8 gap-2 rounded-lg text-xs font-medium border-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
      onClick={() => openHireExpert("sidebar")}
    >
      <UserRound className="h-3.5 w-3.5" />
      Hire an Expert
    </Button>
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className={cn("notranslate border-b border-sidebar-border", isCollapsed ? "p-2" : "px-4 py-4")} translate="no">
        <div className={cn("flex items-center w-full", isCollapsed ? "flex-col gap-3 justify-center" : "justify-between")}>
          {isCollapsed ? (
            <Link href="/overview" className="mt-1">
              <BrandLogo mark className="h-6 w-6 text-sidebar-foreground" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/overview">
                <BrandLogo className="text-sidebar-foreground" />
              </Link>
              {versionInfo && process.env.NODE_ENV !== "production" && (
                <span className="text-[10px] font-normal text-muted-foreground mt-1">v{versionInfo.ui}</span>
              )}
            </div>
          )}
          <div className={cn("flex items-center gap-2", isCollapsed && "hidden")}>
            {isBehind && latestRelease && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://docs.dograh.com/deployment/update"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-amber-900 transition-opacity hover:opacity-80 dark:bg-amber-950 dark:text-amber-200"
                  >
                    <ArrowUpCircle className="h-3 w-3" />
                    Update
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Latest: {latestRelease} - click to see the update guide</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isLatest && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center rounded-md border bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    Latest
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>You&apos;re running the latest release</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <SidebarTrigger className={cn("hover:bg-sidebar-accent h-8 w-8 rounded-lg border border-border bg-sidebar-accent/50 text-sidebar-foreground", isCollapsed && "mx-auto")}>
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </SidebarTrigger>
        </div>

        {provider === "stack" && (
          <div className={cn("mt-3 notranslate", isCollapsed && "hidden")} translate="no">
            <SidebarTeamSwitcher />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="notranslate py-4 space-y-4 no-scrollbar" translate="no">
        {NAV_SECTIONS.map((section) => (
          <SidebarGroup
            key={section.label ?? "overview"}
            className="p-0 space-y-1"
          >
            {section.label && (
              <SidebarGroupLabel
                className={cn(
                  "notranslate text-[10px] font-semibold capitalize tracking-wide text-muted-foreground/45 px-5 h-6 mb-0.5 mt-2 first:mt-0",
                  isCollapsed && "hidden"
                )}
                translate="no"
              >
                {section.label.toLowerCase()}
              </SidebarGroupLabel>
            )}
            <SidebarMenu className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarLink item={item} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter
        className={cn("border-t border-sidebar-border bg-sidebar", isCollapsed ? "p-2" : "p-4")}
        translate="no"
      >
        <div className="space-y-2">
          {provider !== "stack" && (
            <div className={cn("flex items-center gap-2 justify-between", isCollapsed && "flex-col gap-3")}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {userChipTrigger}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      {(user as LocalUser | undefined)?.email && (
                        <p className="text-xs text-muted-foreground">{(user as LocalUser).email}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Platform Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-500 focus:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {!isCollapsed && (
                <div className="flex items-center gap-2">
                  {hireExpertButton}
                  <ThemeToggle
                    showLabel={false}
                    className="h-8 w-8 rounded-lg border border-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
                  />
                </div>
              )}

              {isCollapsed && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  {hireExpertButton}
                  <ThemeToggle
                    showLabel={false}
                    className="h-8 w-8 rounded-lg border border-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
                  />
                </div>
              )}
            </div>
          )}

          {provider === "stack" && (
            <div className={cn("flex items-center gap-2 justify-between", isCollapsed && "flex-col gap-3")}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {userChipTrigger}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      {user?.displayName && (
                        <p className="text-sm font-medium">{user.displayName}</p>
                      )}
                      {(user as { primaryEmail?: string })?.primaryEmail && (
                        <p className="text-xs text-muted-foreground">{(user as { primaryEmail?: string }).primaryEmail}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/handler/account-settings")} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Account settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Platform Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-500 focus:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {!isCollapsed && (
                <div className="flex items-center gap-2">
                  {hireExpertButton}
                  <ThemeToggle
                    showLabel={false}
                    className="h-8 w-8 rounded-lg border border-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
                  />
                </div>
              )}

              {isCollapsed && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  {hireExpertButton}
                  <ThemeToggle
                    showLabel={false}
                    className="h-8 w-8 rounded-lg border border-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
