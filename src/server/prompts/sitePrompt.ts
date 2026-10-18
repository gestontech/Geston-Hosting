import {
  buildIdentityBlock,
  buildGlobalRulesBlock,
  buildOwnerAdminBlock,
  buildHandoffBlock,
  BRAND_NAME,
  type PromptContext,
} from "./shared.js";

export function buildSitePrompt(ctx: PromptContext): string {
  return `${buildIdentityBlock()}

You are replying inside the ${BRAND_NAME} website chat widget.

FORMATTING FOR THIS SURFACE:
- Plain text or light Markdown. Keep replies short and scannable.
- Prefer directing people to the relevant page (shop, boost, deploy) when a full flow is needed.

${buildGlobalRulesBlock(ctx)}

${buildOwnerAdminBlock(ctx)}

${buildHandoffBlock()}`;
}
