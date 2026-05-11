import PDFDocument from "pdfkit";

const OWNER_INFO = {
  name: "Jonathan Pineda",
  businessName: "ANAIA'S MOTORCYCLE RENTAL",
  address: "Bk14 Lt8 Ph2 Lily St. Soldier's Hills IV, Molino VI, Bacoor Cavite",
  phone: "09171422830/09176231426",
  email: "jpineda132020@gmail.com",
};

// ── Brand Colors ──────────────────────────────────────────────────────────────
const COLORS = {
  dark: "#171717",
  mid: "#171717",
  accent: "#b50002",
  lightBg: "#F5F5F5",
  renterBg: "#FDEAED",
  subtle: "#CCCCCC",
  white: "#FFFFFF",
  grey: "#888888",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (amount) =>
  `PHP ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (time) => {
  if (!time) return "N/A";
  const [h = "0", m = "00"] = String(time).split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:${String(minute).padStart(2, "0")} ${period}`;
};

const deriveColorFromUnitId = (unitId) => {
  if (!unitId) return "TBD";
  const parts = String(unitId)
    .split("-")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) return "TBD";
  return parts
    .slice(1, parts.length - 1)
    .join("-")
    .toUpperCase();
};

// ── Page constants ────────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const MARGIN = 40;
const CONTENT = PAGE_W - 2 * MARGIN;

// ── Drawing utilities ─────────────────────────────────────────────────────────
const fillRect = (doc, x, y, w, h, color) => {
  doc.save().rect(x, y, w, h).fill(color).restore();
};

const strokeRect = (doc, x, y, w, h, color, lw = 0.5) => {
  doc.save().lineWidth(lw).rect(x, y, w, h).stroke(color).restore();
};

const ensureSpace = (doc, needed = 60) => {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
};

// ── Hero Header ───────────────────────────────────────────────────────────────
const addHeroHeader = (doc) => {
  const x = MARGIN,
    y = MARGIN,
    w = CONTENT;

  const nameH = doc
    .fontSize(13)
    .heightOfString(OWNER_INFO.businessName, { width: w });
  const addrH = doc
    .fontSize(7.5)
    .heightOfString(OWNER_INFO.address, { width: w });
  const telH = doc
    .fontSize(7.5)
    .heightOfString(`Tel: ${OWNER_INFO.phone}  |  ${OWNER_INFO.email}`, {
      width: w,
    });
  const bannerH = nameH + addrH + telH + 20;

  fillRect(doc, x, y, w, bannerH, COLORS.dark);

  let ty = y + 10;
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor(COLORS.white)
    .text(OWNER_INFO.businessName, x, ty, { align: "center", width: w });
  ty += nameH + 2;
  doc
    .fontSize(7.5)
    .font("Helvetica")
    .fillColor(COLORS.white)
    .text(OWNER_INFO.address, x, ty, { align: "center", width: w });
  ty += addrH + 2;
  doc
    .fontSize(7.5)
    .font("Helvetica")
    .fillColor(COLORS.white)
    .text(`Tel: ${OWNER_INFO.phone}  |  ${OWNER_INFO.email}`, x, ty, {
      align: "center",
      width: w,
    });

  doc.y = y + bannerH + 4;
};

// ── Title Band ────────────────────────────────────────────────────────────────
const addTitleBand = (doc, title) => {
  const bandH = 22,
    y = doc.y;
  fillRect(doc, MARGIN, y, CONTENT, bandH, COLORS.accent);
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(COLORS.white)
    .text(title, MARGIN, y + 5, { align: "center", width: CONTENT });
  doc.y = y + bandH + 6;
};

// ── Section Heading ───────────────────────────────────────────────────────────
const addSection = (doc, title) => {
  ensureSpace(doc, 50);
  doc.moveDown(0.3);
  const y = doc.y,
    barH = 15;
  fillRect(doc, MARGIN, y, 3, barH, COLORS.accent);
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(COLORS.dark)
    .text(title, MARGIN + 7, y + 2, { width: CONTENT - 7 });
  doc.moveDown(0.35);
};

