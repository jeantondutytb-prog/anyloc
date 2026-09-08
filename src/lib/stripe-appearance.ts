import type { Appearance } from "@stripe/stripe-js";

export const stripeAppearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#ec4899",
    colorBackground: "#ffffff",
    colorText: "#18181b",
    colorDanger: "#dc2626",
    colorTextSecondary: "#71717a",
    colorTextPlaceholder: "#a1a1aa",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSizeBase: "16px",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #e4e4e7",
      boxShadow: "none",
      padding: "12px",
    },
    ".Input:focus": {
      border: "1px solid #ec4899",
      boxShadow: "0 0 0 1px #ec4899",
    },
    ".Label": {
      fontWeight: "500",
      marginBottom: "6px",
    },
    ".Tab": {
      border: "1px solid #e4e4e7",
      boxShadow: "none",
    },
    ".Tab--selected": {
      border: "1px solid #ec4899",
      boxShadow: "0 0 0 1px #ec4899",
    },
    ".TabIcon--selected": {
      fill: "#ec4899",
    },
  },
};
