// Main Application Controller for By Ear Flashcards

(function (global) {
  const { generateCard } = global.ByEar.theory;
  const { AudioEngine } = global.ByEar;
  const { renderStaff } = global.ByEar;

  class ByEarApp {
    constructor() {
      this.audio = new AudioEngine();
      this.mode = this.safeGetStorage("byear_mode", "note");
      this.instrument = this.safeGetStorage("byear_instrument", "piano");
      this.transposition = this.safeGetStorage("byear_transposition", "concert");

      this.deck = [];
      this.currentIndex = -1;
      this.isFlipped = false;
      this.isPlaying = false;

      this.initDOM();
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
          this.renderCurrentCard();
        });
      });

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

    dealNextCard(autoPlay = true) {
      this.audio.stop();
      this.setPlayingState(false);

      const advance = () => {
        if (this.currentIndex < this.deck.length - 1) {
          this.currentIndex++;
        } else {
          const card = generateCard(this.mode);
          this.deck.push(card);
          this.currentIndex = this.deck.length - 1;
        }
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

    playCurrentCard(useArpeggio = false) {
      const card = this.currentCard;
      if (!card) return;

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
