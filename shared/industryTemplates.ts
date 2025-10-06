// Industry-specific templates for line items and materials

export const industryTemplates = {
  construction: {
    lineItems: [
      { name: "Site Preparation", category: "site_preparation", description: "Land clearing, excavation, and site preparation work" },
      { name: "Foundation Work", category: "foundation", description: "Foundation excavation, concrete pouring, and reinforcement" },
      { name: "Structural Framework", category: "structural", description: "Steel or concrete structural framework installation" },
      { name: "Roofing Installation", category: "roofing", description: "Roof structure and covering installation" },
      { name: "Electrical Installation", category: "electrical", description: "Electrical wiring, outlets, and fixtures" },
      { name: "Plumbing Installation", category: "plumbing", description: "Plumbing pipes, fixtures, and drainage systems" },
      { name: "Interior Finishing", category: "finishing", description: "Painting, tiling, and interior finishes" },
      { name: "External Works", category: "external_works", description: "Landscaping, driveways, and external features" },
    ],
    materials: [
      { name: "Cement", unit: "bag", currentUnitPrice: "5000.00", supplier: "General Suppliers" },
      { name: "Sand", unit: "ton", currentUnitPrice: "25000.00", supplier: "General Suppliers" },
      { name: "Granite", unit: "ton", currentUnitPrice: "35000.00", supplier: "General Suppliers" },
      { name: "Iron Rods (12mm)", unit: "length", currentUnitPrice: "8000.00", supplier: "Steel Suppliers" },
      { name: "Iron Rods (16mm)", unit: "length", currentUnitPrice: "12000.00", supplier: "Steel Suppliers" },
      { name: "Blocks (9 inch)", unit: "piece", currentUnitPrice: "250.00", supplier: "Block Factory" },
      { name: "Roofing Sheets", unit: "sheet", currentUnitPrice: "4500.00", supplier: "Roofing Suppliers" },
      { name: "Paint (Emulsion)", unit: "gallon", currentUnitPrice: "15000.00", supplier: "Paint Suppliers" },
      { name: "Tiles (Floor)", unit: "sqm", currentUnitPrice: "8000.00", supplier: "Tile Suppliers" },
      { name: "Electrical Cables", unit: "meter", currentUnitPrice: "500.00", supplier: "Electrical Suppliers" },
    ],
  },
  real_estate: {
    lineItems: [
      { name: "Land Acquisition", category: "land_purchase", description: "Purchase and legal documentation of land" },
      { name: "Property Development", category: "development_resources", description: "Overall property development and construction" },
      { name: "Marketing & Sales", category: "marketing", description: "Property marketing and sales activities" },
      { name: "Legal & Documentation", category: "operations", description: "Legal fees and property documentation" },
      { name: "Property Management", category: "operations", description: "Ongoing property management services" },
      { name: "Utilities Setup", category: "infrastructure", description: "Water, electricity, and utility connections" },
    ],
    materials: [
      { name: "Signage Boards", unit: "piece", currentUnitPrice: "50000.00", supplier: "Signage Company" },
      { name: "Marketing Brochures", unit: "pack", currentUnitPrice: "25000.00", supplier: "Printing Press" },
      { name: "Site Fencing", unit: "meter", currentUnitPrice: "3000.00", supplier: "Fencing Suppliers" },
      { name: "Access Gates", unit: "unit", currentUnitPrice: "250000.00", supplier: "Gate Manufacturers" },
      { name: "Street Lighting", unit: "unit", currentUnitPrice: "75000.00", supplier: "Lighting Suppliers" },
    ],
  },
  manufacturing: {
    lineItems: [
      { name: "Raw Material Procurement", category: "operations", description: "Purchase of raw materials for production" },
      { name: "Production Process", category: "operations", description: "Manufacturing and production activities" },
      { name: "Quality Control", category: "testing_qa", description: "Quality assurance and testing" },
      { name: "Packaging", category: "operations", description: "Product packaging and labeling" },
      { name: "Equipment Maintenance", category: "infrastructure", description: "Machinery maintenance and repairs" },
      { name: "Logistics & Distribution", category: "operations", description: "Transportation and distribution" },
    ],
    materials: [
      { name: "Raw Materials", unit: "kg", currentUnitPrice: "1000.00", supplier: "Raw Material Suppliers" },
      { name: "Packaging Materials", unit: "unit", currentUnitPrice: "500.00", supplier: "Packaging Company" },
      { name: "Lubricants", unit: "liter", currentUnitPrice: "5000.00", supplier: "Industrial Supplies" },
      { name: "Safety Equipment", unit: "piece", currentUnitPrice: "15000.00", supplier: "Safety Gear Suppliers" },
      { name: "Cleaning Supplies", unit: "pack", currentUnitPrice: "3000.00", supplier: "Cleaning Suppliers" },
    ],
  },
  software_development: {
    lineItems: [
      { name: "Development Resources", category: "development_resources", description: "Software development team and resources" },
      { name: "Design & UX", category: "design_tools", description: "UI/UX design and prototyping" },
      { name: "Testing & QA", category: "testing_qa", description: "Software testing and quality assurance" },
      { name: "Infrastructure & Hosting", category: "infrastructure", description: "Cloud hosting and infrastructure" },
      { name: "Marketing & Growth", category: "marketing", description: "Product marketing and user acquisition" },
      { name: "Operations & Support", category: "operations", description: "Customer support and operations" },
    ],
    materials: [
      { name: "Cloud Hosting (AWS)", unit: "month", currentUnitPrice: "50000.00", supplier: "Amazon Web Services" },
      { name: "Development Tools Licenses", unit: "license", currentUnitPrice: "25000.00", supplier: "JetBrains" },
      { name: "Design Software Subscription", unit: "month", currentUnitPrice: "15000.00", supplier: "Adobe" },
      { name: "API Services", unit: "month", currentUnitPrice: "30000.00", supplier: "Various Providers" },
      { name: "Analytics Tools", unit: "month", currentUnitPrice: "20000.00", supplier: "Analytics Vendors" },
    ],
  },
  other: {
    lineItems: [
      { name: "Project Management", category: "operations", description: "General project management activities" },
      { name: "Resource Allocation", category: "operations", description: "General resource allocation" },
      { name: "Quality Assurance", category: "testing_qa", description: "Quality control and assurance" },
      { name: "Marketing Activities", category: "marketing", description: "Marketing and promotional activities" },
    ],
    materials: [
      { name: "Office Supplies", unit: "pack", currentUnitPrice: "5000.00", supplier: "Office Depot" },
      { name: "Equipment", unit: "unit", currentUnitPrice: "50000.00", supplier: "Equipment Suppliers" },
      { name: "Services", unit: "hour", currentUnitPrice: "10000.00", supplier: "Service Providers" },
    ],
  },
};

export type IndustryType = keyof typeof industryTemplates;

export const industryLabels: Record<IndustryType, string> = {
  construction: "Construction",
  real_estate: "Real Estate",
  manufacturing: "Manufacturing",
  software_development: "Software Development",
  other: "Other",
};
