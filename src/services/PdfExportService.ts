import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ScrapbookPageData, CoupleProfile } from './StorageService';

export const PdfExportService = {
  /**
   * Generates a printable HTML document of the entire Scrapbook
   * and opens the native PDF export dialog / print menu.
   */
  async exportScrapbookToPdf(
    pages: ScrapbookPageData[],
    profile?: CoupleProfile | null
  ): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      const htmlContent = generateScrapbookHtml(pages, profile);

      if (Platform.OS === 'web') {
        // On web, Print.printAsync invokes window.print() which prints the screen layout.
        // Instead, create an isolated invisible iframe to render and print ONLY the scrapbook pages!
        if (typeof document !== 'undefined') {
          const printFrame = document.createElement('iframe');
          printFrame.style.position = 'fixed';
          printFrame.style.top = '-9999px';
          printFrame.style.left = '-9999px';
          printFrame.style.width = '1024px';
          printFrame.style.height = '1024px';
          printFrame.style.border = '0';
          printFrame.style.opacity = '0';
          printFrame.style.pointerEvents = 'none';
          printFrame.setAttribute('aria-hidden', 'true');
          document.body.appendChild(printFrame);

          const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
          if (!frameDoc) {
            throw new Error('Unable to create print document frame');
          }

          frameDoc.open();
          frameDoc.write(htmlContent);
          frameDoc.close();

          await new Promise<void>((resolve) => {
            // Allow fonts and images inside iframe to render properly
            setTimeout(() => {
              try {
                printFrame.contentWindow?.focus();
                printFrame.contentWindow?.print();
              } catch (err) {
                console.warn('Scrapbook print failed:', err);
              }
              setTimeout(() => {
                if (document.body.contains(printFrame)) {
                  document.body.removeChild(printFrame);
                }
                resolve();
              }, 1200);
            }, 600);
          });

          return { success: true };
        }
        return { success: false, error: 'Document not accessible on web' };
      } else {
        // On iOS & Android, printToFileAsync creates the local .pdf file
        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false,
        });

        // Open native sharing sheet so user can Save to Files, AirDrop, Print, or Share
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: `${profile?.userName || 'Couple'} Scrapbook Keepsake.pdf`,
          });
        }

        return { success: true, uri };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown PDF export error';
      console.warn('Scrapbook PDF export failed:', message);
      return { success: false, error: message };
    }
  },
};

/**
 * Builds high-resolution, print-ready HTML with luxury spiral scrapbook styling
 */
