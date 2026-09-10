"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import Features from "@/components/features";
import { BuiltForSection } from "@/components/built-for";
import { NewReleasePromo } from "@/components/new-release-promo";
import { FAQSection } from "@/components/faq-section";
import { HowItWorks } from "@/components/how-it-works";
import { StickyFooter } from "@/components/sticky-footer";
import { NavBar as TubeNav } from "@/components/ui/tubelight-navbar";
import { Layers, Workflow, ShieldCheck, HelpCircle } from "lucide-react";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "system");
    root.classList.add("dark");
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMobileNavClick = (elementId: string) => {
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        const headerOffset = 120; // Account for sticky header height + margin
        const elementPosition =
          element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen w-full relative landing-ambient no-scrollbar">
      {/* Top atmospheric blue glow layer */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-[45vh] landing-skyglow z-0" />

      {/* Desktop Header */}
      <header
        className={`sticky top-4 z-[9999] mx-auto hidden w-full flex-row items-center justify-between self-start rounded-full bg-background/80 md:flex backdrop-blur-sm border border-border/50 shadow-lg transition-all duration-300 ${
          isScrolled ? "max-w-3xl px-2" : "max-w-5xl px-4"
        } py-2`}
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          perspective: "1000px",
        }}
      >
        <Link
          href="/"
          className={`z-50 flex items-center justify-center gap-2 text-sm font-semibold tracking-tight transition-all duration-300 ${
            isScrolled ? "ml-4" : ""
          }`}
        >
          BlockLedger
        </Link>

        <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center md:flex">
          <TubeNav
            fixed={false}
            items={[
              { name: "Platform", url: "#features", icon: Layers },
              { name: "How it works", url: "#how-it-works", icon: Workflow },
              { name: "Built for", url: "#built-for", icon: ShieldCheck },
              { name: "FAQ", url: "#faq", icon: HelpCircle },
            ]}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* <Link
            href="/login"
            className="font-medium transition-colors hover:text-foreground text-muted-foreground text-sm cursor-pointer px-3 py-2 rounded-md hover:bg-background/50"
            onClick={() => console.log('Login button clicked - navigating to /login')}
          >
            Log In
          </Link> */}

          <Link
            href="/dashboard"
            className="rounded-md font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-4 py-2 text-sm"
          >
            Launch Platform
          </Link>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-4 z-[9999] mx-4 flex w-auto flex-row items-center justify-between rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg md:hidden px-4 py-3 overflow-x-clip">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-sm font-semibold tracking-tight"
        >
          BlockLedger
        </Link>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border/50 transition-colors hover:bg-background/80"
          aria-label="Toggle menu"
        >
          <div className="flex flex-col items-center justify-center w-5 h-5 space-y-1">
            <span
              className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${
                isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""
              }`}
            ></span>
            <span
              className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${
                isMobileMenuOpen ? "opacity-0" : ""
              }`}
            ></span>
            <span
              className={`block w-4 h-0.5 bg-foreground transition-all duration-300 ${
                isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
              }`}
            ></span>
          </div>
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm md:hidden">
          <div className="absolute top-20 left-4 right-4 bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl p-6">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => handleMobileNavClick("features")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50"
              >
                Platform
              </button>
              <button
                onClick={() => handleMobileNavClick("how-it-works")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50"
              >
                How it works
              </button>
              <button
                onClick={() => handleMobileNavClick("built-for")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50"
              >
                Built for
              </button>
              <button
                onClick={() => handleMobileNavClick("faq")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50"
              >
                FAQ
              </button>
              <div className="border-t border-border/50 pt-4 mt-4 flex flex-col space-y-3">
                <Link
                  href="/audit"
                  className="px-4 py-3 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-background/50 cursor-pointer"
                >
                  Audit Trail
                </Link>
                <Link
                  href="/dashboard"
                  className="px-4 py-3 text-lg font-bold text-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  Launch Platform
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="section-glow">
        <HeroSection />
      </div>

      {/* Features Section */}
      <div id="features" className="section-glow">
        <Features />
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="section-glow">
        <HowItWorks />
      </div>

      {/* Built For Section */}
      <div id="built-for" className="section-glow">
        <BuiltForSection />
      </div>

      <NewReleasePromo />

      {/* FAQ Section */}
      <div id="faq" className="section-glow">
        <FAQSection />
      </div>

      {/* Sticky Footer */}
      <StickyFooter />
    </div>
  );
}
