/**
 * Inspirify - Canvas Quote Card Image Exporter
 * Generates high-definition downloadable quote cards for social sharing.
 */

window.QuoteCanvasExporter = {
  exportQuoteCard: function(quoteData) {
    const canvas = document.getElementById('quoteExportCanvas') || document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 1200 x 700 dimensions
    const width = 1200;
    const height = 700;
    canvas.width = width;
    canvas.height = height;

    // Background: Deep gradient mesh
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0a0d18');
    bgGradient.addColorStop(0.5, '#13182c');
    bgGradient.addColorStop(1, '#090b14');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle decorative glow orbs
    const glow1 = ctx.createRadialGradient(200, 150, 10, 200, 150, 400);
    glow1.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(1000, 550, 10, 1000, 550, 450);
    glow2.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // Inner Card Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, width - 100, height - 100);

    // Decorative Quotation Symbol
    ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.font = 'bold 120px "Playfair Display", Georgia, serif';
    ctx.fillText('“', 90, 170);

    // Topic Pill Badge
    const topic = quoteData.topic || 'General';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    const pillText = topic.toUpperCase();
    const pillWidth = ctx.measureText(pillText).width + 36;
    const pillX = width - 90 - pillWidth;
    const pillY = 95;

    // Pill background
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, 32, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(pillText, pillX + 18, pillY + 22);

    // Text Word Wrapping for Quote
    ctx.font = '500 36px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#f8fafc';
    const maxTextWidth = width - 220;
    const words = (quoteData.text || '').split(' ');
    let lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && i > 0) {
        lines.push(currentLine.trim());
        currentLine = words[i] + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine.trim());

    // Calculate Y start to vertically center text
    const lineHeight = 52;
    const totalTextHeight = lines.length * lineHeight;
    let textStartY = 240;
    if (lines.length <= 3) {
      textStartY = 270;
    }

    lines.forEach((line, index) => {
      ctx.fillText(`“${index === 0 ? '' : ''}${line}${index === lines.length - 1 ? '”' : ''}`, 110, textStartY + (index * lineHeight));
    });

    // Author Row
    const authorY = Math.max(textStartY + totalTextHeight + 40, height - 160);
    
    // Accent horizontal line
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, authorY);
    ctx.lineTo(160, authorY);
    ctx.stroke();

    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(quoteData.author || 'Unknown', 180, authorY + 8);

    // Watermark / Brand in bottom right
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('⚡ Inspirify Vault', width - 250, height - 90);

    // Trigger download
    const link = document.createElement('a');
    link.download = `inspirify-quote-${(quoteData.author || 'quote').toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
};
