const stats = [
  { value: "10,000+", label: "Projects Completed" },
  { value: "5,200+", label: "Verified Freelancers" },
  { value: "฿85M+",  label: "Paid Out via Escrow" },
  { value: "99%",    label: "Satisfaction Rate" },
];

export function StatsBar() {
  return (
    <section className="border-y border-border bg-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 divide-x divide-primary-hover/40 md:grid-cols-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-1 px-6 py-8 text-center"
            >
              <span className="text-3xl font-bold text-white font-ui">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-white/75 font-ui">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
