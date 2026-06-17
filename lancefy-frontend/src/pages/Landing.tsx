import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import {
  ArrowRight,
  BadgeCheck,
  Layers3,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { CategoryShowcase } from "@/components/landing/CategoryShowcase";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { Footer } from "@/components/landing/Footer";
import { FreelancerShowcase } from "@/components/landing/FreelancerShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { StatsBar } from "@/components/landing/StatsBar";

type AuthAction = "login" | "register" | null;

const heroHighlights = [
  "Escrow คุ้มครองทุก milestone",
  "ฟรีแลนซ์ผ่านการยืนยันตัวตน",
  "แชตและไฟล์รวมในงานเดียว",
];

const trustStats = [
  { label: "Projects with escrow", value: "12.4K+" },
  { label: "Verified creatives", value: "5.2K+" },
  { label: "Released on time", value: "97%" },
];

export default function Landing() {
  const { keycloak, initialized } = useKeycloak();
  const navigate = useNavigate();
  const [authAction, setAuthAction] = useState<AuthAction>(null);

  useEffect(() => {
    if (!initialized || !keycloak.authenticated) return;

    const roles = keycloak.tokenParsed?.realm_access?.roles ?? [];

    if (roles.includes("platform_admin") || roles.includes("staff")) {
      navigate("/admin", { replace: true });
      return;
    }

    navigate("/app", { replace: true });
  }, [initialized, keycloak.authenticated, keycloak.tokenParsed, navigate]);

  const handleLogin = async () => {
    if (authAction) return;
    setAuthAction("login");

    try {
      await keycloak.login({
        redirectUri: `${window.location.origin}/app`,
      });
    } catch {
      setAuthAction(null);
    }
  };

  const handleRegister = async () => {
    if (authAction) return;
    setAuthAction("register");

    try {
      await keycloak.register({
        redirectUri: `${window.location.origin}/app`,
      });
    } catch {
      setAuthAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_18%,#ffffff_40%,#f7fbff_100%)] text-text-primary">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,rgba(27,77,170,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(98,138,255,0.16),transparent_30%),radial-gradient(circle_at_center,rgba(146,190,255,0.12),transparent_44%)]" />
        <div className="pointer-events-none absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="pointer-events-none absolute right-[-7rem] top-16 h-80 w-80 rounded-full bg-blue-300/25 blur-3xl" />

        <header className="relative z-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#173b83_0%,#2d64d8_100%)] shadow-[0_14px_28px_rgba(23,59,131,0.22)]">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-text-primary">Lancefy</p>
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Escrow marketplace</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-text-secondary md:flex">
              <a href="#features" className="transition-colors hover:text-primary">Features</a>
              <a href="#how-it-works" className="transition-colors hover:text-primary">How it works</a>
              <a href="#talent" className="transition-colors hover:text-primary">Talent</a>
            </nav>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleLogin}
                isLoading={authAction === "login"}
                disabled={!!authAction}
                className="hidden sm:inline-flex"
              >
                เข้าสู่ระบบ
              </Button>
              <Button
                onClick={handleRegister}
                isLoading={authAction === "register"}
                disabled={!!authAction}
                className="rounded-full px-5 shadow-[0_16px_30px_rgba(27,77,170,0.18)]"
              >
                เริ่มต้นใช้งาน
              </Button>
            </div>
          </div>
        </header>

        <main className="relative z-10">
          <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
            <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--primary)/0.16)] bg-white/80 px-4 py-2 text-sm font-medium text-primary shadow-[0_8px_22px_rgba(20,42,90,0.06)] backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                  Platform สำหรับจ้างงานครีเอทีฟแบบโปร่งใส
                </div>

                <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
                  จ้างงานและปล่อยเงิน
                  <span className="block bg-[linear-gradient(135deg,#173b83_0%,#2d64d8_55%,#6e9eff_100%)] bg-clip-text text-transparent">
                    ผ่าน Escrow ทีละ Milestone
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                  Lancefy ทำให้การทำงานระหว่างลูกค้าและฟรีแลนซ์ชัดเจนขึ้นตั้งแต่การคุยงาน
                  การส่งมอบ ไปจนถึงการจ่ายเงินจริง เพื่อให้ทั้งสองฝั่งมั่นใจในทุกขั้นตอน
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {heroHighlights.map((item) => (
                    <div
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm text-slate-700 shadow-[0_10px_26px_rgba(17,24,39,0.05)] backdrop-blur"
                    >
                      <BadgeCheck className="h-4 w-4 text-lime-600" />
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    onClick={handleRegister}
                    isLoading={authAction === "register"}
                    disabled={!!authAction}
                    className="rounded-full px-8 shadow-[0_18px_40px_rgba(27,77,170,0.22)]"
                  >
                    เริ่มต้นใช้งาน
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={handleLogin}
                    isLoading={authAction === "login"}
                    disabled={!!authAction}
                    className="rounded-full border-white/80 bg-white/85 px-8 shadow-[0_10px_28px_rgba(18,38,82,0.08)] backdrop-blur"
                  >
                    เข้าสู่ระบบ
                  </Button>
                  <Link
                    to="/app/explore/jobs"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-transparent px-6 text-sm font-medium text-slate-600 transition-colors hover:text-primary"
                  >
                    ดูงานทั้งหมด
                  </Link>
                </div>

                <div className="mt-12 grid gap-4 sm:grid-cols-3">
                  {trustStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-3xl border border-white/80 bg-white/78 px-5 py-4 shadow-[0_14px_34px_rgba(18,38,82,0.06)] backdrop-blur"
                    >
                      <p className="text-2xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
                      <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-10 top-12 hidden h-36 w-36 rounded-full bg-sky-200/30 blur-3xl lg:block" />
                <div className="absolute -right-8 bottom-12 hidden h-44 w-44 rounded-full bg-blue-300/30 blur-3xl lg:block" />

                <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(12,37,86,0.98)_0%,rgba(18,55,126,0.98)_100%)] p-5 shadow-[0_30px_80px_rgba(9,22,55,0.26)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,187,255,0.25),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(109,160,255,0.18),transparent_28%)]" />
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-blue-100/70">Active project</p>
                        <h2 className="mt-1 text-xl font-semibold text-white">Brand Identity System</h2>
                      </div>
                      <div className="rounded-full bg-lime-400/15 px-3 py-1 text-xs font-semibold text-lime-200">
                        Escrow secured
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                      <div className="rounded-[28px] bg-white p-5 text-slate-900 shadow-[0_22px_60px_rgba(9,22,55,0.18)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Milestone board</p>
                            <h3 className="mt-1 text-lg font-semibold">3 stages of delivery</h3>
                          </div>
                          <div className="rounded-2xl bg-blue-50 p-3 text-primary">
                            <Layers3 className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="mt-5 space-y-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-slate-900">Concept direction</p>
                                <p className="mt-1 text-sm text-slate-500">Escrow funded and ready to start</p>
                              </div>
                              <span className="rounded-full bg-lime-100 px-2.5 py-1 text-xs font-semibold text-lime-700">
                                Funded
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-slate-900">Design system draft</p>
                                <p className="mt-1 text-sm text-slate-500">In review with attached deliverables</p>
                              </div>
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                Review
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-slate-700">Final export package</p>
                                <p className="mt-1 text-sm text-slate-500">Ready for release after approval</p>
                              </div>
                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                Pending
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 text-white backdrop-blur">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-blue-100/65">Locked payment</p>
                              <p className="mt-2 text-3xl font-semibold">THB 24,500</p>
                            </div>
                            <div className="rounded-2xl bg-white/14 p-3">
                              <WalletCards className="h-5 w-5" />
                            </div>
                          </div>
                          <div className="mt-4 h-2 rounded-full bg-white/10">
                            <div className="h-2 w-[72%] rounded-full bg-[linear-gradient(90deg,#8fcbff_0%,#d2e7ff_100%)]" />
                          </div>
                          <p className="mt-3 text-sm text-blue-100/80">เงินจะถูกปล่อยเมื่อ milestone ผ่านการอนุมัติ</p>
                        </div>

                        <div className="rounded-[28px] bg-white p-5 shadow-[0_22px_60px_rgba(9,22,55,0.14)]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Team communication</p>
                              <p className="mt-1 text-lg font-semibold text-slate-950">Project room active</p>
                            </div>
                            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                              <MessageSquareMore className="h-5 w-5" />
                            </div>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                              ส่งไฟล์ revision ล่าสุดไว้ใน milestone 2 แล้วนะครับ
                            </div>
                            <div className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-white">
                              รับทราบ เดี๋ยว review แล้วอนุมัติปล่อยเงินให้รอบนี้
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <StatsBar />

          <div id="features">
            <FeaturesSection />
          </div>

          <div id="how-it-works">
            <HowItWorks />
          </div>

          <CategoryShowcase />

          <div id="talent">
            <FreelancerShowcase />
          </div>

          <CtaBanner />
        </main>
      </div>

      <Footer />
    </div>
  );
}