// ── Parties Box ───────────────────────────────────────────────────────────────
// Pre-measures every row so the box is always tall enough and text never overflows
const addPartiesBox = (doc, leftRows, rightRows) => {
  const colW = (CONTENT - 6) / 2;
  const padX = 8,
    padY = 6,
    fs = 8,
    lineGap = 3;

  const measureRows = (rows, cw) =>
    rows.map(
      ([label, value]) =>
        doc
          .fontSize(fs)
          .heightOfString(`${label} ${value || "N/A"}`, {
            width: cw - padX * 2,
          }) + lineGap,
    );

  const lh = measureRows(leftRows, colW);
  const rh = measureRows(rightRows, colW);
  const boxH = Math.max(
    lh.reduce((a, b) => a + b, 0) + padY * 2,
    rh.reduce((a, b) => a + b, 0) + padY * 2,
  );

  ensureSpace(doc, boxH + 10);
  const y = doc.y;

  fillRect(doc, MARGIN, y, colW, boxH, COLORS.lightBg);
  fillRect(doc, MARGIN + colW + 6, y, colW, boxH, COLORS.renterBg);
  strokeRect(doc, MARGIN, y, colW, boxH, COLORS.subtle);
  strokeRect(doc, MARGIN + colW + 6, y, colW, boxH, "#F5C6CB");

  const drawRows = (rows, heights, startX) => {
    let ty = y + padY;
    rows.forEach(([label, value], i) => {
      doc
        .fontSize(fs)
        .font("Helvetica-Bold")
        .fillColor(COLORS.dark)
        .text(`${label} `, startX + padX, ty, {
          continued: true,
          width: colW - padX * 2,
        })
        .font("Helvetica")
        .text(value || "N/A", { width: colW - padX * 2 });
      ty += heights[i];
    });
  };

  drawRows(leftRows, lh, MARGIN);
  drawRows(rightRows, rh, MARGIN + colW + 6);

  doc.y = y + boxH + 6;
};

// ── Unit Grid ─────────────────────────────────────────────────────────────────
const addUnitGrid = (doc, rows) => {
  const cellH = 18,
    cellW = CONTENT / 4;
  ensureSpace(doc, rows.length * cellH + 10);
  const startY = doc.y;

  rows.forEach((cols, ri) => {
    const y = startY + ri * cellH;
    const bg = ri % 2 === 0 ? COLORS.lightBg : COLORS.white;
    for (let ci = 0; ci < 4; ci++) {
      fillRect(doc, MARGIN + ci * cellW, y, cellW, cellH, bg);
      strokeRect(doc, MARGIN + ci * cellW, y, cellW, cellH, COLORS.subtle, 0.3);
    }
    strokeRect(doc, MARGIN, y, CONTENT, cellH, COLORS.subtle, 0.5);
    cols.forEach((text, ci) => {
      doc
        .fontSize(8.5)
        .font(ci % 2 === 0 ? "Helvetica-Bold" : "Helvetica")
        .fillColor(COLORS.dark)
        .text(String(text || "N/A"), MARGIN + ci * cellW + 7, y + 4, {
          width: cellW - 14,
          ellipsis: true,
          lineBreak: false,
        });
    });
  });

  doc.y = startY + rows.length * cellH + 4;
};

// ── Period Table (returns bottom Y) ──────────────────────────────────────────
const drawPeriodTable = (doc, x, tableW, rows, startY) => {
  const labelW = 62,
    padX = 7,
    padY = 3,
    fs = 8;
  const valW = tableW - labelW - padX;

  const heights = rows.map(
    ({ label, value }) =>
      Math.max(
        doc.fontSize(fs).heightOfString(label, { width: labelW - padX }),
        doc
          .fontSize(fs)
          .heightOfString(String(value || "N/A"), { width: valW }),
      ) +
      padY * 2 +
      2,
  );

  let ty = startY;
  rows.forEach(({ label, value }, i) => {
    const cellH = heights[i];
    const bg = i % 2 === 0 ? COLORS.lightBg : COLORS.white;
    fillRect(doc, x, ty, tableW, cellH, bg);
    strokeRect(doc, x, ty, tableW, cellH, COLORS.subtle, 0.3);
    doc
      .fontSize(fs)
      .font("Helvetica-Bold")
      .fillColor(COLORS.dark)
      .text(label, x + padX, ty + padY, {
        width: labelW - padX,
        lineBreak: false,
      });
    doc
      .fontSize(fs)
      .font("Helvetica")
      .fillColor(COLORS.dark)
      .text(String(value || "N/A"), x + labelW, ty + padY, { width: valW });
    ty += cellH;
  });

  return ty;
};

