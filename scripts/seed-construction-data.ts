#!/usr/bin/env tsx

import { db } from "../server/db";
import { companies, lineItems, materials } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedConstructionData() {
  console.log("🚀 Starting seed process for construction data...");

  // Create or find a sample company for seeding
  console.log("🏢 Setting up sample company...");
  
  let sampleCompany;
  const existingCompanies = await db.select().from(companies).limit(1);
  
  if (existingCompanies.length > 0) {
    sampleCompany = existingCompanies[0];
    console.log(`📍 Using existing company: ${sampleCompany.name} (${sampleCompany.id})`);
  } else {
    // Create a sample company for seeding
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: "Sample Construction Company",
        email: "admin@sampleconstruction.com",
        phone: "+1-555-0123",
        address: "123 Construction Ave, Builder City, BC 12345",
        industry: "Construction",
        subscriptionPlan: "pro",
        status: "active",
        createdBy: "seed-script"
      })
      .returning();
    sampleCompany = newCompany;
    console.log(`✨ Created new company: ${sampleCompany.name} (${sampleCompany.id})`);
  }
  
  const sampleTenantId = sampleCompany.id;

  try {
    console.log("📦 Seeding line items...");
    
    // Comprehensive line items data - Construction lifecycle with existing categories  
    const lineItemsData: Array<{
      category: "land_purchase" | "site_preparation" | "foundation" | "structural" | "roofing" | "electrical" | "plumbing" | "finishing" | "external_works" | "marketing";
      name: string;
      description: string;
      tenantId: string;
    }> = [
      // Land Purchase (includes Legal & Approvals)
      { category: "land_purchase", name: "Land Purchase", description: "Acquisition of construction land", tenantId: sampleTenantId },
      { category: "land_purchase", name: "Legal Fees", description: "Legal documentation and transfer fees", tenantId: sampleTenantId },
      { category: "land_purchase", name: "Government Approvals", description: "Planning permits and government approvals", tenantId: sampleTenantId },
      
      // Site Preparation
      { category: "site_preparation", name: "Site Clearing", description: "Clearing vegetation and debris from site", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Soil Test", description: "Soil testing and analysis", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Survey & Pegging", description: "Site surveying and boundary pegging", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Temporary Structures", description: "Site offices and temporary facilities", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Site Fencing", description: "Temporary site security fencing", tenantId: sampleTenantId },
      
      // Foundation
      { category: "foundation", name: "Excavation", description: "Foundation excavation and earthworks", tenantId: sampleTenantId },
      { category: "foundation", name: "Blinding Concrete", description: "Blinding concrete for foundation base", tenantId: sampleTenantId },
      { category: "foundation", name: "Footings", description: "Foundation footings and strip foundations", tenantId: sampleTenantId },
      { category: "foundation", name: "Damp Proof Course", description: "Damp proof course installation", tenantId: sampleTenantId },
      { category: "foundation", name: "Reinforcement", description: "Steel reinforcement for foundation", tenantId: sampleTenantId },
      
      // Structural (includes Blockwork & Decking)
      { category: "structural", name: "Block Molding", description: "Concrete block molding and preparation", tenantId: sampleTenantId },
      { category: "structural", name: "Block Laying", description: "Wall construction with concrete blocks", tenantId: sampleTenantId },
      { category: "structural", name: "Columns", description: "Concrete column construction", tenantId: sampleTenantId },
      { category: "structural", name: "Lintels", description: "Lintel installation above openings", tenantId: sampleTenantId },
      { category: "structural", name: "Scaffolding", description: "Scaffolding for construction", tenantId: sampleTenantId },
      { category: "structural", name: "Formwork", description: "Formwork for concrete decking", tenantId: sampleTenantId },
      { category: "structural", name: "Concrete Casting", description: "Concrete casting for deck slabs", tenantId: sampleTenantId },
      
      // Roofing
      { category: "roofing", name: "Trusses", description: "Roof truss installation", tenantId: sampleTenantId },
      { category: "roofing", name: "Roof Covering", description: "Roof covering installation", tenantId: sampleTenantId },
      { category: "roofing", name: "Fascia & Soffit", description: "Fascia board and soffit installation", tenantId: sampleTenantId },
      { category: "roofing", name: "Gutters", description: "Gutter and downpipe installation", tenantId: sampleTenantId },
      
      // Electrical
      { category: "electrical", name: "Electrical Rough-in", description: "Electrical rough-in installation", tenantId: sampleTenantId },
      { category: "electrical", name: "Electrical Final Fix", description: "Final electrical connections and testing", tenantId: sampleTenantId },
      { category: "electrical", name: "Panel Installation", description: "Electrical panel and distribution setup", tenantId: sampleTenantId },
      { category: "electrical", name: "Lighting Fixtures", description: "Installation of lighting fixtures", tenantId: sampleTenantId },
      
      // Plumbing
      { category: "plumbing", name: "Plumbing Rough-in", description: "Plumbing rough-in installation", tenantId: sampleTenantId },
      { category: "plumbing", name: "Septic Tank", description: "Septic tank installation", tenantId: sampleTenantId },
      { category: "plumbing", name: "Borehole", description: "Water borehole drilling and setup", tenantId: sampleTenantId },
      { category: "plumbing", name: "Plumbing Final Fix", description: "Final plumbing connections and testing", tenantId: sampleTenantId },
      
      // Finishing
      { category: "finishing", name: "Plastering", description: "Wall and ceiling plastering", tenantId: sampleTenantId },
      { category: "finishing", name: "Screeding", description: "Floor screeding and leveling", tenantId: sampleTenantId },
      { category: "finishing", name: "Windows", description: "Window installation", tenantId: sampleTenantId },
      { category: "finishing", name: "Doors", description: "Door installation", tenantId: sampleTenantId },
      { category: "finishing", name: "Tiling", description: "Floor and wall tiling", tenantId: sampleTenantId },
      { category: "finishing", name: "Ceiling", description: "Ceiling installation and finishing", tenantId: sampleTenantId },
      { category: "finishing", name: "Painting", description: "Interior and exterior painting", tenantId: sampleTenantId },
      { category: "finishing", name: "Cabinetry", description: "Kitchen and bathroom cabinetry", tenantId: sampleTenantId },
      { category: "finishing", name: "Sanitary", description: "Sanitary ware installation", tenantId: sampleTenantId },
      
      // External Works
      { category: "external_works", name: "Driveway", description: "Driveway construction", tenantId: sampleTenantId },
      { category: "external_works", name: "Perimeter Fence & Gate", description: "Perimeter fencing and gate installation", tenantId: sampleTenantId },
      { category: "external_works", name: "Landscaping", description: "Site landscaping and gardening", tenantId: sampleTenantId },
      { category: "external_works", name: "Drainage", description: "Site drainage system", tenantId: sampleTenantId },
      
      // Marketing (includes Close-out activities)
      { category: "marketing", name: "Marketing Collateral", description: "Marketing materials and brochures", tenantId: sampleTenantId },
      { category: "marketing", name: "Agent Commission", description: "Sales agent commission payments", tenantId: sampleTenantId },
      { category: "marketing", name: "Final Cleaning", description: "Construction cleanup and final inspection", tenantId: sampleTenantId },
      { category: "marketing", name: "Occupancy Certificate", description: "Final approvals and occupancy certificate", tenantId: sampleTenantId },
    ];

    // Insert line items
    await db.insert(lineItems).values(lineItemsData);
    console.log(`✅ Inserted ${lineItemsData.length} line items`);

    console.log("🏗️ Seeding materials...");

    // Comprehensive materials data - Construction materials with proper units
    const materialsData = [
      // Basic construction materials
      { name: "Cement", unit: "bag", currentUnitPrice: "12.50", supplier: "CemCorp Ltd", tenantId: sampleTenantId },
      { name: "Sharp Sand", unit: "m³", currentUnitPrice: "45.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Granite", unit: "m³", currentUnitPrice: "55.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Laterite", unit: "m³", currentUnitPrice: "35.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Water", unit: "tanker", currentUnitPrice: "85.00", supplier: "Water Services", tenantId: sampleTenantId },
      
      // Reinforcement materials
      { name: "Reinforcement Rod", unit: "kg", currentUnitPrice: "4.20", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Binding Wire", unit: "roll", currentUnitPrice: "25.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Timber", unit: "pcs", currentUnitPrice: "15.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Nails", unit: "kg", currentUnitPrice: "3.50", supplier: "Hardware Central", tenantId: sampleTenantId },
      
      // Roofing materials
      { name: "Aluminium Roofing Sheet", unit: "m²", currentUnitPrice: "28.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      { name: "Fascia Board", unit: "pcs", currentUnitPrice: "45.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      { name: "PVC Soffit", unit: "m²", currentUnitPrice: "22.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      
      // Electrical materials
      { name: "Electrical Conduit", unit: "length", currentUnitPrice: "4.50", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Cables", unit: "roll", currentUnitPrice: "125.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Switches & Sockets", unit: "pcs", currentUnitPrice: "8.50", supplier: "ElectroMax", tenantId: sampleTenantId },
      
      // Plumbing materials
      { name: "Plumbing Pipe", unit: "length", currentUnitPrice: "18.50", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Plumbing Fittings", unit: "pcs", currentUnitPrice: "5.50", supplier: "PlumbPro", tenantId: sampleTenantId },
      
      // Finishing materials
      { name: "Paint", unit: "bucket", currentUnitPrice: "35.00", supplier: "ColorMax", tenantId: sampleTenantId },
      { name: "Floor Tiles", unit: "m²", currentUnitPrice: "42.00", supplier: "TileWorld", tenantId: sampleTenantId },
      { name: "Ceiling Boards", unit: "m²", currentUnitPrice: "25.00", supplier: "CeilingPro", tenantId: sampleTenantId },
      
      // Fixtures and fittings
      { name: "Doors", unit: "pcs", currentUnitPrice: "280.00", supplier: "DoorCraft", tenantId: sampleTenantId },
      { name: "Windows", unit: "pcs", currentUnitPrice: "350.00", supplier: "WindowWorks", tenantId: sampleTenantId },
      { name: "Kitchen Sink", unit: "pcs", currentUnitPrice: "150.00", supplier: "KitchenPro", tenantId: sampleTenantId },
      { name: "WC Set", unit: "pcs", currentUnitPrice: "280.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Paving Stones", unit: "m²", currentUnitPrice: "42.00", supplier: "StoneCraft", tenantId: sampleTenantId },
    ];

    // Insert materials
    await db.insert(materials).values(materialsData);
    console.log(`✅ Inserted ${materialsData.length} materials`);

    console.log("🎉 Seed data creation completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   • Company: ${sampleCompany.name} (${sampleTenantId})`);
    console.log(`   • Line Items: ${lineItemsData.length} items across construction lifecycle`);
    console.log(`   • Materials: ${materialsData.length} construction materials with realistic pricing`);

  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

// Run the seed function
seedConstructionData()
  .then(() => {
    console.log("✨ Seeding completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  });