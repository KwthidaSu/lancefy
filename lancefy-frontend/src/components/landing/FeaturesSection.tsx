import {
  ShieldCheck,
  Layers,
  Users2,
  MessageSquare,
  BadgeCheck,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: ShieldCheck,
    title: "Escrow Protection",
    description:
      "เงินของคุณปลอดภัย 100% — ถูกล็อกไว้และปล่อยเฉพาะเมื่อคุณอนุมัติงานที่ส่งมาเท่านั้น",
    iconClass: "text-green-600 bg-green-50",
  },
  {
    icon: Layers,
    title: "Milestone-Based Delivery",
    description:
      "แบ่งโปรเจกต์เป็นขั้นตอน จ่ายเป็น Lot ติดตามความคืบหน้า และอนุมัติงานทีละส่วน",
    iconClass: "text-primary bg-blue-50",
  },
  {
    icon: Users2,
    title: "Dual-Role Accounts",
    description:
      "เป็นได้ทั้งนายจ้างและฟรีแลนซ์ในบัญชีเดียว ไม่ต้องสมัครใหม่ สะดวกสุดๆ",
    iconClass: "text-violet-600 bg-violet-50",
  },
  {
    icon: MessageSquare,
    title: "Real-Time Chat",
    description:
      "Chat ในโปรเจกต์พร้อมแนบไฟล์ได้ ทุกข้อความมี Timestamp และเก็บไว้เป็นหลักฐานทางกฎหมาย",
    iconClass: "text-primary bg-blue-50",
  },
  {
    icon: BadgeCheck,
    title: "KYC Verified Freelancers",
    description:
      "ฟรีแลนซ์ทุกคนผ่านการยืนยันตัวตน คุณจึงมั่นใจได้ว่าทำงานกับมืออาชีพจริงๆ",
    iconClass: "text-amber-600 bg-amber-50",
  },
  {
    icon: RefreshCw,
    title: "Auto-Release Policy",
    description:
      "หากลืม Review ระบบจะปล่อยเงินอัตโนมัติหลัง 7 วัน เพื่อความยุติธรรมกับฟรีแลนซ์เสมอ",
    iconClass: "text-green-600 bg-green-50",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary font-ui">
            Platform Features
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl font-ui">
            สร้างขึ้นบนพื้นฐานความน่าเชื่อถือทุกขั้นตอน
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div
                className={cn(
                  "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg",
                  feature.iconClass,
                )}
              >
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-text-primary font-ui">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
