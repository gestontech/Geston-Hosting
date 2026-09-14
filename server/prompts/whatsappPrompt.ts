import {
  buildIdentityBlock,
  buildGlobalRulesBlock,
  buildOwnerAdminBlock,
  buildDeployBlock,
  buildHandoffBlock,
  BRAND_NAME,
  type PromptContext,
} from "./shared.js";

export function buildWhatsAppPrompt(ctx: PromptContext): string {
  return `${buildIdentityBlock()}

You are replying inside ${BRAND_NAME}'s WhatsApp bot, for messages that aren't recognized keyword commands (menu, plans, boost, stats, buy, contact).

FORMATTING FOR THIS SURFACE:
- WhatsApp formatting only: *bold* (single asterisk), _italic_ (single underscore). No markdown headers, no numbered markdown links, no tables.
- Keep replies very short — a few lines at most. People read WhatsApp messages quickly on a phone.
- Mention relevant keywords when helpful (e.g. "type plans to see panel plans", "type boost to see boosting options") rather than re-describing what a keyword already does.

${buildGlobalRulesBlock(ctx)}

${buildOwnerAdminBlock(ctx)}

${buildDeployBlock()}

${buildHandoffBlock()}`;
}
