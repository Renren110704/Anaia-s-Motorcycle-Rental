import PDFDocument from 'pdfkit';

const OWNER_INFO = {
  name: 'Jonathan Pineda',
  businessName: "ANAIA'S MOTORCYCLE RENTAL",
  address: "Bk14 Lt8 Ph2 Lily St. Soldier's Hills IV, Molino VI, Bacoor Cavite",
  phone: '09171422830/09176231426',
  email: 'jpineda132020@gmail.com'
};

const formatCurrency = (amount) => {
  return `PHP ${Number(amount || 0).toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })}`;
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric' 
  });
};

const formatTime = (time) => {
  if (!time) return '';
  const [h = '0', m = '00'] = String(time).split(':');
  const hour = Number(h);
  const minute = Number(m);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const period = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:${String(minute).padStart(2, '0')} ${period}`;
};

const deriveColorFromUnitId = (unitId) => {
  if (!unitId) return 'TBD';
  const parts = String(unitId)
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return 'TBD';
  return parts.slice(1, parts.length - 1).join('-').toUpperCase();
};

const ensureSpace = (doc, minSpace = 70) => {
  const limit = doc.page.height - doc.page.margins.bottom;
  if (doc.y + minSpace > limit) {
    doc.addPage();
  }
};

const addHeader = (doc, title) => {
  doc.fontSize(15).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica-Bold').text(OWNER_INFO.businessName, { align: 'center' });
  doc.fontSize(8).text(`${OWNER_INFO.address}`, { align: 'center' });
  doc.fontSize(8).text(`Phone: ${OWNER_INFO.phone}`, { align: 'center' });
  doc.fontSize(8).text(`Email: ${OWNER_INFO.email}`, { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.4);
};

const addSection = (doc, title) => {
  ensureSpace(doc, 45);
  doc.moveDown(0.35);
  doc.fontSize(11).font('Helvetica-Bold').text(title);
  doc.moveTo(40, doc.y + 1).lineTo(230, doc.y + 1).stroke();
  doc.moveDown(0.35);
};

const addLabel = (doc, label, value) => {
  ensureSpace(doc, 24);
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(`${label} `, { continued: true, width: 515 })
    .font('Helvetica')
    .text(value || 'N/A', { width: 515 });
};

const addDetailRow = (doc, label, value) => {
  ensureSpace(doc, 22);
  doc
    .fontSize(9)
    .font('Helvetica')
    .text(`${label}: `, { continued: true, width: 515 })
    .font('Helvetica-Bold')
    .text(value || 'N/A', { width: 515 });
};

export const generateRentalAgreementPDF = (booking) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true
  });

  try {
    // ── Header ──
    addHeader(doc, 'MOTORCYCLE LEASE AGREEMENT');

    const agreementDate = '';
    doc.fontSize(9).font('Helvetica').text('Date of Agreement: ____________________');
    doc.fontSize(9).font('Helvetica').text('MLA No.: ____________________', { align: 'right' });
    doc.moveDown(0.2);

    // ── Parties ──
    addSection(doc, 'PARTIES TO THE AGREEMENT');
    doc.fontSize(9).text(
      `This Motorcycle Lease Agreement is made and entered into as of ____________________, by and between:`,
      { align: 'left', width: 515 }
    );
    doc.moveDown(0.35);

    // Owner information
    addLabel(doc, 'OWNER:', OWNER_INFO.name);
    addLabel(doc, 'Address:', OWNER_INFO.address);
    addLabel(doc, 'Phone:', OWNER_INFO.phone);
    addLabel(doc, 'Email:', OWNER_INFO.email);
    doc.moveDown(0.25);

    // Renter information
    addLabel(doc, 'RENTER:', booking.customer);
    addLabel(doc, 'Email:', booking.email);
    addLabel(doc, 'Phone:', booking.phone);
    if (booking.address) {
      const addr = booking.address;
      const fullAddr = [addr.street, addr.barangay, addr.city, addr.region, addr.zipCode]
        .filter(Boolean)
        .join(', ');
      addLabel(doc, 'Address:', fullAddr || 'N/A');
    } else {
      addLabel(doc, 'Address:', 'N/A');
    }

    // ── Rental Unit ──
    addSection(doc, 'RENTAL UNIT');
    doc.fontSize(9).font('Helvetica').text(
      'The Owner hereby agrees to lend or rent a motorcycle identified as follows:',
      { width: 515 }
    );
    doc.moveDown(0.3);

    const motorcycle = booking.motorcycle || {};
    const derivedColor = deriveColorFromUnitId(motorcycle.unitId);
    addDetailRow(doc, 'Make and Model', `${motorcycle.make || 'N/A'} ${motorcycle.model || ''}`);
    addDetailRow(doc, 'Year', motorcycle.year ? String(motorcycle.year) : 'N/A');
    addDetailRow(doc, 'Color', derivedColor);
    addDetailRow(doc, 'Plate Number', motorcycle.unitId || 'TBD');
    addDetailRow(doc, 'Engine Size', motorcycle.engineSize ? `${motorcycle.engineSize}cc` : 'N/A');
    addDetailRow(doc, 'Overall Condition', 'Good');

    doc.moveDown(0.25);
    doc.fontSize(8).text(
      'The Renter acknowledges the motorcycle\'s state and condition and agrees to the following terms and conditions:',
      { width: 515, italic: true }
    );

    // ── Rental Fees ──
    addSection(doc, 'RENTAL FEES');
    
    const pickupDate = formatDate(booking.pickupDate);
    const returnDate = formatDate(booking.returnDate);
    const dailyRate = motorcycle.dailyRate || 0;
    
    addDetailRow(doc, 'Daily Rate', formatCurrency(dailyRate));
    addDetailRow(doc, 'Pickup Date', pickupDate);
    addDetailRow(doc, 'Return Date', returnDate);
    
    doc.moveDown(0.2);
    
    const bookingDetails = booking.details || {};
    const totalAmount = booking.amount || 0;
    
    // Fees breakdown
    if (booking.reservationFee) {
      addDetailRow(doc, 'Reservation Fee', formatCurrency(booking.reservationFee));
    }
    if (bookingDetails.helmetFee) {
      addDetailRow(doc, 'Helmet Fee', formatCurrency(bookingDetails.helmetFee));
    }
    if (bookingDetails.distanceFee) {
      addDetailRow(doc, 'Distance Fee', formatCurrency(bookingDetails.distanceFee));
    }
    
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica-Bold').text(
      `TOTAL AMOUNT DUE: ${formatCurrency(totalAmount)}`,
      { width: 515 }
    );

    // ── Payment Terms ──
    addSection(doc, 'PAYMENT TERMS');
    const paymentMethod = booking.paymentMethod || 'Cash';
    doc.fontSize(9).font('Helvetica').text(`Payment Method: ${paymentMethod}`, { width: 515 });
    doc.moveDown(0.2);
    doc.fontSize(8).text(
      'Full payment shall be paid upon the execution of this contract. ' +
      'Failure to pay on time will be subjected to late payment charge of 5% on the amount due.',
      { width: 515, italic: true }
    );

    // ── Rental Period ──
    addSection(doc, 'RENTAL PERIOD');
    const pickupTime = booking.pickupTime || '08:00';
    const returnTime = booking.returnTime || '08:00';
    addDetailRow(doc, 'Pickup Date & Time', `${pickupDate} at ${formatTime(pickupTime)}`);
    addDetailRow(doc, 'Return Date & Time', `${returnDate} at ${formatTime(returnTime)}`);
    addDetailRow(doc, 'Destination', booking.destination || 'N/A');
    if (bookingDetails.pickupLocation) {
      addDetailRow(doc, 'Pickup Location', bookingDetails.pickupLocation);
    }

    // ── Terms and Conditions ──
    addSection(doc, 'TERMS AND CONDITIONS');
    
    const termsText = [
      '1. The Renter shall maintain the motorcycle in good condition throughout the rental period.',
      '2. The Renter is responsible for any damage or loss that may occur during the rental period.',
      '3. The motorcycle must be returned on time and in the same condition as at the time of pickup.',
      '4. Fuel tank should be returned full. Any shortage will be charged.',
      '5. The Renter agrees not to allow any third party to use the motorcycle without prior written consent.',
      '6. The Renter must comply with all traffic laws and regulations.',
      '7. The Renter is solely responsible for any personal belongings left in the motorcycle.',
      '8. The Renter must report any accidents or damage immediately to the Owner.',
      '9. Late return of the motorcycle will incur additional charges at the daily rate or PHP 500/hour, whichever is applicable.'
    ];

    termsText.forEach(term => {
      ensureSpace(doc, 20);
      doc.fontSize(8).font('Helvetica').text(term, { width: 515, align: 'left' });
      doc.moveDown(0.1);
    });

    // ── Signatures ──
    ensureSpace(doc, 120);
    doc.moveDown(0.8);
    const sigTop = doc.y;

    doc.fontSize(9).font('Helvetica-Bold').text('OWNER:', 50, sigTop);
    doc.fontSize(9).font('Helvetica-Bold').text('RENTER:', 330, sigTop);

    const lineY = sigTop + 32;
    doc.moveTo(50, lineY).lineTo(240, lineY).stroke();
    doc.moveTo(330, lineY).lineTo(520, lineY).stroke();

    doc.fontSize(8).font('Helvetica').text(OWNER_INFO.name, 50, lineY + 6);
    doc.fontSize(8).font('Helvetica').text(booking.customer || 'Renter Name', 330, lineY + 6);

    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
