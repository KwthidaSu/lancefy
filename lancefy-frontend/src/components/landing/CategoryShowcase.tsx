import { Link } from "react-router-dom";
import {
  Code2,
  Palette,
  FileText,
  TrendingUp,
  Video,
  Database,
  Megaphone,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { icon: Code2,      label: "Development",      count: "1,240 งาน", color: "bg-blue-50 text-primary"      },
  { icon: Palette,    label: "Design",            count: "870 งาน",   color: "bg-pink-50 text-pink-600"     },
  { icon: FileText,   label: "Content Writing",   count: "640 งาน",   color: "bg-amber-50 text-amber-600"   },
  { icon: TrendingUp, label: "Marketing",         count: "520 งาน",   color: "bg-green-50 text-green-600"   },
  { icon: Video,      label: "Video & Animation", count: "310 งาน",   color: "bg-violet-50 text-violet-600" },
  { icon: Database,   label: "Data & Analytics",  count: "290 งาน",   color: "bg-cyan-50 text-cyan-600"     },
  { icon: Megaphone,  label: "Social Media",      count: "480 งาน",   color: "bg-orange-50 text-orange-600" },
  { icon: Camera,     label: "Photography",       count: "180 งาน",   color: "bg-rose-50 text-rose-600"     },
];

export function CategoryShowcase() {
  return (
    <section className="bg-background/60 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary font-ui">
            หมวดหมู่งาน
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl font-ui">
            ค้นหางานในสาขาของคุณ
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              to={`/app/explore/jobs?category=${encodeURIComponent(cat.label)}`}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-5 text-center transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                  cat.color,
                )}
              >
                <cat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary font-ui">{cat.label}</p>
                <p className="mt-0.5 text-xs text-text-muted font-ui">{cat.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
