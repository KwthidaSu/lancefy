// src/components/projects/ReviewValue.tsx
export default function ReviewValue({
  value,
}: {
  value: string | number;
}) {
  return <div className="text-sm text-gray-900">{value}</div>;
}
