import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper to draw a horizontal rule
function drawHr(doc: PDFKit.PDFDocument, y: number, color = "#e2e8f0") {
  doc.strokeColor(color).lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}

// -----------------------------------------------------------------------------
// 1. Corporate Tech Minimalist (Slate & Blue) - RECEIVABLE
// -----------------------------------------------------------------------------
function generateInvoice1() {
  const filePath = path.join(dataDir, "invoice_01_tech_consulting.pdf");
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  // Top Accent Bar
  doc.rect(0, 0, 612, 8).fill("#2563eb");

  // Company Header
  doc
    .fillColor("#0f172a")
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("CloudSphere Technologies Ltd.", 50, 45);
  doc
    .fillColor("#64748b")
    .fontSize(8)
    .font("Helvetica")
    .text("Enterprise Cloud Architecture & DevOps Solutions", 50, 68)
    .text("Level 7, Banani Commercial Area, Dhaka 1213", 50, 79)
    .text("contact@cloudsphere.tech | +880 1711-009988", 50, 90);

  // Invoice Title & Meta
  doc
    .fillColor("#2563eb")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("TAX INVOICE", 400, 45, { align: "right" });
  doc
    .fillColor("#334155")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Invoice #: INV-2026-0891", 400, 68, { align: "right" })
    .font("Helvetica")
    .text("Date: 2026-10-05", 400, 80, { align: "right" })
    .text("Due Date: 2026-10-25", 400, 92, { align: "right" })
    .text("Payment Terms: Net 20 Days", 400, 104, { align: "right" });

  drawHr(doc, 125, "#cbd5e1");

  // Counterparty
  doc
    .fillColor("#64748b")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("BILLED TO (CUSTOMER):", 50, 140);
  doc
    .fillColor("#0f172a")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Apex Retail Group Ltd", 50, 153);
  doc
    .fillColor("#475569")
    .fontSize(9)
    .font("Helvetica")
    .text("Accounts Payable Department", 50, 167)
    .text("Plot 42, Gulshan Avenue, Dhaka 1212", 50, 179)
    .text("BIN / Tax ID: 001928374-0101", 50, 191);

  // Table Header
  doc.rect(50, 215, 500, 24).fill("#f1f5f9");
  doc
    .fillColor("#1e293b")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("ITEM & DESCRIPTION", 60, 222)
    .text("QTY / HOURS", 290, 222, { align: "center", width: 80 })
    .text("RATE (BDT)", 380, 222, { align: "right", width: 70 })
    .text("AMOUNT (BDT)", 460, 222, { align: "right", width: 80 });

  // Rows
  const items = [
    {
      desc: "Cloud Infrastructure Migration (AWS to Hybrid Kubernetes)",
      qty: "60 hrs",
      rate: "1,500.00",
      amt: "90,000.00",
    },
    {
      desc: "Zero-Trust Edge Security & Proxy Hardening",
      qty: "25 hrs",
      rate: "1,400.00",
      amt: "35,000.00",
    },
    {
      desc: "Post-Migration Support & 24/7 Monitoring Baseline",
      qty: "1 month",
      rate: "20,000.00",
      amt: "20,000.00",
    },
  ];

  let y = 248;
  for (const item of items) {
    doc
      .fillColor("#1e293b")
      .fontSize(9)
      .font("Helvetica")
      .text(item.desc, 60, y)
      .text(item.qty, 290, y, { align: "center", width: 80 })
      .text(item.rate, 380, y, { align: "right", width: 70 })
      .font("Helvetica-Bold")
      .text(item.amt, 460, y, { align: "right", width: 80 });
    drawHr(doc, y + 20, "#f1f5f9");
    y += 28;
  }

  // Summary Table
  const totalY = y + 15;
  doc
    .fillColor("#64748b")
    .fontSize(9)
    .font("Helvetica")
    .text("Subtotal:", 350, totalY)
    .text("145,000.00 BDT", 460, totalY, { align: "right", width: 80 });
  doc
    .text("VAT / AIT (0% Included):", 350, totalY + 16)
    .text("0.00 BDT", 460, totalY + 16, { align: "right", width: 80 });

  doc.rect(340, totalY + 34, 210, 28).fill("#eff6ff");
  doc
    .fillColor("#1e40af")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("TOTAL DUE:", 350, totalY + 42)
    .text("BDT 145,000.00", 450, totalY + 42, { align: "right", width: 90 });

  // Payment Details
  doc
    .fillColor("#0f172a")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("BANK WIRE DETAILS:", 50, 430);
  doc
    .fillColor("#64748b")
    .fontSize(8)
    .font("Helvetica")
    .text("Bank: Eastern Bank Ltd (Banani Branch)", 50, 442)
    .text("Account Name: CloudSphere Technologies Ltd", 50, 453)
    .text("Account #: 104-102-998877", 50, 464)
    .text("Routing Number: 090260124", 50, 475);

  doc.end();
}

