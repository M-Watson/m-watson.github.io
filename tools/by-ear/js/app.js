// Main Application Controller for By Ear Flashcards

(function (global) {
  const { generateCard, getReferenceNotesList } = global.ByEar.theory;
  const { AudioEngine } = global.ByEar;
  const { renderStaff } = global.ByEar;

  class ByEarApp {
    constructor() {
      this.audio = new AudioEngine();
      this.mode = this.safeGetStorage("byear_mode", "note");
      this.instrument = this.safeGetStorage("byear_instrument", "piano");
      this.transposition = this.safeGetStorage("byear_transposition", "concert");
      this.accidentals = this.safeGetStorage("byear_accidentals", "all"); // "all" | "naturals"
      this.selectedRefMidi = parseInt(this.safeGetStorage("byear_ref_midi", "58"), 10) || 58;

      this.deck = [];
      this.currentIndex = -1;
      this.isFlipped = false;
      this.isPlaying = false;
      this.isRefPlaying = false;

      this.initDOM();
      this.populateReferenceSelect();
      this.bindEvents();
      this.syncSettingsUI();

      this.audio.setStatusCallback((inst, status) => {
        this.updateAudioStatusBadge(inst, status);
      });
      this.audio.setInstrument(this.instrument);

      this.dealNextCard(false);
    }

    safeGetStorage(key, fallback) {
      try {
        return localStorage.getItem(key) || fallback;
      } catch (_) {
        return fallback;
      }
    }

    safeSetStorage(key, val) {
      try {
        localStorage.setItem(key, val);
      } catch (_) {}
    }

    initDOM() {
      this.modeButtons = document.querySelectorAll("[data-mode]");
      this.instrumentButtons = document.querySelectorAll("[data-instrument]");
      this.transpositionButtons = document.querySelectorAll("[data-transposition]");
      this.accidentalsButtons = document.querySelectorAll("[data-accidentals]");

      this.refNoteSelect = document.getElementById("ref-note-select");
      this.refPlayBtn = document.getElementById("ref-play-btn");

      this.flashcard = document.getElementById("flashcard");
      this.cardCounter = document.getElementById("card-counter");
      this.audioStatusBadge = document.getElementById("audio-status-badge");

      this.frontBadge = document.getElementById("front-badge");
      this.frontTitle = document.getElementById("front-title");
      this.frontHint = document.getElementById("front-hint");
      this.frontPlayBtn = document.getElementById("front-play-btn");
      this.frontPlayLabel = document.getElementById("front-play-label");
      this.frontArpeggioBtn = document.getElementById("front-arpeggio-btn");
      this.frontFlipBtn = document.getElementById("front-flip-btn");

      this.backBadge = document.getElementById("back-badge");
      this.backTranspositionTag = document.getElementById("back-transposition-tag");
      this.staffContainer = document.getElementById("staff-container");
      this.answerTitle = document.getElementById("answer-title");
      this.answerSubtitle = document.getElementById("answer-subtitle");
      this.answerDetail = document.getElementById("answer-detail");
      this.backReplayBtn = document.getElementById("back-replay-btn");
      this.backFlipBtn = document.getElementById("back-flip-btn");

      this.prevCardBtn = document.getElementById("prev-card-btn");
      this.bottomFlipBtn = document.getElementById("bottom-flip-btn");
      this.nextCardBtn = document.getElementById("next-card-btn");
    }

    populateReferenceSelect() {
      if (!this.refNoteSelect) return;
      const notes = getReferenceNotesList();
      this.refNoteSelect.innerHTML = "";

      notes.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = String(item.midi);
        if (this.transposition === "bb") {
          opt.textContent = `Written ${item.bb.dualName}  (Concert ${item.concert.name})`;
        } else {
          opt.textContent = `Concert ${item.concert.dualName}  (Bb Trumpet ${item.bb.name})`;
        }
        if (item.midi === this.selectedRefMidi) {
          opt.selected = true;
        }
        this.refNoteSelect.appendChild(opt);
      });
    }

    bindEvents() {
      this.modeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          this.mode = btn.dataset.mode;
          this.safeSetStorage("byear_mode", this.mode);
          this.syncSettingsUI();
          this.dealNextCard(true);
        });
      });

      this.instrumentButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          this.instrument = btn.dataset.instrument;
          this.safeSetStorage("byear_instrument", this.instrument);
          this.syncSettingsUI();
          this.audio.setInstrument(this.instrument);
        });
      });

      this.transpositionButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          this.transposition = btn.dataset.transposition;
          this.safeSetStorage("byear_transposition", this.transposition);
          this.syncSettingsUI();
          this.populateReferenceSelect();

          // If Naturals Only is active and current card has accidentals in the newly selected transposition, deal a fresh card
          if (this.accidentals === "naturals" && this.currentCardHasAccidentalsInActiveView()) {
            this.dealNextCard(false);
          } else {
            this.renderCurrentCard();
          }
        });
      });

      this.accidentalsButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          this.accidentals = btn.dataset.accidentals;
          this.safeSetStorage("byear_accidentals", this.accidentals);
          this.syncSettingsUI();
          if (this.mode === "note" || this.mode === "melody" || this.mode === "mixed") {
            this.dealNextCard(true);
          }
        });
      });

      if (this.refNoteSelect) {
        this.refNoteSelect.addEventListener("change", () => {
          this.selectedRefMidi = parseInt(this.refNoteSelect.value, 10);
          this.safeSetStorage("byear_ref_midi", String(this.selectedRefMidi));
          this.playReferenceNote();
        });
      }

      if (this.refPlayBtn) {
        this.refPlayBtn.addEventListener("click", () => {
          this.playReferenceNote();
        });
      }

      this.frontPlayBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.playCurrentCard(false);
      });

      this.frontArpeggioBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.playCurrentCard(true);
      });

      this.backReplayBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.playCurrentCard(false);
      });

      this.frontFlipBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleFlip();
      });

      this.backFlipBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleFlip();
      });

      this.bottomFlipBtn.addEventListener("click", () => {
        this.toggleFlip();
      });

      this.flashcard.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        this.toggleFlip();
      });

      this.prevCardBtn.addEventListener("click", () => {
        this.goToPreviousCard();
      });

      this.nextCardBtn.addEventListener("click", () => {
        this.dealNextCard(true);
      });

      window.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
        if (e.code === "Space") {
          e.preventDefault();
          this.playCurrentCard(false);
        } else if (e.code === "KeyR") {
          e.preventDefault();
          this.playReferenceNote();
        } else if (e.code === "KeyF" || e.code === "ArrowUp" || e.code === "ArrowDown") {
          e.preventDefault();
          this.toggleFlip();
        } else if (e.code === "ArrowRight") {
          e.preventDefault();
          this.dealNextCard(true);
        } else if (e.code === "ArrowLeft") {
          e.preventDefault();
          this.goToPreviousCard();
        }
      });
    }

    currentCardHasAccidentalsInActiveView() {
      const card = this.currentCard;
      if (!card || (card.type !== "note" && card.type !== "melody")) return false;
      const view = this.transposition === "bb" ? card.bb : card.concert;
      return view.staffGroups.some((group) => group.some((n) => n.acc !== ""));
    }

    syncSettingsUI() {
      this.modeButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.mode === this.mode);
        btn.setAttribute("aria-pressed", btn.dataset.mode === this.mode);
      });

      this.instrumentButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.instrument === this.instrument);
        btn.setAttribute("aria-pressed", btn.dataset.instrument === this.instrument);
      });

      this.transpositionButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.transposition === this.transposition);
        btn.setAttribute("aria-pressed", btn.dataset.transposition === this.transposition);
      });

      this.accidentalsButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.accidentals === this.accidentals);
        btn.setAttribute("aria-pressed", btn.dataset.accidentals === this.accidentals);
      });
    }

    updateAudioStatusBadge(inst, status) {
      if (!this.audioStatusBadge) return;
      const label = inst === "trumpet" ? "Trumpet" : "Grand Piano";
      if (status === "loading") {
        this.audioStatusBadge.textContent = `Loading ${label} samples…`;
        this.audioStatusBadge.dataset.state = "loading";
      } else if (status === "ready") {
        this.audioStatusBadge.textContent = `${label} (HD Sampled)`;
        this.audioStatusBadge.dataset.state = "ready";
      } else if (status === "fallback") {
        this.audioStatusBadge.textContent = `${label} (Studio Synth)`;
        this.audioStatusBadge.dataset.state = "fallback";
      } else {
        this.audioStatusBadge.textContent = `${label} Ready`;
        this.audioStatusBadge.dataset.state = "idle";
      }
    }

    get currentCard() {
      return this.deck[this.currentIndex] || null;
    }

    getCardOptions() {
      return {
        naturalsOnly: this.accidentals === "naturals",
        transposition: this.transposition
      };
    }

    dealNextCard(autoPlay = true) {
      this.audio.stop();
      this.setPlayingState(false);

      const advance = () => {
        const card = generateCard(this.mode, this.getCardOptions());
        // Truncate any forward history if we branched from an earlier card
        if (this.currentIndex < this.deck.length - 1) {
          this.deck = this.deck.slice(0, this.currentIndex + 1);
        }
        this.deck.push(card);
        this.currentIndex = this.deck.length - 1;

        this.renderCurrentCard();
        if (autoPlay) {
          this.playCurrentCard(false);
        }
      };

      if (this.isFlipped) {
        this.setFlipped(false);
        setTimeout(advance, 220);
      } else {
        advance();
      }
    }

    goToPreviousCard() {
      if (this.currentIndex <= 0) return;
      this.audio.stop();
      this.setPlayingState(false);

      const stepBack = () => {
        this.currentIndex--;
        this.renderCurrentCard();
        this.playCurrentCard(false);
      };

      if (this.isFlipped) {
        this.setFlipped(false);
        setTimeout(stepBack, 220);
      } else {
        stepBack();
      }
    }

    toggleFlip() {
      this.setFlipped(!this.isFlipped);
    }

    setFlipped(flipped) {
      this.isFlipped = flipped;
      this.flashcard.classList.toggle("is-flipped", this.isFlipped);
      this.bottomFlipBtn.querySelector(".btn-label").textContent = this.isFlipped
        ? "Flip to Front"
        : "Flip Card";
    }

    playReferenceNote() {
      const midi = this.selectedRefMidi;
      this.setPlayingState(false);
      if (this.refPlayBtn) {
        this.refPlayBtn.classList.add("is-playing");
      }
      this.audio.playEvents([{ notes: [midi], duration: 0.95 }], () => {
        if (this.refPlayBtn) {
          this.refPlayBtn.classList.remove("is-playing");
        }
      });
    }

    playCurrentCard(useArpeggio = false) {
      const card = this.currentCard;
      if (!card) return;

      if (this.refPlayBtn) {
        this.refPlayBtn.classList.remove("is-playing");
      }

      const events = useArpeggio && card.arpeggioEvents
        ? card.arpeggioEvents
        : card.playbackEvents;

      this.setPlayingState(true);
      this.audio.playEvents(events, () => {
        this.setPlayingState(false);
      });
    }

    setPlayingState(playing) {
      this.isPlaying = playing;
      this.frontPlayBtn.classList.toggle("is-playing", playing);
      this.backReplayBtn.classList.toggle("is-playing", playing);
      this.frontPlayLabel.textContent = playing ? "Playing…" : "Play Audio";
    }

    renderCurrentCard() {
      const card = this.currentCard;
      if (!card) return;

      this.cardCounter.textContent = `Card ${this.currentIndex + 1} of ${this.deck.length}`;
      this.prevCardBtn.disabled = this.currentIndex <= 0;

      this.frontBadge.textContent = card.badge;
      this.frontTitle.textContent = card.promptTitle;
      this.frontHint.textContent = card.promptHint;

      if (card.arpeggioEvents) {
        this.frontArpeggioBtn.hidden = false;
      } else {
        this.frontArpeggioBtn.hidden = true;
      }

      const viewData = this.transposition === "bb" ? card.bb : card.concert;
      this.backBadge.textContent = card.badge;
      this.backTranspositionTag.textContent =
        this.transposition === "bb" ? "Bb Trumpet Pitch" : "Concert Pitch";

      this.answerTitle.textContent = viewData.title;
      this.answerSubtitle.textContent = viewData.subtitle;
      this.answerDetail.textContent = viewData.detail;

      renderStaff(this.staffContainer, viewData.staffGroups);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    global.byEarApp = new ByEarApp();
  });
})(window);
