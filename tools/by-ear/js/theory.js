// Music Theory & Flashcard Generator for By Ear
// Works directly via file:// (double-clicking index.html) and on GitHub Pages.

(function (global) {
  const BASE_MIDI = 58; // Concert Bb3 = Written C4 for Bb Trumpet
  const MIN_MIDI = 58;  // Concert Bb3 (Written C4)
  const MAX_MIDI = 77;  // Concert F5  (Written G5)

  const CHROMATIC_SHARP = [
    { name: "C", stepOffset: 0, acc: "" },
    { name: "C#", alt: "Db", stepOffset: 0, acc: "#" },
    { name: "D", stepOffset: 1, acc: "" },
    { name: "D#", alt: "Eb", stepOffset: 1, acc: "#" },
    { name: "E", stepOffset: 2, acc: "" },
    { name: "F", stepOffset: 3, acc: "" },
    { name: "F#", alt: "Gb", stepOffset: 3, acc: "#" },
    { name: "G", stepOffset: 4, acc: "" },
    { name: "G#", alt: "Ab", stepOffset: 4, acc: "#" },
    { name: "A", stepOffset: 5, acc: "" },
    { name: "A#", alt: "Bb", stepOffset: 5, acc: "#" },
    { name: "B", stepOffset: 6, acc: "" }
  ];

  const CHROMATIC_FLAT = [
    { name: "C", stepOffset: 0, acc: "" },
    { name: "Db", alt: "C#", stepOffset: 1, acc: "b" },
    { name: "D", stepOffset: 1, acc: "" },
    { name: "Eb", alt: "D#", stepOffset: 2, acc: "b" },
    { name: "E", stepOffset: 2, acc: "" },
    { name: "F", stepOffset: 3, acc: "" },
    { name: "Gb", alt: "F#", stepOffset: 4, acc: "b" },
    { name: "G", stepOffset: 4, acc: "" },
    { name: "Ab", alt: "G#", stepOffset: 5, acc: "b" },
    { name: "A", stepOffset: 5, acc: "" },
    { name: "Bb", alt: "A#", stepOffset: 6, acc: "b" },
    { name: "B", stepOffset: 6, acc: "" }
  ];

  function midiToNoteInfo(midi, preferFlats = false) {
    const octave = Math.floor(midi / 12) - 1;
    const pc = ((midi % 12) + 12) % 12;
    const table = preferFlats ? CHROMATIC_FLAT : CHROMATIC_SHARP;
    const entry = table[pc];

    const step = (octave - 4) * 7 + entry.stepOffset;
    const fullName = `${entry.name}${octave}`;
    const dualName = entry.alt ? `${entry.name}${octave} / ${entry.alt}${octave}` : fullName;

    return {
      midi,
      pc,
      octave,
      name: fullName,
      pitchClass: entry.name,
      dualName,
      step,
      acc: entry.acc
    };
  }

  function getDualNoteData(concertMidi, preferFlatsConcert = true, preferFlatsBb = false) {
    return {
      concert: midiToNoteInfo(concertMidi, preferFlatsConcert),
      bb: midiToNoteInfo(concertMidi + 2, preferFlatsBb)
    };
  }

  /**
   * Returns all available notes in the standard range (MIDI 58..77)
   * for populating the Reference / Practice Note selector.
   */
  function getReferenceNotesList() {
    const list = [];
    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
      const dual = getDualNoteData(midi, true, false);
      list.push({
        midi,
        concert: dual.concert,
        bb: dual.bb
      });
    }
    return list;
  }

  /**
   * Returns candidate Concert MIDI numbers in [minMidi, maxMidi],
   * optionally filtered to natural notes only (no sharps/flats) in the active transposition.
   */
  function getCandidateMidis(minMidi, maxMidi, options = {}) {
    const { naturalsOnly = false, transposition = "concert" } = options;
    const pool = [];
    for (let m = minMidi; m <= maxMidi; m++) {
      if (naturalsOnly) {
        const dual = getDualNoteData(m, true, false);
        const target = transposition === "bb" ? dual.bb : dual.concert;
        if (target.acc !== "") continue;
      }
      pool.push(m);
    }
    return pool;
  }

  const CHORD_TYPES = [
    { id: "maj", name: "Major", symbol: "", intervals: [0, 4, 7], preferFlats: false },
    { id: "min", name: "Minor", symbol: "m", intervals: [0, 3, 7], preferFlats: true },
    { id: "dim", name: "Diminished", symbol: "dim", intervals: [0, 3, 6], preferFlats: true },
    { id: "aug", name: "Augmented", symbol: "aug", intervals: [0, 4, 8], preferFlats: false },
    { id: "dom7", name: "Dominant 7th", symbol: "7", intervals: [0, 4, 7, 10], preferFlats: true },
    { id: "maj7", name: "Major 7th", symbol: "maj7", intervals: [0, 4, 7, 11], preferFlats: false },
    { id: "min7", name: "Minor 7th", symbol: "m7", intervals: [0, 3, 7, 10], preferFlats: true }
  ];

  const PROGRESSIONS = [
    {
      name: "I – IV – V – I",
      subtitle: "Classic Authentic Cadence",
      mode: "Major",
      degrees: [
        { roman: "I", rootOffset: 0, quality: "maj" },
        { roman: "IV", rootOffset: 5, quality: "maj" },
        { roman: "V", rootOffset: 7, quality: "maj" },
        { roman: "I", rootOffset: 0, quality: "maj" }
      ]
    },
    {
      name: "I – V – vi – IV",
      subtitle: "Four-Chord Pop Progression",
      mode: "Major",
      degrees: [
        { roman: "I", rootOffset: 0, quality: "maj" },
        { roman: "V", rootOffset: 7, quality: "maj" },
        { roman: "vi", rootOffset: 9, quality: "min" },
        { roman: "IV", rootOffset: 5, quality: "maj" }
      ]
    },
    {
      name: "ii – V – I",
      subtitle: "Jazz Turnaround",
      mode: "Major",
      degrees: [
        { roman: "ii", rootOffset: 2, quality: "min" },
        { roman: "V", rootOffset: 7, quality: "maj" },
        { roman: "I", rootOffset: 0, quality: "maj" }
      ]
    },
    {
      name: "I – vi – IV – V",
      subtitle: "50s Doo-Wop Progression",
      mode: "Major",
      degrees: [
        { roman: "I", rootOffset: 0, quality: "maj" },
        { roman: "vi", rootOffset: 9, quality: "min" },
        { roman: "IV", rootOffset: 5, quality: "maj" },
        { roman: "V", rootOffset: 7, quality: "maj" }
      ]
    },
    {
      name: "vi – IV – I – V",
      subtitle: "Minor-Start Pop Progression",
      mode: "Major",
      degrees: [
        { roman: "vi", rootOffset: 9, quality: "min" },
        { roman: "IV", rootOffset: 5, quality: "maj" },
        { roman: "I", rootOffset: 0, quality: "maj" },
        { roman: "V", rootOffset: 7, quality: "maj" }
      ]
    },
    {
      name: "i – iv – V – i",
      subtitle: "Minor Cadence",
      mode: "Minor",
      degrees: [
        { roman: "i", rootOffset: 0, quality: "min" },
        { roman: "iv", rootOffset: 5, quality: "min" },
        { roman: "V", rootOffset: 7, quality: "maj" },
        { roman: "i", rootOffset: 0, quality: "min" }
      ]
    }
  ];

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateNoteCard(options = {}) {
    const pool = getCandidateMidis(MIN_MIDI, MAX_MIDI, options);
    const midi = randomChoice(pool);
    const noteData = getDualNoteData(midi, true, false);
    const badgeSuffix = options.naturalsOnly ? " (Naturals)" : "";

    return {
      type: "note",
      badge: `Single Note${badgeSuffix}`,
      promptTitle: "Listen & Identify the Note",
      promptHint: options.naturalsOnly
        ? "Sharps & flats are off — identify this natural note!"
        : "Can you name this pitch by ear?",
      playbackEvents: [{ notes: [midi], duration: 0.95 }],
      concert: {
        title: noteData.concert.dualName,
        subtitle: `Concert Pitch (${noteData.concert.name})`,
        detail: `MIDI ${midi}`,
        staffGroups: [[noteData.concert]]
      },
      bb: {
        title: noteData.bb.dualName,
        subtitle: `Bb Trumpet Written Pitch (${noteData.bb.name})`,
        detail: `Sounds as Concert ${noteData.concert.name}`,
        staffGroups: [[noteData.bb]]
      }
    };
  }

  function generateMelodyCard(length = 3, options = {}) {
    const fullPool = getCandidateMidis(MIN_MIDI, MAX_MIDI, options);
    const startPool = getCandidateMidis(60, 72, options);
    const firstMidi = randomChoice(startPool.length > 0 ? startPool : fullPool);

    const midis = [firstMidi];

    for (let i = 1; i < length; i++) {
      const prev = midis[i - 1];
      // Pick notes within a musical interval (1 to 7 semitones away) from the allowed pool
      const nearby = fullPool.filter((m) => {
        const diff = Math.abs(m - prev);
        return diff >= 1 && diff <= 7;
      });
      midis.push(randomChoice(nearby.length > 0 ? nearby : fullPool));
    }

    const dualNotes = midis.map((m) => getDualNoteData(m, true, false));
    const badgeSuffix = options.naturalsOnly ? " (Naturals)" : "";

    return {
      type: "melody",
      badge: `${length}-Note Series${badgeSuffix}`,
      promptTitle: "Listen & Identify the Melody",
      promptHint: options.naturalsOnly
        ? `Hear the ${length} natural notes (no sharps/flats) and trace their contour.`
        : `Hear the sequence of ${length} notes and trace their contour.`,
      playbackEvents: midis.map((m) => ({ notes: [m], duration: 0.65 })),
      concert: {
        title: dualNotes.map((n) => n.concert.name).join("  →  "),
        subtitle: "Concert Pitch Sequence",
        detail: dualNotes.map((n) => n.concert.dualName).join("  •  "),
        staffGroups: dualNotes.map((n) => [n.concert])
      },
      bb: {
        title: dualNotes.map((n) => n.bb.name).join("  →  "),
        subtitle: "Bb Trumpet Written Sequence",
        detail: `Concert: ${dualNotes.map((n) => n.concert.name).join(" → ")}`,
        staffGroups: dualNotes.map((n) => [n.bb])
      }
    };
  }

  function generateChordCard() {
    const rootMidi = randomInt(58, 67);
    const chordType = randomChoice(CHORD_TYPES);
    const midis = chordType.intervals.map((interval) => rootMidi + interval);

    const rootDual = getDualNoteData(rootMidi, true, false);
    const dualNotes = midis.map((m) =>
      getDualNoteData(m, chordType.preferFlats, chordType.preferFlats)
    );

    const concertChordName = `${rootDual.concert.pitchClass} ${chordType.name}`;
    const bbChordName = `${rootDual.bb.pitchClass} ${chordType.name}`;

    return {
      type: "chord",
      badge: "Chord",
      promptTitle: "Identify the Chord",
      promptHint: "Listen for the chord quality (Major, Minor, Diminished, 7th) and root.",
      playbackEvents: [{ notes: midis, duration: 1.35 }],
      arpeggioEvents: midis.map((m) => ({ notes: [m], duration: 0.45 })).concat([
        { notes: midis, duration: 1.1 }
      ]),
      concert: {
        title: concertChordName,
        subtitle: `Notes: ${dualNotes.map((n) => n.concert.name).join(" – ")}`,
        detail: `Quality: ${chordType.name}`,
        staffGroups: [dualNotes.map((n) => n.concert)]
      },
      bb: {
        title: bbChordName,
        subtitle: `Written Notes: ${dualNotes.map((n) => n.bb.name).join(" – ")}`,
        detail: `Concert: ${concertChordName}`,
        staffGroups: [dualNotes.map((n) => n.bb)]
      }
    };
  }

  function generateProgressionCard() {
    const prog = randomChoice(PROGRESSIONS);
    const keyRootMidi = randomChoice([58, 60, 62, 63, 65, 67]);
    const keyRootDual = getDualNoteData(keyRootMidi, true, false);

    const chordQualitiesMap = Object.fromEntries(CHORD_TYPES.map((c) => [c.id, c]));

    const chordGroupsConcert = [];
    const chordGroupsBb = [];
    const concertChordNames = [];
    const bbChordNames = [];
    const playbackEvents = [];

    for (const deg of prog.degrees) {
      const q = chordQualitiesMap[deg.quality];
      let degRoot = keyRootMidi + deg.rootOffset;
      if (degRoot > 69) degRoot -= 12;

      const midis = q.intervals.map((interval) => degRoot + interval);
      playbackEvents.push({ notes: midis, duration: 0.85 });

      const degRootDual = getDualNoteData(degRoot, true, false);
      concertChordNames.push(`${degRootDual.concert.pitchClass}${q.symbol}`);
      bbChordNames.push(`${degRootDual.bb.pitchClass}${q.symbol}`);

      const dualNotes = midis.map((m) => getDualNoteData(m, q.preferFlats, q.preferFlats));
      chordGroupsConcert.push(dualNotes.map((n) => n.concert));
      chordGroupsBb.push(dualNotes.map((n) => n.bb));
    }

    return {
      type: "progression",
      badge: "Chord Progression",
      promptTitle: "Identify the Progression",
      promptHint: `Listen to the ${prog.degrees.length} chords and hear how they move relative to the key.`,
      playbackEvents,
      concert: {
        title: prog.name,
        subtitle: `${concertChordNames.join("  →  ")}  (Key of ${keyRootDual.concert.pitchClass} ${prog.mode})`,
        detail: prog.subtitle,
        staffGroups: chordGroupsConcert
      },
      bb: {
        title: prog.name,
        subtitle: `${bbChordNames.join("  →  ")}  (Written Key of ${keyRootDual.bb.pitchClass} ${prog.mode})`,
        detail: `Concert Chords: ${concertChordNames.join(" → ")}`,
        staffGroups: chordGroupsBb
      }
    };
  }

  function generateCard(mode = "note", options = {}) {
    switch (mode) {
      case "note":
        return generateNoteCard(options);
      case "melody":
        return generateMelodyCard(3, options);
      case "chord":
        return generateChordCard();
      case "progression":
        return generateProgressionCard();
      case "mixed": {
        const modes = ["note", "melody", "chord", "progression"];
        return generateCard(randomChoice(modes), options);
      }
      default:
        return generateNoteCard(options);
    }
  }

  global.ByEar = global.ByEar || {};
  global.ByEar.theory = {
    BASE_MIDI,
    midiToNoteInfo,
    getDualNoteData,
    getReferenceNotesList,
    generateCard
  };
})(window);