// -----------------------------------------------------------------------------
// 2. Heavy Industrial Supplier Bill (Forest Green & Amber) - PAYABLE
// -----------------------------------------------------------------------------
function generateInvoice2() {
  const filePath = path.join(dataDir, "invoice_02_raw_materials_supplier.pdf");
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  // Dark Green Header Bar
  doc.rect(0, 0, 612, 60).fill("#14532d");
  doc
    .fillColor("#ffffff")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("BENGAL HEAVY INDUSTRIES & STEEL WORKS", 50, 22);

  // Subheader
  doc
    .fillColor("#475569")
    .fontSize(8)
    .font("Helvetica")
    .text("Industrial Raw Materials, Galvanized Sheet & Rebar Supplier", 50, 75)
    .text("Plot 12-14, Shitalakkhya Industrial Zone, Narayanganj", 50, 87)
    .text("Tax BIN: 004819203-0202 | Phone: +880 2-7634991", 50, 99);

  // Bill Box
  doc.rect(360, 70, 190, 75).fill("#f8fafc").stroke("#cbd5e1");
  doc
    .fillColor("#14532d")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("VENDOR BILL", 370, 78)
    .fillColor("#334155")
    .fontSize(8)
    .font("Helvetica")
    .text("Bill Number: BILL-BH-99214", 370, 93)
    .text("Purchase Order: PO-44012", 370, 105)
    .text("Issue Date: 2026-09-28", 370, 117)
    .text("Payment Due Date: 2026-10-18", 370, 129);

  // Buyer Info
  doc
    .fillColor("#14532d")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("BILL TO / SHIP TO:", 50, 130);
  doc
    .fillColor("#0f172a")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("CashPilot AI Engineering Works", 50, 142);
  doc
    .fillColor("#475569")
    .fontSize(8)
    .font("Helvetica")
    .text("Factory Site Warehouse #3, Gazipur Industrial Area", 50, 154)
    .text("Attn: Procurement & Inventory Lead", 50, 166);

  // Table
  doc.rect(50, 190, 500, 22).fill("#14532d");
  doc
    .fillColor("#ffffff")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("LINE ITEM / MATERIAL SPECIFICATION", 60, 197)
    .text("WEIGHT (MT)", 270, 197, { align: "center", width: 80 })
    .text("UNIT PRICE (BDT)", 360, 197, { align: "right", width: 80 })
    .text("TOTAL (BDT)", 450, 197, { align: "right", width: 90 });

  const rows = [
    {
      spec: "500W Deformed Rebar (16mm) - Grade 60",
      weight: "2.5 MT",
      rate: "88,000.00",
      total: "220,000.00",
    },
    {
      spec: "Galvanized Corrugated Iron (0.42mm standard)",
      weight: "0.8 MT",
      rate: "75,000.00",
      total: "60,000.00",
    },
  ];

  let y = 220;
  for (const r of rows) {
    doc
      .fillColor("#0f172a")
      .fontSize(8)
      .font("Helvetica")
      .text(r.spec, 60, y)
      .text(r.weight, 270, y, { align: "center", width: 80 })
      .text(r.rate, 360, y, { align: "right", width: 80 })
      .font("Helvetica-Bold")
      .text(r.total, 450, y, { align: "right", width: 90 });
    drawHr(doc, y + 18, "#e2e8f0");
    y += 26;
  }

  // Totals Box
  const tY = y + 20;
  doc.rect(320, tY, 230, 60).fill("#f0fdf4").stroke("#bbf7d0");
  doc
    .fillColor("#166534")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Total Payable Amount:", 330, tY + 12)
    .text("BDT 280,000.00", 430, tY + 12, { align: "right", width: 110 })
    .font("Helvetica")
    .fontSize(8)
    .text("Status: Awaiting Bank Transfer", 330, tY + 30)
    .text("Authorized by: Factory Quality Control", 330, tY + 42);

  doc.end();
}

