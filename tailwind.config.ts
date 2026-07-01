import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        success: "var(--success)",
        "success-foreground": "var(--success-foreground)",
        warning: "var(--warning)",
        "warning-foreground": "var(--warning-foreground)"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"]
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        panel:
          "0 1px 1px oklch(0% 0 0 / 0.04), 0 12px 30px oklch(35% 0.03 230deg / 0.08)",
        button: "0 1px 0 oklch(0% 0 0 / 0.18), 0 2px 6px oklch(0% 0 0 / 0.12)",
        stamp: "0 2px 0 oklch(0% 0 0 / 0.22), 0 6px 16px oklch(58% 0.19 33deg / 0.32)"
      },
      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(1.12) rotate(-3deg)" },
          "60%": { opacity: "1", transform: "scale(0.97) rotate(-3deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-3deg)" }
        }
      },
      animation: {
        "rise-in": "rise-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        "stamp-in": "stamp-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both"
      }
    }
  },
  plugins: []
};

export default config;
