import { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
};

export default function FormField({
  label,
  children,
  required = false,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-1 text-danger">*</span>
        )}
      </label>
      {children}
    </div>
  );
}
