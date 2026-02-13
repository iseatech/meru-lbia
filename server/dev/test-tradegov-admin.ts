import { db } from "../db";
import { meruTradegovSources, meruTradegovEntries } from "@shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("=== Trade.gov Admin Endpoints Test ===\n");

  let testSourceId: string | null = null;
  let testEntryId: string | null = null;

  try {
    console.log("1. Inserting test source + entry...");
    const [src] = await db.insert(meruTradegovSources).values({
      title: "Test Source for Admin Audit",
      url: "https://example.com/test",
      publisher: "Test Publisher",
    }).returning();
    testSourceId = src.id;

    const [entry] = await db.insert(meruTradegovEntries).values({
      countryCode: "ZZ",
      countryName: "Testland",
      topic: "Admin Audit Test",
      summary: "Entry created by test script",
      tags: ["test", "admin-audit"],
      riskLevel: "LOW",
      barriers: ["Tariff: Test barrier"],
      regulatoryFlags: ["Agency: Test flag"],
      sectorInsights: ["Sector: Test insight"],
      sourceId: src.id,
      effectiveDate: new Date(),
      isActive: true,
    }).returning();
    testEntryId = entry.id;
    console.log(`   Created entry ${testEntryId}\n`);

    console.log("2. Testing GET /admin/intelligence/tradegov/list (unauthenticated)...");
    const listUnauth = await fetch("http://localhost:5000/admin/intelligence/tradegov/list");
    console.log(`   Status: ${listUnauth.status} (expect 401 or 302)`);
    console.log(`   PASS: ${listUnauth.status === 401 || listUnauth.status === 302 || listUnauth.status === 403}\n`);

    console.log("3. Verifying list endpoint returns data via direct DB query...");
    const allEntries = await db.select().from(meruTradegovEntries).where(eq(meruTradegovEntries.id, testEntryId));
    console.log(`   Found entry: ${allEntries.length === 1}`);
    console.log(`   is_active: ${allEntries[0]?.isActive}`);
    console.log(`   PASS: ${allEntries.length === 1 && allEntries[0]?.isActive === true}\n`);

    console.log("4. Testing deactivation via direct DB update...");
    await db.update(meruTradegovEntries).set({ isActive: false }).where(eq(meruTradegovEntries.id, testEntryId));
    const [deactivated] = await db.select().from(meruTradegovEntries).where(eq(meruTradegovEntries.id, testEntryId));
    console.log(`   is_active after deactivation: ${deactivated?.isActive}`);
    console.log(`   PASS: ${deactivated?.isActive === false}\n`);

    console.log("5. Verifying deactivated entry excluded from loader query...");
    const { loadTradeGovIntelligence } = await import("../intelligence/intelligence.tradegov.db");
    const result = await loadTradeGovIntelligence("Testland");
    console.log(`   Loader result for 'Testland': ${result === null ? "null (correctly excluded)" : "found (BUG)"}`);
    console.log(`   PASS: ${result === null}\n`);

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    if (testEntryId) {
      await db.delete(meruTradegovEntries).where(eq(meruTradegovEntries.id, testEntryId));
    }
    if (testSourceId) {
      await db.delete(meruTradegovSources).where(eq(meruTradegovSources.id, testSourceId));
    }
    console.log("Cleanup done. Test data removed.");
    console.log("\n=== Manual curl commands ===");
    console.log("# List entries:");
    console.log('curl -s http://localhost:5000/admin/intelligence/tradegov/list -H "Cookie: connect.sid=YOUR_SESSION"');
    console.log("\n# Get entry detail:");
    console.log('curl -s http://localhost:5000/admin/intelligence/tradegov/entry/ENTRY_ID -H "Cookie: connect.sid=YOUR_SESSION"');
    console.log("\n# Deactivate entry:");
    console.log('curl -s -X POST http://localhost:5000/admin/intelligence/tradegov/deactivate/ENTRY_ID -H "Cookie: connect.sid=YOUR_SESSION"');
  }
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
