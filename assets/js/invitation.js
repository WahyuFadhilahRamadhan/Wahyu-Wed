/* ==========================================================================
   Mounstory — invitation.js
   Generic engine for every couple's invitation page. Reads that couple's
   data.json and renders the whole page from it, so duplicating /demo/ to
   /nama1-nama2/ only ever requires editing data.json + swapping images —
   never the HTML or JS.
   ========================================================================== */

(function (global) {
  "use strict";

  var Mounstory = (global.Mounstory = global.Mounstory || {});

  /** Escapes text before it is dropped into innerHTML. */
  function escapeHTML(str) {
    var div = document.createElement("div");
    div.textContent = String(str == null ? "" : str);
    return div.innerHTML;
  }

  /** Reads ?to= from the URL, decoded, falling back to a default. */
  function getGuestName() {
    var params = new URLSearchParams(window.location.search);
    var name = params.get("to");
    if (!name || !name.trim()) return "Tamu Undangan";
    return name.trim();
  }

  function fetchData(path) {
    return fetch(path, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("Gagal memuat data undangan: " + res.status);
      return res.json();
    });
  }

  /* ---------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------- */

  function renderText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null ? "" : value;
  }

  function renderAttr(id, attr, value) {
    var el = document.getElementById(id);
    if (el && value) el.setAttribute(attr, value);
  }

  function renderCouple(data) {
    document.title = data.meta.title || document.title;

    var shortNames = data.meta.coupleShort || "";
    renderText("coverNames", shortNames);
    renderText("greetingNames", shortNames);
    renderText("footerNames", shortNames);

    var guest = getGuestName();
    var guestEl = document.getElementById("guestName");
    if (guestEl) guestEl.textContent = guest;

    renderText("coverDate", data.event && data.event.coverDateLabel);

    ["groom", "bride"].forEach(function (role) {
      var person = data[role];
      if (!person) return;
      renderText(role + "FullName", person.fullName);
      renderText(role + "Order", person.childOrder);
      renderText(role + "Parents", person.parents);
      renderAttr(role + "Photo", "src", person.photo);
      renderAttr(role + "Photo", "alt", person.fullName);
    });
  }

  function renderEvent(data) {
    var eventKeys = data.event
      ? Object.keys(data.event).filter(function (key) {
          return key !== "weddingDate" && key !== "coverDateLabel";
        })
      : [];
    eventKeys.forEach(function (key) {
      var info = data.event && data.event[key];
      var card = document.querySelector('[data-event="' + key + '"]');
      if (!info || !card) {
        if (card) card.style.display = "none";
        return;
      }
      var setText = function (cls, value) {
        var el = card.querySelector(cls);
        if (el) el.textContent = value || "";
      };
      setText(".event-card__label", info.label);
      setText(".event-card__date", info.date);
      setText(".event-card__time", info.time);
      setText(".event-card__venue", info.venueName);
      setText(".event-card__address", info.address);
      var link = card.querySelector(".event-card__maps");
      if (link && info.mapsUrl) link.href = info.mapsUrl;
    });
  }

  function renderGallery(data) {
    var grid = document.getElementById("galleryGrid");
    if (!grid || !Array.isArray(data.gallery)) return;
    grid.innerHTML = data.gallery
      .map(function (src, i) {
        return (
          '<div class="gallery-grid__item reveal" data-index="' +
          i +
          '"><img src="' +
          escapeHTML(src) +
          '" alt="Momen ' +
          (i + 1) +
          '" loading="lazy"></div>'
        );
      })
      .join("");
  }

  function renderGift(data) {
    var gift = data.gift || {};
    renderText("giftNote", gift.note);

    var banksEl = document.getElementById("banksList");
    if (banksEl && Array.isArray(gift.banks)) {
      banksEl.innerHTML = gift.banks
        .map(function (bank) {
          return (
            '<div class="bank-card">' +
            '<div class="bank-card__info">' +
            '<strong>' + escapeHTML(bank.bankName) + '</strong>' +
            '<div class="bank-card__number">' + escapeHTML(bank.accountNumber) + '</div>' +
            '<div class="bank-card__name">a.n. ' + escapeHTML(bank.accountName) + '</div>' +
            '</div>' +
            '<button type="button" class="bank-card__copy" data-copy="' + escapeHTML(bank.accountNumber) + '">Salin</button>' +
            '</div>'
          );
        })
        .join("");
    }

    if (gift.qrisImage) {
      renderAttr("qrisImage", "src", gift.qrisImage);
      var qrisCard = document.getElementById("qrisCard");
      if (qrisCard) qrisCard.style.display = "";
    }
  }

  function wishItemHTML(wish) {
    var likes = wish.likes || 0;
    return (
      '<li class="wish-item">' +
      '<div class="wish-item__head">' +
      '<span class="wish-item__name">' + escapeHTML(wish.name) + '</span>' +
      '<span class="wish-item__status">' + escapeHTML(wish.attendance) + '</span>' +
      '</div>' +
      '<p class="wish-item__message">' + escapeHTML(wish.message) + '</p>' +
      '<button type="button" class="wish-item__like" data-likes="' + likes + '">' +
      '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.5 12c-2.5 4.5-9.5 9-9.5 9z"/></svg>' +
      '<span class="wish-item__like-count">' + likes + '</span>' +
      '</button>' +
      '</li>'
    );
  }

  function renderWishes(data) {
    var list = document.getElementById("wishesList");
    if (!list || !Array.isArray(data.wishes)) return;
    list.innerHTML = data.wishes.map(wishItemHTML).join("");
  }

  function initWishLikes() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".wish-item__like");
      if (!btn || btn.disabled) return;
      var likes = parseInt(btn.getAttribute("data-likes"), 10) || 0;
      likes += 1;
      btn.setAttribute("data-likes", likes);
      btn.querySelector(".wish-item__like-count").textContent = likes;
      btn.classList.add("is-liked");
      btn.disabled = true;
    });
  }

  /* ---------------------------------------------------------------------
     Love story timeline (optional — only renders if both the container
     and data.loveStory are present, so pages that skip it are unaffected)
     ------------------------------------------------------------------- */

  function renderLoveStory(data) {
    var list = document.getElementById("loveStoryTimeline");
    if (!list || !Array.isArray(data.loveStory)) return;
    list.innerHTML = data.loveStory
      .map(function (item) {
        return (
          '<div class="timeline-item reveal">' +
          '<span class="timeline-item__dot"></span>' +
          '<div class="timeline-item__content">' +
          '<span class="timeline-item__year">' + escapeHTML(item.year) + '</span>' +
          '<h3 class="timeline-item__title">' + escapeHTML(item.title) + '</h3>' +
          '<p class="timeline-item__date">' +
          escapeHTML(item.date) +
          (item.location ? ' &middot; ' + escapeHTML(item.location) : '') +
          '</p>' +
          '<p class="timeline-item__desc">' + escapeHTML(item.description) + '</p>' +
          '</div>' +
          '</div>'
        );
      })
      .join("");
  }

  /* ---------------------------------------------------------------------
     Cover open transition
     ------------------------------------------------------------------- */

  function initCover(onOpen) {
    var cover = document.getElementById("cover");
    var content = document.getElementById("invitationContent");
    var btn = document.getElementById("openInvitationBtn");
    if (!cover || !content || !btn) return;

    document.body.style.overflow = "hidden";

    btn.addEventListener("click", function () {
      cover.classList.add("is-closing");
      document.body.style.overflow = "";
      setTimeout(function () {
        content.classList.add("is-visible");
        // Scroll-reveal only starts observing once the cover is actually
        // dismissed — starting it earlier flags above-the-fold sections
        // "visible" while they're still hidden behind the cover, so their
        // fade-in plays out invisibly and the guest never sees any motion.
        Mounstory.initScrollReveal();
      }, 150);
      if (typeof onOpen === "function") onOpen();
    });
  }

  /* ---------------------------------------------------------------------
     Countdown
     ------------------------------------------------------------------- */

  function initCountdown(targetISO) {
    var root = document.getElementById("countdown");
    if (!root || !targetISO) return;

    var target = new Date(targetISO).getTime();
    var fields = {
      days: root.querySelector('[data-unit="days"]'),
      hours: root.querySelector('[data-unit="hours"]'),
      minutes: root.querySelector('[data-unit="minutes"]'),
      seconds: root.querySelector('[data-unit="seconds"]'),
    };
    var previous = {};

    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function update() {
      var diff = target - Date.now();
      if (diff < 0) diff = 0;

      var values = {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };

      Object.keys(fields).forEach(function (key) {
        var el = fields[key];
        if (!el) return;
        var display = key === "days" ? String(values[key]) : pad(values[key]);
        if (previous[key] === display) return;
        previous[key] = display;

        el.classList.add("is-updating");
        setTimeout(function () {
          el.textContent = display;
          el.classList.remove("is-updating");
        }, 150);
      });

      if (diff <= 0) clearInterval(timer);
    }

    update();
    var timer = setInterval(update, 1000);
  }

  /* ---------------------------------------------------------------------
     Music player
     ------------------------------------------------------------------- */

  function initMusicPlayer(src) {
    var toggle = document.getElementById("musicToggle");
    if (!toggle || !src) {
      if (toggle) toggle.style.display = "none";
      return;
    }

    var audio = new Audio(src);
    audio.loop = true;

    toggle.addEventListener("click", function () {
      if (audio.paused) {
        audio.play().catch(function () {
          Mounstory.showToast("Tidak dapat memutar musik saat ini");
        });
        toggle.classList.add("is-playing");
      } else {
        audio.pause();
        toggle.classList.remove("is-playing");
      }
    });
  }

  /* ---------------------------------------------------------------------
     RSVP form (dummy submit — no backend yet)
     ------------------------------------------------------------------- */

  function initRSVPForm() {
    var form = document.getElementById("rsvpForm");
    if (!form) return;
    var note = document.getElementById("rsvpNote");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var payload = {
        name: form.elements.rsvpName.value.trim(),
        guests: form.elements.rsvpGuests ? form.elements.rsvpGuests.value : undefined,
        attendance: form.elements.rsvpAttendance.value,
      };
      console.log("[RSVP submitted]", payload);

      if (note) {
        note.textContent = "Terima kasih, " + (payload.name || "Tamu") + "! Konfirmasi kehadiranmu sudah kami catat.";
        note.classList.add("is-visible");
      }
      form.reset();
    });
  }

  /* ---------------------------------------------------------------------
     Wishes form (client-side only, prepends to the visible list)
     ------------------------------------------------------------------- */

  function initWishesForm() {
    var form = document.getElementById("wishesForm");
    var list = document.getElementById("wishesList");
    if (!form || !list) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var wish = {
        name: form.elements.wishName.value.trim() || "Tamu Undangan",
        attendance: form.elements.wishAttendance.value,
        message: form.elements.wishMessage.value.trim(),
      };
      if (!wish.message) return;

      console.log("[Wish submitted]", wish);
      list.insertAdjacentHTML("afterbegin", wishItemHTML(wish));
      form.reset();
      Mounstory.showToast("Ucapan terkirim, terima kasih!");
    });
  }

  /* ---------------------------------------------------------------------
     Copy-to-clipboard for bank account numbers
     ------------------------------------------------------------------- */

  function initCopyButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-copy]");
      if (!btn) return;
      var value = btn.getAttribute("data-copy");

      var done = function () {
        Mounstory.showToast("Nomor rekening disalin");
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done).catch(done);
      } else {
        done();
      }
    });
  }

  /* ---------------------------------------------------------------------
     Gallery lightbox
     ------------------------------------------------------------------- */

  function initGalleryLightbox() {
    var grid = document.getElementById("galleryGrid");
    var lightbox = document.getElementById("lightbox");
    if (!grid || !lightbox) return;

    var img = lightbox.querySelector("img");
    var closeBtn = lightbox.querySelector(".lightbox__close");

    grid.addEventListener("click", function (e) {
      var item = e.target.closest(".gallery-grid__item");
      if (!item) return;
      var src = item.querySelector("img").getAttribute("src");
      img.setAttribute("src", src);
      lightbox.classList.add("is-open");
    });

    function close() {
      lightbox.classList.remove("is-open");
    }

    closeBtn.addEventListener("click", close);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------- */

  function init(dataPath) {
    document.body.classList.add("invitation-body");

    fetchData(dataPath)
      .then(function (data) {
        renderCouple(data);
        renderEvent(data);
        renderGallery(data);
        renderGift(data);
        renderWishes(data);
        renderLoveStory(data);

        initCover(function () {
          if (data.meta && data.meta.musicSrc) {
            var toggle = document.getElementById("musicToggle");
            if (toggle) toggle.click();
          }
        });
        initCountdown(data.event && data.event.weddingDate);
        initMusicPlayer(data.meta && data.meta.musicSrc);
        initRSVPForm();
        initWishesForm();
        initWishLikes();
        initCopyButtons();
        initGalleryLightbox();
      })
      .catch(function (err) {
        console.error(err);
        Mounstory.showToast("Gagal memuat data undangan");
      });
  }

  Mounstory.Invitation = {
    init: init,
    getGuestName: getGuestName,
  };
})(window);