// -----------------------------------------------------------------------------
// 3. Creative / Marketing Agency (Editorial Black & Crimson) - RECEIVABLE
// -----------------------------------------------------------------------------
function generateInvoice3() {
  const filePath = path.join(dataDir, "invoice_03_creative_agency.pdf");
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  // Big Bold Typography
  doc
    .fillColor("#09090b")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("VIBRANT STUDIO", 50, 45);
  doc
    .fillColor("#e11d48")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("CREATIVE BRAND STRATEGY & DIGITAL CAMPAIGNS", 50, 72);

  doc
    .fillColor("#71717a")
    .fontSize(8)
    .font("Helvetica")
    .text("Studio 4B, Concord Tower, Gulshan-2, Dhaka", 50, 86)
    .text("hello@vibrantstudio.design | +880 1819-554433", 50, 97);

  // Invoice Number Header
  doc
    .fillColor("#09090b")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("INVOICE # VS-OCT-2026-44", 350, 45, { align: "right" });
  doc
    .fillColor("#71717a")
    .fontSize(8)
    .font("Helvetica")
    .text("Issue Date: 2026-10-08", 350, 62, { align: "right" })
    .text("Due Date: 2026-10-23", 350, 74, { align: "right" })
    .text("Term: Net 15 Days", 350, 86, { align: "right" });

  drawHr(doc, 120, "#e4e4e7");

  // Client
  doc
    .fillColor("#71717a")
    .fontSize(8)
    .font("Helvetica")
    .text("CLIENT / COUNTERPARTY", 50, 135)
    .fillColor("#09090b")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Dhaka Gourmet Foods Ltd", 50, 148)
    .fillColor("#52525b")
    .fontSize(8)
    .font("Helvetica")
    .text("Dhanmondi R/A, Road 27, Dhaka", 50, 163)
    .text("Contact: Brand Marketing Directorate", 50, 174);

  // Creative Deliverables Table
  doc
    .fillColor("#09090b")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("DELIVERABLE / MILESTONE", 50, 210)
    .text("QTY", 330, 210, { align: "center", width: 50 })
    .text("FEE (BDT)", 450, 210, { align: "right", width: 90 });
  drawHr(doc, 222, "#09090b");

  const creativeItems = [
    {
      title: "Brand Identity Redesign (Logomark, Styleguide, Packaging)",
      qty: "1 Phase",
      fee: "50,000.00",
    },
    {
      title: "Commercial Product Photography & Video Asset Production",
      qty: "1 Session",
      fee: "25,000.00",
    },
    {
      title: "Social Media Launch Campaign Kit (15 Multi-Platform Ads)",
      qty: "1 Kit",
      fee: "10,000.00",
    },
  ];

  let cy = 235;
  for (const item of creativeItems) {
    doc
      .fillColor("#18181b")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(item.title, 50, cy)
      .font("Helvetica")
      .fontSize(8)
      .text(item.qty, 330, cy, { align: "center", width: 50 })
      .text(item.fee, 450, cy, { align: "right", width: 90 });
    drawHr(doc, cy + 20, "#f4f4f5");
    cy += 30;
  }

  // Large Total Callout
  drawHr(doc, cy + 10, "#09090b");
  doc
    .fillColor("#09090b")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("NET TOTAL PAYABLE", 50, cy + 22)
    .fillColor("#e11d48")
    .fontSize(18)
    .text("85,000.00 BDT", 380, cy + 18, { align: "right", width: 160 });

  doc
    .fillColor("#71717a")
    .fontSize(7)
    .font("Helvetica")
    .text(
      "Thank you for your business. Remit via bKash Merchant: 01819-554433 or City Bank A/C: 1102938472",
      50,
      450,
    );

  doc.end();
}

