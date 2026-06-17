import { ReactNode, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Step = 1 | 2 | 3

export default function KycLayout({
  step,
  children,
}: {
  step: Step
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="-m-6 min-h-[calc(100%+3rem)] bg-muted/30 p-6">
      <div className="mx-auto flex w-full max-w-4xl min-w-0 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("kyc.title")}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {t("kyc.subtitle")}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 sm:mb-10 sm:gap-4">
          <StepItem
            index={1}
            label={t("kyc.step.profile")}
            completed={step > 1}
            active={step === 1}
          />

          <StepConnector active={step > 1} />

          <StepItem
            index={2}
            label={t("kyc.step.idCard")}
            completed={step > 2}
            active={step === 2}
          />

          <StepConnector active={step > 2} />

          <StepItem
            index={3}
            label={t("kyc.step.selfie")}
            completed={false}
            active={step === 3}
          />
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

function StepItem({
  index,
  label,
  active,
  completed,
}: {
  index: number
  label: string
  active: boolean
  completed: boolean
}) {
  const numberRef = useRef<HTMLSpanElement>(null)
  const checkRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!completed) return

    const number = numberRef.current
    const check = checkRef.current

    if (!number || !check) return

    number.style.transform = "scale(1)"
    number.style.opacity = "1"

    check.style.transform = "scale(0.5)"
    check.style.opacity = "0"

    number.getBoundingClientRect()

    requestAnimationFrame(() => {
      number.style.transition = "transform 280ms ease-out, opacity 200ms"
      check.style.transition =
        "transform 320ms cubic-bezier(0.2,0.8,0.2,1), opacity 200ms"

      number.style.transform = "scale(0)"
      number.style.opacity = "0"

      check.style.transform = "scale(1)"
      check.style.opacity = "1"
    })
  }, [completed])

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2",
          active || completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground"
        )}
      >
        <span ref={numberRef} className="absolute text-sm font-semibold">
          {index}
        </span>

        <span ref={checkRef} className="absolute opacity-0">
          <Check className="h-4 w-4" />
        </span>
      </div>

      <span
        className={cn(
          "min-w-0 truncate text-sm font-medium",
          active || completed ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  )
}

function StepConnector({ active }: { active: boolean }) {
  return (
    <div className="relative hidden h-[2px] w-12 shrink-0 overflow-hidden bg-border sm:block sm:w-16">
      <div
        className={cn(
          "absolute inset-0 origin-left bg-primary transition-transform duration-300",
          active ? "scale-x-100" : "scale-x-0"
        )}
      />
    </div>
  )
}
