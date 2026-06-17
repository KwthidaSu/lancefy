import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      {/* Dot-grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(var(--border)) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center">
          {/* ── Left: text ──────────────────────────────────────────────── */}
          <div className="flex-1 text-center lg:text-left">
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-3 py-1 text-sm font-medium text-primary-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Escrow-Protected Payments
            </span>

            <h1 className="mt-4 text-balance text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl font-ui">
              Hire top talent.
              <br />
              <span className="text-primary">Get paid securely.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
              Lancefy เชื่อมต่อนายจ้างกับฟรีแลนซ์มืออาชีพ ทุกการชำระเงิน
              ถูกล็อกใน Escrow และปล่อยเมื่องานได้รับการอนุมัติ — ทีละ Milestone
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-hover font-ui"
              >
                เริ่มต้นใช้งาน
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/app/explore/jobs"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-8 py-3 text-base font-semibold text-text-primary transition-colors hover:bg-accent font-ui"
              >
                ค้นหางาน
              </Link>
            </div>

            <p className="mt-4 text-xs text-text-muted font-ui">
              สมัครฟรี · ไม่ต้องใช้บัตรเครดิต
            </p>
          </div>

          {/* ── Right: illustration ─────────────────────────────────────── */}
          <div className="relative flex-1 w-full max-w-lg lg:max-w-none">
            <div className="relative overflow-hidden rounded-2xl border border-border shadow-xl bg-gradient-to-br from-accent via-white to-blue-50 aspect-[4/3]">
              {/* Placeholder illustration */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8 space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="h-10 w-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-border rounded-full w-48 mx-auto" />
                    <div className="h-3 bg-border/60 rounded-full w-36 mx-auto" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-10 rounded-lg bg-white border border-border shadow-sm" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Escrow badge */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-border bg-white/95 px-4 py-2.5 shadow-md backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-text-primary font-ui">Escrow Active</p>
                  <p className="text-[10px] text-text-muted font-ui">฿24,500 locked</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
