// Four hand-tuned color themes for the DSH web GUI.
//
// How the theming works: the built-in Appearance picker only knows
// `light` / `dark` / `system`, and a third-party `ctx.theme.register()` id never
// reaches the durable settings schema. So instead of registering competing theme
// ids we stack *alias-token override layers* on top of the active palette through
// `ctx.theme.overrideTokens()`. Every theme carries one value per color scheme,
// so a skin keeps working when the user flips light/dark — it is a layer over
// the palette, not a replacement for it.
//
// Where the UI lives: the sidebar's foot area (and with it
// `sidebar.footer.action`) is `display: none` while the sidebar is wide and only
// appears in the 56px rail. So the primary picker is a row in
// Settings -> General (`settings.general.item`), contributed through the same
// contract the shipped Appearance/Language rows use; the rail cycler is kept as
// a secondary entry point for the collapsed sidebar.
window.__ModuleLoader__.load({
	id: "@local/dsh-theme-pack",
	factory(require) {
		/**
		 * React is a module-loader builtin, but it is NOT injected into this
		 * module's lexical scope — referring to a bare `React` throws
		 * `ReferenceError: React is not defined` at render time. Pull it from the
		 * module loader, falling back to the global for older shells.
		 */
		const React =
			(typeof require === "function" ? require("react") : undefined) ??
			globalThis.React ??
			window.React;
		if (React === undefined) throw new Error("dsh-theme-pack: the React builtin is unavailable");

		const NS = "theme-pack";
		const STORAGE_KEY = "dsh-theme-pack:active";
		const STYLE_ID = "dsh-theme-pack-style";
		const LAYER_SOURCE = "@local/dsh-theme-pack";

		const DICTIONARIES = {
			en: {
				"section.theme": "Theme",
				"section.hint": "Recolors the whole interface and follows the light/dark preference.",
				"theme.stock": "Stock",
				"theme.cyber": "Cyber neon",
				"theme.midnight": "Midnight blue",
				"theme.nord": "Nord",
				"theme.dracula": "Dracula",
				"theme.catppuccin": "Catppuccin",
				"theme.tokyo": "Tokyo night",
				"theme.gruvbox": "Gruvbox",
				"theme.solarized": "Solarized",
				"theme.monokai": "Monokai",
				"theme.onedark": "One dark",
				"theme.rosepine": "Rosé Pine",
				"theme.cobalt": "Cobalt",
				"theme.ocean": "Deep ocean",
				"theme.forest": "Forest",
				"theme.paper": "Paper",
				"theme.synthwave": "Synthwave",
				"theme.coffee": "Coffee",
				"theme.lavender": "Lavender",
				"theme.contrast": "High contrast",
			},
			ru: {
				"section.theme": "Темы",
				"section.hint": "Перекрашивает весь интерфейс и следует режиму «светлая / тёмная».",
				"theme.stock": "Сток",
				"theme.cyber": "Кибер-неон",
				"theme.midnight": "Полночный синий",
				"theme.nord": "Норд",
				"theme.dracula": "Дракула",
				"theme.catppuccin": "Каппучино",
				"theme.tokyo": "Токио",
				"theme.gruvbox": "Грувбокс",
				"theme.solarized": "Соляризация",
				"theme.monokai": "Монокай",
				"theme.onedark": "Тёмный One",
				"theme.rosepine": "Розовая сосна",
				"theme.cobalt": "Кобальт",
				"theme.ocean": "Глубокий океан",
				"theme.forest": "Лес",
				"theme.paper": "Бумага",
				"theme.synthwave": "Синтвейв",
				"theme.coffee": "Кофе",
				"theme.lavender": "Лаванда",
				"theme.contrast": "Высокий контраст",
			}
		};

		/**
		 * The alias tokens a skin may override. Everything the Theme inspect
		 * provider reports as `requiresLightAndDark` is here, plus the sidebar,
		 * markdown, button and scrollbar aliases that actually paint the shell.
		 */
		const T = {
			bgBase: "--dsw-alias-bg-base",
			bgL1: "--dsw-alias-bg-layer-1",
			bgL2: "--dsw-alias-bg-layer-2",
			bgL3: "--dsw-alias-bg-layer-3",
			bgOverlay: "--dsw-alias-bg-overlay",
			sidebar: "--dsw-specific-sidebar-fill",
			borderL1: "--dsw-alias-border-l1",
			borderL2: "--dsw-alias-border-l2",
			labelPrimary: "--dsw-alias-label-primary",
			labelSecondary: "--dsw-alias-label-secondary",
			labelTertiary: "--dsw-alias-label-tertiary",
			labelInverted: "--dsw-alias-label-primary-foreground",
			brand: "--dsw-alias-brand-primary",
			brandInvert: "--dsw-alias-brand-primary-invert",
			brandAccent: "--dsw-alias-brand-primary-new-colorprimary-new-color",
			buttonPrimary: "--dsw-alias-button-primary-fill",
			buttonPrimaryHover: "--dsw-alias-button-primary-hover",
			link: "--dsw-alias-link",
			stateBusiness: "--dsw-alias-state-business-primary",
			stateError: "--dsw-alias-state-error-primary",
			stateWarn: "--dsw-alias-state-warn-primary",
			stateSuccess: "--dsw-alias-state-success-primary",
			stateIdle: "--dsw-alias-state-idle-primary",
			interactiveHover: "--dsw-alias-interactive-bg-hover",
			interactiveActive: "--dsw-alias-interactive-bg-active",
			codeBlock: "--dsw-alias-markdown-code-block",
			codeBlockBanner: "--dsw-alias-markdown-code-block-banner",
			inlineCode: "--dsw-alias-markdown-inline-code",
			scrollbar: "--dsw-alias-scrollbar-bg-l1",
			scrollbarHover: "--dsw-alias-scrollbar-hover-l1",
			toastBg: "--dsw-alias-toast-bg",
			toastLabel: "--dsw-alias-toast-label",
			tooltipBg: "--dsw-alias-tooltip-bg",
			tooltipKeyBg: "--dsw-alias-tooltip-key-bg",
			menuIcon: "--dsw-alias-menu-icon",
			menuGroupHeaderFill: "--dsw-alias-menu-group-header-fill",
			turnTriggerBg: "--dsw-alias-turn-trigger-bg",
			turnTriggerBgHover: "--dsw-alias-turn-trigger-bg-hover",
			bgDocumentPreview: "--dsw-alias-bg-document-preview",
			bgDocumentSelection: "--dsw-alias-bg-document-selection",
			labelDeepDiving: "--dsw-alias-label-deep-diving",
			labelDeepDivingShimmer: "--dsw-alias-label-deep-diving-shimmer",
			labelDocumentPreview: "--dsw-alias-label-document-preview",
			labelShimmer: "--dsw-alias-label-shimmer",
			markdownPlaceholder: "--dsw-alias-markdown-placeholder",
			markdownCitation: "--dsw-alias-markdown-citation",
			markdownTag: "--dsw-alias-markdown-tag",
			markdownCodeSegmentSelected: "--dsw-alias-markdown-code-segment-selected",
			markdownCodeSegmentUnselected: "--dsw-alias-markdown-code-segment-unselected",
			brandText: "--dsw-alias-brand-text",
			codeDiffAdded: "--dsw-alias-code-diff-added",
			codeDiffDeleted: "--dsw-alias-code-diff-deleted",
			diffAddedBg: "--dsw-alias-file-diff-added-bg",
			diffAddedGutter: "--dsw-alias-file-diff-added-gutter",
			diffAddedMarker: "--dsw-alias-file-diff-added-marker",
			diffDeletedBg: "--dsw-alias-file-diff-deleted-bg",
			diffDeletedGutter: "--dsw-alias-file-diff-deleted-gutter",
			diffDeletedMarker: "--dsw-alias-file-diff-deleted-marker"
		};

		/* ---------------------------------------------------------------- colors */

		function parseColor(text) {
			const value = String(text).trim();
			const rgba = /^rgba?\(([^)]+)\)$/i.exec(value);
			if (rgba !== null) {
				const parts = rgba[1].split(",").map((part) => Number.parseFloat(part));
				const [red, green, blue] = parts;
				const alpha = parts.length > 3 ? parts[3] : 1;
				return { r: red, g: green, b: blue, a: alpha };
			}
			let hex = value.replace("#", "");
			if (hex.length === 3) hex = hex.split("").map((char) => char + char).join("");
			if (hex.length === 6) hex += "ff";
			if (hex.length !== 8) throw new Error(`dsh-theme-pack: cannot parse color "${text}"`);
			return {
				r: Number.parseInt(hex.slice(0, 2), 16),
				g: Number.parseInt(hex.slice(2, 4), 16),
				b: Number.parseInt(hex.slice(4, 6), 16),
				a: Number.parseInt(hex.slice(6, 8), 16) / 255
			};
		}

		/** `#rrggbb`, or `rgba(...)` when the color carries transparency. */
		function formatColor(color) {
			const channel = (value) => Math.max(0, Math.min(255, Math.round(value)));
			if (color.a >= 0.999) {
				return `#${[color.r, color.g, color.b].map((value) => channel(value).toString(16).padStart(2, "0")).join("")}`;
			}
			return `rgba(${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}, ${Number(color.a.toFixed(3))})`;
		}

		/** Linear blend: `ratio` 0 keeps `base`, 1 returns `over`. */
		function mix(base, over, ratio) {
			const a = parseColor(base);
			const b = parseColor(over);
			return formatColor({
				r: a.r + (b.r - a.r) * ratio,
				g: a.g + (b.g - a.g) * ratio,
				b: a.b + (b.b - a.b) * ratio,
				a: a.a + (b.a - a.a) * ratio
			});
		}

		/** Same color at a given alpha. */
		function alphaOf(color, alpha) {
			return formatColor({ ...parseColor(color), a: alpha });
		}

		/** Compose `ink` at `alpha` over `surface`, so borders stay flat colors. */
		function veil(surface, ink, alpha) {
			return mix(surface, alphaOf(ink, alpha), 1);
		}

		/** WCAG relative luminance — the yardstick the contrast checks use. */
		function relativeLuminance(color) {
			const linear = [color.r, color.g, color.b]
				.map((value) => value / 255)
				.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
			return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
		}

		function contrastRatio(foreground, background) {
			const light = Math.max(relativeLuminance(parseColor(foreground)), relativeLuminance(parseColor(background)));
			const dark = Math.min(relativeLuminance(parseColor(foreground)), relativeLuminance(parseColor(background)));
			return (light + 0.05) / (dark + 0.05);
		}

		/* --------------------------------------------------------- palette engine */

		/**
		 * Atoms each scheme has to declare. Everything else is derived, so a theme
		 * stays consistent and stays readable: contrast is checked, not hoped for.
		 *
		 * canvas  app background        sunken  code blocks, nested fills
		 * raised  primary surface       ink     primary text
		 * nested  secondary surface     muted   secondary text
		 * deep    deep surface          faint   tertiary text
		 * sidebar column background     border  strong border
		 * brand   accent                onBrand foreground on the accent
		 */
		const ATOM_KEYS = [
			"canvas",
			"raised",
			"nested",
			"deep",
			"sidebar",
			"sunken",
			"brand",
			"onBrand",
			"ink",
			"muted",
			"faint",
			"border",
			"button",
			"link",
			"ok",
			"warn",
			"danger",
			"idle"
		];

		/** One theme's icon and its two atom tables. */
		function theme(id, icon, light, dark) {
			return { id, icon, light, dark };
		}

		/**
		 * Build every alias token the shell consumes, derived from the atoms.
		 *
		 * The shipped design system declares over a hundred `--dsw-alias-*` names; a
		 * skin that overrides only the obvious two dozen leaves the rest of the shell
		 * in its stock colours — purple surfaces in the composer, the sidebar or a
		 * menu, under an otherwise repainted UI. So this map is deliberately complete.
		 * `node report-token-coverage.mjs` prints the gap, and the checker fails when
		 * the design system grows a token this map misses.
		 *
		 * @param {Record<string, string>} a Atom table.
		 * @returns {Record<string, string>} token name -> color.
		 */
		function palette(a) {
			const borderTone = contrastRatio(a.canvas, a.border) > 1.6 ? a.canvas : a.ink;
			const alphaOfInk = (ratio) => alphaOf(a.ink, ratio);
			const placeholder = a.muted ?? a.ink;
			return {
				/* canvas and the raised ladder */
				[T.bgBase]: a.canvas,
				[T.bgL1]: a.raised,
				[T.bgL2]: a.nested,
				[T.bgL3]: a.deep,
				[T.bgOverlay]: a.raised,
				[T.sidebar]: a.sidebar,
				"--dsw-alias-bg-layer-4": a.canvas,
				"--dsw-alias-bg-module-platform": a.raised,
				"--dsw-alias-bg-multi-select": mix(a.nested, a.brand, 0.18),
				"--dsw-alias-bg-skeleton": alphaOfInk(0.05),
				"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.24)",
				"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.12)",
				"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
				"--dsw-alias-bg-mask-drop": alphaOf(a.canvas, 0.7),
				"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
				[T.bgDocumentPreview]: a.deep,
				[T.bgDocumentSelection]: "rgba(59, 130, 246, 0.4)",

				/* borders, thinner and lighter than the surface ladder */
				[T.borderL1]: veil(a.canvas, borderTone, 0.14),
				[T.borderL2]: veil(a.canvas, borderTone, 0.28),
				"--dsw-alias-border-l3": veil(a.canvas, borderTone, 0.34),
				"--dsw-alias-border-l4": veil(a.canvas, borderTone, 0.44),
				"--dsw-alias-border-l2-darkmode-thin": veil(a.canvas, borderTone, 0.18),
				"--dsw-alias-border-inverted": borderTone === a.canvas ? alphaOf(a.ink, 0.16) : alphaOf(a.canvas, 0.16),
				"--dsw-alias-border-inverted2": alphaOf(a.ink, 0.16),

				/* the text ladder */
				[T.labelPrimary]: a.ink,
				[T.labelSecondary]: a.muted,
				[T.labelTertiary]: a.faint,
				[T.labelInverted]: a.onBrand,
				"--dsw-alias-label-caption": a.faint,
				"--dsw-alias-label-dimmed": a.muted,
				"--dsw-alias-label-error": a.danger,
				"--dsw-alias-label-primary-bluish": a.ink,
				"--dsw-alias-label-primary-dimmed": a.ink,
				"--dsw-alias-label-primary-inverted": a.onBrand,
				[T.labelDeepDiving]: a.brand,
				[T.labelDeepDivingShimmer]: mix(a.brand, a.ink, 0.35),
				[T.labelDocumentPreview]: a.ink,
				[T.labelShimmer]: alphaOfInk(0.3),
				[T.markdownPlaceholder]: placeholder,
				[T.markdownCitation]: a.faint,
				[T.markdownTag]: a.nested,
				[T.markdownCodeSegmentUnselected]: a.nested,
				[T.markdownCodeSegmentSelected]: mix(a.nested, a.brand, 0.22),

				/* accent and actions */
				[T.brand]: a.brand,
				[T.brandInvert]: a.onBrand,
				[T.brandAccent]: a.brand,
				[T.brandText]: a.brand,
				[T.link]: a.link,
				[T.buttonPrimary]: a.button,
				[T.buttonPrimaryHover]: mix(a.button, a.ink, 0.18),
				"--dsw-alias-button-primary-dimmed": mix(a.canvas, a.button, 0.6),
				"--dsw-alias-button-elevated-fill": a.raised,
				"--dsw-alias-button-floating-fill": a.nested,
				"--dsw-alias-button-floating-hover": a.deep,
				"--dsw-alias-button-contrast-fill": a.ink,
				"--dsw-alias-button-tool-bar-fill": alphaOf(a.ink, 0.32),
				"--dsw-alias-button-tool-bar-fill-invisible": alphaOf(a.ink, 0.24),
				"--dsw-alias-button-tool-bar-hover": alphaOf(a.ink, 0.42),
				"--dsw-alias-button-ghost-active-fill": alphaOfInk(0.12),
				"--dsw-alias-button-ghost-active-border": veil(a.canvas, borderTone, 0.3),
				"--dsw-alias-button-ghost-active-hover": alphaOfInk(0.18),
				"--dsw-alias-button-info-fill": a.brand,
				"--dsw-alias-button-info-hover": mix(a.brand, a.ink, 0.16),

				/* interaction layers */
				[T.interactiveHover]: veil(a.canvas, a.ink, 0.08),
				[T.interactiveActive]: veil(a.canvas, a.ink, 0.16),
				"--dsw-alias-interactive-bg-hover-accent": veil(a.canvas, a.brand, 0.14),
				"--dsw-alias-interactive-bg-hover-danger": veil(a.canvas, a.danger, 0.12),
				"--dsw-alias-interactive-bg-hover-solid": a.nested,
				[T.turnTriggerBg]: a.nested,
				[T.turnTriggerBgHover]: veil(a.canvas, a.ink, 0.12),

				/* semantic states */
				[T.stateBusiness]: a.brand,
				"--dsw-alias-state-business-tertiary": mix(a.canvas, a.brand, 0.18),
				[T.stateError]: a.danger,
				"--dsw-alias-state-error-secondary": mix(a.danger, a.canvas, 0.45),
				[T.stateWarn]: a.warn,
				"--dsw-alias-state-warn-label": mix(a.warn, a.ink, 0.3),
				"--dsw-alias-state-warn-secondary": mix(a.warn, a.canvas, 0.35),
				"--dsw-alias-state-warn-tertiary": mix(a.canvas, a.warn, 0.16),
				[T.stateSuccess]: a.ok,
				"--dsw-alias-state-success-secondary": mix(a.ok, a.canvas, 0.35),
				"--dsw-alias-state-success-tertiary": mix(a.canvas, a.ok, 0.16),
				[T.stateIdle]: a.idle,

				/* code and diffs */
				[T.codeBlock]: a.sunken,
				[T.codeBlockBanner]: mix(a.sunken, a.ink, 0.06),
				[T.inlineCode]: mix(a.sunken, a.ink, 0.04),
				[T.codeDiffAdded]: veil(a.canvas, a.ok, 0.16),
				[T.codeDiffDeleted]: veil(a.canvas, a.danger, 0.16),
				[T.diffAddedBg]: veil(a.canvas, a.ok, 0.14),
				[T.diffAddedGutter]: veil(a.canvas, a.ok, 0.1),
				[T.diffAddedMarker]: a.ok,
				[T.diffDeletedBg]: veil(a.canvas, a.danger, 0.14),
				[T.diffDeletedGutter]: veil(a.canvas, a.danger, 0.1),
				[T.diffDeletedMarker]: a.danger,

				/* chrome */
				[T.scrollbar]: mix(a.canvas, a.ink, 0.18),
				[T.scrollbarHover]: mix(a.canvas, a.ink, 0.32),
				"--dsw-alias-scrollbar-bg-l2": mix(a.nested, a.ink, 0.2),
				"--dsw-alias-scrollbar-hover-l2": mix(a.nested, a.ink, 0.34),
				[T.toastBg]: a.deep,
				[T.toastLabel]: a.ink,
				[T.tooltipBg]: a.deep,
				[T.tooltipKeyBg]: mix(a.deep, a.ink, 0.22),
				[T.menuIcon]: a.muted,
				[T.menuGroupHeaderFill]: alphaOf(a.raised, 0.94),
				"--dsw-alias-switch-thumb": a.onBrand
			};
		}

		/**
		 * The theme catalogue. `stock` carries no atoms: its whole job is to remove
		 * the layer and hand the shipped palette back untouched.
		 */
		const THEMES = [
			{ id: "stock", icon: "\u25CF" },
			theme(
				"cyber",
				"\u25C6",
				{ canvas: "#f2f7fb", raised: "#ffffff", nested: "#e8f1f8", deep: "#dbe9f4", sidebar: "#e6eff7", sunken: "#e2eef7", brand: "#0e7490", onBrand: "#ffffff", ink: "#0b2a3c", muted: "#3f6a83", faint: "#5c8199", border: "#0c4a6e", button: "#0e7490", link: "#0e7490", ok: "#0f766e", warn: "#b45309", danger: "#be123c", idle: "#8fa3b5" },
				{ canvas: "#070b12", raised: "#0d131e", nested: "#141c2b", deep: "#1b2739", sidebar: "#0a1017", sunken: "#0b1220", brand: "#22d3ee", onBrand: "#04121a", ink: "#dff6ff", muted: "#8fb4c9", faint: "#6b93aa", border: "#22d3ee", button: "#22d3ee", link: "#67e8f9", ok: "#34d399", warn: "#fbbf24", danger: "#fb7185", idle: "#3d5062" }
			),
			theme(
				"midnight",
				"\u25D1",
				{ canvas: "#eef3fb", raised: "#ffffff", nested: "#e3ebf8", deep: "#d3dff2", sidebar: "#e8eef9", sunken: "#dde7f5", brand: "#2563eb", onBrand: "#ffffff", ink: "#0f1c36", muted: "#3f5378", faint: "#5f7398", border: "#1e3a8a", button: "#2563eb", link: "#2563eb", ok: "#047857", warn: "#b45309", danger: "#dc2626", idle: "#93a4c0" },
				{ canvas: "#0b1220", raised: "#111c33", nested: "#182747", deep: "#21335c", sidebar: "#0d1626", sunken: "#0e1729", brand: "#7aa2ff", onBrand: "#08101f", ink: "#e4ecff", muted: "#9fb2d4", faint: "#7789ab", border: "#4d7cff", button: "#7aa2ff", link: "#9dbaff", ok: "#34d399", warn: "#fbbf24", danger: "#f87171", idle: "#3c5177" }
			),
			theme(
				"nord",
				"\u2744",
				{ canvas: "#eceff4", raised: "#ffffff", nested: "#e5e9f0", deep: "#d8dee9", sidebar: "#e8ecf3", sunken: "#e3e8f0", brand: "#5e81ac", onBrand: "#ffffff", ink: "#2e3440", muted: "#4c566a", faint: "#6a748a", border: "#4c566a", button: "#5e81ac", link: "#5e81ac", ok: "#2f7d63", warn: "#9a6a1f", danger: "#a8304a", idle: "#a3adc2" },
				{ canvas: "#2e3440", raised: "#3b4252", nested: "#434c5e", deep: "#4c566a", sidebar: "#333a47", sunken: "#353c4a", brand: "#88c0d0", onBrand: "#2e3440", ink: "#eceff4", muted: "#c3cbd8", faint: "#9aa4b5", border: "#81a1c1", button: "#88c0d0", link: "#8fbcbb", ok: "#a3be8c", warn: "#ebcb8b", danger: "#bf616a", idle: "#5b667c" }
			),
			theme(
				"dracula",
				"\u25E2",
				{ canvas: "#faf7fd", raised: "#ffffff", nested: "#f1ebfa", deep: "#e4d9f5", sidebar: "#f6f1fc", sunken: "#ede5f8", brand: "#7c3aed", onBrand: "#ffffff", ink: "#2b2141", muted: "#564574", faint: "#7a6795", border: "#4c3a63", button: "#7c3aed", link: "#6d28d9", ok: "#15803d", warn: "#b45309", danger: "#dc2626", idle: "#b3a6c9" },
				{ canvas: "#282a36", raised: "#343746", nested: "#3d4152", deep: "#4a4e63", sidebar: "#2d2f3d", sunken: "#30323f", brand: "#ff79c6", onBrand: "#282a36", ink: "#f8f8f2", muted: "#c8cade", faint: "#9aa0c0", border: "#6272a4", button: "#ff79c6", link: "#8be9fd", ok: "#50fa7b", warn: "#f1fa8c", danger: "#ff5555", idle: "#5c6180" }
			),
			theme(
				"catppuccin",
				"\u2615",
				{ canvas: "#f5f3f0", raised: "#ffffff", nested: "#ece7e3", deep: "#e0d8d2", sidebar: "#f0ece8", sunken: "#e9e3de", brand: "#ea76cb", onBrand: "#4b2a44", ink: "#4c4f69", muted: "#5c5f77", faint: "#7c7f94", border: "#9b8189", button: "#ea76cb", link: "#1e66f5", ok: "#1d7d5a", warn: "#a9641a", danger: "#c02648", idle: "#b7b1c4" },
				{ canvas: "#1e1e2e", raised: "#252537", nested: "#313244", deep: "#45475a", sidebar: "#212134", sunken: "#272738", brand: "#f5c2e7", onBrand: "#1e1e2e", ink: "#f5e0dc", muted: "#cdd6f4", faint: "#a6adc8", border: "#6c7086", button: "#f5c2e7", link: "#89b4fa", ok: "#a6e3a1", warn: "#f9e2af", danger: "#f38ba8", idle: "#585b70" }
			),
			theme(
				"tokyo",
				"\u25D0",
				{ canvas: "#f2f4fb", raised: "#ffffff", nested: "#e7ecf9", deep: "#d6deef", sidebar: "#edf0f9", sunken: "#e4e9f7", brand: "#2e5fbe", onBrand: "#ffffff", ink: "#1a2242", muted: "#4a5578", faint: "#6b769a", border: "#3b4a7a", button: "#2e5fbe", link: "#2e5fbe", ok: "#1f7a5a", warn: "#a8641c", danger: "#c02648", idle: "#a2acc8" },
				{ canvas: "#1a1b26", raised: "#24283b", nested: "#2c3147", deep: "#383f5c", sidebar: "#1d1f2e", sunken: "#20222f", brand: "#7aa2f7", onBrand: "#16161e", ink: "#c0caf5", muted: "#a9b1d6", faint: "#828bb8", border: "#565f89", button: "#7aa2f7", link: "#7dcfff", ok: "#9ece6a", warn: "#e0af68", danger: "#f7768e", idle: "#4b5275" }
			),
			theme(
				"gruvbox",
				"\u25A4",
				{ canvas: "#fbf1c7", raised: "#fffbf0", nested: "#f2e5bc", deep: "#ebdbb2", sidebar: "#f7eccb", sunken: "#f3e6bd", brand: "#b5530a", onBrand: "#fffbf0", ink: "#3c3836", muted: "#504945", faint: "#7c6f64", border: "#7c6f64", button: "#b5530a", link: "#a8560a", ok: "#3f7d3f", warn: "#9a6a1f", danger: "#9d2020", idle: "#b5a68c" },
				{ canvas: "#1d2021", raised: "#282828", nested: "#32302f", deep: "#3c3836", sidebar: "#212222", sunken: "#252423", brand: "#fe8019", onBrand: "#1d2021", ink: "#ebdbb2", muted: "#d5c4a1", faint: "#a89984", border: "#504945", button: "#fe8019", link: "#fabd2f", ok: "#b8bb26", warn: "#fabd2f", danger: "#fb4934", idle: "#584c40" }
			),
			theme(
				"solarized",
				"\u2600",
				{ canvas: "#fdf6e3", raised: "#fffcf2", nested: "#f4ecda", deep: "#eee8d5", sidebar: "#f9f2e2", sunken: "#f2ead8", brand: "#1f5f9e", onBrand: "#fdf6e3", ink: "#073642", muted: "#586e75", faint: "#657b83", border: "#93a1a1", button: "#1f5f9e", link: "#1f5f9e", ok: "#5c7f0e", warn: "#a05a05", danger: "#b03030", idle: "#b3a98f" },
				{ canvas: "#002b36", raised: "#073642", nested: "#0d404b", deep: "#134a56", sidebar: "#04323d", sunken: "#05333e", brand: "#8ec5e8", onBrand: "#002b36", ink: "#eee8d5", muted: "#b6c9c6", faint: "#8fa9a6", border: "#4a6b73", button: "#8ec5e8", link: "#4fb3d9", ok: "#a3be8c", warn: "#d3a63c", danger: "#e07a5f", idle: "#3d5f68" }
			),
			theme(
				"monokai",
				"\u25C8",
				{ canvas: "#faf7f0", raised: "#fffdf8", nested: "#f2ece0", deep: "#e9e0d0", sidebar: "#f6f1e7", sunken: "#efe9dd", brand: "#c2185b", onBrand: "#ffffff", ink: "#2d2a24", muted: "#5a5348", faint: "#7e7566", border: "#8a7f6c", button: "#c2185b", link: "#0a6ea8", ok: "#4a7c26", warn: "#a1671a", danger: "#c0392b", idle: "#bcb2a0" },
				{ canvas: "#272822", raised: "#33342c", nested: "#3c3d34", deep: "#4a4b40", sidebar: "#2c2d26", sunken: "#2f3028", brand: "#f92672", onBrand: "#272822", ink: "#f8f8f2", muted: "#c9ccb6", faint: "#a3a88e", border: "#75715e", button: "#ff8ab8", link: "#66d9ef", ok: "#a6e22e", warn: "#e6db74", danger: "#ff6188", idle: "#585a4c" }
			),
			theme(
				"onedark",
				"\u25D3",
				{ canvas: "#f4f6fa", raised: "#ffffff", nested: "#e9edf5", deep: "#dbe2ee", sidebar: "#eef1f7", sunken: "#e5eaf3", brand: "#2f6eb5", onBrand: "#ffffff", ink: "#21252b", muted: "#4b5263", faint: "#6c7486", border: "#3e4451", button: "#2f6eb5", link: "#2f6eb5", ok: "#2f7d63", warn: "#a8641c", danger: "#c0392b", idle: "#a8b0c0" },
				{ canvas: "#282c34", raised: "#31363f", nested: "#3a4049", deep: "#454b57", sidebar: "#2c313a", sunken: "#2f333c", brand: "#61afef", onBrand: "#21252b", ink: "#d7dae0", muted: "#b0b6c0", faint: "#8b919d", border: "#5c6370", button: "#61afef", link: "#61afef", ok: "#98c379", warn: "#e5c07b", danger: "#e06c75", idle: "#565c68" }
			),
			theme(
				"rosepine",
				"\u2764",
				{ canvas: "#fffaf3", raised: "#fffefb", nested: "#f8eee4", deep: "#f2e1d5", sidebar: "#fbf3ea", sunken: "#f6ece1", brand: "#a8557a", onBrand: "#fffaf3", ink: "#45313c", muted: "#6b5461", faint: "#927c88", border: "#a08b95", button: "#a8557a", link: "#286983", ok: "#4f7a4a", warn: "#9c6a15", danger: "#b4636b", idle: "#c3b0ba" },
				{ canvas: "#191724", raised: "#1f1d2e", nested: "#26233a", deep: "#322f43", sidebar: "#1d1b29", sunken: "#201e2c", brand: "#ebbcba", onBrand: "#191724", ink: "#e0def4", muted: "#c4c0d8", faint: "#9a97b8", border: "#6e6a86", button: "#ebbcba", link: "#9ccfd8", ok: "#95b1ac", warn: "#f6c177", danger: "#eb6f92", idle: "#55516f" }
			),
			theme(
				"cobalt",
				"\u2726",
				{ canvas: "#eef2ff", raised: "#ffffff", nested: "#e0e7ff", deep: "#c7d2fe", sidebar: "#e8edff", sunken: "#e3e9ff", brand: "#4f46e5", onBrand: "#ffffff", ink: "#1e1b4b", muted: "#4338ca", faint: "#6d68b8", border: "#312e81", button: "#4f46e5", link: "#4338ca", ok: "#047857", warn: "#b45309", danger: "#be123c", idle: "#a3a8d8" },
				{ canvas: "#0b1020", raised: "#141a30", nested: "#1d2542", deep: "#28325a", sidebar: "#0e1428", sunken: "#111730", brand: "#818cf8", onBrand: "#0b1020", ink: "#e0e7ff", muted: "#a5b0e0", faint: "#7c88bd", border: "#4f46e5", button: "#818cf8", link: "#a5b4fc", ok: "#34d399", warn: "#fbbf24", danger: "#fb7185", idle: "#3b4a7a" }
			),
			theme(
				"ocean",
				"\u2248",
				{ canvas: "#eef8fb", raised: "#ffffff", nested: "#dcf0f7", deep: "#c3e5f0", sidebar: "#e7f5f9", sunken: "#e0f1f7", brand: "#0e7490", onBrand: "#ffffff", ink: "#083344", muted: "#155e75", faint: "#4b7f92", border: "#0b4a5e", button: "#0e7490", link: "#0e7490", ok: "#047857", warn: "#b45309", danger: "#be123c", idle: "#9dc2cd" },
				{ canvas: "#041f26", raised: "#0a2f3a", nested: "#0f3d4c", deep: "#154e60", sidebar: "#06252e", sunken: "#082832", brand: "#5eead4", onBrand: "#04211f", ink: "#ccfbf1", muted: "#8fd8ce", faint: "#66a9a6", border: "#2dd4bf", button: "#5eead4", link: "#67e8f9", ok: "#34d399", warn: "#fbbf24", danger: "#fb7185", idle: "#2f6a72" }
			),
			theme(
				"forest",
				"\u2663",
				{ canvas: "#f2f7f1", raised: "#ffffff", nested: "#e3eee1", deep: "#cfe3cb", sidebar: "#ecf4ea", sunken: "#e6f0e4", brand: "#2f7d3f", onBrand: "#ffffff", ink: "#1a2e1d", muted: "#3f5e43", faint: "#6b8569", border: "#2d5033", button: "#2f7d3f", link: "#2f7d3f", ok: "#15803d", warn: "#a16207", danger: "#b91c1c", idle: "#a8bda6" },
				{ canvas: "#0e150f", raised: "#162218", nested: "#1e2e21", deep: "#2a3f2d", sidebar: "#111a13", sunken: "#131d15", brand: "#6ba36b", onBrand: "#0e150f", ink: "#dfe8d9", muted: "#a9bda3", faint: "#7f9479", border: "#4d6b50", button: "#6ba36b", link: "#a3b18a", ok: "#7cb342", warn: "#d9a441", danger: "#e07a5f", idle: "#42533f" }
			),
			theme(
				"paper",
				"\u25A1",
				{ canvas: "#fbfaf7", raised: "#ffffff", nested: "#f2f0ea", deep: "#e6e3da", sidebar: "#f6f4ee", sunken: "#f0eee8", brand: "#57534e", onBrand: "#ffffff", ink: "#1c1917", muted: "#57534e", faint: "#7c7873", border: "#a8a29e", button: "#57534e", link: "#44403c", ok: "#3f6212", warn: "#92400e", danger: "#991b1b", idle: "#c8c5bf" },
				{ canvas: "#161513", raised: "#1f1e1b", nested: "#292724", deep: "#35322e", sidebar: "#1a1917", sunken: "#1c1b19", brand: "#c8c2b8", onBrand: "#161513", ink: "#e7e5e4", muted: "#b5b0a8", faint: "#8a857d", border: "#57534e", button: "#c8c2b8", link: "#d6d3d1", ok: "#a3b18a", warn: "#d6a35c", danger: "#e07a5f", idle: "#4a4741" }
			),
			theme(
				"synthwave",
				"\u2605",
				{ canvas: "#fdf4ff", raised: "#ffffff", nested: "#f6e4fc", deep: "#ebcdf8", sidebar: "#faeeff", sunken: "#f8e9fe", brand: "#86198f", onBrand: "#ffffff", ink: "#2c1338", muted: "#6b2a75", faint: "#9a5ba3", border: "#4a0d55", button: "#86198f", link: "#7c3aed", ok: "#047857", warn: "#b45309", danger: "#be123c", idle: "#c3a5cb" },
				{ canvas: "#1a0b2e", raised: "#26133f", nested: "#311a4f", deep: "#3f2464", sidebar: "#1e0f34", sunken: "#22113a", brand: "#f472b6", onBrand: "#1a0b2e", ink: "#fbe8ff", muted: "#d0a8e8", faint: "#a780c0", border: "#7c3aed", button: "#f472b6", link: "#22d3ee", ok: "#34d399", warn: "#fbbf24", danger: "#fb7185", idle: "#523a75" }
			),
			theme(
				"coffee",
				"\u2615",
				{ canvas: "#f7f1e8", raised: "#fffcf7", nested: "#efe4d5", deep: "#e2d2bd", sidebar: "#f3ebe0", sunken: "#eee2d3", brand: "#8b5e34", onBrand: "#fffdf9", ink: "#3b2f2a", muted: "#5f4b3f", faint: "#8a7263", border: "#7a5c46", button: "#8b5e34", link: "#8b5e34", ok: "#4a7c3f", warn: "#b45309", danger: "#a03a3a", idle: "#baa892" },
				{ canvas: "#1c1714", raised: "#26201b", nested: "#332a23", deep: "#42362c", sidebar: "#201a16", sunken: "#231d18", brand: "#c8a06a", onBrand: "#1c1714", ink: "#ece2d5", muted: "#c4b4a0", faint: "#94826f", border: "#5c4a3a", button: "#c8a06a", link: "#d8b98a", ok: "#a3be8c", warn: "#d9a441", danger: "#e07a5f", idle: "#4a3d31" }
			),
			theme(
				"lavender",
				"\u2735",
				{ canvas: "#f6f4fd", raised: "#ffffff", nested: "#ebe6fa", deep: "#dcd4f4", sidebar: "#f1edfc", sunken: "#e9e4f9", brand: "#6d28d9", onBrand: "#ffffff", ink: "#241a3d", muted: "#4c3c75", faint: "#7a6b9e", border: "#3b2a63", button: "#6d28d9", link: "#6d28d9", ok: "#047857", warn: "#b45309", danger: "#be123c", idle: "#b3a8cd" },
				{ canvas: "#151228", raised: "#1e1a35", nested: "#272247", deep: "#342d5c", sidebar: "#191532", sunken: "#1b1730", brand: "#c4b5fd", onBrand: "#151228", ink: "#ede9fe", muted: "#c0b5e0", faint: "#948bba", border: "#6d28d9", button: "#c4b5fd", link: "#a78bfa", ok: "#34d399", warn: "#fbbf24", danger: "#fb7185", idle: "#453c6b" }
			),
			theme(
				"contrast",
				"\u25C9",
				{ canvas: "#ffffff", raised: "#ffffff", nested: "#f2f2f2", deep: "#e0e0e0", sidebar: "#f2f2f2", sunken: "#f5f5f5", brand: "#0043ce", onBrand: "#ffffff", ink: "#000000", muted: "#262626", faint: "#595959", border: "#000000", button: "#0043ce", link: "#0043ce", ok: "#0b6b2f", warn: "#8a4b00", danger: "#a8071a", idle: "#767676" },
				{ canvas: "#000000", raised: "#0d0d0d", nested: "#1a1a1a", deep: "#2b2b2b", sidebar: "#0a0a0a", sunken: "#0f0f0f", brand: "#7cc4ff", onBrand: "#000000", ink: "#ffffff", muted: "#e0e0e0", faint: "#b3b3b3", border: "#8c8c8c", button: "#7cc4ff", link: "#aad4ff", ok: "#5ce65c", warn: "#ffd24d", danger: "#ff7a7a", idle: "#595959" }
			),
		];
		void ATOM_KEYS;

		const DEFAULT_ID = "stock";

		/** The pack's own stylesheet: hover feedback for the picker chips. */
		const CSS = `
[data-dsh-theme-pack-chip]{transition:border-color .12s ease,background-color .12s ease}
[data-dsh-theme-pack-chip]:hover{border-color:var(--dsw-alias-brand-primary)!important}
`;

		function themeById(id) {
			return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
		}

		/**
		 * The `{ light, dark }` token table a registered theme needs: each derived
		 * token carries one value per scheme. `stock` produces nothing.
		 * @param {{ light?: Record<string, string>, dark?: Record<string, string> }} definition
		 */
		function tokensOf(definition) {
			if (definition.light === undefined || definition.dark === undefined) return {};
			const light = palette(definition.light);
			const dark = palette(definition.dark);
			const tokens = {};
			for (const name of Object.keys(light)) tokens[name] = { light: light[name], dark: dark[name] };
			return tokens;
		}

		/** The color a theme's glyph paints with, per scheme. */
		function swatchOf(definition, isDark) {
			if (definition.light === undefined) return "#8b9099";
			return isDark ? definition.dark.brand : definition.light.brand;
		}

		function readStored() {
			try {
				const stored = window.localStorage.getItem(STORAGE_KEY);
				return THEMES.some((theme) => theme.id === stored) ? stored : DEFAULT_ID;
			} catch {
				return DEFAULT_ID;
			}
		}

		function writeStored(id) {
			try {
				window.localStorage.setItem(STORAGE_KEY, id);
			} catch {
				/* a blocked storage must not break the picker */
			}
		}

		/**
		 * Owns the single override layer and the current preference. Both entry
		 * points read and write through this object, so there is exactly one layer
		 * per plugin no matter how many surfaces are mounted.
		 * @param ctx Client cordis context.
		 */
		function createController(ctx) {
			let active = readStored();
			let isDark = false;
			let disposeLayer = () => {};
			const listeners = new Set();

			const syncScheme = () => {
				isDark = document.body !== null && document.body.hasAttribute("data-ds-dark-theme");
			};
			/** Stack the active skin over the current palette. */
			const apply = () => {
				disposeLayer();
				disposeLayer = () => {};
				const definition = themeById(active);
				if (definition.id === DEFAULT_ID) return;
				const tokens = tokensOf(definition);
				if (Object.keys(tokens).length === 0) {
					/* An incomplete atom table must not silently render the stock palette. */
					console.error(`dsh-theme-pack: theme "${definition.id}" has no atom tables`);
					return;
				}
				disposeLayer = ctx.theme.overrideTokens(LAYER_SOURCE, tokens);
			};
			const notify = () => {
				for (const listener of listeners) listener();
			};

			ctx.effect(() => () => disposeLayer(), "theme-pack: override layer");
			syncScheme();
			ctx.on("theme/change", () => {
				syncScheme();
				apply();
			});
			apply();

			return {
				get() {
					return active;
				},
				isDark() {
					return isDark;
				},
				set(id) {
					const next = themeById(id).id;
					if (next === active) return;
					active = next;
					writeStored(next);
					apply();
					notify();
				},
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				}
			};
		}

		/** Re-render whenever the controller's preference changes. */
		function useActive(controller) {
			const [active, setActive] = React.useState(controller.get());
			React.useEffect(() => {
				setActive(controller.get());
				return controller.subscribe(() => setActive(controller.get()));
			}, [controller]);
			return active;
		}

		/**
		 * Settings -> General row: the primary picker. The section column only
		 * stacks rows and passes no props, so the row draws its own label, its own
		 * swatches and its own write path.
		 */
		/**
		 * Settings -> General row: the only picker surface. The section column only
		 * stacks rows and passes no props, so the row draws its own label, its own
		 * swatches and its own write path.
		 */
		function ThemeRow(props) {
			const active = useActive(props.controller);
			const isDark = props.controller.isDark();
			return React.createElement(
				"div",
				{ "data-dsh-theme-pack-row": "", style: { display: "flex", flexDirection: "column", gap: "8px" } },
				React.createElement(
					"div",
					{ style: { display: "flex", flexDirection: "column", gap: "2px" } },
					React.createElement(
						"span",
						{ style: { fontSize: "13px", fontWeight: 500, color: "var(--dsw-alias-label-primary)" } },
						props.t("section.theme")
					),
					React.createElement(
						"span",
						{ style: { fontSize: "12px", color: "var(--dsw-alias-label-tertiary)" } },
						props.t("section.hint")
					)
				),
				React.createElement(
					"div",
					{ style: { display: "flex", flexWrap: "wrap", gap: "6px" } },
					...THEMES.map((theme) => {
						const selected = theme.id === active;
						return React.createElement(
							"button",
							{
								key: theme.id,
								type: "button",
								"data-dsh-theme-pack-chip": theme.id,
								"aria-pressed": selected ? "true" : "false",
								title: props.t("theme." + theme.id),
								onClick: () => props.controller.set(theme.id),
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									height: "28px",
									padding: "0 10px",
									borderRadius: "8px",
									border: "1px solid var(--dsw-alias-border-l2)",
									background: selected
										? "var(--dsw-alias-interactive-bg-hover)"
										: "var(--dsw-alias-bg-layer-3)",
									color: selected
										? "var(--dsw-alias-label-primary)"
										: "var(--dsw-alias-label-secondary)",
									font: "12px/1 var(--dsw-font-family, sans-serif)",
									fontWeight: selected ? 600 : 400,
									cursor: "pointer"
								}
							},
							React.createElement("span", {
								"aria-hidden": true,
								style: {
									width: "10px",
									height: "10px",
									borderRadius: "3px",
									flex: "none",
									background: swatchOf(theme, isDark)
								}
							}),
							props.t("theme." + theme.id)
						);
					})
				)
			);
		}

		return {
			inject: ["theme", "slots", "locale"],
			apply(ctx) {
				ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), "theme-pack: dictionaries");
				const t = ctx.locale.bind(NS);
				ctx.effect(() => {
					const node = document.createElement("style");
					node.id = STYLE_ID;
					node.textContent = CSS;
					document.head.append(node);
					return () => node.remove();
				}, "theme-pack: stylesheet");

				const controller = createController(ctx);

				ctx.slots.inject("settings.general.item", () =>
					ctx.slots.register(
						{
							name: "settings.general.item",
							id: "theme-pack",
							order: 13,
							inject: () => ({ controller, t })
						},
						ThemeRow
					)
				);
			}
		};
	}
});