// ── Fee Table (returns bottom Y) ─────────────────────────────────────────────
const drawFeeTable = (doc, x, tableW, feeRows, startY) => {
  const col1W = tableW * 0.65,
    col2W = tableW * 0.35;
  const cellH = 17,
    padX = 7,
    padY = 4;

  let ty = startY;
  feeRows.forEach((row, i) => {
    let bg = i % 2 === 0 ? COLORS.lightBg : COLORS.white;
    let fg = COLORS.dark,
      font = "Helvetica";
    if (row.isHeader) {
      bg = COLORS.mid;
      fg = COLORS.white;
      font = "Helvetica-Bold";
    }
    if (row.isTotal) {
      bg = COLORS.accent;
      fg = COLORS.white;
      font = "Helvetica-Bold";
    }

    fillRect(doc, x, ty, col1W, cellH, bg);
    fillRect(doc, x + col1W, ty, col2W, cellH, bg);
    strokeRect(doc, x, ty, tableW, cellH, COLORS.subtle, 0.3);

    doc
      .fontSize(8.5)
      .font(font)
      .fillColor(fg)
      .text(row.label, x + padX, ty + padY, {
        width: col1W - padX * 2,
        lineBreak: false,
        ellipsis: true,
      })
      .text(row.amount, x + col1W + padX, ty + padY, {
        width: col2W - padX * 2,
        lineBreak: false,
      });
    ty += cellH;
  });

  return ty;
};

// ── Terms & Conditions ────────────────────────────────────────────────────────
const addTerms = (doc, terms) => {
  const numW = 14,
    padY = 3,
    fs = 8;
  const textW = CONTENT - numW;

  terms.forEach(({ num, text }, i) => {
    const rowH =
      doc.fontSize(fs).heightOfString(text, { width: textW - 4 }) +
      padY * 2 +
      2;
    ensureSpace(doc, rowH + 2);
    const y = doc.y;
    const bg = i % 2 === 0 ? COLORS.renterBg : COLORS.white;
    fillRect(doc, MARGIN, y, CONTENT, rowH, bg);
    doc
      .fontSize(fs)
      .font("Helvetica-Bold")
      .fillColor(COLORS.accent)
      .text(num, MARGIN + 2, y + padY, { width: numW, lineBreak: false });
    doc
      .fontSize(fs)
      .font("Helvetica")
      .fillColor(COLORS.dark)
      .text(text, MARGIN + numW, y + padY, { width: textW - 4 });
    doc.y = y + rowH + 1;
  });
};

// ── Signatures ────────────────────────────────────────────────────────────────
const addSignatures = (doc, ownerName, renterName) => {
  ensureSpace(doc, 110);
  const bandH = 20,
    bandY = doc.y;
  fillRect(doc, MARGIN, bandY, CONTENT, bandH, COLORS.mid);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(COLORS.white)
    .text("AGREEMENT & SIGNATURES", MARGIN, bandY + 5, {
      align: "center",
      width: CONTENT,
    });
  doc.y = bandY + bandH + 8;

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(COLORS.grey)
    .text(
      "By signing below, both parties acknowledge they have read, understood, and agreed to all terms of this agreement.",
      MARGIN,
      doc.y,
      { width: CONTENT, align: "center" },
    );
  doc.moveDown(0.8);

  const colW = (CONTENT - 20) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 20;
  const baseY = doc.y;

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(COLORS.dark)
    .text("OWNER / LESSOR", leftX, baseY)
    .text("RENTER / LESSEE", rightX, baseY);
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(COLORS.grey)
    .text("Signature over Printed Name", leftX, baseY + 13)
    .text("Signature over Printed Name", rightX, baseY + 13);

  const lineY = baseY + 46;
  doc
    .save()
    .moveTo(leftX, lineY)
    .lineTo(leftX + colW, lineY)
    .lineWidth(1)
    .stroke(COLORS.accent)
    .restore();
  doc
    .save()
    .moveTo(rightX, lineY)
    .lineTo(rightX + colW, lineY)
    .lineWidth(1)
    .stroke(COLORS.accent)
    .restore();

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(COLORS.dark)
    .text(ownerName, leftX, lineY + 5)
    .text(renterName, rightX, lineY + 5);
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(COLORS.grey)
    .text(`Owner, ${OWNER_INFO.businessName}`, leftX, lineY + 17)
    .text("Renter", rightX, lineY + 17);

  const dateY = lineY + 34;
  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor(COLORS.dark)
    .text("Date: ____________________", leftX, dateY)
    .text("Date: ____________________", rightX, dateY);

  doc.y = dateY + 18;
};

