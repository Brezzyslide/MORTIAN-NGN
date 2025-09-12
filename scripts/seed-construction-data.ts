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
    
    // Comprehensive line items data - Land Purchase to Final Cleaning to Marketing
    const lineItemsData: Array<{
      category: "land_purchase" | "site_preparation" | "foundation" | "structural" | "roofing" | "electrical" | "plumbing" | "finishing" | "external_works" | "marketing";
      name: string;
      description: string;
      tenantId: string;
    }> = [
      // Land Purchase
      { category: "land_purchase", name: "Land acquisition", description: "Purchase of construction land", tenantId: sampleTenantId },
      { category: "land_purchase", name: "Site survey", description: "Professional site surveying and planning", tenantId: sampleTenantId },
      { category: "land_purchase", name: "Legal fees", description: "Legal documentation and transfer fees", tenantId: sampleTenantId },
      { category: "land_purchase", name: "Title transfer", description: "Property title transfer processing", tenantId: sampleTenantId },
      
      // Site Preparation
      { category: "site_preparation", name: "Site clearing", description: "Clearing vegetation and debris from site", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Excavation", description: "Main excavation work for foundation", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Leveling", description: "Site leveling and grading", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Access road", description: "Construction of site access roads", tenantId: sampleTenantId },
      
      // Foundation
      { category: "foundation", name: "Foundation excavation", description: "Digging foundation trenches and footings", tenantId: sampleTenantId },
      { category: "foundation", name: "Concrete pouring", description: "Pouring concrete for foundation", tenantId: sampleTenantId },
      { category: "foundation", name: "Rebar installation", description: "Steel reinforcement placement", tenantId: sampleTenantId },
      { category: "foundation", name: "Waterproofing", description: "Foundation waterproofing and damp proofing", tenantId: sampleTenantId },
      
      // Structural
      { category: "structural", name: "Frame construction", description: "Main structural frame building", tenantId: sampleTenantId },
      { category: "structural", name: "Beam installation", description: "Installation of structural beams", tenantId: sampleTenantId },
      { category: "structural", name: "Column construction", description: "Concrete or steel column construction", tenantId: sampleTenantId },
      { category: "structural", name: "Floor slabs", description: "Concrete floor slab installation", tenantId: sampleTenantId },
      
      // Roofing
      { category: "roofing", name: "Roof structure", description: "Roof frame and truss installation", tenantId: sampleTenantId },
      { category: "roofing", name: "Roofing materials", description: "Installation of roofing sheets or tiles", tenantId: sampleTenantId },
      { category: "roofing", name: "Gutters", description: "Gutter and downpipe installation", tenantId: sampleTenantId },
      { category: "roofing", name: "Insulation", description: "Roof insulation installation", tenantId: sampleTenantId },
      
      // Electrical
      { category: "electrical", name: "Wiring installation", description: "Electrical wiring throughout building", tenantId: sampleTenantId },
      { category: "electrical", name: "Panel setup", description: "Electrical panel and distribution setup", tenantId: sampleTenantId },
      { category: "electrical", name: "Outlet installation", description: "Power outlet and switch installation", tenantId: sampleTenantId },
      { category: "electrical", name: "Lighting fixtures", description: "Installation of lighting fixtures", tenantId: sampleTenantId },
      
      // Plumbing
      { category: "plumbing", name: "Pipe installation", description: "Water supply and sewerage pipe installation", tenantId: sampleTenantId },
      { category: "plumbing", name: "Fixture installation", description: "Installation of plumbing fixtures", tenantId: sampleTenantId },
      { category: "plumbing", name: "Water heater", description: "Water heating system installation", tenantId: sampleTenantId },
      { category: "plumbing", name: "Drainage system", description: "Drainage and waste water system", tenantId: sampleTenantId },
      
      // Finishing
      { category: "finishing", name: "Interior painting", description: "Interior wall and ceiling painting", tenantId: sampleTenantId },
      { category: "finishing", name: "Flooring installation", description: "Installation of floor materials", tenantId: sampleTenantId },
      { category: "finishing", name: "Wall finishing", description: "Plastering and wall finishing work", tenantId: sampleTenantId },
      { category: "finishing", name: "Ceiling work", description: "Ceiling installation and finishing", tenantId: sampleTenantId },
      { category: "finishing", name: "Final cleaning", description: "Construction cleanup and final inspection", tenantId: sampleTenantId },
      { category: "finishing", name: "Touch-up work", description: "Final touch-ups and corrections", tenantId: sampleTenantId },
      
      // External Works
      { category: "external_works", name: "Landscaping", description: "Site landscaping and gardening", tenantId: sampleTenantId },
      { category: "external_works", name: "Paving", description: "Driveway and walkway paving", tenantId: sampleTenantId },
      { category: "external_works", name: "Fencing", description: "Perimeter fencing installation", tenantId: sampleTenantId },
      { category: "external_works", name: "Exterior lighting", description: "Outdoor lighting installation", tenantId: sampleTenantId },
      
      // Marketing
      { category: "marketing", name: "Sales materials", description: "Brochures and sales documentation", tenantId: sampleTenantId },
      { category: "marketing", name: "Advertising", description: "Marketing and advertising campaigns", tenantId: sampleTenantId },
      { category: "marketing", name: "Show home setup", description: "Model home preparation and setup", tenantId: sampleTenantId },
    ];

    // Insert line items
    await db.insert(lineItems).values(lineItemsData);
    console.log(`✅ Inserted ${lineItemsData.length} line items`);

    console.log("🏗️ Seeding materials...");

    // Comprehensive materials data with realistic pricing
    const materialsData = [
      // Basic construction materials
      { name: "Portland Cement", unit: "bags", currentUnitPrice: "12.50", supplier: "CemCorp Ltd", tenantId: sampleTenantId },
      { name: "Fine Sand", unit: "cubic meters", currentUnitPrice: "45.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Coarse Gravel", unit: "cubic meters", currentUnitPrice: "55.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Steel Rebar 12mm", unit: "tons", currentUnitPrice: "850.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Steel Rebar 16mm", unit: "tons", currentUnitPrice: "870.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Structural Timber", unit: "cubic meters", currentUnitPrice: "650.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      
      // Hardware and fasteners
      { name: "Common Nails 75mm", unit: "kg", currentUnitPrice: "3.20", supplier: "Hardware Central", tenantId: sampleTenantId },
      { name: "Common Nails 100mm", unit: "kg", currentUnitPrice: "3.40", supplier: "Hardware Central", tenantId: sampleTenantId },
      { name: "Wood Screws 50mm", unit: "kg", currentUnitPrice: "8.50", supplier: "Hardware Central", tenantId: sampleTenantId },
      { name: "Bolts and Nuts M12", unit: "pieces", currentUnitPrice: "2.50", supplier: "Hardware Central", tenantId: sampleTenantId },
      
      // Roofing materials
      { name: "Aluminum Roofing Sheets", unit: "square meters", currentUnitPrice: "25.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      { name: "Clay Roof Tiles", unit: "square meters", currentUnitPrice: "35.00", supplier: "TileMasters", tenantId: sampleTenantId },
      { name: "Roof Insulation", unit: "square meters", currentUnitPrice: "15.50", supplier: "InsulPro", tenantId: sampleTenantId },
      { name: "Guttering PVC", unit: "meters", currentUnitPrice: "12.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      
      // Electrical materials
      { name: "Electrical Conduit 20mm", unit: "meters", currentUnitPrice: "4.50", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Electrical Cable 2.5mm", unit: "meters", currentUnitPrice: "6.80", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Electrical Cable 4mm", unit: "meters", currentUnitPrice: "10.20", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Wall Switches", unit: "pieces", currentUnitPrice: "8.50", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Power Sockets", unit: "pieces", currentUnitPrice: "12.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "LED Bulbs 12W", unit: "pieces", currentUnitPrice: "15.00", supplier: "LightCorp", tenantId: sampleTenantId },
      
      // Plumbing materials  
      { name: "PVC Pipes 100mm", unit: "meters", currentUnitPrice: "18.50", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "PVC Pipes 50mm", unit: "meters", currentUnitPrice: "8.75", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Pipe Fittings Assorted", unit: "pieces", currentUnitPrice: "5.50", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Water Taps", unit: "pieces", currentUnitPrice: "45.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Toilet Set Complete", unit: "pieces", currentUnitPrice: "350.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      
      // Finishing materials
      { name: "Interior Paint White", unit: "liters", currentUnitPrice: "25.00", supplier: "ColorMax", tenantId: sampleTenantId },
      { name: "Interior Paint Colors", unit: "liters", currentUnitPrice: "28.00", supplier: "ColorMax", tenantId: sampleTenantId },
      { name: "Ceramic Floor Tiles", unit: "square meters", currentUnitPrice: "35.00", supplier: "TileWorld", tenantId: sampleTenantId },
      { name: "Laminate Flooring", unit: "square meters", currentUnitPrice: "45.00", supplier: "FloorMaster", tenantId: sampleTenantId },
      { name: "Interior Doors", unit: "pieces", currentUnitPrice: "280.00", supplier: "DoorCraft", tenantId: sampleTenantId },
      { name: "Windows Aluminum", unit: "square meters", currentUnitPrice: "185.00", supplier: "WindowWorks", tenantId: sampleTenantId },
      
      // External works materials
      { name: "Paving Stones", unit: "square meters", currentUnitPrice: "42.00", supplier: "StoneCraft", tenantId: sampleTenantId },
      { name: "Chain Link Fencing", unit: "meters", currentUnitPrice: "28.00", supplier: "FencePro", tenantId: sampleTenantId },
      { name: "Garden Soil", unit: "cubic meters", currentUnitPrice: "35.00", supplier: "GardenSupply", tenantId: sampleTenantId },
      { name: "Outdoor Light Fixtures", unit: "pieces", currentUnitPrice: "85.00", supplier: "OutdoorLights", tenantId: sampleTenantId },
      
      // Specialized materials
      { name: "Waterproof Membrane", unit: "square meters", currentUnitPrice: "22.00", supplier: "WaterSeal", tenantId: sampleTenantId },
      { name: "Construction Bricks", unit: "pieces", currentUnitPrice: "0.85", supplier: "BrickWorks", tenantId: sampleTenantId },
      { name: "Mortar Mix", unit: "bags", currentUnitPrice: "8.50", supplier: "CemCorp Ltd", tenantId: sampleTenantId },
      { name: "Insulation Foam", unit: "cubic meters", currentUnitPrice: "120.00", supplier: "InsulPro", tenantId: sampleTenantId },
      { name: "Steel Beams I-Section", unit: "tons", currentUnitPrice: "1250.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Concrete Blocks", unit: "pieces", currentUnitPrice: "4.50", supplier: "BlockCorp", tenantId: sampleTenantId },
      { name: "Roofing Nails", unit: "kg", currentUnitPrice: "4.20", supplier: "Hardware Central", tenantId: sampleTenantId },
      { name: "Exterior Paint", unit: "liters", currentUnitPrice: "32.00", supplier: "ColorMax", tenantId: sampleTenantId }
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