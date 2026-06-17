import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const footerLinks: Record<string, { label: string; to: string }[]> = {
  Platform: [
    { label: "ค้นหางาน",      to: "/app/explore/jobs"            },
    { label: "โพสต์โปรเจกต์", to: "/app"                          },
    { label: "วิธีใช้งาน",    to: "/#how-it-works"               },
    { label: "ค่าบริการ",     to: "/#pricing"                    },
  ],
  Company: [
    { label: "เกี่ยวกับเรา", to: "#" },
    { label: "Blog",          to: "#" },
    { label: "ร่วมงานกับเรา", to: "#" },
    { label: "ข่าวสาร",      to: "#" },
  ],
  Support: [
    { label: "ศูนย์ช่วยเหลือ",      to: "#" },
    { label: "Community",            to: "#" },
    { label: "Dispute Resolution",   to: "#" },
    { label: "ติดต่อเรา",           to: "#" },
  ],
  Legal: [
    { label: "Privacy Policy",   to: "#" },
    { label: "Terms of Service", to: "#" },
    { label: "Cookie Policy",    to: "#" },
    { label: "Escrow Terms",     to: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-text-primary font-ui">Lancefy</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-secondary">
              ตลาดงานฟรีแลนซ์ที่มีระบบ Escrow ในตัว
              พร้อมการส่งมอบงานแบบ Milestone ที่โปร่งใสและปลอดภัย
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-primary font-ui">
                {group}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-text-muted font-ui">
            &copy; {new Date().getFullYear()} Lancefy. All rights reserved.
          </p>
          <p className="text-xs text-text-muted font-ui">
            Payments powered by Omise · Escrow-protected
          </p>
        </div>
      </div>
    </footer>
  );
}