// ── Footer ────────────────────────────────────────────────────────────────────
const addFooter = (doc) => {
  doc.moveDown(0.5);
  doc
    .save()
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + CONTENT, doc.y)
    .lineWidth(0.5)
    .stroke(COLORS.subtle)
    .restore();
  doc.moveDown(0.3);
  doc
    .fontSize(7)
    .font("Helvetica")
    .fillColor(COLORS.grey)
    .text(
      `${OWNER_INFO.businessName}  |  ${OWNER_INFO.address}  |  ${OWNER_INFO.phone}`,
      MARGIN,
      doc.y,
      { align: "center", width: CONTENT },
    );
};

// ── Main Export ───────────────────────────────────────────────────────────────
export const generateRentalAgreementPDF = (booking) => {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
  });

  try {
    const motorcycle = booking.motorcycle || {};
    const bookingDetails = booking.details || {};
    const addr = booking.address || {};

    const fullAddr =
      [addr.street, addr.barangay, addr.city, addr.region, addr.zipCode]
        .filter(Boolean)
        .join(", ") || "N/A";

    const pickupDate = formatDate(booking.pickupDate);
    const returnDate = formatDate(booking.returnDate);
    const pickupTime = formatTime(booking.pickupTime || "08:00");
    const returnTime = formatTime(booking.returnTime || "08:00");
    const derivedColor = deriveColorFromUnitId(motorcycle.unitId);

    // 1. Hero
    addHeroHeader(doc);

    // 2. Title
    addTitleBand(doc, "MOTORCYCLE LEASE AGREEMENT");

    // 3. Meta
    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(COLORS.dark)
      .text("Date of Agreement: ____________________", MARGIN, doc.y, {
        continued: true,
        width: CONTENT,
      })
      .text("MLA No.: ____________________", { align: "right" });
    doc.moveDown(0.4);

    // 4. Parties
    addSection(doc, "PARTIES TO THE AGREEMENT");
    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(COLORS.dark)
      .text(
        "This Motorcycle Lease Agreement is entered into as of ____________________, by and between:",
        MARGIN,
        doc.y,
        { width: CONTENT },
      );
    doc.moveDown(0.35);

    addPartiesBox(
      doc,
      [
        ["Owner:", OWNER_INFO.name],
        ["Business:", OWNER_INFO.businessName],
        ["Address:", OWNER_INFO.address],
        ["Phone:", OWNER_INFO.phone],
        ["Email:", OWNER_INFO.email],
      ],
      [
        ["Renter:", booking.customer || "N/A"],
        ["Email:", booking.email || "N/A"],
        ["Phone:", booking.phone || "N/A"],
        ["Address:", fullAddr],
      ],
    );

    // 5. Rental Unit
    addSection(doc, "RENTAL UNIT");
    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(COLORS.dark)
      .text(
        "The Owner agrees to rent the motorcycle identified as follows:",
        MARGIN,
        doc.y,
        { width: CONTENT },
      );
    doc.moveDown(0.3);

    addUnitGrid(doc, [
      [
        "Make & Model",
        `${motorcycle.make || "N/A"} ${motorcycle.model || ""}`.trim(),
        "Year",
        motorcycle.year ? String(motorcycle.year) : "N/A",
      ],
      [
        "Color",
        derivedColor,
        "Engine Size",
        motorcycle.engineSize ? `${motorcycle.engineSize}cc` : "N/A",
      ],
      ["Plate / Unit", motorcycle.unitId || "TBD", "Condition", "Good"],
    ]);

    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor(COLORS.grey)
      .text(
        "The Renter acknowledges the motorcycle's condition and agrees to all terms herein.",
        MARGIN,
        doc.y,
        { width: CONTENT },
      );
    doc.moveDown(0.4);

    // 6. Rental Period & Fees
    addSection(doc, "RENTAL PERIOD & FEES");

    const halfW = (CONTENT - 6) / 2;
    const sectionStartY = doc.y;

    const periodRows = [
      { label: "Pickup", value: `${pickupDate} at ${pickupTime}` },
      { label: "Return", value: `${returnDate} at ${returnTime}` },
      { label: "Destination", value: booking.destination || "N/A" },
    ];
    if (bookingDetails.pickupLocation) {
      periodRows.push({
        label: "Pickup Loc.",
        value: bookingDetails.pickupLocation,
      });
    }

    const feeRows = [
      { label: "Description", amount: "Amount", isHeader: true },
      {
        label:
          `Daily Rate (${motorcycle.make || ""} ${motorcycle.model || ""})`.trim(),
        amount: formatCurrency(motorcycle.dailyRate || 0),
      },
    ];
    if (booking.reservationFee)
      feeRows.push({
        label: "Reservation Fee",
        amount: formatCurrency(booking.reservationFee),
      });
    if (bookingDetails.helmetFee)
      feeRows.push({
        label: "Helmet Fee",
        amount: formatCurrency(bookingDetails.helmetFee),
      });
    if (bookingDetails.distanceFee)
      feeRows.push({
        label: "Distance Fee",
        amount: formatCurrency(bookingDetails.distanceFee),
      });
    feeRows.push({
      label: "TOTAL AMOUNT DUE",
      amount: formatCurrency(booking.amount || 0),
      isTotal: true,
    });

    const leftBottom = drawPeriodTable(
      doc,
      MARGIN,
      halfW,
      periodRows,
      sectionStartY,
    );
    const rightBottom = drawFeeTable(
      doc,
      MARGIN + halfW + 6,
      halfW,
      feeRows,
      sectionStartY,
    );

    doc.y = Math.max(leftBottom, rightBottom) + 4;

    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fillColor(COLORS.grey)
      .text(
        "All fees are due in full before or upon pickup. Payment methods accepted: Cash, GCash, PayMaya, Bank Transfer.",
        MARGIN,
        doc.y,
        { width: CONTENT },
      );
    doc.moveDown(0.4);

    // 7. Terms
    addSection(doc, "TERMS AND CONDITIONS");
    addTerms(doc, [
      {
        num: "1.",
        text: "The Renter shall maintain the motorcycle in good condition throughout the rental period.",
      },
      {
        num: "2.",
        text: "The Renter is responsible for any damage or loss that may occur during the rental period.",
      },
      {
        num: "3.",
        text: "The motorcycle must be returned on time and in the same condition as at the time of pickup.",
      },
      {
        num: "4.",
        text: "Fuel tank should be returned full. Any shortage will be charged accordingly.",
      },
      {
        num: "5.",
        text: "The Renter agrees not to allow any third party to use the motorcycle without prior written consent.",
      },
      {
        num: "6.",
        text: "The Renter must comply with all traffic laws and regulations at all times.",
      },
      {
        num: "7.",
        text: "The Renter is solely responsible for any personal belongings left in the motorcycle.",
      },
      {
        num: "8.",
        text: "The Renter must report any accidents or damage immediately to the Owner.",
      },
      {
        num: "9.",
        text: "Late return will incur additional charges at the daily rate or PHP 500/hour, whichever applies.",
      },
    ]);
    doc.moveDown(0.4);

    // 8. Signatures
    addSignatures(doc, OWNER_INFO.name, booking.customer || "Renter Name");

    // 9. Footer
    addFooter(doc);

    return doc;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};
