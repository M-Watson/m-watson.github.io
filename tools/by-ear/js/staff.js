// Crisp SVG Treble Staff Renderer for By Ear Flashcards

(function (global) {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function renderStaff(container, staffGroups) {
    container.innerHTML = "";

    const width = 360;
    const height = 155;
    const stepHeight = 6.5;
    const stepZeroY = 116; // C4 (step 0)

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "staff-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Musical staff notation");

    const staffLeft = 24;
    const staffRight = width - 24;

    for (let s = 2; s <= 10; s += 2) {
      const y = stepZeroY - s * stepHeight;
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", staffLeft);
      line.setAttribute("y1", y);
      line.setAttribute("x2", staffRight);
      line.setAttribute("y2", y);
      line.setAttribute("class", "staff-line");
      svg.appendChild(line);
    }

    const clef = document.createElementNS(SVG_NS, "text");
    clef.setAttribute("x", staffLeft + 8);
    clef.setAttribute("y", stepZeroY - 3.6 * stepHeight);
    clef.setAttribute("class", "staff-clef");
    clef.textContent = "𝄞";
    svg.appendChild(clef);

    if (!staffGroups || staffGroups.length === 0) {
      container.appendChild(svg);
      return;
    }

    const usableLeft = staffLeft + 74;
    const usableRight = staffRight - 28;
    const count = staffGroups.length;

    staffGroups.forEach((group, groupIdx) => {
      let centerX;
      if (count === 1) {
        centerX = (usableLeft + usableRight) / 2;
      } else {
        centerX = usableLeft + (groupIdx * (usableRight - usableLeft)) / (count - 1);
      }

      const sorted = [...group].sort((a, b) => a.step - b.step);
      const minStep = sorted[0].step;
      const maxStep = sorted[sorted.length - 1].step;

      for (let s = 0; s >= minStep; s -= 2) {
        drawLedgerLine(svg, centerX, stepZeroY - s * stepHeight);
      }
      for (let s = 12; s <= maxStep; s += 2) {
        drawLedgerLine(svg, centerX, stepZeroY - s * stepHeight);
      }

      const avgStep = sorted.reduce((acc, n) => acc + n.step, 0) / sorted.length;
      const stemUp = avgStep < 6;

      const lowestY = stepZeroY - minStep * stepHeight;
      const highestY = stepZeroY - maxStep * stepHeight;
      const stem = document.createElementNS(SVG_NS, "line");
      if (stemUp) {
        stem.setAttribute("x1", centerX + 7);
        stem.setAttribute("y1", lowestY);
        stem.setAttribute("x2", centerX + 7);
        stem.setAttribute("y2", highestY - 36);
      } else {
        stem.setAttribute("x1", centerX - 7);
        stem.setAttribute("y1", highestY);
        stem.setAttribute("x2", centerX - 7);
        stem.setAttribute("y2", lowestY + 36);
      }
      stem.setAttribute("class", "note-stem");
      svg.appendChild(stem);

      let prevStep = -999;
      let prevOffsetRight = false;
      let accSlot = 0;

      sorted.forEach((note) => {
        const y = stepZeroY - note.step * stepHeight;

        let offsetRight = false;
        if (note.step - prevStep === 1 && !prevOffsetRight) {
          offsetRight = true;
        }
        prevStep = note.step;
        prevOffsetRight = offsetRight;

        const noteX = offsetRight ? centerX + 12 : centerX;

        const head = document.createElementNS(SVG_NS, "ellipse");
        head.setAttribute("cx", noteX);
        head.setAttribute("cy", y);
        head.setAttribute("rx", 7.8);
        head.setAttribute("ry", 5.6);
        head.setAttribute("transform", `rotate(-18 ${noteX} ${y})`);
        head.setAttribute("class", "note-head");
        svg.appendChild(head);

        if (note.acc === "#" || note.acc === "b") {
          const accText = document.createElementNS(SVG_NS, "text");
          const accX = centerX - 20 - (accSlot % 2) * 12;
          accText.setAttribute("x", accX);
          accText.setAttribute("y", y + 5.5);
          accText.setAttribute("class", "note-accidental");
          accText.textContent = note.acc === "#" ? "♯" : "♭";
          svg.appendChild(accText);
          accSlot++;
        }
      });
    });

    container.appendChild(svg);
  }

  function drawLedgerLine(svg, x, y) {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", x - 15);
    line.setAttribute("y1", y);
    line.setAttribute("x2", x + 15);
    line.setAttribute("y2", y);
    line.setAttribute("class", "staff-ledger-line");
    svg.appendChild(line);
  }

  global.ByEar = global.ByEar || {};
  global.ByEar.renderStaff = renderStaff;
})(window);
