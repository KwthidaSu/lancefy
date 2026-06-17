import Button from "@/components/ui/Button";

type FreelancerKycGateProps = {
  alt: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCta: () => void;
  imageSrc?: string;
  buttonVariant?: "primary" | "secondary";
};

export default function FreelancerKycGate({
  alt,
  title,
  subtitle,
  ctaLabel,
  onCta,
  imageSrc = "/images/verify-freelancer.png",
  buttonVariant = "primary",
}: FreelancerKycGateProps) {
  return (
    <div className="p-6">
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <img
          src={imageSrc}
          alt={alt}
          className="mb-8 w-72 max-w-full sm:w-80"
        />
        <h2 className="text-2xl font-semibold text-text-primary">
          {title}
        </h2>
        <p className="mt-3 max-w-md text-text-muted">
          {subtitle}
        </p>
        <Button
          variant={buttonVariant}
          className="mt-8 px-6"
          onClick={onCta}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
