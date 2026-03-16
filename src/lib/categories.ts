export type Category = {
  id: string;
  label: string;
  color: string;       // accent color
  soft: string;        // soft background (rgba)
  gradient: string;    // cover image gradient
};

export const CATEGORIES: Category[] = [
  {
    id: "ai",
    label: "AI",
    color: "#6366f1",
    soft: "rgba(99, 102, 241, 0.12)",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
  },
  {
    id: "gamedev",
    label: "게임개발",
    color: "#ec4899",
    soft: "rgba(236, 72, 153, 0.12)",
    gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #f9a8d4 100%)",
  },
  {
    id: "sideproject",
    label: "사이드프로젝트",
    color: "#10b981",
    soft: "rgba(16, 185, 129, 0.12)",
    gradient: "linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)",
  },
  {
    id: "trading",
    label: "트레이딩",
    color: "#ef4444",
    soft: "rgba(239, 68, 68, 0.12)",
    gradient: "linear-gradient(135deg, #ef4444 0%, #f87171 50%, #fca5a5 100%)",
  },
  {
    id: "infra",
    label: "인프라/배포",
    color: "#f59e0b",
    soft: "rgba(245, 158, 11, 0.12)",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)",
  },
  {
    id: "general",
    label: "일반",
    color: "#71717a",
    soft: "rgba(113, 113, 122, 0.12)",
    gradient: "linear-gradient(135deg, #71717a 0%, #a1a1aa 50%, #d4d4d8 100%)",
  },
];

export const DEFAULT_CATEGORY = "general";

export function getCategoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
