/* ==========================================================================
   Revaldy & Sahla — standalone page logic
   Ported from the wahyu-wanda template (own repo/design) with the couple's
   own data swapped in, alert()/prompt() replaced by Mounstory.showToast
   (from ../assets/js/animations.js), and localStorage keys namespaced to
   this couple.
   ========================================================================== */

(function () {
  "use strict";

  var WEDDING_DATE = "2026-12-12T08:00:00+07:00";

  // Venue name/address are still "menyusul" so there's no address text to
  // build a maps embed query from — but a real pinned-location short link
  // is already available for the "Buka Google Maps" buttons.
  var VENUE_MAPS_URL = "https://maps.app.goo.gl/BMDCQ9hyKmEQxAAi8";

  var EVENT = {
    akad: {
      date: "Tanggal menyusul",
      time: "Waktu menyusul",
      venue: "Lokasi menyusul",
      address: "Alamat menyusul",
      mapQuery: null,
      mapsUrl: VENUE_MAPS_URL,
    },
    resepsi: {
      date: "Tanggal menyusul",
      time: "Waktu menyusul",
      venue: "Lokasi menyusul",
      address: "Alamat menyusul",
      mapQuery: null,
      mapsUrl: VENUE_MAPS_URL,
    },
  };
  var STORAGE_KEY = "revaldy_sahla_comments";
  var DEFAULT_COMMENTS = [];

  /* Guest name from ?to= ------------------------------------------------- */

  function getGuestName() {
    var params = new URLSearchParams(window.location.search);
    var name = params.get("to") || params.get("guest");
    if (!name || !name.trim()) return "Tamu Undangan";
    return name.trim();
  }

  document.getElementById("displayGuestName").textContent = getGuestName();
  document.getElementById("displayGuestNameHero").textContent = getGuestName();

  /* Event details into the DOM -------------------------------------------- */

  function fillEvent(prefix, info) {
    document.getElementById(prefix + "Date").textContent = info.date;
    document.getElementById(prefix + "Time").textContent = info.time;
    document.getElementById(prefix + "Venue").textContent = info.venue;
    document.getElementById(prefix + "Address").textContent = info.address;
    document.getElementById(prefix + "Maps").href = info.mapsUrl;
  }
  fillEvent("akad", EVENT.akad);
  fillEvent("resepsi", EVENT.resepsi);
  document.getElementById("heroDate").textContent = EVENT.akad.date;
  document.getElementById("heroVenue").textContent = EVENT.akad.venue;

  /* Music toggle ------------------------------------------------------------ */

  var musicToggle = document.getElementById("musicToggle");
  var audio = new Audio("audio/music.mp3");
  audio.loop = true;

  musicToggle.addEventListener("click", function () {
    if (audio.paused) {
      audio.play().catch(function () {
        Mounstory.showToast("Tidak dapat memutar musik saat ini");
      });
      musicToggle.classList.add("is-playing");
    } else {
      audio.pause();
      musicToggle.classList.remove("is-playing");
    }
  });

  /* Entrance portal + 3D curtain -------------------------------------------- */

  var btnOpen = document.getElementById("btnOpenInvitation");
  var coverCardWrap = document.getElementById("coverCardWrap");
  var curtainLeft = document.getElementById("curtainLeft");
  var curtainRight = document.getElementById("curtainRight");
  var lightBeam = document.getElementById("lightBeam");
  var entrancePortal = document.getElementById("entrancePortal");
  var portalBg = document.getElementById("portalBg");

  btnOpen.addEventListener("click", function () {
    audio.play().catch(function () {});
    musicToggle.classList.add("is-playing");

    coverCardWrap.style.opacity = "0";
    coverCardWrap.style.transform = "scale(0.92)";

    curtainLeft.classList.add("is-opening");
    curtainRight.classList.add("is-opening");
    lightBeam.classList.add("is-bursting");
    portalBg.style.opacity = "0";

    setTimeout(function () {
      entrancePortal.style.display = "none";
      // Scroll-reveal only starts observing once the curtain is actually gone —
      // starting it earlier would flag above-the-fold sections "visible" while
      // they're still hidden behind the curtain, so their fade-in plays out
      // invisibly and the guest never sees any motion once it opens.
      Mounstory.initScrollReveal();
    }, 5100);
  });

  /* Scroll down hint (welcome portal) --------------------------------------- */

  var btnScrollDown = document.getElementById("btnScrollDown");
  if (btnScrollDown) {
    btnScrollDown.addEventListener("click", function () {
      var next = document.getElementById("ayat-suci");
      if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* Countdown ----------------------------------------------------------------- */

  (function initCountdown() {
    var target = new Date(WEDDING_DATE).getTime();
    var fields = {
      days: document.querySelector('[data-unit="days"]'),
      hours: document.querySelector('[data-unit="hours"]'),
      minutes: document.querySelector('[data-unit="minutes"]'),
      seconds: document.querySelector('[data-unit="seconds"]'),
    };
    var previous = {};

    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function update() {
      var diff = target - Date.now();
      if (diff < 0) diff = 0;
      var values = {
        days: pad(Math.floor(diff / 86400000)),
        hours: pad(Math.floor((diff / 3600000) % 24)),
        minutes: pad(Math.floor((diff / 60000) % 60)),
        seconds: pad(Math.floor((diff / 1000) % 60)),
      };
      Object.keys(fields).forEach(function (key) {
        var el = fields[key];
        if (!el || previous[key] === values[key]) return;
        previous[key] = values[key];
        el.classList.add("is-updating");
        setTimeout(function () {
          el.textContent = values[key];
          el.classList.remove("is-updating");
        }, 150);
      });
    }
    update();
    setInterval(update, 1000);
  })();

  /* Google Calendar link -------------------------------------------------------- */

  (function initCalendarLink() {
    var d = new Date(WEDDING_DATE);
    var end = new Date(d.getTime() + 4 * 3600000);
    function fmt(dt) {
      return dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    }
    var url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent("The Wedding of Wahyu & Wanda") +
      "&dates=" + fmt(d) + "/" + fmt(end) +
      "&details=" + encodeURIComponent("Pernikahan Revaldy & Sahla") +
      "&location=" + encodeURIComponent(EVENT.akad.venue);
    document.getElementById("btnAddCalendar").href = url;
  })();

  /* Copy to clipboard (bank accounts) -------------------------------------------- */

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".bank-card__copy");
    if (!btn) return;
    var number = btn.closest(".bank-card").querySelector(".bank-card__number").textContent.trim();
    var done = function () {
      Mounstory.showToast("Nomor rekening disalin");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(number).then(done).catch(done);
    } else {
      done();
    }
  });

  /* Gallery lightbox ---------------------------------------------------------------- */

  (function initLightbox() {
    var grid = document.getElementById("galleryGrid");
    var modal = document.getElementById("lightboxModal");
    var img = document.getElementById("lightboxImg");
    grid.addEventListener("click", function (e) {
      if (e.target.tagName !== "IMG") return;
      img.src = e.target.src;
      modal.classList.add("is-open");
    });
    modal.addEventListener("click", function () {
      modal.classList.remove("is-open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") modal.classList.remove("is-open");
    });
  })();

  /* RSVP + guestbook (localStorage) --------------------------------------------------- */

  function loadComments() {
    var saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      saved = [];
    }
    var all = saved.length ? saved : DEFAULT_COMMENTS;
    var container = document.getElementById("commentsList");
    container.innerHTML = all
      .map(function (item) {
        var badgeClass = item.attendance === "Hadir" ? "comment-item__badge" : "comment-item__badge comment-item__badge--away";
        return (
          '<div class="comment-item">' +
          '<div class="comment-item__head">' +
          '<span class="comment-item__name">' + escapeHTML(item.name) + "</span>" +
          '<span class="' + badgeClass + '">' + escapeHTML(item.attendance) + "</span>" +
          "</div>" +
          '<p class="comment-item__message">' + escapeHTML(item.message) + "</p>" +
          "</div>"
        );
      })
      .join("");
  }

  function escapeHTML(str) {
    var div = document.createElement("div");
    div.textContent = String(str == null ? "" : str);
    return div.innerHTML;
  }

  document.getElementById("rsvpForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("rsvpName").value.trim();
    var attendance = document.getElementById("rsvpAttendance").value;
    var message = document.getElementById("rsvpMessage").value.trim();
    if (!name || !message) return;

    console.log("[RSVP submitted]", { name: name, attendance: attendance, message: message });

    var saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (err) {
      saved = [];
    }
    saved.unshift({ name: name, attendance: attendance, message: message });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    loadComments();
    this.reset();
    Mounstory.showToast("Terima kasih atas ucapan dan konfirmasi kehadirannya!");
  });

  loadComments();

  /* Location map (Akad / Resepsi tabs) ------------------------------------------------ */

  (function initLocationMap() {
    var card = document.querySelector(".location-card");
    var frame = document.getElementById("locationMapFrame");
    var address = document.getElementById("locationMapAddress");
    var tabs = document.querySelectorAll(".location-card__tab");
    if (!card || !frame) return;

    if (!EVENT.akad.mapQuery && !EVENT.resepsi.mapQuery) {
      card.style.display = "none";
      return;
    }

    function showTab(key) {
      var info = EVENT[key];
      if (!info || !info.mapQuery) return;
      frame.src = "https://maps.google.com/maps?q=" + encodeURIComponent(info.mapQuery) + "&hl=id&z=16&output=embed";
      address.textContent = info.venue + " — " + info.address;
      tabs.forEach(function (tab) {
        tab.classList.toggle("is-active", tab.dataset.mapTab === key);
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        showTab(tab.dataset.mapTab);
      });
    });

    showTab("akad");
  })();

  /* Love Story scroll-linked rail fill ------------------------------------------------ */

  (function initLoveStoryRail() {
    var container = document.getElementById("loveStory");
    var fill = document.getElementById("loveStoryRailFill");
    if (!container || !fill) return;

    function update() {
      var rect = container.getBoundingClientRect();
      var viewportH = window.innerHeight;
      var start = viewportH * 0.85;
      var progress = (start - rect.top) / (rect.height - viewportH * 0.5 + 1);
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;
      fill.style.height = (progress * 100) + "%";
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  })();

  /* Floating nav: scroll-spy + click-to-scroll ---------------------------------------- */

  (function initFloatingNav() {
    var nav = document.getElementById("floatingNav");
    if (!nav) return;
    var buttons = Array.prototype.slice.call(nav.querySelectorAll(".floating-nav__btn"));
    var sections = buttons
      .map(function (btn) {
        var el = document.getElementById(btn.dataset.navTarget);
        return el ? { id: btn.dataset.navTarget, el: el, btn: btn } : null;
      })
      .filter(Boolean);

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = document.getElementById(btn.dataset.navTarget);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    if (!sections.length || !("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var match = sections.find(function (s) {
            return s.el === entry.target;
          });
          if (!match) return;
          if (entry.isIntersecting) {
            buttons.forEach(function (btn) {
              btn.classList.toggle("is-active", btn === match.btn);
            });
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sections.forEach(function (s) {
      observer.observe(s.el);
    });
  })();

})();