// -----------------------------------------------------------------------------
// 4. Logistics & Freight Forwarder (Compact Slip Layout) - PAYABLE
// -----------------------------------------------------------------------------
function generateInvoice4() {
  const filePath = path.join(dataDir, "invoice_04_logistics_freight.pdf");
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  // Double Border Outline
  doc.rect(40, 40, 532, 762).stroke("#0284c7");
  doc.rect(43, 43, 526, 756).stroke("#e0f2fe");

  // Courier Top Header
  doc.rect(45, 45, 522, 50).fill("#0284c7");
  doc
    .fillColor("#ffffff")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("FASTTRACK EXPRESS CARGO & FREIGHT", 60, 58)
    .fontSize(8)
    .font("Helvetica")
    .text("Inter-District Heavy Haulage, Drayage & Container Dispatch", 60, 78);

  // Consignment Meta
  doc
    .fillColor("#0f172a")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("FREIGHT BILL #: FT-EXP-77120", 60, 110)
    .font("Helvetica")
    .text("Consignment Note: CN-994821", 60, 122)
    .text("Booking Date: 2026-10-02", 60, 134)
    .text("Due Date: 2026-10-16", 60, 146);

  doc
    .font("Helvetica-Bold")
    .text("PORT OF ORIGIN: Chittagong Sea Port (Yard 4)", 300, 110)
    .font("Helvetica")
    .text("DESTINATION: Tejgaon Industrial Area, Dhaka", 300, 122)
    .text("Vehicle Reg: DHAKA-METRO-TA-14-9981", 300, 134)
    .text("Driver Contact: 01712-334455", 300, 146);

  drawHr(doc, 165, "#bae6fd");

  // Counterparty
  doc
    .fillColor("#0369a1")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("CONSIGNEE / COUNTERPARTY:", 60, 180);
  doc
    .fillColor("#0f172a")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("CashPilot Logistics Ingestion Hub", 60, 192);

  // Itemized Freight Table
  doc.rect(60, 220, 492, 20).fill("#f0f9ff");
  doc
    .fillColor("#0369a1")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("CHARGE COMPONENT", 70, 226)
    .text("BASIS", 280, 226, { align: "center", width: 80 })
    .text("AMOUNT (BDT)", 440, 226, { align: "right", width: 100 });

  const freightRows = [
    {
      name: "Container Haulage (20ft Flatbed Transport)",
      basis: "Flat Rate",
      fee: "32,000.00",
    },
    {
      name: "Port Tolls & Highway Weighbridge Clearance",
      basis: "2 Passes",
      fee: "4,500.00",
    },
    {
      name: "Fuel Adjustment Surcharge & Night Surcharge",
      basis: "Standard Index",
      fee: "6,000.00",
    },
  ];

  let fy = 248;
  for (const row of freightRows) {
    doc
      .fillColor("#334155")
      .fontSize(8)
      .font("Helvetica")
      .text(row.name, 70, fy)
      .text(row.basis, 280, fy, { align: "center", width: 80 })
      .font("Helvetica-Bold")
      .text(row.fee, 440, fy, { align: "right", width: 100 });
    drawHr(doc, fy + 16, "#f1f5f9");
    fy += 24;
  }

  // Total
  doc.rect(340, fy + 10, 212, 35).fill("#0284c7");
  doc
    .fillColor("#ffffff")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("TOTAL DUE:", 355, fy + 22)
    .text("BDT 42,500.00", 435, fy + 22, { align: "right", width: 105 });

  doc.end();
}

