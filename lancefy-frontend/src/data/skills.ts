/**
 * Skill taxonomy — single source of truth for the entire platform.
 *
 * DB stores skills as a flat string[] (JSONB).
 * This file provides the grouped structure used by:
 *   - FreelancerSettings skill picker (grouped chips)
 *   - FreelancersPage filter dropdown (optgroup)
 *   - Any future search / tagging UI
 *
 * To add a skill: add the string to the relevant category below.
 * The flat helper `ALL_SKILLS` can be used for autocomplete / validation.
 */

export interface SkillCategory {
  /** Category key — stable identifier (English, no spaces) */
  id: string;
  /** Display label shown in UI */
  label: string;
  /** Emoji icon for visual grouping */
  icon: string;
  /** Flat list of skill strings stored in DB */
  skills: string[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "frontend",
    label: "Frontend",
    icon: "🌐",
    skills: [
      "React", "Vue", "Angular", "Next.js", "Svelte",
      "TypeScript", "JavaScript", "HTML/CSS", "Tailwind CSS", "SASS",
    ],
  },
  {
    id: "backend",
    label: "Backend",
    icon: "⚙️",
    skills: [
      "Node.js", "Express.js", "Python", "FastAPI", "Django", "Flask",
      "Go", "Java", "Spring Boot", "PHP", "Laravel", "Ruby on Rails",
      "GraphQL", "REST API",
    ],
  },
  {
    id: "mobile",
    label: "Mobile",
    icon: "📱",
    skills: [
      "Flutter", "React Native", "iOS (Swift)", "Android (Kotlin)",
      "Ionic", "Expo",
    ],
  },
  {
    id: "database",
    label: "Database & Cloud",
    icon: "🗄️",
    skills: [
      "PostgreSQL", "MySQL", "MongoDB", "Redis", "Firebase",
      "AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "CI/CD",
    ],
  },
  {
    id: "design",
    label: "Design & UI/UX",
    icon: "🎨",
    skills: [
      "UI/UX Design", "Figma", "Adobe XD", "Sketch",
      "Adobe Illustrator", "Adobe Photoshop", "Wireframing", "Prototyping",
    ],
  },
  {
    id: "artwork",
    label: "Artwork & Media",
    icon: "🖼️",
    skills: [
      "Logo Design", "Branding", "Illustration", "Motion Design",
      "Video Editing", "Photography", "3D Modeling", "Blender",
      "After Effects", "Premiere Pro",
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Content",
    icon: "📣",
    skills: [
      "SEO", "SEM / Google Ads", "Social Media Marketing",
      "Copywriting", "Content Writing", "Email Marketing",
      "Thai Translation", "English Translation",
    ],
  },
  {
    id: "data",
    label: "Data & AI",
    icon: "📊",
    skills: [
      "Data Analysis", "Machine Learning", "Data Science",
      "SQL", "Power BI", "Tableau", "Excel / VBA", "Python (Data)",
      "TensorFlow", "PyTorch",
    ],
  },
  {
    id: "other",
    label: "อื่นๆ",
    icon: "✨",
    skills: [
      "Project Management", "Agile / Scrum", "Technical Writing",
      "Blockchain", "Smart Contracts", "AR/VR", "Game Dev (Unity)",
    ],
  },
];

/** Flat list of every skill — useful for autocomplete & validation */
export const ALL_SKILLS: string[] = SKILL_CATEGORIES.flatMap((c) => c.skills);

/** Find which category a skill belongs to */
export function getCategoryForSkill(skill: string): SkillCategory | undefined {
  return SKILL_CATEGORIES.find((c) => c.skills.includes(skill));
}
