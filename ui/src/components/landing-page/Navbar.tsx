"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  ChevronDown,
  ExternalLink,
  Home,
  Hotel,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Stethoscope,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AGENTS = [
  {
    id: "logistics",
    name: "Logistics & Delivery",
    description: "COD pre-dispatch confirmation & instant payment links",
    icon: Truck,
    href: "https://logistics.talkar.in",
    isLive: true,
  },
  {
    id: "hotel",
    name: "Hotel Bookings",
    description: "Autonomous room reservation & guest concierge",
    icon: Hotel,
    isLive: false,
  },
  {
    id: "medical",
    name: "Clinic Appointments",
    description: "Doctor scheduling & patient appointment triage",
    icon: Stethoscope,
    isLive: false,
  },
  {
    id: "sales",
    name: "Inbound Sales",
    description: "High-intent lead qualification & CRM logging",
    icon: Briefcase,
    isLive: false,
  },
  {
    id: "service",
    name: "Service Dispatch",
    description: "Emergency technician routing & job confirmation",
    icon: Wrench,
    isLive: false,
  },
  {
    id: "real_estate",
    name: "Real Estate",
    description: "Buyer qualification & property viewing coordination",
    icon: Home,
    isLive: false,
  },
  {
    id: "recruiter",
    name: "Hiring & Screening",
    description: "Candidate resume screening & initial interviews",
    icon: Users,
    isLive: false,
  },
];

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Desktop Agents dropdown state
  const [isAgentsOpen, setIsAgentsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const agentsRef = useRef<HTMLDivElement | null>(null);

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileAgentsOpen, setIsMobileAgentsOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsAgentsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsAgentsOpen(false);
    }, 350);
  };

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentsRef.current && !agentsRef.current.contains(event.target as Node)) {
        setIsAgentsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Lock body scroll when mobile menu is open & close on escape
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const displayIdentity = user?.displayName || (user as any)?.primaryEmail || "";
  const userInitials =
    displayIdentity
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s: string) => s[0]?.toUpperCase())
      .join("") || "U";

  const profileImageUrl = (user as any)?.profileImageUrl;

  const userChipTrigger = (
    <button
      aria-label="User Account Menu"
      className="h-9 w-9 md:h-10 md:w-10 shrink-0 cursor-pointer rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white overflow-hidden p-0 transition-colors flex items-center justify-center outline-none"
    >
      {profileImageUrl ? (
        <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs md:text-sm font-semibold">{userInitials}</span>
      )}
    </button>
  );

  return (
    <header className="relative z-50 w-full">
      <nav className="container mx-auto px-4 sm:px-6 py-4 md:py-6 flex items-center justify-between relative">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer group" onClick={closeMobileMenu}>
          <svg version="1.1" viewBox="0 0 300 97.83" className="h-7 sm:h-8 w-auto text-white group-hover:opacity-90 transition-opacity" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="talkar-k-gradient-nav" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5500" />
                <stop offset="100%" stopColor="#E11D48" />
              </linearGradient>
            </defs>
            <g fill="none" fillRule="nonzero">
              <path d="M14.08,14.99h14v16.6h17.52c-0.05,4.22 0,8.53 0,12.75h-17.52v10.34c0,2.34-0.08,4.69 0.07,7.03 0.62,9.51 10.2,9.29 17.24,9.29h4.98l-0.38,12.26c-2.84,0.07-5.69,0.1-8.54,0.1-12.14-0.12-23.86-2.47-26.69-16.18-0.8-3.89-0.7-7.46-0.69-11.39v-9.58z" fill="#fcfbf7"/>
              <path d="M74.54,30.82c6.4-0.64 12.6,1.79 16.87,6.55v-5.74h13.59v50.96h-13.63v-5.17c-0.86,0.84-1.49,1.37-2.43,2.13-7.98,6.05-20.7,4.8-28.13-1.6-16.95-14.61-10.08-45.18 13.72-47.12z" fill="#fcfbf7"/>
              <path d="M77.07,43.55c7.58-0.76 14.33,4.78 15.06,12.36 0.74,7.58-4.82,14.31-12.4,15.03-7.55,0.71-14.26-4.82-14.99-12.37-0.73-7.55 4.78-14.27 12.33-15.02z" fill="#121316"/>
              <path d="M115.03,14.63h13.59v67.96h-13.59z" fill="#fcfbf7"/>
              <path d="M133.15,14.92h84.4l-3.66,10.74h-34.26v10.02c6.96-5.5 17.95-3.32 23.08,3.56 7.89,10.59 4.3,24.58-5.5,32.4 4.14,5.82 8.54,11.53 12.67,17.34h-14.65l-11.19-15.45c-1.04-1.45-2.07-2.91-3.07-4.39 6.2-3.77 13.06-8.27 13.44-16.34 0.47-10-12.63-11.39-14.55-2.11-0.56,2.68-0.24,7.79-0.24,10.72v21.11h-12.53c-0.06-4.33 0.03-8.66 0.03-12.99-2.95,2.5-5.68,4.01-9.57,4.52-5.1,0.69-10.27-0.7-14.33-3.86-9.46-7.31-10.16-21.34-3.12-30.54 6.38-8.33 18.46-10.99 27-4.3-0.11-3.15 0-6.55-0.03-9.75h-33.86z" fill="url(#talkar-k-gradient-nav)"/>
              <path d="M156.81,43.38c4.1-0.59 7.46,1.4 10.23,4.2 0.62,6.67-1.95,12.94-8.97,14.62-13.19,1.52-13.72-16.59-1.26-18.82z" fill="#121316"/>
              <path d="M233.12,30.81c0.54-0.09 2.43-0.06 3.02-0.02 5.82,0.4 10.2,2.32 14.06,6.65v-5.82h13.49v50.95h-13.5v-5.3c-0.92,0.92-1.52,1.44-2.54,2.25-8.27,5.74-20.21,5.06-27.89-1.41-17.16-14.44-10.55-45.17 13.35-47.3z" fill="#fcfbf7"/>
              <path d="M235.66,43.54c7.6-0.81 14.41,4.73 15.16,12.34 0.75,7.61-4.83,14.37-12.44,15.07-7.54,0.69-14.22-4.82-14.97-12.35-0.75-7.53 4.72-14.25 12.25-15.05z" fill="#121316"/>
              <path d="M286.19,30.96c1.17-0.18 7-0.05 8.55-0.03l-0.03,12.53c-1.29-0.04-2.58-0.08-3.87-0.1-6.43-0.05-7.18,2.95-7.15,8.77 0.01,2.54 0.01,5.2 0.01,7.75v22.7h-13.43v-24.21c0-6.47-0.83-14.03 2.52-19.79 2.94-5.05 7.83-7.16 13.38-7.62z" fill="#fcfbf7"/>
            </g>
          </svg>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-7 text-sm font-medium text-gray-300">
          {/* Agents Dropdown */}
          <div
            ref={agentsRef}
            className="relative py-2 -my-2 group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setIsAgentsOpen((prev) => !prev)}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer focus:outline-none"
            >
              <span className={isAgentsOpen ? "text-white" : ""}>Agents</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 text-gray-400 group-hover:text-white ${
                  isAgentsOpen ? "rotate-180 text-white" : "group-hover:rotate-180"
                }`}
              />
            </button>

            {/* Submenu Dropdown */}
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className={`absolute top-full left-0 md:-left-3 pt-2 transition-all duration-150 z-[100] ${
                isAgentsOpen
                  ? "opacity-100 visible translate-y-0 pointer-events-auto"
                  : "opacity-0 invisible -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto"
              }`}
            >
              <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent pointer-events-auto" />
              <div className="w-[330px] p-1.5 rounded-2xl bg-[#0c0d10] border border-white/15 shadow-2xl shadow-black relative z-[101]">
                <div className="space-y-0.5 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
                  {AGENTS.map((agent) => {
                    const Icon = agent.icon;
                    if (agent.isLive) {
                      return (
                        <a
                          key={agent.id}
                          href={agent.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/item flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer"
                        >
                          <div className="p-2 rounded-lg bg-white/5 text-gray-300 group-hover/item:text-white group-hover/item:bg-white/10 transition-colors mt-0.5 shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1.5 justify-between">
                              <span className="text-xs font-semibold text-white tracking-tight">{agent.name}</span>
                              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Live
                                </span>
                                <ExternalLink className="w-3 h-3 text-gray-400 group-hover/item:text-white shrink-0" />
                              </div>
                            </div>
                            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{agent.description}</p>
                          </div>
                        </a>
                      );
                    }

                    return (
                      <div
                        key={agent.id}
                        className="group/item flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer select-none"
                      >
                        <div className="p-2 rounded-lg bg-white/5 text-gray-300 group-hover/item:text-white group-hover/item:bg-white/10 transition-colors mt-0.5 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="text-xs font-semibold text-white tracking-tight">{agent.name}</span>
                            <span className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/15 text-white border border-white/20 whitespace-nowrap ml-auto shrink-0">
                              Coming Soon
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{agent.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <a className="hover:text-white transition-colors" href="#problem">The Problem</a>
          <a className="hover:text-white transition-colors" href="#capabilities">Solution</a>
          <a className="hover:text-white transition-colors" href="#homebase">Enterprise</a>
          <a className="hover:text-white transition-colors" href="#why-talkar">Results</a>
          <a className="hover:text-white transition-colors" href="#faq">FAQ's</a>
        </div>

        {/* Right Area: Desktop CTA & User + Mobile Header Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Desktop Auth / CTA */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {userChipTrigger}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="end" className="w-56 mt-2 shadow-2xl">
                  <DropdownMenuLabel className="font-normal p-3 bg-muted/30">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold tracking-tight">{displayIdentity}</p>
                      {(user as any)?.primaryEmail && displayIdentity !== (user as any)?.primaryEmail && (
                        <p className="text-xs text-muted-foreground">{(user as any)?.primaryEmail}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/overview")} className="cursor-pointer py-2.5">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span className="font-medium">Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer py-2.5">
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="font-medium">Platform Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void logout()} className="cursor-pointer text-red-500 focus:text-red-500 py-2.5">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-medium">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <a href="/handler/sign-in" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  Sign In
                </a>
                <a
                  className="bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:opacity-95 text-white px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 shadow-md shadow-orange-500/20"
                  href="/handler/sign-up"
                >
                  Get Started Free
                </a>
              </>
            )}
          </div>

          {/* Mobile Right Controls: User Avatar or Quick CTA + Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {userChipTrigger}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="end" className="w-56 mt-2 shadow-2xl">
                  <DropdownMenuLabel className="font-normal p-3 bg-muted/30">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold tracking-tight">{displayIdentity}</p>
                      {(user as any)?.primaryEmail && displayIdentity !== (user as any)?.primaryEmail && (
                        <p className="text-xs text-muted-foreground">{(user as any)?.primaryEmail}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/overview")} className="cursor-pointer py-2.5">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span className="font-medium">Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer py-2.5">
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="font-medium">Platform Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void logout()} className="cursor-pointer text-red-500 focus:text-red-500 py-2.5">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-medium">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <a
                href="/handler/sign-up"
                className="bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm shadow-orange-500/20 active:scale-95 transition-transform"
              >
                Get Started
              </a>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
              className="p-2 rounded-xl text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Production-Ready Responsive Mobile Drawer / Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden w-full bg-[#090A0F]/95 backdrop-blur-2xl border-b border-white/15 shadow-2xl shadow-black relative z-50 overflow-hidden"
          >
            <div className="container mx-auto px-4 sm:px-6 py-5 max-h-[calc(100vh-80px)] overflow-y-auto no-scrollbar space-y-4">
              
              {/* Agents Expandable Section */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileAgentsOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span>Explore Agents</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      isMobileAgentsOpen ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isMobileAgentsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/10 p-2 space-y-1 bg-black/30"
                    >
                      {AGENTS.map((agent) => {
                        const Icon = agent.icon;
                        if (agent.isLive) {
                          return (
                            <a
                              key={agent.id}
                              href={agent.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={closeMobileMenu}
                              className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
                            >
                              <div className="p-2 rounded-lg bg-orange-500/15 text-orange-400 shrink-0 mt-0.5">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-white">{agent.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      Live
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                  </div>
                                </div>
                                <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{agent.description}</p>
                              </div>
                            </a>
                          );
                        }

                        return (
                          <div
                            key={agent.id}
                            className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-transparent text-gray-300"
                          >
                            <div className="p-2 rounded-lg bg-white/5 text-gray-400 shrink-0 mt-0.5">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-white/90">{agent.name}</span>
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-white/10 text-gray-300 border border-white/15">
                                  Coming Soon
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{agent.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <a
                  href="#problem"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>The Problem</span>
                  <span className="text-xs text-gray-500 font-mono">01</span>
                </a>
                <a
                  href="#capabilities"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>Solution</span>
                  <span className="text-xs text-gray-500 font-mono">02</span>
                </a>
                <a
                  href="#homebase"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>Enterprise</span>
                  <span className="text-xs text-gray-500 font-mono">03</span>
                </a>
                <a
                  href="#why-talkar"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>Results</span>
                  <span className="text-xs text-gray-500 font-mono">04</span>
                </a>
                <a
                  href="#faq"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>FAQ's</span>
                  <span className="text-xs text-gray-500 font-mono">05</span>
                </a>
              </div>

              {/* Mobile Menu Footer Actions */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-semibold overflow-hidden shrink-0">
                        {profileImageUrl ? (
                          <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          userInitials
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{displayIdentity}</p>
                        {(user as any)?.primaryEmail && (
                          <p className="text-[11px] text-gray-400 truncate">{(user as any)?.primaryEmail}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          closeMobileMenu();
                          router.push("/overview");
                        }}
                        className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Dashboard</span>
                      </button>
                      <button
                        onClick={() => {
                          closeMobileMenu();
                          router.push("/settings");
                        }}
                        className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        closeMobileMenu();
                        void logout();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <a
                      href="/handler/sign-in"
                      onClick={closeMobileMenu}
                      className="w-full py-3 px-4 rounded-xl text-center text-xs font-semibold text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors block"
                    >
                      Sign In
                    </a>
                    <a
                      href="/handler/sign-up"
                      onClick={closeMobileMenu}
                      className="w-full py-3.5 px-4 rounded-xl text-center text-xs font-bold text-white bg-gradient-to-r from-[#FF5500] to-[#E11D48] shadow-lg shadow-orange-500/25 transition-all block"
                    >
                      Get Started Free
                    </a>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
