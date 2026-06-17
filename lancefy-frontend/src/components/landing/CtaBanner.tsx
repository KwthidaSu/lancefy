import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="bg-primary py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-white/15 p-3">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl font-ui">
          พร้อมสร้างสิ่งดีๆ แล้วหรือยัง?
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-white/80">
          ร่วมกับนายจ้างและฟรีแลนซ์หลายพันคนที่ไว้วางใจ Lancefy
          ในการส่งมอบงานคุณภาพ — ทุกครั้ง ตรงเวลา
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-base font-semibold text-primary transition-colors hover:bg-white/90 font-ui"
          >
            สร้างบัญชีฟรี
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/app/explore/jobs"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10 font-ui"
          >
            ค้นหางาน
          </Link>
        </div>
      </div>
    </section>
  );
}