function generateScrapbookHtml(
  pages: ScrapbookPageData[],
  profile?: CoupleProfile | null
): string {
  const user = profile?.userName || 'You';
  const partner = profile?.partnerName || 'Partner';

  const pagesHtml = pages
    .map((page, index) => renderSinglePageHtml(page, index + 1, pages.length, profile))
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${user} & ${partner} - Couple Scrapbook</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Playfair+Display:ital,wght@0,600;0,800;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: #F8F4F0;
      color: #332228;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      page-break-after: always;
      break-after: page;
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 16mm 18mm 16mm 28mm; /* Extra left padding for spiral rings */
      background: #FAF5EF;
      overflow: hidden;
      border: 1px solid #E4D8CC;
    }

    /* Metallic Spiral Binding Column on Left Margin */
    .spiral-spine {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 6mm;
      width: 14mm;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
      padding: 12mm 0;
      z-index: 10;
    }
    .spiral-ring {
      width: 11mm;
      height: 7mm;
      border-radius: 4mm;
      background: linear-gradient(135deg, #E2E2E6 0%, #FFFFFF 35%, #9E9EA8 70%, #C4C4CC 100%);
      box-shadow: 1px 2px 4px rgba(0,0,0,0.22);
      border: 1px solid #B0B0B8;
      position: relative;
    }
    .spiral-hole {
      position: absolute;
      left: 1mm;
      top: 2mm;
      width: 2.5mm;
      height: 2.5mm;
      border-radius: 50%;
      background: #2C2628;
      box-shadow: inset 1px 1px 2px #000;
    }

    /* Inner Page Sheet */
    .sheet-card {
      flex: 1;
      background: #FFFFFF;
      border-radius: 6mm;
      border: 1.5px solid #EADBCC;
      box-shadow: 0 4mm 10mm rgba(180, 160, 145, 0.15);
      display: flex;
      flex-direction: column;
      padding: 10mm 12mm;
      position: relative;
    }

    /* Cover Page Specific Styles */
    .cover-sheet {
      background: linear-gradient(145deg, #FFF8F6 0%, #FFF0F2 50%, #FDF4E9 100%);
      align-items: center;
      justify-content: center;
      text-align: center;
      border: 3px double #FFB6C1;
    }
    .cover-tag {
      background: #FFE8EC;
      color: #E60067;
      font-weight: 800;
      font-size: 11pt;
      padding: 3mm 8mm;
      border-radius: 20mm;
      letter-spacing: 2px;
      text-transform: uppercase;
      border: 1px solid #FFBAC8;
      margin-bottom: 6mm;
    }
    .cover-title {
      font-family: 'Playfair Display', serif;
      font-size: 32pt;
      color: #2D1520;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 4mm;
    }
    .cover-names {
      font-family: 'Dancing Script', cursive;
      font-size: 36pt;
      color: #E60067;
      margin-bottom: 6mm;
    }
    .cover-meta {
      font-size: 11pt;
      color: #7A626B;
      letter-spacing: 1px;
    }

    /* Header Row */
    .page-header {
      margin-bottom: 6mm;
      position: relative;
    }
    .page-badge {
      display: inline-block;
      background: #F0E6D8;
      color: #6C5544;
      font-size: 8.5pt;
      font-weight: 800;
      padding: 1.5mm 5mm;
      border-radius: 3mm;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 2mm;
      border: 1px solid #DECFC0;
    }
    .page-title {
      font-family: 'Playfair Display', serif;
      font-size: 20pt;
      color: #2D1520;
      font-weight: 800;
      line-height: 1.2;
    }
    .page-subtitle {
      font-family: 'Dancing Script', cursive;
      font-size: 15pt;
      color: #E60067;
      margin-top: 1mm;
    }

    /* Photo Containers */
    .photo-frame {
      background: #FFFFFF;
      padding: 3.5mm;
      border-radius: 2.5mm;
      border: 1px solid #E6D8CE;
      box-shadow: 0 3mm 8mm rgba(0,0,0,0.1);
      position: relative;
      margin: 4mm 0 6mm 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .photo-img {
      width: 100%;
      height: 65mm;
      object-fit: cover;
      border-radius: 1.5mm;
      background: #F3EAE2;
    }
    .washi-tape {
      position: absolute;
      top: -3mm;
      left: 10mm;
      width: 25mm;
      height: 6mm;
      background: rgba(255, 175, 189, 0.85);
      transform: rotate(-3deg);
      border: 1px dashed rgba(255,255,255,0.7);
    }
    .washi-tape-right {
      left: auto;
      right: 10mm;
      transform: rotate(4deg);
      background: rgba(184, 226, 216, 0.85);
    }
    .photo-caption {
      font-family: 'Dancing Script', cursive;
      font-size: 13pt;
      color: #6B525C;
      margin-top: 2.5mm;
      text-align: center;
    }

    /* Dual Polaroids Layout */
    .polaroids-row {
      display: flex;
      gap: 6mm;
      margin: 4mm 0 6mm 0;
      justify-content: center;
    }
    .polaroid-box {
      flex: 1;
      background: #FFFFFF;
      padding: 3.5mm 3.5mm 5mm 3.5mm;
      border: 1px solid #E4D8CE;
      box-shadow: 0 3mm 8mm rgba(0,0,0,0.12);
      border-radius: 1.5mm;
      text-align: center;
    }
    .polaroid-img {
      width: 100%;
      height: 52mm;
      object-fit: cover;
      border-radius: 1mm;
      background: #F5EAE0;
    }

    /* Vow & Note Parchment Card */
    .note-card {
      background: #FFFDF9;
      border: 1.5px dashed #D6C4B4;
      border-radius: 3mm;
      padding: 5mm 6mm;
      position: relative;
      margin-top: auto;
    }
    .note-text {
      font-size: 10.5pt;
      line-height: 1.6;
      color: #4A3A40;
      font-style: italic;
    }
    .wax-seal {
      position: absolute;
      bottom: -3.5mm;
      right: 6mm;
      width: 10mm;
      height: 10mm;
      border-radius: 50%;
      background: radial-gradient(circle, #FF2A6D 0%, #C40045 100%);
      box-shadow: 0 1mm 3mm rgba(196, 0, 69, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 6pt;
      font-weight: 900;
    }

    /* Handwritten Letter Layout */
    .parchment-sheet {
      background: #FFFBF4;
      border: 1px solid #E8D8C8;
      border-radius: 3mm;
      padding: 6mm 8mm;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .letter-salutation {
      font-family: 'Dancing Script', cursive;
      font-size: 18pt;
      color: #A31245;
      margin-bottom: 4mm;
    }
    .letter-body {
      font-size: 11pt;
      line-height: 1.8;
      color: #382A30;
      white-space: pre-line;
      flex: 1;
      background: repeating-linear-gradient(transparent, transparent 7.5mm, #EFE2D5 7.5mm, #EFE2D5 8mm);
      padding-top: 1mm;
    }
    .letter-signoff {
      font-family: 'Dancing Script', cursive;
      font-size: 18pt;
      color: #E60067;
      text-align: right;
      margin-top: 4mm;
    }

    /* Boarding Pass Motif */
    .boarding-card {
      background: #FAF7F2;
      border: 2px dashed #D4C0B0;
      border-radius: 4mm;
      padding: 5mm 7mm;
    }
    .pass-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #E6D8CE;
      padding-bottom: 2mm;
      font-size: 9pt;
      font-weight: 800;
      color: #E60067;
      letter-spacing: 1.5px;
    }

    /* Footer Pagination */
    .page-footer {
      margin-top: 4mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #9C8690;
      border-top: 1px solid #EFE4DC;
      padding-top: 2mm;
    }
  </style>
</head>
<body>
  <!-- SCRAPBOOK CONTENT PAGES ONLY -->
  ${pagesHtml}
</body>
</html>
`;
}

function renderSinglePageHtml(
  page: ScrapbookPageData,
  pageNum: number,
  totalPages: number,
  _profile?: CoupleProfile | null
): string {
  let bodyContent = '';

  switch (page.templateType) {
    case 'polaroid_collage': {
      const hasPhoto1 = !!page.photoUri1;
      const hasPhoto2 = !!page.photoUri2;
      const polaroidsHtml = (hasPhoto1 || hasPhoto2) ? `
        <div class="polaroids-row">
          ${hasPhoto1 ? `
            <div class="polaroid-box" style="transform: rotate(-2deg);">
              <div class="washi-tape"></div>
              <img src="${page.photoUri1}" class="polaroid-img" alt="Photo 1" />
              ${page.caption1 ? `<div class="photo-caption">${escapeHtml(page.caption1)}</div>` : ''}
            </div>
          ` : ''}
          ${hasPhoto2 ? `
            <div class="polaroid-box" style="transform: rotate(2.5deg);">
              <div class="washi-tape washi-tape-right"></div>
              <img src="${page.photoUri2}" class="polaroid-img" alt="Photo 2" />
              ${page.caption2 ? `<div class="photo-caption">${escapeHtml(page.caption2)}</div>` : ''}
            </div>
          ` : ''}
        </div>
      ` : '';

      const noteHtml = page.bodyText ? `
        <div class="note-card">
          <div class="note-text">"${escapeHtml(page.bodyText)}"</div>
          <div class="wax-seal">LOVE</div>
        </div>
      ` : '';

      bodyContent = `${polaroidsHtml}${noteHtml}`;
      break;
    }

    case 'handwritten_letter':
      bodyContent = `
        <div class="parchment-sheet">
          ${page.salutation ? `<div class="letter-salutation">${escapeHtml(page.salutation)}</div>` : ''}
          ${page.bodyText ? `<div class="letter-body">${escapeHtml(page.bodyText)}</div>` : ''}
          ${page.signature ? `<div class="letter-signoff">${escapeHtml(page.signature)}</div>` : ''}
        </div>
      `;
      break;

    case 'adventure_ticket':
      bodyContent = `
        <div class="boarding-card">
          <div class="pass-header">
            <span>✈️ COUPLE BOARDING PASS</span>
            <span>GATE: FOREVER</span>
          </div>
          ${page.photoUri1 ? `
            <div class="photo-frame" style="margin-top: 3mm;">
              <img src="${page.photoUri1}" class="photo-img" alt="Trip Photo" style="height: 60mm;" />
              ${page.caption1 ? `<div class="photo-caption">${escapeHtml(page.caption1)}</div>` : ''}
            </div>
          ` : ''}
          ${page.bodyText ? `<div class="note-text" style="margin-top: 3mm;">${escapeHtml(page.bodyText)}</div>` : ''}
        </div>
      `;
      break;

    case 'midnight_whispers':
      bodyContent = `
        <div style="background: linear-gradient(145deg, #1A0D2E 0%, #2B1545 100%); padding: 6mm 8mm; border-radius: 4mm; color: #FFFFFF; flex: 1; display: flex; flex-direction: column;">
          <div style="text-align: center; font-size: 14pt; margin-bottom: 2mm;">✨ 🌌 ✨</div>
          ${page.photoUri1 ? `
            <div class="photo-frame" style="background: #25133D; border-color: #4D2B75; margin-bottom: 4mm;">
              <img src="${page.photoUri1}" class="photo-img" alt="Midnight Photo" style="height: 60mm;" />
              ${page.caption1 ? `<div class="photo-caption" style="color: #FFB8C6;">${escapeHtml(page.caption1)}</div>` : ''}
            </div>
          ` : ''}
          ${page.bodyText ? `
            <div style="font-size: 11pt; line-height: 1.7; color: #FFD2DC; font-style: italic; flex: 1;">
              ${escapeHtml(page.bodyText)}
            </div>
          ` : ''}
        </div>
      `;
      break;

    case 'butterfly_pressed':
    case 'milestone_cover':
    default:
      bodyContent = `
        ${page.photoUri1 ? `
          <div class="photo-frame">
            <div class="washi-tape"></div>
            <div class="washi-tape washi-tape-right"></div>
            <img src="${page.photoUri1}" class="photo-img" alt="Scrapbook Photo" />
            ${page.caption1 ? `<div class="photo-caption">${escapeHtml(page.caption1)}</div>` : ''}
          </div>
        ` : ''}
        ${page.bodyText ? `
          <div class="note-card">
            <div class="note-text">"${escapeHtml(page.bodyText)}"</div>
            <div class="wax-seal">❤</div>
          </div>
        ` : ''}
      `;
      break;
  }

  return `
  <div class="page-container">
    <div class="spiral-spine">
      ${Array(14).fill('<div class="spiral-ring"><div class="spiral-hole"></div></div>').join('')}
    </div>
    <div class="sheet-card">
      <div class="page-header">
        ${page.dateStr ? `<div class="page-badge">${escapeHtml(page.dateStr)}</div>` : ''}
        ${page.title ? `<div class="page-title">${escapeHtml(page.title)}</div>` : `<div class="page-title" style="color: #6C5544; font-style: italic;">Scrapbook Page ${pageNum}</div>`}
        ${page.subtitle ? `<div class="page-subtitle">${escapeHtml(page.subtitle)}</div>` : ''}
      </div>

      ${bodyContent}

      <div class="page-footer">
        <span>Couplesify Keepsake Edition</span>
        <span>Page ${pageNum} of ${totalPages}</span>
      </div>
    </div>
  </div>
  `;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default PdfExportService;
