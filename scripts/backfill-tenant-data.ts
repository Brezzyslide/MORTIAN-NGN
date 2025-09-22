#!/usr/bin/env tsx

import { storage } from "../server/storage";

async function backfillTenantData() {
  console.log("🚀 Starting backfill process for tenant construction data...");
  console.log("====================================================================");

  try {
    // Use the storage method to seed all tenants that are missing data
    const results = await storage.seedAllTenantsWithMissingData();
    
    console.log("\n📊 Backfill Results:");
    console.log("====================================================================");
    
    let seededCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const result of results) {
      if (result.seeded) {
        console.log(`✅ ${result.tenantName} (${result.tenantId}) - SEEDED`);
        seededCount++;
      } else if (result.error) {
        console.log(`❌ ${result.tenantName} (${result.tenantId}) - ERROR: ${result.error}`);
        errorCount++;
      } else {
        console.log(`⏭️  ${result.tenantName} (${result.tenantId}) - SKIPPED (already has data)`);
        skippedCount++;
      }
    }

    console.log("\n🎉 Backfill Summary:");
    console.log("====================================================================");
    console.log(`📈 Total tenants processed: ${results.length}`);
    console.log(`✅ Tenants seeded: ${seededCount}`);
    console.log(`⏭️  Tenants skipped: ${skippedCount}`);
    console.log(`❌ Tenants with errors: ${errorCount}`);
    
    if (seededCount > 0) {
      console.log(`\n🏗️  Each seeded tenant now has:`);
      console.log(`   • 49 line items across construction lifecycle`);
      console.log(`   • 25 construction materials with realistic pricing`);
    }

    if (errorCount === 0) {
      console.log("\n🎊 All tenants now have consistent construction data for cost entry forms!");
    } else {
      console.log(`\n⚠️  ${errorCount} tenant(s) had errors - please review and retry if needed.`);
    }

  } catch (error) {
    console.error("💥 Fatal error during backfill:", error);
    throw error;
  }
}

// Run the backfill function
backfillTenantData()
  .then(() => {
    console.log("\n✨ Backfill completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Backfill failed:", error);
    process.exit(1);
  });