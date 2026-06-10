/* ============================================================
   Book engine: page flipping (desktop spreads + mobile single
   pages), synthesized sound, anime.js flourishes, interactions
   ============================================================ */

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var A = window.anime || null; // anime.js v3 (CDN); everything degrades gracefully without it

  function fx() { return A && !REDUCED; }

  /* ============================================================
     Sound — everything synthesized with Web Audio, no files.
     Nothing plays until a user gesture; mute persists.
     ============================================================ */
  var Sound = (function () {
    var ctx = null, master = null, noiseBuf = null, rainNodes = null;
    var enabled = true;
    try { enabled = localStorage.getItem("aseel-sound") !== "off"; } catch (e) {}

    function ensure() {
      if (!enabled) return null;
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.6;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function noiseSrc() {
      if (!noiseBuf) {
        var len = ctx.sampleRate * 2;
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      var src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      return src;
    }

    function pageTurn() {
      if (!ensure()) return;
      var t = ctx.currentTime;
      var src = noiseSrc();
      var bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(2400, t);
      bp.frequency.exponentialRampToValueAtTime(650, t + 0.3);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.33);
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t, Math.random() * 1.5);
      src.stop(t + 0.4);
    }

    function pluck(freq, when) {
      if (!ensure()) return;
      var t = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      o.connect(g); g.connect(master);
      o.start(t);
      o.stop(t + 0.7);
    }

    function thump() {
      if (!ensure()) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(master);
      o.start(t);
      o.stop(t + 0.2);
    }

    function purr() {
      if (!ensure()) return;
      var t = ctx.currentTime, dur = 1.5;
      var src = noiseSrc();
      src.loop = true;
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 150;
      lp.Q.value = 2;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.25);
      g.gain.setValueAtTime(0.3, t + dur - 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 25;
      var lfoG = ctx.createGain();
      lfoG.gain.value = 0.2;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      src.connect(lp); lp.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur + 0.1);
      lfo.start(t); lfo.stop(t + dur + 0.1);
    }

    function rainOn() {
      if (!ensure()) return false;
      if (rainNodes) return true;
      var t = ctx.currentTime;
      var src = noiseSrc();
      src.loop = true;
      var hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 400;
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1100;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 1.2);
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
      src.start(t);
      rainNodes = { src: src, g: g };
      return true;
    }

    function rainOff() {
      if (!rainNodes || !ctx) return;
      var t = ctx.currentTime;
      var nodes = rainNodes;
      rainNodes = null;
      nodes.g.gain.cancelScheduledValues(t);
      nodes.g.gain.setValueAtTime(nodes.g.gain.value, t);
      nodes.g.gain.linearRampToValueAtTime(0.0001, t + 0.5);
      nodes.src.stop(t + 0.6);
    }

    return {
      pageTurn: pageTurn,
      pluck: pluck,
      thump: thump,
      purr: purr,
      rainOn: rainOn,
      rainOff: rainOff,
      rainPlaying: function () { return !!rainNodes; },
      isEnabled: function () { return enabled; },
      setEnabled: function (on) {
        enabled = on;
        if (!on) rainOff();
        try { localStorage.setItem("aseel-sound", on ? "on" : "off"); } catch (e) {}
      },
    };
  })();

  /* ============================================================
     Flip engine — desktop: spreads; mobile: one face at a time
     ============================================================ */
  var book = document.getElementById("book");
  var leaves = Array.prototype.slice.call(book.querySelectorAll(".leaf"));
  var TOTAL = leaves.length;
  var FACES = TOTAL * 2;
  var whereEl = document.getElementById("where");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var mobileMq = window.matchMedia("(max-width: 720px)");
  var mobile = mobileMq.matches;

  // Position is persisted as a face index (0 .. FACES-1) so it
  // survives switching between phone and desktop.
  var face = 0;
  try {
    var saved = parseInt(localStorage.getItem("aseel-book-pos") || "0", 10);
    if (saved >= 0 && saved <= FACES - 1) face = saved;
  } catch (e) { /* private mode */ }
  var current = Math.min(Math.ceil(face / 2), TOTAL);

  var animating = null;

  function applyState(animLeaf) {
    if (mobile) current = Math.min(Math.ceil(face / 2), TOTAL);
    leaves.forEach(function (leaf, i) {
      var flipped = i < current;
      leaf.classList.toggle("flipped", flipped);
      leaf.style.zIndex = i === animLeaf ? TOTAL + 10 : flipped ? i + 1 : TOTAL - i;
    });

    if (mobile) {
      book.classList.remove("closed-front", "closed-back");
      var dir = face % 2 === 0 ? -0.5 : 0.5;
      book.style.transform = "translateX(calc(var(--page-w) * " + dir + "))";
    } else {
      book.style.transform = "";
      book.classList.toggle("closed-front", current === 0);
      book.classList.toggle("closed-back", current === TOTAL);
    }

    var persistFace = mobile ? face : (current >= TOTAL ? FACES - 1 : current * 2);
    try { localStorage.setItem("aseel-book-pos", String(persistFace)); } catch (e) {}

    prevBtn.disabled = mobile ? face <= 0 : current === 0;
    nextBtn.disabled = mobile ? face >= FACES - 1 : current === TOTAL;
    whereEl.textContent = mobile
      ? (face === 0 ? "the cover" : face === FACES - 1 ? "the end" : "page " + face + " of " + (FACES - 2))
      : (current === 0 ? "the cover" : current === TOTAL ? "the end" : "spread " + current + " of " + (TOTAL - 1));
  }

  function settle(leaf) {
    leaf.addEventListener("transitionend", function onEnd(e) {
      if (e.propertyName !== "transform") return;
      leaf.removeEventListener("transitionend", onEnd);
      animating = null;
      applyState(-1);
    });
  }

  function onTurn() {
    Sound.pageTurn();
    if (Sound.rainPlaying()) {
      Sound.rainOff();
      resetRainBtn();
    }
  }

  function next() {
    if (mobile) {
      if (face >= FACES - 1) return;
      var flipping = face % 2 === 0;
      var leafIdx = flipping ? face / 2 : -1;
      face++;
      if (flipping) { animating = leafIdx; settle(leaves[leafIdx]); }
      applyState(flipping ? leafIdx : -1);
    } else {
      if (current >= TOTAL) return;
      var leaf = leaves[current];
      current++;
      animating = current - 1;
      applyState(animating);
      settle(leaf);
    }
    onTurn();
  }

  function prev() {
    if (mobile) {
      if (face <= 0) return;
      var flipping = face % 2 === 1;
      var leafIdx = flipping ? (face - 1) / 2 : -1;
      face--;
      if (flipping) { animating = leafIdx; settle(leaves[leafIdx]); }
      applyState(flipping ? leafIdx : -1);
    } else {
      if (current <= 0) return;
      current--;
      var leaf = leaves[current];
      animating = current;
      applyState(animating);
      settle(leaf);
    }
    onTurn();
  }

  // Click pages to turn (interactive bits opt out via data-no-flip)
  leaves.forEach(function (leaf) {
    leaf.querySelector(".page.front").addEventListener("click", function (e) {
      if (e.target.closest("[data-no-flip]")) return;
      if (!leaf.classList.contains("flipped")) next();
    });
    var back = leaf.querySelector(".page.back");
    if (back) back.addEventListener("click", function (e) {
      if (e.target.closest("[data-no-flip]")) return;
      if (leaf.classList.contains("flipped")) prev();
    });
  });

  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);
  document.addEventListener("keydown", function (e) {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight" || e.key === " ") next();
    if (e.key === "ArrowLeft") prev();
  });

  // Swipe to turn
  var touchX = 0, touchY = 0, touchOk = false;
  document.addEventListener("touchstart", function (e) {
    var t = e.touches[0];
    touchX = t.clientX;
    touchY = t.clientY;
    touchOk = !e.target.closest("textarea");
  }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (!touchOk) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchX;
    var dy = t.clientY - touchY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0) next(); else prev();
  }, { passive: true });

  /* ---------- Scaling ---------- */
  var wrap = document.querySelector(".book-wrap");
  var PAGE_W = 520, PAGE_H = 680;
  function fit() {
    var s;
    if (mobile) {
      s = Math.min(window.innerWidth / (PAGE_W + 18), (window.innerHeight - 88) / PAGE_H, 1);
    } else {
      s = Math.min(window.innerWidth / (wrap.offsetWidth + 120), window.innerHeight / (wrap.offsetHeight + 170), 1.18);
    }
    wrap.style.transform = "scale(" + s + ")";
  }

  function setMode() {
    var m = mobileMq.matches;
    if (m === mobile) return;
    if (m) {
      face = current === 0 ? 0 : current >= TOTAL ? FACES - 1 : current * 2;
    } else {
      current = Math.min(Math.ceil(face / 2), TOTAL);
    }
    mobile = m;
    document.body.classList.toggle("mobile", m);
    applyState(-1);
    fit();
  }

  window.addEventListener("resize", function () { setMode(); fit(); });
  document.body.classList.toggle("mobile", mobile);
  applyState(-1);
  fit();

  /* ============================================================
     Particle helpers (anime.js; skipped under reduced motion)
     ============================================================ */
  function spawnParticles(container, count, build, animateOne) {
    if (!fx()) return;
    for (var i = 0; i < count; i++) {
      var el = document.createElement("span");
      build(el, i);
      container.appendChild(el);
      animateOne(el, i);
    }
  }

  function removeLater(el, ms) {
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, ms);
  }

  /* ---------- Proud stamps ---------- */
  var sealBtn = document.getElementById("sealBtn");
  if (sealBtn) {
    var stampField = document.getElementById("stampField");
    var stamps = Array.prototype.slice.call(stampField.querySelectorAll(".stamp"));
    var stamped = 0;
    try { stamped = Math.min(parseInt(localStorage.getItem("aseel-stamps") || "0", 10), stamps.length); } catch (e) {}
    stamps.slice(0, stamped).forEach(function (s) { s.classList.add("on"); });

    sealBtn.addEventListener("click", function () {
      var justStamped = null;
      if (stamped < stamps.length) {
        justStamped = stamps[stamped];
        justStamped.classList.add("on");
        stamped++;
        try { localStorage.setItem("aseel-stamps", String(stamped)); } catch (e) {}
      }
      Sound.thump();
      if (fx()) {
        A.remove(sealBtn);
        A({
          targets: sealBtn,
          keyframes: [
            { scale: 0.82, rotate: -7, duration: 90, easing: "easeOutQuad" },
            { scale: 1, rotate: 0, duration: 500, easing: "easeOutElastic(1, .5)" },
          ],
        });
        if (justStamped) {
          var cx = justStamped.offsetLeft + justStamped.offsetWidth / 2;
          var cy = justStamped.offsetTop + justStamped.offsetHeight / 2;
          spawnParticles(stampField, 7, function (el) {
            el.className = "fleck";
            el.style.left = cx + "px";
            el.style.top = cy + "px";
          }, function (el) {
            A({
              targets: el,
              translateX: A.random(-55, 55),
              translateY: A.random(-45, 45),
              scale: [1, 0],
              opacity: [0.8, 0],
              duration: 650,
              easing: "easeOutCubic",
              complete: function () { removeLater(el, 0); },
            });
          });
        }
      } else {
        sealBtn.animate(
          [{ transform: "scale(0.85) rotate(-6deg)" }, { transform: "scale(1)" }],
          { duration: 260, easing: "cubic-bezier(.2,1.6,.4,1)" }
        );
      }
    });
  }

  /* ---------- Hidden margin notes ---------- */
  var clipBtn = document.getElementById("clipBtn");
  if (clipBtn) {
    clipBtn.addEventListener("click", function () {
      document.getElementById("hiddenNotes").classList.add("revealed");
      clipBtn.textContent = "see? not invisible.";
      clipBtn.disabled = true;
      clipBtn.style.cursor = "default";
      Sound.pluck(660);
    });
  }

  /* ---------- Chess board ---------- */
  var boardEl = document.getElementById("chessboard");
  if (boardEl) {
    var winIndex = 8 * 4 + 3; // the one famous square
    for (var i = 0; i < 64; i++) {
      var sq = document.createElement("div");
      var row = Math.floor(i / 8);
      sq.className = "sq" + ((row + i) % 2 === 1 ? " dark" : "");
      if (i === winIndex) {
        sq.classList.add("win");
        sq.setAttribute("data-no-flip", "");
        sq.title = "?";
        sq.addEventListener("click", function (e) {
          document.getElementById("chessSecret").classList.add("revealed");
          Sound.pluck(523);
          Sound.pluck(784, 0.09);
          var target = e.currentTarget;
          var colors = ["#fbf5e9", "#c0758a", "#8e4d62", "#d9a96a"];
          spawnParticles(boardEl, 10, function (el, n) {
            el.className = "chess-fleck";
            el.style.left = target.offsetLeft + 12 + "px";
            el.style.top = target.offsetTop + 12 + "px";
            el.style.background = colors[n % colors.length];
          }, function (el) {
            A({
              targets: el,
              translateX: A.random(-75, 75),
              keyframes: [
                { translateY: A.random(-90, -30), duration: 380, easing: "easeOutQuad" },
                { translateY: 120, duration: 520, easing: "easeInQuad" },
              ],
              rotate: A.random(-270, 270),
              opacity: [{ value: 1, duration: 600 }, { value: 0, duration: 300 }],
              duration: 900,
              complete: function () { removeLater(el, 0); },
            });
          });
        });
      }
      boardEl.appendChild(sq);
    }
  }

  /* ---------- Stickers ---------- */
  var sheet = document.getElementById("stickerSheet");
  if (sheet) {
    var field = document.getElementById("stickerField");
    var spots = [
      { left: "8%", top: "12%", rot: -8 },
      { left: "62%", top: "6%", rot: 6 },
      { left: "30%", top: "38%", rot: -3 },
      { left: "70%", top: "48%", rot: 10 },
      { left: "12%", top: "58%", rot: 5 },
    ];
    var placed = [];
    try { placed = JSON.parse(localStorage.getItem("aseel-stickers") || "[]"); } catch (e) {}

    var place = function (idx, animate) {
      var btn = sheet.querySelector('[data-sticker="' + idx + '"]');
      if (!btn || btn.classList.contains("used")) return;
      btn.classList.add("used");
      var spot = spots[idx % spots.length];
      var d = document.createElement("div");
      d.className = "placed-sticker";
      d.style.left = spot.left;
      d.style.top = spot.top;
      d.style.setProperty("--rot", spot.rot + "deg");
      d.innerHTML = btn.querySelector("svg").outerHTML;
      if (!animate) {
        d.style.animation = "none";
      } else if (fx()) {
        d.style.animation = "none";
        field.appendChild(d);
        A({
          targets: d,
          scale: [1.9, 1],
          translateY: [-26, 0],
          rotate: [spot.rot - 24, spot.rot],
          opacity: [0, 1],
          duration: 680,
          easing: "easeOutElastic(1, .6)",
        });
        Sound.pluck(740);
        return;
      }
      field.appendChild(d);
      if (animate) Sound.pluck(740);
    };

    placed.forEach(function (idx) { place(idx, false); });
    sheet.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-sticker]");
      if (!btn || btn.classList.contains("used")) return;
      var idx = parseInt(btn.getAttribute("data-sticker"), 10);
      place(idx, true);
      if (placed.indexOf(idx) === -1) placed.push(idx);
      try { localStorage.setItem("aseel-stickers", JSON.stringify(placed)); } catch (e2) {}
    });
  }

  /* ---------- Rain ---------- */
  var rainWindow = document.getElementById("rainWindow");
  if (rainWindow) {
    for (var r = 0; r < 26; r++) {
      var drop = document.createElement("span");
      drop.className = "drop";
      drop.style.left = Math.random() * 100 + "%";
      drop.style.animationDuration = 0.9 + Math.random() * 0.9 + "s";
      drop.style.animationDelay = -Math.random() * 2 + "s";
      drop.style.opacity = 0.4 + Math.random() * 0.5;
      rainWindow.appendChild(drop);
    }
  }

  var rainBtn = document.getElementById("rainBtn");
  function resetRainBtn() {
    if (rainBtn) rainBtn.textContent = "🔊 tap for rain";
  }
  if (rainBtn) {
    rainBtn.addEventListener("click", function () {
      if (Sound.rainPlaying()) {
        Sound.rainOff();
        resetRainBtn();
      } else if (Sound.rainOn()) {
        rainBtn.textContent = "🔇 enough rain";
      }
    });
  }

  /* ---------- Voice page: floating music notes ---------- */
  var voiceBtn = document.getElementById("voiceBtn");
  if (voiceBtn) {
    var noteField = document.getElementById("noteField");
    var glyphs = ["♪", "♫", "♬", "♩"];
    var scale = [523, 587, 659, 784, 880, 1047];
    voiceBtn.addEventListener("click", function () {
      for (var n = 0; n < 6; n++) {
        Sound.pluck(scale[Math.min(n + (Math.random() < 0.5 ? 0 : 1), scale.length - 1)], n * 0.11);
      }
      spawnParticles(noteField, 7, function (el) {
        el.className = "music-note";
        el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
        el.style.left = 8 + Math.random() * 80 + "%";
      }, function (el, n) {
        A({
          targets: el,
          translateY: -(110 + Math.random() * 110),
          translateX: A.random(-35, 35),
          rotate: A.random(-28, 28),
          opacity: [
            { value: 0.9, duration: 250, easing: "easeOutQuad" },
            { value: 0, duration: 1100, delay: 450, easing: "easeInQuad" },
          ],
          duration: 1800,
          delay: n * 110,
          easing: "easeOutCubic",
          complete: function () { removeLater(el, 0); },
        });
      });
    });
  }

  /* ---------- Pet the cat ---------- */
  var petCat = document.getElementById("petCat");
  if (petCat) {
    var heartField = document.getElementById("heartField");
    var purrCountEl = document.getElementById("purrCount");
    var purrs = 0;
    try { purrs = parseInt(localStorage.getItem("aseel-purrs") || "0", 10) || 0; } catch (e) {}
    var showPurrs = function () {
      purrCountEl.textContent = "official purr count: " + purrs;
    };
    showPurrs();

    var blinkTimer = null;
    petCat.addEventListener("click", function () {
      purrs++;
      try { localStorage.setItem("aseel-purrs", String(purrs)); } catch (e) {}
      showPurrs();
      Sound.purr();
      petCat.classList.add("blink");
      clearTimeout(blinkTimer);
      blinkTimer = setTimeout(function () { petCat.classList.remove("blink"); }, 800);
      if (fx()) {
        A.remove(petCat.querySelector("svg"));
        A({
          targets: petCat.querySelector("svg"),
          scale: [1, 1.05, 1],
          duration: 600,
          easing: "easeOutQuad",
        });
      }
      spawnParticles(heartField, 4, function (el) {
        el.className = "float-heart";
        el.textContent = "♥";
        el.style.left = 30 + Math.random() * 40 + "%";
        el.style.top = 35 + Math.random() * 20 + "%";
      }, function (el, n) {
        A({
          targets: el,
          translateY: -(70 + Math.random() * 60),
          translateX: A.random(-25, 25),
          scale: [0.6, 1.1],
          opacity: [
            { value: 0.9, duration: 200, easing: "easeOutQuad" },
            { value: 0, duration: 900, delay: 250, easing: "easeInQuad" },
          ],
          duration: 1350,
          delay: n * 90,
          easing: "easeOutCubic",
          complete: function () { removeLater(el, 0); },
        });
      });
    });
  }

  /* ---------- Official forecast ---------- */
  var certifyBtn = document.getElementById("certifyBtn");
  if (certifyBtn) {
    var cards = Array.prototype.slice.call(document.querySelectorAll("#forecastStack .forecast-card"));
    var certified = 0;
    try { certified = Math.min(parseInt(localStorage.getItem("aseel-forecast") || "0", 10), cards.length); } catch (e) {}
    cards.slice(0, certified).forEach(function (c) {
      c.style.transition = "none";
      c.classList.add("on");
    });
    var doneLabel = function () {
      certifyBtn.textContent = "all certified";
      certifyBtn.disabled = true;
      certifyBtn.style.cursor = "default";
      certifyBtn.style.opacity = "0.55";
    };
    if (certified >= cards.length) doneLabel();

    certifyBtn.addEventListener("click", function () {
      if (certified >= cards.length) return;
      var card = cards[certified];
      certified++;
      try { localStorage.setItem("aseel-forecast", String(certified)); } catch (e) {}
      Sound.thump();
      if (fx()) {
        A.remove(certifyBtn);
        A({
          targets: certifyBtn,
          keyframes: [
            { scale: 0.8, rotate: -8, duration: 90, easing: "easeOutQuad" },
            { scale: 1, rotate: 0, duration: 480, easing: "easeOutElastic(1, .5)" },
          ],
        });
      }
      card.classList.add("on");
      if (certified >= cards.length) doneLabel();
    });
  }

  /* ---------- Write back ---------- */
  var replyBox = document.getElementById("replyBox");
  if (replyBox) {
    try { replyBox.value = localStorage.getItem("aseel-reply") || ""; } catch (e) {}
    replyBox.addEventListener("input", function () {
      try { localStorage.setItem("aseel-reply", replyBox.value); } catch (e) {}
    });
  }

  /* ---------- Bloom finale ---------- */
  var bloom = document.getElementById("bloom");
  if (bloom) {
    bloom.addEventListener("click", function () {
      var first = !bloom.classList.contains("bloomed");
      bloom.classList.add("bloomed");
      document.getElementById("bloomMessage").classList.add("on");
      if (!first) return;
      [523, 659, 784, 1047].forEach(function (f, n) { Sound.pluck(f, n * 0.1); });
      var stage = bloom.closest(".bloom-stage");
      var tints = ["#c0758a", "#d8a0b0", "#e7c3cd", "#d9a96a"];
      spawnParticles(stage, 34, function (el, n) {
        el.className = "burst-petal";
        el.style.background = tints[n % tints.length];
      }, function (el) {
        var ang = Math.random() * Math.PI * 2;
        var dist = 90 + Math.random() * 160;
        A({
          targets: el,
          translateX: Math.cos(ang) * dist,
          translateY: Math.sin(ang) * dist - 30,
          rotate: A.random(-540, 540),
          scale: [1, 0.4 + Math.random() * 0.5],
          opacity: [
            { value: 0.95, duration: 200, easing: "easeOutQuad" },
            { value: 0, duration: 1100, delay: 300, easing: "easeInQuad" },
          ],
          duration: 1300 + Math.random() * 500,
          easing: "easeOutCubic",
          complete: function () { removeLater(el, 0); },
        });
      });
    });
  }

  /* ---------- Sound toggle ---------- */
  var soundBtn = document.getElementById("soundBtn");
  function paintSoundBtn() {
    soundBtn.textContent = Sound.isEnabled() ? "♪ on" : "♪ off";
    soundBtn.classList.toggle("off", !Sound.isEnabled());
  }
  soundBtn.addEventListener("click", function () {
    Sound.setEnabled(!Sound.isEnabled());
    if (!Sound.isEnabled()) resetRainBtn();
    paintSoundBtn();
  });
  paintSoundBtn();

  /* ---------- Ambient petals ---------- */
  var ambient = document.getElementById("ambient");
  var petalCount = 8;
  (function buildAmbient() {
    ambient.innerHTML = "";
    if (REDUCED) return;
    for (var p = 0; p < petalCount; p++) {
      var el = document.createElement("span");
      el.className = "petal-float";
      el.style.left = Math.random() * 100 + "%";
      el.style.animationDuration = 11 + Math.random() * 14 + "s";
      el.style.animationDelay = -Math.random() * 24 + "s";
      el.style.setProperty("--sway", (Math.random() * 160 - 80) + "px");
      var sc = 0.5 + Math.random() * 0.9;
      el.style.width = 12 * sc + "px";
      el.style.height = 12 * sc + "px";
      el.style.opacity = 0.25 + Math.random() * 0.4;
      ambient.appendChild(el);
    }
  })();
})();