// -----------------------------------------------------------------------------
// 5. Commercial Real Estate Lease Bill (Classic Legal Serif) - PAYABLE
// -----------------------------------------------------------------------------
function generateInvoice5() {
  const filePath = path.join(dataDir, "invoice_05_commercial_lease.pdf");
  const doc = new PDFDocument({ margin: 55, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  // Elegant Legal Serif Header
  doc
    .fillColor("#1c1917")
    .fontSize(18)
    .font("Times-Bold")
    .text("NAVANA REAL ESTATE MANAGEMENT LTD.", 55, 50, { align: "center" });
  doc
    .fillColor("#78716c")
    .fontSize(8)
    .font("Times-Roman")
    .text(
      "Property Asset Management & Commercial Facilities Directorate",
      55,
      74,
      { align: "center" },
    )
    .text(
      "Navana Pristine Pavilion, Gulshan North Avenue, Dhaka 1212",
      55,
      86,
      { align: "center" },
    );

  drawHr(doc, 105, "#44403c");

  doc
    .fillColor("#1c1917")
    .fontSize(12)
    .font("Times-Bold")
    .text("STATEMENT OF RENT & UTILITY CHARGES", 55, 125, { align: "center" });
  doc
    .fontSize(9)
    .font("Times-Roman")
    .text("Billing Period: 01 October 2026 – 31 October 2026", 55, 142, {
      align: "center",
    });

  // Bill metadata
  doc
    .fontSize(9)
    .font("Times-Bold")
    .text("Invoice Ref: LEASE-GULSHAN-2026-10", 55, 175)
    .font("Times-Roman")
    .text("Issue Date: 2026-10-01", 55, 189)
    .text("Due Date: 2026-10-10", 55, 203)
    .font("Times-Bold")
    .text("TENANT / COUNTERPARTY:", 350, 175)
    .font("Times-Roman")
    .text("CashPilot Technologies Ltd", 350, 189)
    .text("Suite 5A (2,400 sq.ft Office Space)", 350, 203)
    .text("Gulshan Commercial Tower, Dhaka", 350, 217);

  drawHr(doc, 240, "#d6d3d1");

  // Ledger Table
  doc
    .font("Times-Bold")
    .fontSize(9)
    .text("DESCRIPTION OF CHARGES", 55, 255)
    .text("AMOUNT (BDT)", 430, 255, { align: "right", width: 120 });
  drawHr(doc, 270, "#1c1917");

  const leaseItems = [
    {
      desc: "Monthly Office Premises Rent (Contract Ref: NRE-L-8820)",
      amt: "95,000.00",
    },
    {
      desc: "Building Maintenance, Security & Lift Service Charge",
      amt: "15,000.00",
    },
    {
      desc: "Dedicated Generator Fuel & HVAC Electricity Sub-metering",
      amt: "10,000.00",
    },
  ];

  let ly = 285;
  for (const item of leaseItems) {
    doc
      .font("Times-Roman")
      .fontSize(9)
      .text(item.desc, 55, ly)
      .text(item.amt, 430, ly, { align: "right", width: 120 });
    drawHr(doc, ly + 20, "#e7e5e4");
    ly += 30;
  }

  // Summary
  drawHr(doc, ly + 5, "#1c1917");
  doc
    .font("Times-Bold")
    .fontSize(11)
    .text("TOTAL PAYABLE BY DUE DATE:", 55, ly + 18)
    .text("BDT 120,000.00", 430, ly + 18, { align: "right", width: 120 });

  // Legal Note
  doc
    .font("Times-Italic")
    .fontSize(8)
    .fillColor("#78716c")
    .text(
      "Notice: Late settlement after the 10th of each calendar month incurs a 2.5% delayed billing adjustment per clause 14 of the master tenancy agreement.",
      55,
      450,
      { width: 495, align: "justify" },
    );

  doc.end();
}

// -----------------------------------------------------------------------------
// 6. Medical Supplies Wholesale (Teal & Clinical Format) - RECEIVABLE
// -----------------------------------------------------------------------------
function generateInvoice6() {
  const filePath = path.join(dataDir, "invoice_06_medical_supplies.pdf");
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  // Clinical Teal Header
  doc.rect(50, 40, 500, 50).fill("#0d9488");
  doc
    .fillColor("#ffffff")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("MEDIHEALTH DIAGNOSTICS & PHARMA SUPPLIES LTD", 65, 52)
    .fontSize(8)
    .font("Helvetica")
    .text(
      "Certified Wholesale Distributor of Clinical Reagents & Surgical Consumables",
      65,
      72,
    );

  // Invoice Details
  doc
    .fillColor("#0f766e")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("INVOICE # MED-88102-RX", 50, 110)
    .fillColor("#475569")
    .fontSize(8)
    .font("Helvetica")
    .text("Order Date: 2026-10-10", 50, 124)
    .text("Delivery Due Date: 2026-10-24", 50, 136)
    .text("DGDA License No: DGDA-WHOLESALE-2024-91", 50, 148);

  // Counterparty
  doc
    .fillColor("#0f766e")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("HEALTHCARE CLIENT (RECEIVABLE):", 330, 110)
    .fillColor("#0f172a")
    .fontSize(10)
    .text("Crescent General Hospital Ltd", 330, 124)
    .fillColor("#475569")
    .fontSize(8)
    .font("Helvetica")
    .text("Central Procurement Department, Dhanmondi, Dhaka", 330, 137);

  // Items Table
  doc.rect(50, 180, 500, 22).fill("#ccfbf1");
  doc
    .fillColor("#0f766e")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("ITEM / PRODUCT SPECIFICATION", 60, 187)
    .text("BATCH / LOT", 250, 187)
    .text("PACKS", 360, 187, { align: "center", width: 50 })
    .text("AMOUNT (BDT)", 440, 187, { align: "right", width: 100 });

  const medItems = [
    {
      name: "Automated Hematology Reagent Kit (5-Part)",
      lot: "LOT-2026-A12",
      packs: "10 Kits",
      amt: "85,000.00",
    },
    {
      name: "Sterile Disposable Surgical Drape Packs",
      lot: "LOT-2026-D44",
      packs: "100 Pcs",
      amt: "50,000.00",
    },
    {
      name: "N95 Medical Respirator Particulate Mask (Box of 50)",
      lot: "LOT-2026-M09",
      packs: "40 Boxes",
      amt: "60,000.00",
    },
  ];

  let my = 210;
  for (const m of medItems) {
    doc
      .fillColor("#1e293b")
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(m.name, 60, my)
      .font("Helvetica")
      .text(m.lot, 250, my)
      .text(m.packs, 360, my, { align: "center", width: 50 })
      .text(m.amt, 440, my, { align: "right", width: 100 });
    drawHr(doc, my + 18, "#f1f5f9");
    my += 26;
  }

  // Total
  const totalMy = my + 15;
  doc.rect(340, totalMy, 210, 40).fill("#0d9488");
  doc
    .fillColor("#ffffff")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("TOTAL INVOICE VALUE:", 350, totalMy + 14)
    .text("BDT 195,000.00", 440, totalMy + 14, { align: "right", width: 100 });

  doc.end();
}

// -----------------------------------------------------------------------------
// 7. IT Hardware & Server Procurement (Grid Dark Slate) - PAYABLE
// -----------------------------------------------------------------------------
function generateInvoice7() {
  const filePath = path.join(dataDir, "invoice_07_hardware_it_equipment.pdf");
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  // Tech Hardware Top Banner
  doc.rect(50, 40, 500, 45).fill("#334155");
  doc
    .fillColor("#ffffff")
    .fontSize(15)
    .font("Helvetica-Bold")
    .text("STAR TECH ENTERPRISE HARDWARE SYSTEMS", 65, 52)
    .fontSize(8)
    .font("Helvetica")
    .text(
      "Rack Servers, Enterprise Networking, Storage & Data Center Solutions",
      65,
      70,
    );

  // Meta
  doc
    .fillColor("#334155")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("SUPPLIER BILL REF: ST-HW-2026-118", 50, 105)
    .font("Helvetica")
    .fontSize(8)
    .text("Quotation Reference: QT-99120", 50, 118)
    .text("Issue Date: 2026-10-12", 50, 130)
    .text("Due Date: 2026-11-11 (Net 30)", 50, 142);

  // Buyer
  doc
    .font("Helvetica-Bold")
    .text("BUYER / COUNTERPARTY (PAYABLE):", 330, 105)
    .fillColor("#0f172a")
    .fontSize(9)
    .text("CashPilot AI Infrastructure Team", 330, 118)
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#475569")
    .text("Dhaka Tech Park, Agargaon, Dhaka", 330, 130);

  drawHr(doc, 160, "#cbd5e1");

  // Equipment Table
  doc.rect(50, 175, 500, 20).fill("#f1f5f9");
  doc
    .fillColor("#334155")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("HARDWARE SPECIFICATIONS & SERIALS", 60, 181)
    .text("WARRANTY", 310, 181)
    .text("PRICE (BDT)", 450, 181, { align: "right", width: 90 });

  const hwItems = [
    {
      spec: "Dell PowerEdge R750xs Server (2x Intel Xeon, 128GB RAM)",
      war: "3 Yrs ProSupport",
      price: "240,000.00",
    },
    {
      spec: "Cisco Catalyst 9200L 48-Port Gigabit Switch",
      war: "Limited Lifetime",
      price: "75,000.00",
    },
    {
      spec: "APC Smart-UPS On-Line 3kVA Rackmount Battery Backup",
      war: "2 Yrs Replacement",
      price: "25,000.00",
    },
  ];

  let hy = 205;
  for (const h of hwItems) {
    doc
      .fillColor("#0f172a")
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(h.spec, 60, hy)
      .font("Helvetica")
      .text(h.war, 310, hy)
      .text(h.price, 450, hy, { align: "right", width: 90 });
    drawHr(doc, hy + 18, "#e2e8f0");
    hy += 26;
  }

  // Grand Total
  const grandHy = hy + 15;
  doc.rect(330, grandHy, 220, 35).fill("#1e293b");
  doc
    .fillColor("#ffffff")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("PAYABLE AMOUNT:", 340, grandHy + 12)
    .text("BDT 340,000.00", 430, grandHy + 12, { align: "right", width: 110 });

  doc.end();
}

// -----------------------------------------------------------------------------
// 8. Global Cloud / SaaS Subscription (Modern Receipt Layout) - PAYABLE
// -----------------------------------------------------------------------------
function generateInvoice8() {
  const filePath = path.join(dataDir, "invoice_08_saas_cloud_subscription.pdf");
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(fs.createWriteStream(filePath));

  // Purple Modern SaaS Accent
  doc.circle(70, 65, 18).fill("#7c3aed");
  doc
    .fillColor("#ffffff")
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("D", 65, 59);

  doc
    .fillColor("#0f172a")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("DataPulse Analytics Global Inc.", 100, 52);
  doc
    .fillColor("#6b7280")
    .fontSize(8)
    .font("Helvetica")
    .text("Cloud AI Infrastructure & Real-Time Telemetry API", 100, 71);

  // Receipt Details
  doc
    .fillColor("#7c3aed")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("SUBSCRIPTION INVOICE", 380, 52, { align: "right" });
  doc
    .fillColor("#374151")
    .fontSize(8)
    .font("Helvetica")
    .text("Invoice ID: DP-SUB-994101", 380, 68, { align: "right" })
    .text("Billing Period: Oct 1 - Oct 31, 2026", 380, 79, { align: "right" })
    .text("Due Date: 2026-10-15", 380, 90, { align: "right" })
    .text("Payment Method: Auto-Debit / Wire", 380, 101, { align: "right" });

  drawHr(doc, 120, "#e5e7eb");

  // Counterparty
  doc
    .fillColor("#6b7280")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("CUSTOMER / SUBSCRIBER:", 50, 135);
  doc
    .fillColor("#111827")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("CashPilot AI Platform Development Hub", 50, 148);
  doc
    .fillColor("#4b5563")
    .fontSize(8)
    .font("Helvetica")
    .text("Workspace: cashpilot-prod-cluster", 50, 161)
    .text("Plan: Enterprise Dedicated Tier", 50, 172);

  // Line items
  doc.rect(50, 195, 500, 22).fill("#f5f3ff");
  doc
    .fillColor("#6d28d9")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("SUBSCRIPTION ITEM & API USAGE", 60, 202)
    .text("TIER METRICS", 300, 202)
    .text("AMOUNT (BDT)", 440, 202, { align: "right", width: 100 });

  const saasItems = [
    {
      title: "Enterprise API Platform Seat Licenses (10 seats)",
      metrics: "Fixed Tier",
      amt: "30,000.00",
    },
    {
      title: "Distributed Redis Vector & Time-Series Data Stream (50M ops)",
      metrics: "Usage Tier",
      amt: "15,000.00",
    },
    {
      title: "Priority Support SLA (99.95% Guaranteed Uptime)",
      metrics: "Enterprise Addon",
      amt: "10,000.00",
    },
  ];

  let sy = 227;
  for (const s of saasItems) {
    doc
      .fillColor("#1f2937")
      .fontSize(8)
      .font("Helvetica")
      .text(s.title, 60, sy)
      .text(s.metrics, 300, sy)
      .font("Helvetica-Bold")
      .text(s.amt, 440, sy, { align: "right", width: 100 });
    drawHr(doc, sy + 18, "#f3f4f6");
    sy += 26;
  }

  // Total
  const totalSy = sy + 15;
  doc.rect(340, totalSy, 210, 36).fill("#7c3aed");
  doc
    .fillColor("#ffffff")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("AMOUNT PAYABLE:", 350, totalSy + 12)
    .text("BDT 55,000.00", 440, totalSy + 12, { align: "right", width: 100 });

  doc.end();
}

// Execute generation of all 8 PDF invoices
console.log("Generating 8 diverse PDF sample invoices in data/...");
generateInvoice1();
generateInvoice2();
generateInvoice3();
generateInvoice4();
generateInvoice5();
generateInvoice6();
generateInvoice7();
generateInvoice8();
console.log("All 8 PDF sample invoices generated successfully!");
