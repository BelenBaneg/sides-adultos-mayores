import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Paleta institucional: violeta del Ministerio de Desarrollo Social de Santiago del Estero.
// brand.600 = #5B2D8E es el color exacto usado en los logos y en la pantalla de login original.
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#F6F0FB" },
          100: { value: "#E9D9F5" },
          200: { value: "#D3B3EB" },
          300: { value: "#BC8CE0" },
          400: { value: "#A566D6" },
          500: { value: "#8D45C4" },
          600: { value: "#5B2D8E" },
          700: { value: "#4A2474" },
          800: { value: "#391B59" },
          900: { value: "#28133F" },
        },
      },
      fonts: {
        heading: { value: `'Inter', system-ui, sans-serif` },
        body: { value: `'Inter', system-ui, sans-serif` },
      },
      radii: {
        l1: { value: "0.375rem" },
        l2: { value: "0.625rem" },
        l3: { value: "1rem" },
      },
    },
    slotRecipes: {
      card: {
        base: {
          root: {
            boxShadow: "0 1px 3px rgba(40, 19, 63, 0.07), 0 4px 12px -2px rgba(40, 19, 63, 0.06)",
            transition: "box-shadow 0.2s ease, transform 0.2s ease",
            _dark: {
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4), 0 6px 16px -4px rgba(0, 0, 0, 0.45)",
            },
          },
        },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: "{colors.brand.600}" },
          contrast: { value: "white" },
          fg: { value: "{colors.brand.700}" },
          muted: { value: "{colors.brand.100}" },
          subtle: { value: "{colors.brand.50}" },
          emphasized: { value: "{colors.brand.200}" },
          focusRing: { value: "{colors.brand.600}" },
        },
        // Título institucional: violeta oscuro sobre fondos claros, violeta claro sobre fondos oscuros.
        heading: {
          value: { base: "{colors.brand.900}", _dark: "{colors.brand.100}" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
