import { FileText, Handshake, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: "01",
    icon: FileText,
    title: "Post a Project",
    description:
      "ระบุรายละเอียดงาน กำหนด Budget และแบ่ง Milestone ให้ชัดเจน งานของคุณจะถูกแสดงต่อฟรีแลนซ์ที่ผ่านการยืนยันตัวตนแล้ว",
    iconClass: "bg-blue-50 text-primary",
  },
  {
    number: "02",
    icon: Handshake,
    title: "Review & Accept Offers",
    description:
      "ฟรีแลนซ์ส่ง Proposal มาให้คุณเลือก ดู Portfolio, Rating และ Cover Letter แล้วเลือกคนที่ใช่",
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Get Paid via Escrow",
    description:
      "เงินถูกล็อกใน Escrow ทุก Milestone งานส่งแล้ว คุณอนุมัติ — เงินปล่อยอัตโนมัติ ปลอดภัยทั้งสองฝ่าย",
    iconClass: "bg-green-50 text-green-600",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-background/60 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary font-ui">
            วิธีการทำงาน
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl font-ui">
            ง่าย. โปร่งใส. ปลอดภัย.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-text-secondary">
            จากการโพสต์งานจนถึงการรับเงิน ใน 3 ขั้นตอนที่ชัดเจน
            ไม่มีเซอร์ไพรส์ ปัญหาทุกอย่างมีระบบจัดการ
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative flex flex-col items-start rounded-xl border border-border bg-white p-6 shadow-sm"
            >
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="absolute right-0 top-10 hidden h-px w-8 translate-x-full bg-border md:block" />
              )}

              <div
                className={cn(
                  "mb-5 flex h-12 w-12 items-center justify-center rounded-xl",
                  step.iconClass,
                )}
              >
                <step.icon className="h-6 w-6" />
              </div>

              <span className="mb-2 text-xs font-bold tracking-widest text-text-subtle font-ui">
                {step.number}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-text-primary font-ui">{step.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
