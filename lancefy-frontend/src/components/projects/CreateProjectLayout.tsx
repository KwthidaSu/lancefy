import { ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = 1 | 2;
type Mode = "create" | "edit";

export default function CreateProjectLayout({
  step,
  mode = "create",
  children,
}: {
  step: Step;
  mode?: Mode;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-background px-4 overflow-hidden">
      <div className="mx-auto max-w-4xl py-12 flex flex-col">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "create"
              ? t("project.createPage.title")
              : t("project.editPage.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "create"
              ? t("project.createPage.subtitle")
              : t("project.editPage.subtitle")}
          </p>
        </div>

        {mode === "create" && (
          <div className="mb-10 flex items-center justify-center gap-4">
            <StepItem
              index={1}
              label={t("project.createPage.step.details")}
              completed={step === 2}
              active={step === 1}
            />

            <StepConnector active={step === 2} />

            <StepItem
              index={2}
              label={t("project.createPage.step.review")}
              completed={false}
              active={step === 2}
            />
          </div>
        )}

        <div className="rounded-2xl border border-border bg-white p-8 shadow">
          {children}
        </div>
      </div>
    </div>
  );
}

function StepItem({
  index,
  label,
  active,
  completed,
}: {
  index: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const checkRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!completed) return;

    const number = numberRef.current;
    const check = checkRef.current;
    if (!number || !check) return;

    number.style.transform = "scale(1)";
    number.style.opacity = "1";
    check.style.transform = "scale(0.5)";
    check.style.opacity = "0";

    number.getBoundingClientRect();

    requestAnimationFrame(() => {
      number.style.transition =
        "transform 280ms ease-out, opacity 200ms";
      check.style.transition =
        "transform 320ms cubic-bezier(0.2,0.8,0.2,1), opacity 200ms";

      number.style.transform = "scale(0)";
      number.style.opacity = "0";
      check.style.transform = "scale(1)";
      check.style.opacity = "1";
    });
  }, [completed]);

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border-2",
          active || completed
            ? "border-primary bg-primary text-white"
            : "border-border bg-white text-muted-foreground"
        )}
      >
        <span ref={numberRef} className="absolute font-semibold">
          {index}
        </span>
        <span ref={checkRef} className="absolute opacity-0">
          <Check className="h-4 w-4" />
        </span>
      </div>

      <span
        className={cn(
          "text-sm font-medium",
          active || completed
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ active }: { active: boolean }) {
  return (
    <div className="relative h-[2px] w-16 bg-border overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 bg-primary origin-left transition-transform duration-300",
          active ? "scale-x-100" : "scale-x-0"
        )}
      />
    </div>
  );
}
