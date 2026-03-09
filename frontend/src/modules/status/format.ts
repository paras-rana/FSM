export const formatStatusLabel = (value: string | null | undefined): string => {
  if (!value) return "-";
  const words = value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return words.map((word, index) => (index > 0 && word === "And" ? "and" : word)).join(" ");
};
