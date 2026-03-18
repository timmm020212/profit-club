import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Премиальная тёмная палитра
        'bg-dark': '#1A1A1A', // Тёмный основной фон
        'bg-card': '#242424', // Тёмный для карточек
        'bg-hover': '#2A2A2A', // При наведении
        'bg-header': '#4A4A4A', // Серый для шапки (контрастный с фоном)
        'bg-overlay': 'rgba(0, 0, 0, 0.4)', // Затемнение для Hero
        'text-primary': '#F5F5F5', // Светлый основной текст
        'text-secondary': '#D0D0D0', // Светло-серый вторичный
        'text-muted': '#A0A0A0', // Приглушённый текст
        'accent-primary': '#8B1A1A', // Бордовый акцент
        'accent-hover': '#A02020', // Бордовый при наведении
        'badge-dark': '#2A2A2A', // Тёмная плашка
        'badge-light': '#3A3A3A', // Светлая плашка
        'badge-accent': '#6B1A1A', // Бордовая плашка
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "serif"],
        condensed: ["Helvetica Neue Condensed", "Helvetica Condensed", "Arial Narrow", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        thin: ["var(--font-montserrat)", "Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

