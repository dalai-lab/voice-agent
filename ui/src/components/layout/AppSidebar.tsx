"use client";

import * as PhosphorIcons from "@phosphor-icons/react";
import {
  AlertTriangle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
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
import { useOrgConfig } from "@/context/OrgConfigContext";
import { useLeadForms } from "@/context/LeadFormsContext";
import { useTelephonyConfigWarnings } from "@/context/TelephonyConfigWarningsContext";
import { useLatestReleaseVersion } from "@/hooks/useLatestReleaseVersion";
import type { LocalUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type SidebarSingleItem = {
  type?: "single";
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  showsTelephonyWarning?: boolean;
};

type SidebarGroupItem = {
  type: "group";
  title: string;
  icon: React.ComponentType<any>;
  items: SidebarSingleItem[];
};

type SidebarNavItem = SidebarSingleItem | SidebarGroupItem;

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
      {
        title: "AI Voice Models",
        url: "/models",
        icon: PhosphorIcons.Brain,
      },
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
        title: "Reports & Analytics",
        url: "/reports",
        icon: PhosphorIcons.ChartBar,
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      {
        type: "group",
        title: "Call Activity",
        icon: PhosphorIcons.PhoneCall,
        items: [
          {
            title: "Call History",
            url: "/runs",
            icon: PhosphorIcons.ClockCounterClockwise,
          },
          {
            title: "Scheduled Callbacks",
            url: "/callbacks",
            icon: PhosphorIcons.PhoneCall,
          },
        ],
      },
      {
        type: "group",
        title: "Agent Resources",
        icon: PhosphorIcons.Wrench,
        items: [
          {
            title: "Tools & Integrations",
            url: "/tools",
            icon: PhosphorIcons.Wrench,
          },
          {
            title: "Knowledge Base",
            url: "/files",
            icon: PhosphorIcons.Database,
          },
          {
            title: "Audio Library",
            url: "/recordings",
            icon: PhosphorIcons.VinylRecord,
          },
        ],
      },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      {
        type: "group",
        title: "Account & Settings",
        icon: PhosphorIcons.Gear,
        items: [
          {
            title: "General Settings",
            url: "/settings",
            icon: PhosphorIcons.Gear,
          },
          {
            title: "Telephony & Providers",
            url: "/telephony-configurations",
            icon: PhosphorIcons.Phone,
            showsTelephonyWarning: true,
          },
          {
            title: "AI Models",
            url: "/model-configurations",
            icon: PhosphorIcons.Brain,
          },
          {
            title: "API Keys",
            url: "/api-keys",
            icon: PhosphorIcons.Key,
          },
          {
            title: "Usage & Logs",
            url: "/usage",
            icon: PhosphorIcons.TrendUp,
          },
          {
            title: "Billing & Plans",
            url: "/billing",
            icon: PhosphorIcons.CreditCard,
          },
        ],
      },
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
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const {
    telnyxMissingWebhookPublicKeyCount,
    vonageMissingSignatureSecretCount,
  } = useTelephonyConfigWarnings();
  const hasTelephonyWarning =
    telnyxMissingWebhookPublicKeyCount > 0 ||
    vonageMissingSignatureSecretCount > 0;
  const isCollapsed = !isMobile && state === "collapsed";

  const [isTalkarCustomer, setIsTalkarCustomer] = React.useState(false);
  const [isAdminBypass, setIsAdminBypass] = React.useState(false);

  React.useEffect(() => {
    setIsAdminBypass(document.cookie.includes('talkar_admin_bypass=true'));
  }, []);

  React.useEffect(() => {
    // Skip if admin bypass is active, or org context not loaded yet
    if (isAdminBypass || !dograhOrgId) return;

    fetch(`/api/talkar/customers/status?dograh_org_id=${dograhOrgId}`)
      .then(async r => {
        if (!r.ok) return; // 404 = new customer, fail open (will be gated by AppLayout anyway)
        const data = await r.json();
        // Any valid Talkar customer record means this is a managed Talkar org
        if (data?.status) setIsTalkarCustomer(true);
      })
      .catch(() => { /* fail open */ });
  }, [dograhOrgId, isAdminBypass]);

  const filteredNavSections = React.useMemo(() => {
    const TALKAR_CUSTOMER_HIDDEN_URLS = [
      "/telephony-configurations",
      "/model-configurations",
      "/api-keys",
      "/usage",
      "/billing",
    ];

    const isCustomerView = isTalkarCustomer && !isAdminBypass;

    const visibleSections = isCustomerView
      ? NAV_SECTIONS.map(section => ({
          ...section,
          items: section.items.map(item => {
            if (item.type === "group") {
              const group = item as SidebarGroupItem;
              return {
                ...group,
                items: group.items.filter(subItem => {
                  const url = subItem.url;
                  return url ? !TALKAR_CUSTOMER_HIDDEN_URLS.includes(url) : true;
                })
              };
            }
            return item;
          }).filter(item => {
            if (item.type === "single") {
              return !(item as SidebarSingleItem).url || !TALKAR_CUSTOMER_HIDDEN_URLS.includes((item as SidebarSingleItem).url);
            }
            if (item.type === "group") {
              return (item as SidebarGroupItem).items.length > 0;
            }
            return false;
          }),
        })).filter(section => section.items.length > 0)
      : NAV_SECTIONS.map(section => ({ ...section, items: [...section.items] }));

    if (isTalkarCustomer && visibleSections.length > 0) {
      visibleSections[0].items.push({
        type: "single",
        title: "Wallet & Credits",
        url: "/wallet",
        icon: PhosphorIcons.Wallet,
      } as SidebarSingleItem);

      visibleSections.push({
        label: "HELP & SUPPORT",
        items: [
          {
            type: "single",
            title: "Contact Support",
            url: "mailto:it@4thorbit.in?subject=Support%20Request",
            icon: PhosphorIcons.Envelope,
          },
          {
            type: "single",
            title: "Feature Requests",
            url: "mailto:it@4thorbit.in?subject=Feature%20Request",
            icon: PhosphorIcons.Lightbulb,
          }
        ]
      });
    }

    return visibleSections;
  }, [isTalkarCustomer, isAdminBypass]);

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

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const nextState: Record<string, boolean> = {};
    filteredNavSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.type === "group") {
          const hasActiveChild = item.items.some((child) => isActive(child.url));
          if (hasActiveChild) {
            nextState[item.title] = true;
          }
        }
      });
    });
    setOpenGroups((prev) => ({ ...nextState, ...prev }));
  }, [pathname, filteredNavSections]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const SidebarSingleLink = ({ item, isSubItem = false }: { item: SidebarSingleItem; isSubItem?: boolean }) => {
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
          isCollapsed
            ? "mx-auto h-8.5"
            : isSubItem
            ? "ml-6 mr-2 w-[calc(100%-32px)] h-8"
            : "mx-2 w-[calc(100%-16px)] h-8.5",
          isItemActive
            ? "bg-cta/[0.05] border-transparent text-cta font-semibold before:absolute before:left-0.5 before:top-[20%] before:h-[60%] before:w-0.75 before:rounded-full before:bg-cta"
            : "border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
        )}
      >
        <Link
          href={item.url}
          onClick={handleMobileNavClick}
          className={cn("flex items-center gap-2.5 px-2.5", isCollapsed && "justify-center px-0 w-full h-full")}
          translate="no"
        >
          <Icon
            className={cn(
              "shrink-0 transition-colors",
              isSubItem ? "h-3.5 w-3.5" : "h-4 w-4",
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

  const SidebarGroupMenu = ({ group }: { group: SidebarGroupItem }) => {
    const isExpanded = !!openGroups[group.title];
    const hasActiveChild = group.items.some((child) => isActive(child.url));
    const hasGroupWarning = group.items.some((child) => child.showsTelephonyWarning && hasTelephonyWarning);
    const Icon = group.icon;

    if (isCollapsed) {
      return (
        <div className="space-y-1">
          {group.items.map((child) => (
            <SidebarMenuItem key={child.title}>
              <SidebarSingleLink item={child} />
            </SidebarMenuItem>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        <SidebarMenuButton
          onClick={() => toggleGroup(group.title)}
          className={cn(
            "mx-2 w-[calc(100%-16px)] h-8.5 rounded-lg transition-all duration-150 text-xs font-medium select-none border border-transparent px-2.5 flex items-center justify-between text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground cursor-pointer",
            hasActiveChild && "text-sidebar-foreground font-semibold"
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            <Icon className={cn("h-4 w-4 shrink-0", hasActiveChild ? "text-cta" : "text-muted-foreground")} />
            <span className="truncate text-xs font-sans tracking-tight">{group.title}</span>
            {hasGroupWarning && (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
            )}
          </div>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200 shrink-0",
              isExpanded && "rotate-90 text-sidebar-foreground"
            )}
          />
        </SidebarMenuButton>

        {isExpanded && (
          <div className="space-y-0.5 relative before:absolute before:left-5 before:top-1 before:bottom-1 before:w-px before:bg-sidebar-border/60">
            {group.items.map((child) => (
              <SidebarMenuItem key={child.title}>
                <SidebarSingleLink item={child} isSubItem />
              </SidebarMenuItem>
            ))}
          </div>
        )}
      </div>
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
        {filteredNavSections.map((section) => (
          <SidebarGroup
            key={section.label ?? "main"}
            className="p-0 space-y-1"
          >
            {section.label && (
              <SidebarGroupLabel
                className={cn(
                  "notranslate text-[10px] font-semibold tracking-wider text-muted-foreground/45 px-5 h-6 mb-0.5 mt-2 first:mt-0 uppercase",
                  isCollapsed && "hidden"
                )}
                translate="no"
              >
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu className="space-y-0.5">
              {section.items.map((item) =>
                item.type === "group" ? (
                  <SidebarGroupMenu key={item.title} group={item} />
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarSingleLink item={item} />
                  </SidebarMenuItem>
                )
              )}
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
                    General Settings
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
