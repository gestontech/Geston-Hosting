import { findPanelUser, createPanelUser, getFreeAllocation, createPanelServer } from "./server/services/pterodactyl.js";

const KEY = process.env.PANEL_API_KEY;
const DOMAIN = process.env.PANEL_DOMAIN;

async function run() {
  console.log("\n🔍 Pterodactyl Panel API Test\n");
  console.log(`Panel: ${DOMAIN || "(PANEL_DOMAIN not set)"}`);
  console.log(`Key:   ${KEY ? KEY.slice(0, 12) + "..." : "(PANEL_API_KEY not set)"}\n`);

  if (!KEY || !DOMAIN) {
    console.error("❌ PANEL_API_KEY or PANEL_DOMAIN not set. Check your environment variables.");
    process.exit(1);
  }

  const base = `${DOMAIN}/api/application`;
  const h = { Authorization: `Bearer ${KEY}`, Accept: "application/json", "Content-Type": "application/json" };

  const tests: Array<{ label: string; fn: () => Promise<string> }> = [
    {
      label: "READ users",
      fn: async () => {
        const r = await fetch(`${base}/users`, { headers: h });
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.json().catch(() => ({}))).errors?.[0]?.detail ?? "unknown"}`);
        return "OK";
      },
    },
    {
      label: "READ nodes",
      fn: async () => {
        const r = await fetch(`${base}/nodes?include=allocations`, { headers: h });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json() as { data: unknown[] };
        return `OK — ${d.data.length} node(s)`;
      },
    },
    {
      label: "READ nest eggs (PANEL_NEST_ID)",
      fn: async () => {
        const nestId = process.env.PANEL_NEST_ID || "5";
        const r = await fetch(`${base}/nests/${nestId}/eggs`, { headers: h });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json() as { data: Array<{ attributes: { id: number; name: string } }> };
        const ids = d.data.map(e => `#${e.attributes.id} ${e.attributes.name}`).join(", ");
        return `OK — eggs: ${ids}`;
      },
    },
    {
      label: "FREE allocation available",
      fn: async () => {
        const id = await getFreeAllocation();
        return `OK — allocation ID ${id}`;
      },
    },
    {
      label: "WRITE users (create test user)",
      fn: async () => {
        const ts = Date.now().toString().slice(-6);
        const r = await fetch(`${base}/users`, {
          method: "POST",
          headers: h,
          body: JSON.stringify({ email: `apitest${ts}@gestontech.online`, username: `apitest${ts}`, first_name: "apitest", last_name: "test", language: "en", password: `ApiTest@${ts}`, root_admin: false }),
        });
        const d = await r.json() as { attributes?: { id: number }; errors?: Array<{ detail?: string }> };
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${d.errors?.[0]?.detail ?? "unknown"}`);
        return `OK — created user ID ${d.attributes?.id}`;
      },
    },
  ];

  let pass = 0; let fail = 0;
  for (const t of tests) {
    try {
      const result = await t.fn();
      console.log(`  ✅ ${t.label}: ${result}`);
      pass++;
    } catch (e) {
      console.log(`  ❌ ${t.label}: ${e instanceof Error ? e.message : String(e)}`);
      fail++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Result: ${pass} passed, ${fail} failed`);

  if (fail > 0) {
    console.log("\n💡 If WRITE users fails with 403:");
    console.log(`   → Go to ${DOMAIN}/admin/api`);
    console.log(`   → Edit your Application API key`);
    console.log(`   → Enable Write permissions for: Users, Servers`);
    console.log(`   → Or create a new key with ALL Read+Write boxes checked`);
    console.log("\n💡 If PANEL_EGG_ID is wrong:");
    console.log(`   → Run the nest egg test above to see the correct egg IDs`);
    console.log(`   → Update PANEL_EGG_ID in your Heroku config vars to match`);
  } else {
    console.log("\n🎉 All tests passed! Panel provisioning should work.");
  }
}

run().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
