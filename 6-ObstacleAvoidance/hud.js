function updateGameHud(state) {
  const isPlaying = state.gameStarted && !state.gameOver;
  const showPanels = !isPlaying || state.panelsVisible;
  const gameUi = document.querySelector(".game-ui");
  gameUi.classList.toggle("is-playing", isPlaying);
  gameUi.classList.toggle("is-paused", state.gamePaused);
  gameUi.classList.toggle("panels-visible", state.panelsVisible);
  document.querySelector(".diagnostics").setAttribute("aria-hidden", String(!showPanels));
  document.querySelector(".control-panel").setAttribute("aria-hidden", String(!showPanels));
  const panelsToggle = document.getElementById("panels-toggle");
  panelsToggle.hidden = !isPlaying;
  panelsToggle.setAttribute("aria-expanded", String(state.panelsVisible));
  panelsToggle.textContent = state.panelsVisible ? "MASQUER LES PANNEAUX" : "AFFICHER LES PANNEAUX";

  setHudValue("gravity-state", state.antiGravity ? "ON" : "OFF");
  document.getElementById("gravity-state").classList.toggle("active", state.antiGravity);
  setHudValue("auto-state", state.autoFire ? "ON" : "OFF");
  document.getElementById("auto-state").classList.toggle("active", state.autoFire);
  const modeLabels = { mission: "MISSION", flock: "ESSAIM", patrol: "PATROUILLE" };
  setHudValue("flight-mode-state", state.manualControl ? "MANUEL" : modeLabels[state.flightMode] || "MISSION");
  const difficulty = GameRules.getDifficulty(state.difficulty);
  setHudValue("difficulty-state", difficulty ? difficulty.label : "PILOTE");
  document.querySelectorAll(".difficulty-option").forEach(button => {
    button.disabled = state.gameStarted && !state.gameOver;
  });
  const pauseButton = document.getElementById("pause-button");
  pauseButton.disabled = !state.gameStarted || state.gameOver || state.awaitingNextStage;
  pauseButton.setAttribute("aria-pressed", String(state.gamePaused));
  pauseButton.textContent = state.gamePaused ? "REPRENDRE [ESPACE]" : "PAUSE [ESPACE]";
  document.getElementById("resume-button").textContent = "REPRENDRE [ ESPACE ]";
  const manualControlButton = document.getElementById("manual-control-button");
  manualControlButton.setAttribute("aria-pressed", String(state.manualControl));
  manualControlButton.textContent = state.manualControl
    ? "PILOTAGE AUTOMATIQUE [M]"
    : "PILOTAGE MANUEL [M]";
  setHudValue(
    "control-mode-note",
    state.manualControl
      ? state.manualInputMode === "keyboard"
        ? "FLÈCHES · MAINTENIR POUR PILOTER"
        : "SOURIS · POINTER POUR DIRIGER"
      : "IA AUTONOME · ÉVITEMENT ACTIF",
  );
  setHudValue(
    "wave-readout",
    `${String(state.wave).padStart(2, "0")} · ${String(state.nextWaveSeconds).padStart(2, "0")}s`,
  );
  setHudValue(
    "stage-readout",
    `${String(state.stageState.number).padStart(2, "0")} / ${String(state.stageState.total).padStart(2, "0")} · ${state.stageState.name}`,
  );
  setHudValue("stage-objective", state.stageState.objective);
  setHudValue("stage-progress", state.stageState.progressLabel);
  document.getElementById("stage-fill").style.width = `${100 * state.stageState.ratio}%`;
  const stageTrack = document.querySelector(".stage-track");
  stageTrack.setAttribute("aria-valuemax", String(state.stageState.goal));
  stageTrack.setAttribute("aria-valuenow", String(state.stageState.progress));
  setHudValue("boss-health", state.bossActive ? `${state.bossHealth} / ${state.bossMaxHealth} PV` : "INACTIF");
  const shieldActive = state.shieldFrames > 0;
  const shieldReady = state.shieldCooldownFrames <= 0;
  setHudValue(
    "shield-state",
    shieldActive
      ? `ACTIF ${Math.ceil(state.shieldFrames / 60)}s`
      : shieldReady ? "PRÊT" : `RECHARGE ${Math.ceil(state.shieldCooldownFrames / 60)}s`,
  );
  setHudValue(
    "black-hole-state",
    state.blackHoleCooldownFrames > 0
      ? `RECHARGE ${Math.ceil(state.blackHoleCooldownFrames / 60)}s`
      : "PRÊT",
  );
  const shieldProgress = shieldActive
    ? state.shieldFrames / state.shieldDurationFrames
    : shieldReady ? 1 : 1 - state.shieldCooldownFrames / state.shieldMaxCooldownFrames;
  document.getElementById("shield-fill").style.width = `${100 * shieldProgress}%`;
  document.getElementById("shield-fill").classList.toggle("active", shieldActive);
  const shieldButton = document.getElementById("shield-button");
  shieldButton.disabled = !state.gameStarted || state.gameOver || state.gamePaused || !shieldReady;
  shieldButton.textContent = shieldActive
    ? `BOUCLIER ACTIF · ${Math.ceil(state.shieldFrames / 60)}s`
    : shieldReady ? "ACTIVER LE BOUCLIER [B]" : `RECHARGE · ${Math.ceil(state.shieldCooldownFrames / 60)}s`;
  setHudValue("crystal-count", state.crystals);
  setHudValue("white-count", state.allies);
  setHudValue("red-count", state.enemies);
  setHudValue("enemy-count", state.enemies);
  setHudValue("planet-count", state.planets);
  setHudValue("asteroid-count", state.asteroids);
  setHudValue("entity-count", state.entities);
  document.getElementById("add-white-plane").disabled = !state.gameStarted || state.gameOver || !state.canAddAlly;
  document.getElementById("add-red-plane").disabled = !state.gameStarted || state.gameOver || !state.canAddEnemy;
  setHudValue("score", String(state.score).padStart(3, "0"));
  setHudValue("score-small", String(state.score).padStart(3, "0"));
  const scoreProgress = Math.min(100, state.score / state.winScore * 100);
  setHudValue("objective-progress", `${String(state.score).padStart(3, "0")} / ${state.winScore}`);
  document.getElementById("mission-fill").style.width = `${scoreProgress}%`;
  const missionTrack = document.querySelector(".final-mission-track");
  missionTrack.setAttribute("aria-valuemax", String(state.winScore));
  missionTrack.setAttribute("aria-valuenow", String(Math.min(state.score, state.winScore)));
  setHudValue("best-score", String(state.bestScore).padStart(3, "0"));
  setHudValue("welcome-best-score", String(state.bestScore).padStart(3, "0"));
  setHudValue("first-stage-objective", GameRules.getStageInstruction(1));
  setHudValue("final-score", String(state.score).padStart(3, "0"));
  setHudValue("final-best-score", String(state.bestScore).padStart(3, "0"));
  setHudValue("hull", `${"♥ ".repeat(state.lives).trim()}${state.lives ? "" : "VIDE"}`);
  setHudValue("ammo", `${state.ammo} / ${state.maxAmmo}`);
  setHudValue("cannon-state", state.reloading ? "RELOADING" : "READY");
  document.getElementById("cannon-state").classList.toggle("reloading", state.reloading);
  document.getElementById("ammo-fill").style.width = `${100 * state.ammo / state.maxAmmo}%`;

  const victory = state.gameWon;
  const overlay = document.getElementById("game-over-overlay");
  setHudValue(
    "restart-button",
    `${victory ? "REJOUER LE NIVEAU" : "RECOMMENCER LE NIVEAU"} ${String(state.stageState.number).padStart(2, "0")} [R]`,
  );
  const pauseOverlay = document.getElementById("pause-overlay");
  const stageCompleteOverlay = document.getElementById("stage-complete-overlay");
  const welcome = document.getElementById("welcome-overlay");
  const waveAnnouncement = document.getElementById("wave-announcement");
  const gameWord = document.querySelector(".game-over-game");
  const overWord = document.querySelector(".game-over-over");
  const gameLabel = victory ? "MISSION" : "GAME";
  const overLabel = victory ? "COMPLETE" : "OVER";
  overlay.hidden = !state.gameOver;
  overlay.setAttribute("aria-hidden", String(!state.gameOver));
  pauseOverlay.hidden = !state.gamePaused || state.gameOver;
  pauseOverlay.setAttribute("aria-hidden", String(pauseOverlay.hidden));
  stageCompleteOverlay.hidden = !state.awaitingNextStage;
  stageCompleteOverlay.setAttribute("aria-hidden", String(!state.awaitingNextStage));
  if (state.awaitingNextStage) {
    const nextStage = GameRules.STAGES[state.stageState.number];
    const difficulty = GameRules.getDifficulty(state.difficulty);
    const nextBossHealth = nextStage.type === "boss"
      ? difficulty.bossHealth + nextStage.bossHealthBonus
      : null;
    setHudValue(
      "stage-complete-detail",
      `L'étape ${String(state.stageState.number).padStart(2, "0")} est terminée. La simulation est suspendue.`,
    );
    setHudValue(
      "next-stage-title",
      `ÉTAPE ${String(state.stageState.number + 1).padStart(2, "0")} · ${nextStage.name}`,
    );
    setHudValue(
      "next-stage-objective",
      GameRules.getStageInstruction(state.stageState.number + 1, nextBossHealth),
    );
    setHudValue(
      "next-stage-button",
      `PASSER À L'ÉTAPE ${String(state.stageState.number + 1).padStart(2, "0")}`,
    );
  }
  welcome.hidden = state.gameStarted || state.gameOver;
  welcome.setAttribute("aria-hidden", String(!welcome.hidden));
  const showStage = state.stageBannerTimer > 0;
  waveAnnouncement.hidden = !state.gameStarted || state.gameOver || state.awaitingNextStage
    || (!showStage && state.waveBannerTimer <= 0);
  setHudValue(
    "wave-announcement",
    showStage ? state.stageBannerText : `VAGUE ${String(state.wave).padStart(2, "0")}`,
  );
  waveAnnouncement.classList.toggle("is-visible", !waveAnnouncement.hidden);
  overlay.classList.toggle("is-victory", victory);
  gameWord.textContent = gameLabel;
  gameWord.dataset.text = gameLabel;
  overWord.textContent = overLabel;
  overWord.dataset.text = overLabel;
  document.querySelector(".game-over-skull").hidden = victory;
  setHudValue(
    "game-over-detail",
    victory ? "SECTEUR SÉCURISÉ — BRAVO !" : state.message || "VOTRE FLOTTE A ÉTÉ INTERCEPTÉE",
  );
}

function setHudValue(id, value) {
  const element = document.getElementById(id);
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}
