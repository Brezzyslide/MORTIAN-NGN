#!/usr/bin/env tsx

import { db } from "../server/db";
import { companies, lineItems, materials } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedConstructionData() {
  console.log("🚀 Starting seed process for construction data from BOQ...");

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
    console.log("📦 Seeding line items from BOQ...");
    
    // Comprehensive line items data - Based on MR AJAO TAYE PHILIPS BOQ
    const lineItemsData: Array<{
      category: "land_purchase" | "site_preparation" | "foundation" | "structural" | "roofing" | "electrical" | "plumbing" | "finishing" | "external_works";
      name: string;
      description: string;
      tenantId: string;
    }> = [
      // FOUNDATION - Core Submodules
      { category: "foundation", name: "Excavation", description: "Foundation excavation works", tenantId: sampleTenantId },
      { category: "foundation", name: "Filling", description: "Foundation filling and compaction", tenantId: sampleTenantId },
      { category: "foundation", name: "Concrete", description: "Foundation concrete works", tenantId: sampleTenantId },
      { category: "foundation", name: "Anti-termite", description: "Anti-termite treatment for foundation", tenantId: sampleTenantId },
      
      // STRUCTURAL (FRAME) - Core Submodules
      { category: "structural", name: "Columns", description: "Structural columns and supports", tenantId: sampleTenantId },
      { category: "structural", name: "Beams", description: "Structural beams and lintels", tenantId: sampleTenantId },
      { category: "structural", name: "Reinforcement", description: "Steel reinforcement for structural elements", tenantId: sampleTenantId },
      
      // STRUCTURAL (WALLS) - Core Submodules
      { category: "structural", name: "Masonry", description: "Blockwork and masonry walls", tenantId: sampleTenantId },
      { category: "structural", name: "Lintels", description: "Lintels over openings", tenantId: sampleTenantId },
      
      // ROOFING - Core Submodules
      { category: "roofing", name: "Trusses", description: "Roof trusses and timber work", tenantId: sampleTenantId },
      { category: "roofing", name: "Aluminium", description: "Aluminium roofing sheets and accessories", tenantId: sampleTenantId },
      { category: "roofing", name: "Waterproofing", description: "Roof waterproofing membrane and treatment", tenantId: sampleTenantId },
      
      // FINISHING - Core Submodules
      { category: "finishing", name: "Plastering", description: "Wall and ceiling plastering works", tenantId: sampleTenantId },
      { category: "finishing", name: "Painting", description: "Interior and exterior painting", tenantId: sampleTenantId },
      { category: "finishing", name: "POP", description: "POP (Plaster of Paris) finishing and ceiling", tenantId: sampleTenantId },
      { category: "finishing", name: "Flooring", description: "Floor tiles, screeding and finishing", tenantId: sampleTenantId },
      
      // ELECTRICAL - Core Submodules
      { category: "electrical", name: "Panels", description: "Electrical distribution panels and switchboards", tenantId: sampleTenantId },
      { category: "electrical", name: "Lighting", description: "Lighting fixtures and circuits", tenantId: sampleTenantId },
      { category: "electrical", name: "Power", description: "Power circuits and socket outlets", tenantId: sampleTenantId },
      { category: "electrical", name: "Fire Alarm", description: "Fire alarm and detection systems", tenantId: sampleTenantId },
      
      // PLUMBING - Core Submodules
      { category: "plumbing", name: "Water Supply", description: "Water supply pipes and fittings", tenantId: sampleTenantId },
      { category: "plumbing", name: "Sanitary", description: "Sanitary fixtures and fittings", tenantId: sampleTenantId },
      { category: "plumbing", name: "Drainage", description: "Drainage and waste disposal systems", tenantId: sampleTenantId },
      
      // EXTERNAL WORKS - Core Submodules
      { category: "external_works", name: "Fencing", description: "Perimeter fencing and boundary walls", tenantId: sampleTenantId },
      { category: "external_works", name: "Gates", description: "Gates and entrance structures", tenantId: sampleTenantId },
      { category: "external_works", name: "Borehole", description: "Borehole drilling and water systems", tenantId: sampleTenantId },
      { category: "external_works", name: "Landscaping", description: "Landscaping and site development", tenantId: sampleTenantId },
      
      // SITE PREPARATION & GROUNDWORK
      { category: "site_preparation", name: "Clearing of Site", description: "Clearing site of all trees, shrubs, bushes, grub up root and backfill void", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Top Soil Excavation", description: "Top soil for preservation 150mm average depth", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Trench Excavation", description: "Excavate trench for foundation, width > 0.30m maximum depth not exceeding 2.0m", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Pits Excavation", description: "Excavate pits for column bases 2m maximum depth", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Backfilling", description: "Backfilling with selected excavated material around foundation", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Disposal of Excavated Material", description: "Removal of surplus excavated material away from site", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Laterite Filling", description: "Filling to make up level over 250mm average thick obtained off site", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Hardcore Filling", description: "Stone boulders filling to make up levels not exceeding 150mm average thick", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Anti-Termite Treatment", description: "Apply Dieldrex anti-termite solution to sides and bottom of excavation", tenantId: sampleTenantId },
      { category: "site_preparation", name: "Level and Compact", description: "Level and compact the bottom of excavation to receive concrete", tenantId: sampleTenantId },
      
      // FOUNDATION
      { category: "foundation", name: "Blinding Concrete", description: "Plain In-situ Concrete (1:3:6) 50mm thick blinding bed poured on earth or hardcore", tenantId: sampleTenantId },
      { category: "foundation", name: "Column Base Blinding", description: "50mm thick blinding beneath column bases", tenantId: sampleTenantId },
      { category: "foundation", name: "Column Base Concrete", description: "Reinforced Insitu Concrete Grade 25.5 for column bases", tenantId: sampleTenantId },
      { category: "foundation", name: "Foundation Bed", description: "150mm thick reinforced concrete bed and steps", tenantId: sampleTenantId },
      { category: "foundation", name: "Foundation Footing", description: "Reinforced concrete foundation footing", tenantId: sampleTenantId },
      { category: "foundation", name: "Foundation Reinforcement", description: "High yield steel reinforcement bars 10-16mm diameter to BS 4449 grade 250", tenantId: sampleTenantId },
      { category: "foundation", name: "Fabric Mesh", description: "Fabric mesh type A142; weight 2.22kg/m2 with 300mm lap at joints", tenantId: sampleTenantId },
      { category: "foundation", name: "Column Base Formwork", description: "Marine plywood formwork for sides of column bases", tenantId: sampleTenantId },
      { category: "foundation", name: "Damp Proof Course", description: "Cement and Sand (1:1) damp proof course 50mm x 230mm wide", tenantId: sampleTenantId },
      { category: "foundation", name: "DPM", description: "1000mm gauge polythene sheet damp proof membrane laid on blinding", tenantId: sampleTenantId },
      
      // STRUCTURAL
      { category: "structural", name: "Columns", description: "Reinforced Insitu Concrete Grade 25.5 for columns generally", tenantId: sampleTenantId },
      { category: "structural", name: "Beams", description: "Reinforced Concrete Grade 25.5 for beams", tenantId: sampleTenantId },
      { category: "structural", name: "Column Formwork", description: "Marine plywood formwork for sides of columns", tenantId: sampleTenantId },
      { category: "structural", name: "Beam Formwork", description: "Marine plywood formwork for sides and soffit of beams", tenantId: sampleTenantId },
      { category: "structural", name: "Structural Reinforcement", description: "High yield reinforcement bars 20-8mm diameter to BS 4449 grade 410", tenantId: sampleTenantId },
      { category: "structural", name: "Floor Slab", description: "Reinforced Concrete Grade 25.5 slabs not exceeding 150mm thick", tenantId: sampleTenantId },
      { category: "structural", name: "Slab Formwork", description: "Marine plywood formwork for soffit of suspended slab", tenantId: sampleTenantId },
      { category: "structural", name: "Slab Edge Formwork", description: "Formwork for edges of suspended slabs not exceeding 150mm high", tenantId: sampleTenantId },
      { category: "structural", name: "Slab Reinforcement", description: "High yield reinforcement bars 12mm-10mm diameter for slabs", tenantId: sampleTenantId },
      { category: "structural", name: "Blockwork 230mm", description: "Hollow sandcrete blockwork 230mm thick in cement mortar (1:6) laid in stretcher bond", tenantId: sampleTenantId },
      { category: "structural", name: "Blockwork 150mm", description: "Hollow sandcrete blockwork 150mm thick in cement mortar (1:6) laid in stretcher bond", tenantId: sampleTenantId },
      { category: "structural", name: "Lintels", description: "Reinforced Concrete Grade 25 lintels generally", tenantId: sampleTenantId },
      { category: "structural", name: "Lintel Formwork", description: "Marine plywood formwork for lintels rectangular sides and soffit", tenantId: sampleTenantId },
      { category: "structural", name: "Lintel Reinforcement", description: "High yield reinforcement bars 10-12mm nominal size for lintels", tenantId: sampleTenantId },
      { category: "structural", name: "Parapet Wall", description: "Hollow sandcrete blockwork 230mm thick for parapet wall", tenantId: sampleTenantId },
      
      // ROOFING
      { category: "roofing", name: "Roof Beam", description: "Reinforced Concrete Grade 25.5 roof beam", tenantId: sampleTenantId },
      { category: "roofing", name: "Ribbed Slab", description: "Reinforced concrete ribbed slab", tenantId: sampleTenantId },
      { category: "roofing", name: "Copping", description: "Reinforced concrete copping", tenantId: sampleTenantId },
      { category: "roofing", name: "Concrete Facia", description: "Reinforced concrete facia", tenantId: sampleTenantId },
      { category: "roofing", name: "Roof Beam Formwork", description: "Marine plywood formwork for sides of roof beam", tenantId: sampleTenantId },
      { category: "roofing", name: "Ribbed Slab Formwork", description: "Marine plywood formwork for sides and soffits of ribbed slab", tenantId: sampleTenantId },
      { category: "roofing", name: "Copping Formwork", description: "Marine plywood formwork for sides and soffits of copping", tenantId: sampleTenantId },
      { category: "roofing", name: "Facia Formwork", description: "Marine plywood formwork for side and soffits of concrete facia", tenantId: sampleTenantId },
      { category: "roofing", name: "Roof Reinforcement", description: "High yield reinforcement bars 16-8mm diameter for roof", tenantId: sampleTenantId },
      { category: "roofing", name: "Aluminium Roofing Sheet", description: "0.55mm gauge Queensway long span stucco aluminium roofing sheets", tenantId: sampleTenantId },
      { category: "roofing", name: "Flashings", description: "Aluminium flashings 600mm girth", tenantId: sampleTenantId },
      { category: "roofing", name: "Entrance Canopy", description: "Steel pergola with polycarbonate roofing over entrance door", tenantId: sampleTenantId },
      { category: "roofing", name: "Purlins", description: "Treated hardwood 50x75mm purlins", tenantId: sampleTenantId },
      { category: "roofing", name: "Rafters", description: "Treated hardwood 50x150mm rafters", tenantId: sampleTenantId },
      { category: "roofing", name: "Struts", description: "Treated hardwood 50x100mm struts", tenantId: sampleTenantId },
      { category: "roofing", name: "Ties", description: "Treated hardwood 100x150mm ties", tenantId: sampleTenantId },
      { category: "roofing", name: "Waterproofing Membrane", description: "4mm thick Scudoplast TNT waterproofing membrane on 50mm cement sand screed", tenantId: sampleTenantId },
      
      // STAIRS
      { category: "structural", name: "Staircases", description: "Reinforced Concrete Grade 25 staircases generally", tenantId: sampleTenantId },
      { category: "structural", name: "Staircase Formwork", description: "Marine plywood formwork for sides and soffits of staircase", tenantId: sampleTenantId },
      { category: "structural", name: "Riser Formwork", description: "Formwork for faces of riser 150mm high", tenantId: sampleTenantId },
      { category: "structural", name: "Staircase Reinforcement", description: "High yield reinforcement bars 16mm - 10mm diameter for stairs", tenantId: sampleTenantId },
      { category: "finishing", name: "Steel Handrails", description: "Steel handrails 40mm diameter top and bottom rails, 1200mm high", tenantId: sampleTenantId },
      { category: "finishing", name: "Guard Rails", description: "Steel guard rails at balcony and kitchenette", tenantId: sampleTenantId },
      { category: "finishing", name: "Stair Treads Tiling", description: "20mm thick polished granite floor tiles on stair treads", tenantId: sampleTenantId },
      { category: "finishing", name: "Stair Risers Tiling", description: "Polished granite tiles for faces of risers 150mm high", tenantId: sampleTenantId },
      
      // FINISHING - WALLS
      { category: "finishing", name: "Wall Rendering", description: "Cement and sand (1:3) rendering over 300mm wide to concrete or blockwork", tenantId: sampleTenantId },
      { category: "finishing", name: "Reveal Rendering", description: "Cement and sand (1:3) rendering for reveals not exceeding 300mm wide", tenantId: sampleTenantId },
      { category: "finishing", name: "Decorative Plaster", description: "Grooving, tyrolean and plaster effect decoration to rendered walls", tenantId: sampleTenantId },
      { category: "finishing", name: "Burnt Brick Tiling", description: "Burnt brick tiles laid in stretcher bond on external walls", tenantId: sampleTenantId },
      { category: "finishing", name: "Wall Painting", description: "Emulsion paint - prepare, float, prime, one undercoat and two finishing coats", tenantId: sampleTenantId },
      { category: "finishing", name: "POP Floating Walls", description: "POP floating screeding to surface of rendered wall internally and externally", tenantId: sampleTenantId },
      
      // FINISHING - WINDOWS & DOORS
      { category: "finishing", name: "Curtain Wall 1500x1800mm", description: "Anodised aluminium curtain wall window 1500x1800mm with 6mm laminated glass", tenantId: sampleTenantId },
      { category: "finishing", name: "Curtain Wall 1000x1800mm", description: "Anodised aluminium curtain wall window 1000x1800mm with 6mm laminated glass", tenantId: sampleTenantId },
      { category: "finishing", name: "Curtain Wall 1000x1500mm", description: "Anodised aluminium curtain wall window 1000x1500mm with 6mm laminated glass", tenantId: sampleTenantId },
      { category: "finishing", name: "Curtain Wall 500x1800mm", description: "Anodised aluminium curtain wall window 500x1800mm with 6mm laminated glass", tenantId: sampleTenantId },
      { category: "finishing", name: "Window 750x900mm", description: "Anodised aluminium window 750x900mm with glass and insect screen", tenantId: sampleTenantId },
      { category: "finishing", name: "Window 600x900mm", description: "Anodised aluminium window 600x900mm with glass and insect screen", tenantId: sampleTenantId },
      { category: "finishing", name: "Sliding Door 2400x2400mm", description: "Aluminium sliding door 2400x2400mm with laminated glass", tenantId: sampleTenantId },
      { category: "finishing", name: "Flush Door 900x2400mm", description: "38mm solid core flush door 900x2400mm complete with ironmongery", tenantId: sampleTenantId },
      { category: "finishing", name: "Flush Door 750x2400mm", description: "38mm solid core flush door 750x2400mm complete with ironmongery", tenantId: sampleTenantId },
      { category: "finishing", name: "Security Door Double 1200x2400mm", description: "Purpose made steel double leaf security door 1200x2400mm with accessories", tenantId: sampleTenantId },
      { category: "finishing", name: "Security Door Single 900x2400mm", description: "Purpose made steel single leaf security door 900x2400mm with accessories", tenantId: sampleTenantId },
      
      // FINISHING - FLOORS
      { category: "finishing", name: "Porcelain Floor Tiles", description: "1200x800x10mm Spanish grade glazed porcelain floor tiles on screeded bed", tenantId: sampleTenantId },
      { category: "finishing", name: "Skirting", description: "100mm high porcelain skirting", tenantId: sampleTenantId },
      { category: "finishing", name: "Granite Floor Tiles", description: "20mm thick polished granite floor tiles laid on 40mm screeded bed", tenantId: sampleTenantId },
      { category: "finishing", name: "Ceramic Floor Tiles", description: "300x300x10mm non-slip vitrified ceramic floor tiles for toilets", tenantId: sampleTenantId },
      
      // FINISHING - CEILING
      { category: "finishing", name: "Suspended Ceiling", description: "600x600x13mm thick mineral fibre acoustic suspended ceiling on metal stud", tenantId: sampleTenantId },
      { category: "finishing", name: "Ceiling Painting", description: "Emulsion paint to surfaces of ceiling finishes", tenantId: sampleTenantId },
      { category: "finishing", name: "POP Ceiling", description: "POP floating complete with angle cornice to soffit of suspended slab", tenantId: sampleTenantId },
      
      // ELECTRICAL
      { category: "electrical", name: "PHCN Connection", description: "Connection to PHCN mains including HT poles and aluminium conductor", tenantId: sampleTenantId },
      { category: "electrical", name: "Main Distribution Panel", description: "120A 4ways TP&N MCCB main distribution panel", tenantId: sampleTenantId },
      { category: "electrical", name: "Changeover Switch", description: "120A TP&N changeover switch", tenantId: sampleTenantId },
      { category: "electrical", name: "Armoured Cable 35mm", description: "4C x 35mm2 PVC/SWA/PVC armoured copper cable", tenantId: sampleTenantId },
      { category: "electrical", name: "Armoured Cable 16mm", description: "4C x 16mm2 PVC/SWA/PVC armoured copper cable", tenantId: sampleTenantId },
      { category: "electrical", name: "Lighting Circuit", description: "Conduiting and wiring for lighting using 20mm PVC conduit and 2x1.5mm2 cable", tenantId: sampleTenantId },
      { category: "electrical", name: "Spot Light 30W", description: "1x30W ceiling mounted spot lighting fitting", tenantId: sampleTenantId },
      { category: "electrical", name: "Recessed Light 25W", description: "1x25W ceiling mounted recessed lighting fitting", tenantId: sampleTenantId },
      { category: "electrical", name: "Spot Light 18W", description: "1x18W ceiling mounted spot lighting fitting", tenantId: sampleTenantId },
      { category: "electrical", name: "Bulkhead Light 40W", description: "1x40W bulkhead fittings", tenantId: sampleTenantId },
      { category: "electrical", name: "Ceiling Fan", description: "3-blades ceiling fan 1500mm sweep complete with regulator", tenantId: sampleTenantId },
      { category: "electrical", name: "Switch 1-Gang", description: "10A 1-way 1-gang switch", tenantId: sampleTenantId },
      { category: "electrical", name: "Switch 2-Gang", description: "10A 2-way 2-gang switch", tenantId: sampleTenantId },
      { category: "electrical", name: "Power Circuit", description: "Conduiting and wiring for power using 25mm PVC conduit and 3x2.5mm2 cable", tenantId: sampleTenantId },
      { category: "electrical", name: "AC Conduit", description: "Conduiting for air conditioning using 25mm PVC conduit", tenantId: sampleTenantId },
      { category: "electrical", name: "Socket Outlet 13A", description: "Twin 13A switch socket outlet", tenantId: sampleTenantId },
      { category: "electrical", name: "AC Switch 15A", description: "15A neon switch for AC", tenantId: sampleTenantId },
      { category: "electrical", name: "TV Outlet", description: "TV outlet connection point", tenantId: sampleTenantId },
      { category: "electrical", name: "TV Circuit", description: "Conduiting and wiring for TV using 20mm PVC conduit and shielded coaxial cable", tenantId: sampleTenantId },
      { category: "electrical", name: "Earthing System", description: "Earthing of building and equipment complete with copper spike, earth mat, copper tape", tenantId: sampleTenantId },
      { category: "electrical", name: "Earth Mat", description: "Earth mat for grounding system", tenantId: sampleTenantId },
      { category: "electrical", name: "Copper Tape", description: "10mm x 3mm copper tape for earthing", tenantId: sampleTenantId },
      { category: "electrical", name: "Earth Test Clamp", description: "Screw down copper test clamp", tenantId: sampleTenantId },
      { category: "electrical", name: "Earth Electrode", description: "2.4m earth electrode", tenantId: sampleTenantId },
      { category: "electrical", name: "Fire Alarm System", description: "Complete fire alarm system with optical smoke detectors and control panel", tenantId: sampleTenantId },
      { category: "electrical", name: "Smoke Detector", description: "Optical smoke detector", tenantId: sampleTenantId },
      { category: "electrical", name: "Heat Detector", description: "Optical heat detector", tenantId: sampleTenantId },
      { category: "electrical", name: "Fire Break Glass", description: "Fire break glass alarming system", tenantId: sampleTenantId },
      { category: "electrical", name: "Fire Alarm Bell", description: "Fire alarm bell", tenantId: sampleTenantId },
      { category: "electrical", name: "Fire Control Panel", description: "3 zones fire alarm control panel with 24V DC power unit", tenantId: sampleTenantId },
      { category: "electrical", name: "CO2 Fire Extinguisher", description: "6kg CO2 fire extinguisher", tenantId: sampleTenantId },
      { category: "electrical", name: "ABC Fire Extinguisher", description: "5kg ABC fire extinguisher", tenantId: sampleTenantId },
      
      // PLUMBING - MECHANICAL
      { category: "plumbing", name: "Split AC 12000 BTU", description: "Split unit air conditioner capacity 12,000 BTU/HR", tenantId: sampleTenantId },
      { category: "plumbing", name: "Split AC 24000 BTU", description: "Split unit air conditioner capacity 24,000 BTU/HR", tenantId: sampleTenantId },
      { category: "plumbing", name: "Exhaust Fan", description: "High wall-mounted expeller fan with 360m3/hr extract capacity", tenantId: sampleTenantId },
      { category: "plumbing", name: "Water Closet", description: "Close coupled water closet complete with seat, cistern and push-button", tenantId: sampleTenantId },
      { category: "plumbing", name: "Wash Basin", description: "Wall mounted wash basin with chrome plated tap and p-trap", tenantId: sampleTenantId },
      { category: "plumbing", name: "Wall Mirror", description: "Pilkington silvered coated glass mirror screw to wall", tenantId: sampleTenantId },
      { category: "plumbing", name: "Toilet Roll Holder", description: "Chrome plated toilet roll dispenser with hood", tenantId: sampleTenantId },
      { category: "plumbing", name: "Soap Dish", description: "Chrome-plated soap dish with concealed screws", tenantId: sampleTenantId },
      { category: "plumbing", name: "Anal Spray", description: "Stainless steel hand held anal spray complete with fittings", tenantId: sampleTenantId },
      { category: "plumbing", name: "Floor Drain", description: "50mm floor drain", tenantId: sampleTenantId },
      { category: "plumbing", name: "UPVC Pipe 25mm", description: "25mmΦ UPVC cold water supply pipes", tenantId: sampleTenantId },
      { category: "plumbing", name: "UPVC Pipe 19mm", description: "19mmΦ UPVC cold water supply pipes", tenantId: sampleTenantId },
      { category: "plumbing", name: "UPVC Pipe 13mm", description: "13mmΦ UPVC cold water supply pipes", tenantId: sampleTenantId },
      { category: "plumbing", name: "Tee Fitting 25x25x19", description: "UPVC tee fitting 25x25x19", tenantId: sampleTenantId },
      { category: "plumbing", name: "Tee Fitting 19x19x13", description: "UPVC tee fitting 19x19x13", tenantId: sampleTenantId },
      { category: "plumbing", name: "Elbow 25mm", description: "25mmΦ UPVC elbow", tenantId: sampleTenantId },
      { category: "plumbing", name: "Elbow 20mm", description: "20mmΦ UPVC elbow", tenantId: sampleTenantId },
      { category: "plumbing", name: "Elbow 15mm", description: "15mmΦ UPVC elbow", tenantId: sampleTenantId },
      { category: "plumbing", name: "Nipples 25mm", description: "25mmΦ UPVC nipples", tenantId: sampleTenantId },
      { category: "plumbing", name: "Socket 25mm", description: "25mmΦ UPVC socket", tenantId: sampleTenantId },
      { category: "plumbing", name: "Reducer 19x13mm", description: "19x13mmΦ UPVC reducer", tenantId: sampleTenantId },
      { category: "plumbing", name: "Gate Valve 25mm", description: "25mmΦ bronze gate valve screwed", tenantId: sampleTenantId },
      { category: "plumbing", name: "Non Return Valve 25mm", description: "25mmΦ non return valve screwed", tenantId: sampleTenantId },
      { category: "plumbing", name: "Gate Valve 15mm", description: "15mmΦ bronze gate valve screwed", tenantId: sampleTenantId },
      { category: "plumbing", name: "Flexible Connector 15mm", description: "15mmΦ flexible connector", tenantId: sampleTenantId },
      { category: "plumbing", name: "Waste Pipe 100mm", description: "100mmΦ UPVC soil and waste drainage pipes", tenantId: sampleTenantId },
      { category: "plumbing", name: "Waste Pipe 50mm", description: "50mmΦ UPVC soil and waste drainage pipes", tenantId: sampleTenantId },
      { category: "plumbing", name: "UPVC Bend 100mm", description: "100mmΦ UPVC bend x 90 degrees", tenantId: sampleTenantId },
      { category: "plumbing", name: "UPVC Bend 50mm", description: "50mmΦ UPVC bend x 90 degrees", tenantId: sampleTenantId },
      { category: "plumbing", name: "UPVC Tee 100mm", description: "100mmΦ UPVC equal tee", tenantId: sampleTenantId },
      { category: "plumbing", name: "WC Pan Connector", description: "100mmΦ UPVC WC pan connector", tenantId: sampleTenantId },
      { category: "plumbing", name: "Access Plug 100mm", description: "100mmΦ UPVC access plug", tenantId: sampleTenantId },
      { category: "plumbing", name: "Bottle Trap 32mm", description: "32mmΦ PVC bottle trap", tenantId: sampleTenantId },
      { category: "plumbing", name: "Vent Cowl 100mm", description: "100mmΦ PVC vent cowl", tenantId: sampleTenantId },
      { category: "plumbing", name: "Inspection Chamber", description: "Manhole/Inspection chamber 600x600x600mm with concrete base and blockwork sides", tenantId: sampleTenantId },
      { category: "plumbing", name: "Soakaway Pit", description: "Soakaway pit 2000x2000x2000mm with blockwork sides and concrete cover", tenantId: sampleTenantId },
      { category: "plumbing", name: "Septic Tank", description: "Septic tank 2500x2000x2000mm with blockwork and concrete cover slab", tenantId: sampleTenantId },
      { category: "plumbing", name: "Borehole Drilling", description: "Drilling of borehole including geophysical survey, yield test and submersible pump", tenantId: sampleTenantId },
      { category: "plumbing", name: "Water Storage Tank", description: "Pressed steel elevated water storage tank 5,000 litres capacity", tenantId: sampleTenantId },
      { category: "plumbing", name: "Tank Stanchion", description: "12m high structural steel stanchion complete with reinforced concrete base", tenantId: sampleTenantId },
      { category: "plumbing", name: "Water Reticulation", description: "Reticulation of pipes from tank to main building", tenantId: sampleTenantId },
      
      // EXTERNAL WORKS - FENCING
      { category: "external_works", name: "Fencing Foundation", description: "Reinforced Concrete Grade 25 footing for fence", tenantId: sampleTenantId },
      { category: "external_works", name: "Fence Pillars", description: "Reinforced concrete pillars for fence", tenantId: sampleTenantId },
      { category: "external_works", name: "Fence Formwork", description: "Marine plywood formwork for fence footings and pillars", tenantId: sampleTenantId },
      { category: "external_works", name: "Fence Reinforcement", description: "High yield reinforcement bars 16mm-10mm for fence", tenantId: sampleTenantId },
      { category: "external_works", name: "Fence Blockwork 230mm", description: "Hollow sandcrete blockwork 230mm thick for fence walls", tenantId: sampleTenantId },
      { category: "external_works", name: "Fence Blockwork 150mm", description: "Hollow sandcrete blockwork 150mm thick for fence", tenantId: sampleTenantId },
      { category: "external_works", name: "Fence Rendering", description: "Cement and sand (1:3) rendering for fence walls", tenantId: sampleTenantId },
      { category: "external_works", name: "Fence Painting", description: "Emulsion paint for fence walls", tenantId: sampleTenantId },
      { category: "external_works", name: "Fence POP Floating", description: "POP floating for fence walls", tenantId: sampleTenantId },
      { category: "external_works", name: "Fence Decoration", description: "Grooving, tyrolean and plaster effect decoration for fence", tenantId: sampleTenantId },
      { category: "external_works", name: "Steel Sliding Gate", description: "Fabrication and installation of steel sliding gate", tenantId: sampleTenantId },
    ];

    // Get existing line items to avoid duplicates
    const existingLineItems = await db.select().from(lineItems).where(eq(lineItems.tenantId, sampleTenantId));
    const existingLineItemNames = new Set(existingLineItems.map(item => `${item.category}:${item.name}`));
    
    // Filter out items that already exist
    const newLineItems = lineItemsData.filter(item => 
      !existingLineItemNames.has(`${item.category}:${item.name}`)
    );
    
    // Insert new line items only
    if (newLineItems.length > 0) {
      await db.insert(lineItems).values(newLineItems);
      console.log(`✅ Inserted ${newLineItems.length} new line items from BOQ (${existingLineItems.length} already existed)`);
    } else {
      console.log(`ℹ️  All ${lineItemsData.length} line items already exist`);
    }

    console.log("🏗️ Seeding materials from BOQ...");

    // Comprehensive materials data from BOQ
    const materialsData = [
      // CONCRETE & AGGREGATES
      { name: "Cement", unit: "bag", currentUnitPrice: "6500.00", supplier: "Dangote Cement", tenantId: sampleTenantId },
      { name: "Sharp Sand", unit: "m³", currentUnitPrice: "18000.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Granite (All-in Aggregate)", unit: "m³", currentUnitPrice: "24000.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Laterite Fill", unit: "m³", currentUnitPrice: "4260.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Stone Boulders Hardcore", unit: "m³", currentUnitPrice: "12600.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Water", unit: "tanker", currentUnitPrice: "35000.00", supplier: "Water Services", tenantId: sampleTenantId },
      { name: "Concrete Grade 15", unit: "m³", currentUnitPrice: "58900.00", supplier: "Ready-Mix Concrete", tenantId: sampleTenantId },
      { name: "Concrete Grade 25.5", unit: "m³", currentUnitPrice: "111400.00", supplier: "Ready-Mix Concrete", tenantId: sampleTenantId },
      
      // REINFORCEMENT
      { name: "High Yield Steel Bars 8mm", unit: "kg", currentUnitPrice: "1290.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "High Yield Steel Bars 10mm", unit: "kg", currentUnitPrice: "1290.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "High Yield Steel Bars 12mm", unit: "kg", currentUnitPrice: "1290.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "High Yield Steel Bars 16mm", unit: "kg", currentUnitPrice: "1290.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "High Yield Steel Bars 20mm", unit: "kg", currentUnitPrice: "1290.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Fabric Mesh A142", unit: "m²", currentUnitPrice: "2860.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "BRC Mesh No. 65", unit: "m²", currentUnitPrice: "3200.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Binding Wire", unit: "roll", currentUnitPrice: "12000.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      
      // FORMWORK & CARPENTRY
      { name: "Marine Plywood Formwork", unit: "m²", currentUnitPrice: "12100.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Treated Hardwood 50x75mm", unit: "m", currentUnitPrice: "970.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Treated Hardwood 50x100mm", unit: "m", currentUnitPrice: "1030.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Treated Hardwood 50x150mm", unit: "m", currentUnitPrice: "1630.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Treated Hardwood 100x150mm", unit: "m", currentUnitPrice: "3050.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Nails (Assorted)", unit: "kg", currentUnitPrice: "1500.00", supplier: "Hardware Central", tenantId: sampleTenantId },
      
      // BLOCKWORK & MASONRY
      { name: "Hollow Sandcrete Blocks 150mm", unit: "m²", currentUnitPrice: "11000.00", supplier: "Block Industry", tenantId: sampleTenantId },
      { name: "Hollow Sandcrete Blocks 230mm", unit: "m²", currentUnitPrice: "14400.00", supplier: "Block Industry", tenantId: sampleTenantId },
      { name: "Cement Mortar (1:6)", unit: "m³", currentUnitPrice: "28000.00", supplier: "Ready-Mix", tenantId: sampleTenantId },
      
      // WATERPROOFING & DPM
      { name: "Polythene DPM 1000 gauge", unit: "m²", currentUnitPrice: "220.00", supplier: "Building Materials Ltd", tenantId: sampleTenantId },
      { name: "Dieldrex Anti-Termite Solution", unit: "m²", currentUnitPrice: "250.00", supplier: "ChemTech", tenantId: sampleTenantId },
      { name: "Scudoplast Waterproofing 4mm", unit: "m²", currentUnitPrice: "12500.00", supplier: "Waterproofing Systems", tenantId: sampleTenantId },
      { name: "SBS Bituminous Membrane", unit: "m²", currentUnitPrice: "8500.00", supplier: "Waterproofing Systems", tenantId: sampleTenantId },
      
      // ROOFING MATERIALS
      { name: "Aluminium Roofing Sheet 0.55mm", unit: "m²", currentUnitPrice: "14700.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      { name: "Aluminium Flashings", unit: "m", currentUnitPrice: "8820.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      { name: "Polycarbonate Roofing Sheet", unit: "m²", currentUnitPrice: "18500.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      { name: "Fascia Board", unit: "m", currentUnitPrice: "6500.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      { name: "PVC Soffit", unit: "m²", currentUnitPrice: "5200.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      
      // WINDOWS & DOORS
      { name: "Anodised Aluminium Curtain Wall", unit: "m²", currentUnitPrice: "120000.00", supplier: "WindowWorks", tenantId: sampleTenantId },
      { name: "6mm Laminated Glass", unit: "m²", currentUnitPrice: "28000.00", supplier: "Glass Masters", tenantId: sampleTenantId },
      { name: "Insect Screen", unit: "m²", currentUnitPrice: "4500.00", supplier: "WindowWorks", tenantId: sampleTenantId },
      { name: "38mm Solid Core Flush Door", unit: "Nr", currentUnitPrice: "320000.00", supplier: "DoorCraft", tenantId: sampleTenantId },
      { name: "Steel Security Door", unit: "Nr", currentUnitPrice: "566000.00", supplier: "Security Doors Ltd", tenantId: sampleTenantId },
      { name: "Door Ironmongery Set", unit: "set", currentUnitPrice: "35000.00", supplier: "Hardware Central", tenantId: sampleTenantId },
      
      // RENDERING & PLASTERING
      { name: "Cement Sand Render (1:3)", unit: "m²", currentUnitPrice: "4300.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      { name: "POP (Plaster of Paris)", unit: "m²", currentUnitPrice: "1560.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      { name: "Screeding Mix", unit: "m³", currentUnitPrice: "15000.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      
      // PAINTING
      { name: "Dulux Emulsion Paint", unit: "m²", currentUnitPrice: "3250.00", supplier: "ColorMax", tenantId: sampleTenantId },
      { name: "Meyer Emulsion Paint", unit: "m²", currentUnitPrice: "3250.00", supplier: "ColorMax", tenantId: sampleTenantId },
      { name: "Wall Primer", unit: "litre", currentUnitPrice: "8500.00", supplier: "ColorMax", tenantId: sampleTenantId },
      { name: "Primer & Undercoat", unit: "litre", currentUnitPrice: "8500.00", supplier: "ColorMax", tenantId: sampleTenantId },
      { name: "Satin Paint Finish", unit: "litre", currentUnitPrice: "9500.00", supplier: "ColorMax", tenantId: sampleTenantId },
      
      // ADDITIONAL FOUNDATION MATERIALS
      { name: "Gravel", unit: "m³", currentUnitPrice: "22000.00", supplier: "Quarry Supplies", tenantId: sampleTenantId },
      { name: "Concrete Mix 1:3:6", unit: "m³", currentUnitPrice: "58900.00", supplier: "Ready-Mix Concrete", tenantId: sampleTenantId },
      { name: "Concrete Mix 1:2:4", unit: "m³", currentUnitPrice: "75000.00", supplier: "Ready-Mix Concrete", tenantId: sampleTenantId },
      { name: "Polythene Damp-Proof Membrane 1000g/m²", unit: "m²", currentUnitPrice: "220.00", supplier: "Building Materials Ltd", tenantId: sampleTenantId },
      
      // STRUCTURAL FRAME MATERIALS
      { name: "Reinforced Concrete Grade 25", unit: "m³", currentUnitPrice: "111400.00", supplier: "Ready-Mix Concrete", tenantId: sampleTenantId },
      { name: "Reinforced Concrete Grade 25.5", unit: "m³", currentUnitPrice: "111400.00", supplier: "Ready-Mix Concrete", tenantId: sampleTenantId },
      
      // WALLING MATERIALS
      { name: "Hollow Sandcrete Blocks 225mm", unit: "m²", currentUnitPrice: "14400.00", supplier: "Block Industry", tenantId: sampleTenantId },
      { name: "Water-Proof Cement Render (1:3)", unit: "m²", currentUnitPrice: "4800.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      { name: "Reinforcement Bars for Lintels", unit: "kg", currentUnitPrice: "1290.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      
      // CARPENTRY & ROOF STRUCTURE
      { name: "Treated Hardwood Purlins", unit: "m", currentUnitPrice: "970.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Treated Hardwood Rafters", unit: "m", currentUnitPrice: "1630.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Treated Hardwood Struts", unit: "m", currentUnitPrice: "1030.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Treated Hardwood Ties", unit: "m", currentUnitPrice: "3050.00", supplier: "Forest Products Ltd", tenantId: sampleTenantId },
      { name: "Mild-Steel Roof Trusses", unit: "kg", currentUnitPrice: "1500.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Aluminium Long-Span Roofing Queensway Stucco 0.55mm", unit: "m²", currentUnitPrice: "14700.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      { name: "Bituminous Waterproofing SBS 4mm", unit: "m²", currentUnitPrice: "12500.00", supplier: "Waterproofing Systems", tenantId: sampleTenantId },
      { name: "Polycarbonate Sheet Entrance Canopy", unit: "m²", currentUnitPrice: "18500.00", supplier: "RoofTech Ltd", tenantId: sampleTenantId },
      
      // WINDOWS & DOORS - DETAILED
      { name: "Anodised Aluminium Windows with 6mm Laminated Glass", unit: "m²", currentUnitPrice: "120000.00", supplier: "WindowWorks", tenantId: sampleTenantId },
      { name: "Burglar Proof Bars", unit: "m²", currentUnitPrice: "25000.00", supplier: "Metal Fabricators", tenantId: sampleTenantId },
      { name: "Flush Timber Doors Solid Core", unit: "Nr", currentUnitPrice: "320000.00", supplier: "DoorCraft", tenantId: sampleTenantId },
      { name: "Steel Security Doors Single Leaf", unit: "Nr", currentUnitPrice: "566000.00", supplier: "Security Doors Ltd", tenantId: sampleTenantId },
      { name: "Steel Security Doors Double Leaf", unit: "Nr", currentUnitPrice: "596000.00", supplier: "Security Doors Ltd", tenantId: sampleTenantId },
      { name: "Sliding Aluminium Door Assembly", unit: "Nr", currentUnitPrice: "691200.00", supplier: "WindowWorks", tenantId: sampleTenantId },
      { name: "Door Locks", unit: "Nr", currentUnitPrice: "12000.00", supplier: "Hardware Central", tenantId: sampleTenantId },
      { name: "Door Handles", unit: "set", currentUnitPrice: "8500.00", supplier: "Hardware Central", tenantId: sampleTenantId },
      { name: "Door Hinges", unit: "set", currentUnitPrice: "5000.00", supplier: "Hardware Central", tenantId: sampleTenantId },
      
      // WALL FINISHES - DETAILED
      { name: "POP Screeding", unit: "m²", currentUnitPrice: "1560.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      { name: "Tyrolean Plaster Effect", unit: "m²", currentUnitPrice: "3500.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      { name: "Grooved Plaster Finish", unit: "m²", currentUnitPrice: "3500.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      
      // FLOOR FINISHES - DETAILED  
      { name: "Vitrified Porcelain Tiles Spanish Grade 1200x800mm", unit: "m²", currentUnitPrice: "48000.00", supplier: "TileWorld", tenantId: sampleTenantId },
      { name: "Granite Floor Tiles Treads", unit: "m²", currentUnitPrice: "69300.00", supplier: "Granite Masters", tenantId: sampleTenantId },
      { name: "Granite Floor Tiles Risers", unit: "m", currentUnitPrice: "10400.00", supplier: "Granite Masters", tenantId: sampleTenantId },
      { name: "Ceramic Tiles 300x300mm Anti-Slip", unit: "m²", currentUnitPrice: "48000.00", supplier: "TileWorld", tenantId: sampleTenantId },
      { name: "Cement Screed Bed 40mm", unit: "m²", currentUnitPrice: "2500.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      { name: "Skirting Tiles 100mm High", unit: "m", currentUnitPrice: "7200.00", supplier: "TileWorld", tenantId: sampleTenantId },
      
      // CEILING FINISHES - DETAILED
      { name: "Gypsum Board 600x600mm Mineral Fibre", unit: "m²", currentUnitPrice: "25000.00", supplier: "CeilingPro", tenantId: sampleTenantId },
      { name: "Aluminium Ceiling Grid System", unit: "m²", currentUnitPrice: "8500.00", supplier: "CeilingPro", tenantId: sampleTenantId },
      { name: "POP Cornices", unit: "m", currentUnitPrice: "1800.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      { name: "POP Angle Mouldings", unit: "m", currentUnitPrice: "1500.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      { name: "Ceiling Paint Finish", unit: "m²", currentUnitPrice: "2650.00", supplier: "ColorMax", tenantId: sampleTenantId },
      
      // ELECTRICAL MATERIALS - DETAILED
      { name: "NOCACO PVC/SWA Armoured Copper Cable 35mm²", unit: "m", currentUnitPrice: "36489.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "NOCACO PVC/SWA Armoured Copper Cable 16mm²", unit: "m", currentUnitPrice: "19271.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "NOCACO Copper Cable 2x1.5mm²", unit: "m", currentUnitPrice: "850.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "NOCACO Copper Cable 3x2.5mm²", unit: "m", currentUnitPrice: "1200.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "PVC Conduit 20mm", unit: "m", currentUnitPrice: "450.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "PVC Conduit 25mm", unit: "m", currentUnitPrice: "650.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "MCCB Distribution Panel", unit: "Nr", currentUnitPrice: "450000.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "MK Logic Switches", unit: "Nr", currentUnitPrice: "1050.00", supplier: "Philip", tenantId: sampleTenantId },
      { name: "Philip Brand Switches", unit: "Nr", currentUnitPrice: "1050.00", supplier: "Philip", tenantId: sampleTenantId },
      { name: "MK Logic Sockets", unit: "Nr", currentUnitPrice: "2000.00", supplier: "Philip", tenantId: sampleTenantId },
      { name: "Thorn Spot Lighting", unit: "Nr", currentUnitPrice: "5800.00", supplier: "Thorn Lighting", tenantId: sampleTenantId },
      { name: "Philip Spot Lighting", unit: "Nr", currentUnitPrice: "5800.00", supplier: "Philip Lighting", tenantId: sampleTenantId },
      { name: "Bulkhead Lighting Fitting", unit: "Nr", currentUnitPrice: "4500.00", supplier: "Philip Lighting", tenantId: sampleTenantId },
      { name: "Recessed Lighting Fitting", unit: "Nr", currentUnitPrice: "5500.00", supplier: "Philip Lighting", tenantId: sampleTenantId },
      { name: "Ceiling Fan 3-Blade 1500mm", unit: "Nr", currentUnitPrice: "40000.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Copper Earthing Rods", unit: "Nr", currentUnitPrice: "5500.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Copper Earthing Tapes", unit: "m", currentUnitPrice: "4500.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Fire Alarm Detectors", unit: "Nr", currentUnitPrice: "18400.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      { name: "Fire Alarm Bells", unit: "Nr", currentUnitPrice: "24000.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      { name: "Fire Alarm Panel", unit: "Nr", currentUnitPrice: "550000.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      { name: "CO₂ Fire Extinguisher 6kg", unit: "Nr", currentUnitPrice: "42000.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      { name: "ABC Fire Extinguisher 5kg", unit: "Nr", currentUnitPrice: "33000.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      
      // PLUMBING & MECHANICAL - DETAILED
      { name: "Split Air-Conditioner 12000 BTU", unit: "Nr", currentUnitPrice: "520000.00", supplier: "HVAC Systems", tenantId: sampleTenantId },
      { name: "Split Air-Conditioner 24000 BTU", unit: "Nr", currentUnitPrice: "850000.00", supplier: "HVAC Systems", tenantId: sampleTenantId },
      { name: "High-Wall Expeller Fan Toilet", unit: "Nr", currentUnitPrice: "45000.00", supplier: "Xpelair", tenantId: sampleTenantId },
      { name: "WC Close-Coupled Twyfords", unit: "Nr", currentUnitPrice: "620000.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Wash Basin Twyfords", unit: "Nr", currentUnitPrice: "125000.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Wall Mirrors", unit: "Nr", currentUnitPrice: "8000.00", supplier: "Glass Masters", tenantId: sampleTenantId },
      { name: "Soap Dishes", unit: "Nr", currentUnitPrice: "3500.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Toilet Roll Holders", unit: "Nr", currentUnitPrice: "3500.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Stainless Steel Bidet Spray", unit: "Nr", currentUnitPrice: "6000.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "UPVC Pipes 13mm", unit: "m", currentUnitPrice: "950.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "UPVC Pipes 19mm", unit: "m", currentUnitPrice: "2000.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "UPVC Pipes 25mm", unit: "m", currentUnitPrice: "3000.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "UPVC Pipes 100mm", unit: "m", currentUnitPrice: "2500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "PPR Pipes 13-100mm", unit: "m", currentUnitPrice: "2200.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Pipe Elbow Fittings", unit: "Nr", currentUnitPrice: "600.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Pipe Tee Fittings", unit: "Nr", currentUnitPrice: "600.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Pipe Reducers", unit: "Nr", currentUnitPrice: "850.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Pipe Nipples", unit: "Nr", currentUnitPrice: "600.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Gate Valves", unit: "Nr", currentUnitPrice: "6500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Non-Return Valves", unit: "Nr", currentUnitPrice: "6000.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Floor Drains", unit: "Nr", currentUnitPrice: "1500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Pipe Traps", unit: "Nr", currentUnitPrice: "2500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Tangit PVC Adhesive", unit: "tube", currentUnitPrice: "2500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Pipe Brackets", unit: "Nr", currentUnitPrice: "350.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Septic Tank Construction Materials", unit: "sum", currentUnitPrice: "850000.00", supplier: "Construction Services", tenantId: sampleTenantId },
      { name: "Soakaway Construction Materials", unit: "sum", currentUnitPrice: "450000.00", supplier: "Construction Services", tenantId: sampleTenantId },
      { name: "Borehole Equipment Complete", unit: "sum", currentUnitPrice: "800000.00", supplier: "Water Services", tenantId: sampleTenantId },
      { name: "Submersible Pump", unit: "Nr", currentUnitPrice: "250000.00", supplier: "Water Services", tenantId: sampleTenantId },
      { name: "Steel Stanchion for Tank", unit: "Nr", currentUnitPrice: "3000000.00", supplier: "Steel Structures Ltd", tenantId: sampleTenantId },
      { name: "Water Storage Tank 5000L", unit: "Nr", currentUnitPrice: "1250000.00", supplier: "Tank Manufacturers", tenantId: sampleTenantId },
      
      // EXTERNAL WORKS & FENCING - DETAILED
      { name: "Concrete for Fence Footings", unit: "m³", currentUnitPrice: "111400.00", supplier: "Ready-Mix Concrete", tenantId: sampleTenantId },
      { name: "Concrete for Fence Pillars", unit: "m³", currentUnitPrice: "111400.00", supplier: "Ready-Mix Concrete", tenantId: sampleTenantId },
      { name: "Steel Reinforcement for Fence", unit: "kg", currentUnitPrice: "1290.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Sandcrete Blocks 230mm for Fence", unit: "m²", currentUnitPrice: "14400.00", supplier: "Block Industry", tenantId: sampleTenantId },
      { name: "Sandcrete Blocks 150mm for Fence", unit: "m²", currentUnitPrice: "11000.00", supplier: "Block Industry", tenantId: sampleTenantId },
      { name: "Fence Rendering Materials", unit: "m²", currentUnitPrice: "4300.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      { name: "Fence Painting Materials", unit: "m²", currentUnitPrice: "3250.00", supplier: "ColorMax", tenantId: sampleTenantId },
      { name: "Steel Sliding Gate Assembly", unit: "sum", currentUnitPrice: "1250000.00", supplier: "Metal Fabricators", tenantId: sampleTenantId },
      { name: "Decorative Grooved Plaster for Fence", unit: "m²", currentUnitPrice: "3500.00", supplier: "Finishing Masters", tenantId: sampleTenantId },
      
      // ANCILLARY MATERIALS
      { name: "Screws", unit: "box", currentUnitPrice: "2500.00", supplier: "Hardware Central", tenantId: sampleTenantId },
      { name: "Clips", unit: "box", currentUnitPrice: "1500.00", supplier: "Hardware Central", tenantId: sampleTenantId },
      { name: "Pipe Hangers", unit: "Nr", currentUnitPrice: "500.00", supplier: "Hardware Central", tenantId: sampleTenantId },
      { name: "Charcoal for Earthing", unit: "bag", currentUnitPrice: "3000.00", supplier: "Local Suppliers", tenantId: sampleTenantId },
      { name: "Sealants", unit: "tube", currentUnitPrice: "2500.00", supplier: "Building Materials Ltd", tenantId: sampleTenantId },
      { name: "Mastics", unit: "tube", currentUnitPrice: "2800.00", supplier: "Building Materials Ltd", tenantId: sampleTenantId },
      { name: "Electrical Accessories Misc", unit: "set", currentUnitPrice: "15000.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      
      // TILING & FLOORING
      { name: "Spanish Porcelain Tiles 1200x800mm", unit: "m²", currentUnitPrice: "48000.00", supplier: "TileWorld", tenantId: sampleTenantId },
      { name: "Polished Granite Tiles 20mm", unit: "m²", currentUnitPrice: "69300.00", supplier: "Granite Masters", tenantId: sampleTenantId },
      { name: "Ceramic Floor Tiles 300x300mm", unit: "m²", currentUnitPrice: "48000.00", supplier: "TileWorld", tenantId: sampleTenantId },
      { name: "Burnt Brick Tiles", unit: "m²", currentUnitPrice: "18500.00", supplier: "Brick Works", tenantId: sampleTenantId },
      { name: "Tile Adhesive", unit: "bag", currentUnitPrice: "4500.00", supplier: "TileWorld", tenantId: sampleTenantId },
      { name: "White Cement Grout", unit: "kg", currentUnitPrice: "850.00", supplier: "TileWorld", tenantId: sampleTenantId },
      
      // CEILING
      { name: "Mineral Fibre Acoustic Ceiling 600x600mm", unit: "m²", currentUnitPrice: "25000.00", supplier: "CeilingPro", tenantId: sampleTenantId },
      { name: "Gypsum Board 13mm", unit: "m²", currentUnitPrice: "6500.00", supplier: "CeilingPro", tenantId: sampleTenantId },
      { name: "Metal Stud & Grid", unit: "m²", currentUnitPrice: "8500.00", supplier: "CeilingPro", tenantId: sampleTenantId },
      { name: "Aluminium Grid", unit: "m", currentUnitPrice: "3200.00", supplier: "CeilingPro", tenantId: sampleTenantId },
      
      // ELECTRICAL MATERIALS
      { name: "4C x 35mm² Armoured Cable", unit: "m", currentUnitPrice: "36489.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "4C x 16mm² Armoured Cable", unit: "m", currentUnitPrice: "19271.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "2 x 1.5mm² Copper Cable", unit: "m", currentUnitPrice: "850.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "3 x 2.5mm² Copper Cable", unit: "m", currentUnitPrice: "1200.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "20mm PVC Conduit", unit: "m", currentUnitPrice: "450.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "25mm PVC Conduit", unit: "m", currentUnitPrice: "650.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Main Distribution Panel 120A", unit: "Nr", currentUnitPrice: "450000.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Changeover Switch 120A", unit: "Nr", currentUnitPrice: "90000.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "30W Spot Light Fitting", unit: "Nr", currentUnitPrice: "5800.00", supplier: "Philip Lighting", tenantId: sampleTenantId },
      { name: "25W Recessed Light Fitting", unit: "Nr", currentUnitPrice: "5500.00", supplier: "Philip Lighting", tenantId: sampleTenantId },
      { name: "18W Spot Light Fitting", unit: "Nr", currentUnitPrice: "4800.00", supplier: "Philip Lighting", tenantId: sampleTenantId },
      { name: "40W Bulkhead Fitting", unit: "Nr", currentUnitPrice: "4500.00", supplier: "Philip Lighting", tenantId: sampleTenantId },
      { name: "Ceiling Fan 1500mm", unit: "Nr", currentUnitPrice: "40000.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "10A 1-Gang Switch", unit: "Nr", currentUnitPrice: "1050.00", supplier: "Philip", tenantId: sampleTenantId },
      { name: "10A 2-Gang Switch", unit: "Nr", currentUnitPrice: "1500.00", supplier: "Philip", tenantId: sampleTenantId },
      { name: "13A Socket Outlet", unit: "Nr", currentUnitPrice: "2000.00", supplier: "Philip", tenantId: sampleTenantId },
      { name: "15A AC Switch", unit: "Nr", currentUnitPrice: "2500.00", supplier: "Philip", tenantId: sampleTenantId },
      { name: "TV Outlet", unit: "Nr", currentUnitPrice: "1800.00", supplier: "ABB", tenantId: sampleTenantId },
      { name: "Coaxial Cable (Shielded)", unit: "m", currentUnitPrice: "950.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Earth Electrode 2.4m", unit: "Nr", currentUnitPrice: "5500.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Copper Tape 10x3mm", unit: "m", currentUnitPrice: "4500.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Earth Test Clamp", unit: "Nr", currentUnitPrice: "6500.00", supplier: "ElectroMax", tenantId: sampleTenantId },
      { name: "Optical Smoke Detector", unit: "Nr", currentUnitPrice: "18400.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      { name: "Heat Detector", unit: "Nr", currentUnitPrice: "18400.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      { name: "Fire Alarm Control Panel 3-Zone", unit: "Nr", currentUnitPrice: "550000.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      { name: "6kg CO2 Fire Extinguisher", unit: "Nr", currentUnitPrice: "42000.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      { name: "5kg ABC Fire Extinguisher", unit: "Nr", currentUnitPrice: "33000.00", supplier: "Fire Safety Ltd", tenantId: sampleTenantId },
      
      // PLUMBING MATERIALS
      { name: "25mm UPVC Pipe", unit: "m", currentUnitPrice: "3000.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "19mm UPVC Pipe", unit: "m", currentUnitPrice: "2000.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "13mm UPVC Pipe", unit: "m", currentUnitPrice: "950.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "100mm UPVC Drainage Pipe", unit: "m", currentUnitPrice: "2500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "50mm UPVC Drainage Pipe", unit: "m", currentUnitPrice: "1400.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "UPVC Tee Fittings", unit: "Nr", currentUnitPrice: "600.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "UPVC Elbow Fittings", unit: "Nr", currentUnitPrice: "600.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "UPVC Sockets", unit: "Nr", currentUnitPrice: "600.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Bronze Gate Valve 25mm", unit: "Nr", currentUnitPrice: "6500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Non-Return Valve 25mm", unit: "Nr", currentUnitPrice: "6000.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Flexible Connector 15mm", unit: "Nr", currentUnitPrice: "3500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "WC Pan Connector 100mm", unit: "Nr", currentUnitPrice: "1500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Bottle Trap 32mm", unit: "Nr", currentUnitPrice: "2500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Vent Cowl 100mm", unit: "Nr", currentUnitPrice: "1000.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      { name: "Tangit Gum & Adhesives", unit: "Item", currentUnitPrice: "15000.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      
      // SANITARY FIXTURES
      { name: "Close Coupled WC (Twyford)", unit: "Nr", currentUnitPrice: "620000.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Wall Mounted Wash Basin (Twyford)", unit: "Nr", currentUnitPrice: "125000.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Chrome Basin Pillar Tap", unit: "Nr", currentUnitPrice: "15000.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Chrome P-Trap 32mm", unit: "Nr", currentUnitPrice: "5500.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Wall Mirror Silvered Glass", unit: "Nr", currentUnitPrice: "8000.00", supplier: "Glass Masters", tenantId: sampleTenantId },
      { name: "Toilet Roll Holder Chrome", unit: "Nr", currentUnitPrice: "3500.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Chrome Soap Dish", unit: "Nr", currentUnitPrice: "3500.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Stainless Steel Anal Spray", unit: "Nr", currentUnitPrice: "6000.00", supplier: "SanitaryWare Co", tenantId: sampleTenantId },
      { name: "Floor Drain 50mm", unit: "Nr", currentUnitPrice: "1500.00", supplier: "PlumbPro", tenantId: sampleTenantId },
      
      // MECHANICAL/HVAC
      { name: "Split AC Unit 12000 BTU", unit: "Nr", currentUnitPrice: "520000.00", supplier: "HVAC Systems", tenantId: sampleTenantId },
      { name: "Split AC Unit 24000 BTU", unit: "Nr", currentUnitPrice: "850000.00", supplier: "HVAC Systems", tenantId: sampleTenantId },
      { name: "Wall Mounted Exhaust Fan 360m³/hr", unit: "Nr", currentUnitPrice: "45000.00", supplier: "Xpelair", tenantId: sampleTenantId },
      
      // METAL WORKS
      { name: "Steel Reinforcement Bars", unit: "kg", currentUnitPrice: "1290.00", supplier: "SteelWorks Inc", tenantId: sampleTenantId },
      { name: "Steel Handrails 40mm Diameter", unit: "m", currentUnitPrice: "65000.00", supplier: "Metal Fabricators", tenantId: sampleTenantId },
      { name: "Steel Pergola Structure", unit: "sum", currentUnitPrice: "750000.00", supplier: "Metal Fabricators", tenantId: sampleTenantId },
      { name: "Steel Sliding Gate", unit: "sum", currentUnitPrice: "1250000.00", supplier: "Metal Fabricators", tenantId: sampleTenantId },
      { name: "Steel Stanchion 12m", unit: "Nr", currentUnitPrice: "3000000.00", supplier: "Steel Structures Ltd", tenantId: sampleTenantId },
      
      // WATER SYSTEMS
      { name: "Borehole Drilling Complete", unit: "Nr", currentUnitPrice: "800000.00", supplier: "Water Services", tenantId: sampleTenantId },
      { name: "Submersible Water Pump", unit: "Nr", currentUnitPrice: "250000.00", supplier: "Water Services", tenantId: sampleTenantId },
      { name: "Water Storage Tank 5000L", unit: "Nr", currentUnitPrice: "1250000.00", supplier: "Tank Manufacturers", tenantId: sampleTenantId },
      
      // DRAINAGE
      { name: "Manhole Construction 600x600x600mm", unit: "Nr", currentUnitPrice: "35000.00", supplier: "Construction Services", tenantId: sampleTenantId },
      { name: "Soakaway Pit 2000x2000x2000mm", unit: "Nr", currentUnitPrice: "450000.00", supplier: "Construction Services", tenantId: sampleTenantId },
      { name: "Septic Tank 2500x2000x2000mm", unit: "Nr", currentUnitPrice: "850000.00", supplier: "Construction Services", tenantId: sampleTenantId },
      { name: "Cast Iron Manhole Cover", unit: "Nr", currentUnitPrice: "45000.00", supplier: "Metal Works", tenantId: sampleTenantId },
      
      // MISCELLANEOUS
      { name: "Cow Dung for Earthing", unit: "bag", currentUnitPrice: "2000.00", supplier: "Local Suppliers", tenantId: sampleTenantId },
      { name: "Charcoal for Earthing", unit: "bag", currentUnitPrice: "3000.00", supplier: "Local Suppliers", tenantId: sampleTenantId },
      { name: "Industrial Salt", unit: "kg", currentUnitPrice: "500.00", supplier: "Chemical Suppliers", tenantId: sampleTenantId },
    ];

    // Get existing materials to avoid duplicates
    const existingMaterials = await db.select().from(materials).where(eq(materials.tenantId, sampleTenantId));
    const existingMaterialNames = new Set(existingMaterials.map(item => item.name));
    
    // Filter out materials that already exist
    const newMaterials = materialsData.filter(item => 
      !existingMaterialNames.has(item.name)
    );
    
    // Insert new materials only
    if (newMaterials.length > 0) {
      await db.insert(materials).values(newMaterials);
      console.log(`✅ Inserted ${newMaterials.length} new materials from BOQ (${existingMaterials.length} already existed)`);
    } else {
      console.log(`ℹ️  All ${materialsData.length} materials already exist`);
    }

    console.log("🎉 Seed data creation completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   • Company: ${sampleCompany.name} (${sampleTenantId})`);
    console.log(`   • Line Items: ${lineItemsData.length} items from comprehensive BOQ`);
    console.log(`   • Materials: ${materialsData.length} construction materials with BOQ pricing`);
    console.log(`   • Source: MR AJAO TAYE PHILIPS BOQ - Residential Development`);

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
