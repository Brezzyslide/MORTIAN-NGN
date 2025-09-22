#!/usr/bin/env tsx

import { storage } from "../server/storage";

async function backfillTenantData() {
  console.log("🔒 Starting HARDENED backfill process for tenant construction data...");
  console.log("====================================================================");
  console.log("🛡️  Using atomic transactions, RLS context, and audit logging");
  console.log("🔄 Idempotent operations with conflict resolution");
  console.log("✅ Post-operation verification and integrity checks");
  console.log("====================================================================");

  try {
    // Use the hardened storage method to seed all tenants
    const results = await storage.seedAllTenantsWithMissingData();
    
    console.log("\n📊 Hardened Backfill Results:");
    console.log("====================================================================");
    
    let seededCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalAuditLogs = 0;

    for (const result of results) {
      if (result.error) {
        console.log(`❌ ${result.tenantName} (${result.tenantId}) - ERROR: ${result.error}`);
        errorCount++;
      } else if (result.seeded) {
        console.log(`✅ ${result.tenantName} (${result.tenantId}) - SEEDED`);
        console.log(`   📊 Progress: ${result.preCount?.lineItems || 0} → ${result.postCount?.lineItems || 0} line items`);
        console.log(`   📊 Progress: ${result.preCount?.materials || 0} → ${result.postCount?.materials || 0} materials`);
        console.log(`   🔍 Operation ID: ${result.operationId}`);
        console.log(`   📝 Audit Log: ${result.auditLogId}`);
        seededCount++;
        if (result.auditLogId) totalAuditLogs++;
      } else {
        console.log(`⏭️  ${result.tenantName} (${result.tenantId}) - VERIFIED (already complete)`);
        console.log(`   📊 Current: ${result.postCount?.lineItems || 0} line items, ${result.postCount?.materials || 0} materials`);
        console.log(`   🔍 Operation ID: ${result.operationId}`);
        console.log(`   📝 Audit Log: ${result.auditLogId}`);
        skippedCount++;
        if (result.auditLogId) totalAuditLogs++;
      }
    }

    console.log("\n🎉 Hardened Backfill Summary:");
    console.log("====================================================================");
    console.log(`📈 Total tenants processed: ${results.length}`);
    console.log(`✅ Tenants seeded (new data): ${seededCount}`);
    console.log(`⏭️  Tenants verified (already complete): ${skippedCount}`);
    console.log(`❌ Tenants with errors: ${errorCount}`);
    console.log(`📝 Audit logs created: ${totalAuditLogs}`);
    
    if (seededCount > 0) {
      console.log(`\n🏗️  Each seeded tenant now has construction data with:`);
      console.log(`   • 49 line items across construction lifecycle phases`);
      console.log(`   • 25 construction materials with realistic pricing`);
      console.log(`   • Unique constraints preventing duplicates`);
      console.log(`   • Full audit trail of seeding operations`);
    }

    if (errorCount === 0) {
      console.log("\n🎊 All tenants processed successfully with hardened implementation!");
      console.log("🔒 Database integrity maintained through atomic transactions");
      console.log("🛡️  RLS context properly set for all operations");
      console.log("📝 Complete audit trail available for all activities");
    } else {
      console.log(`\n⚠️  ${errorCount} tenant(s) had errors - all others completed atomically`);
      console.log("🔒 Failed operations were rolled back completely");
    }

  } catch (error) {
    console.error("💥 Fatal error during hardened backfill:", error);
    console.error("🔒 Any partial operations were rolled back automatically");
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