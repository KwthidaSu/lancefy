import { Link } from "react-router-dom";
import { BadgeCheck, Star } from "lucide-react";

const freelancers = [
  {
    name: "Arisa K.",
    title: "Full-Stack Developer",
    skills: ["React", "Next.js", "Node.js"],
    rate: "฿1,800/hr",
    rating: 4.9,
    reviews: 87,
    initials: "AK",
    color: "bg-blue-500",
  },
  {
    name: "Daniel T.",
    title: "UI/UX Designer",
    skills: ["Figma", "Webflow", "Tailwind"],
    rate: "฿1,500/hr",
    rating: 5.0,
    reviews: 64,
    initials: "DT",
    color: "bg-violet-500",
  },
  {
    name: "Priya S.",
    title: "Content Strategist",
    skills: ["SEO", "Copywriting", "CMS"],
    rate: "฿900/hr",
    rating: 4.8,
    reviews: 112,
    initials: "PS",
    color: "bg-pink-500",
  },
  {
    name: "Marco R.",
    title: "Data Analyst",
    skills: ["Python", "SQL", "Power BI"],
    rate: "฿1,300/hr",
    rating: 4.9,
    reviews: 53,
    initials: "MR",
    color: "bg-cyan-600",
  },
  {
    name: "Nina V.",
    title: "Motion Designer",
    skills: ["After Effects", "Lottie", "3D"],
    rate: "฿2,000/hr",
    rating: 5.0,
    reviews: 38,
    initials: "NV",
    color: "bg-orange-500",
  },
  {
    name: "James M.",
    title: "Digital Marketer",
    skills: ["Google Ads", "Meta Ads", "SEO"],
    rate: "฿1,200/hr",
    rating: 4.8,
    reviews: 95,
    initials: "JM",
    color: "bg-green-600",
  },
];

export function FreelancerShowcase() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary font-ui">
              Top Talent
            </p>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl font-ui">
              ทำงานกับมืออาชีพที่ดีที่สุด
            </h2>
          </div>
          <Link
            to="/app/explore/freelancers"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-accent font-ui"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {freelancers.map((f, idx) => (
            <div
              key={idx}
              className="flex w-64 flex-shrink-0 flex-col rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                {/* Avatar with initials */}
                <div
                  className={`h-12 w-12 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white ${f.color} font-ui`}
                >
                  {f.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-semibold text-text-primary font-ui">{f.name}</p>
                    <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  </div>
                  <p className="truncate text-xs text-text-muted">{f.title}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-text-primary font-ui">{f.rating}</span>
                <span className="text-xs text-text-muted font-ui">({f.reviews} reviews)</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {f.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-primary-foreground font-ui"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold text-primary font-ui">{f.rate}</span>
                <Link
                  to="/app/explore/freelancers"
                  className="text-xs font-medium text-text-secondary hover:text-primary-foreground transition-colors font-ui"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
