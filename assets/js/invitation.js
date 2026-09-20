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

  /** Rides out a brief network hiccup (very plausible on mobile, or when
      the invitation link goes out to a group and many guests load the
      page around the same time) instead of failing on the first blip. */
  function fetchDataWithRetry(path, retriesLeft) {
    retriesLeft = retriesLeft == null ? 2 : retriesLeft;
    return fetchData(path).catch(function (err) {
      if (retriesLeft <= 0) throw err;
      return new Promise(function (resolve) {
        setTimeout(resolve, 800);
      }).then(function () {
        return fetchDataWithRetry(path, retriesLeft - 1);
      });
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
    renderText("thanksNames", shortNames);
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
      .map(function (item, index) {
        var direction = index % 2 === 0 ? "reveal--left" : "reveal--right";
        return (
          '<div class="timeline-item reveal ' + direction + '">' +
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
      // Ask the browser to go fullscreen so the address bar disappears.
      // Must fire inside this click handler — it's the user gesture the
      // Fullscreen API requires. Not all browsers support it (notably iOS
      // Safari for non-video elements), so this is a silent no-op there.
      var docEl = document.documentElement;
      var requestFullscreen =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.msRequestFullscreen;
      if (requestFullscreen) {
        var fsResult = requestFullscreen.call(docEl);
        if (fsResult && typeof fsResult.catch === "function") {
          fsResult.catch(function () {});
        }
      }

      cover.classList.add("is-closing");
      document.body.style.overflow = "";
      setTimeout(function () {
        content.classList.add("is-visible");
        // Scroll-reveal only starts observing once the cover is actually
        // dismissed — starting it earlier flags above-the-fold sections
        // "visible" while they're still hidden behind the cover, so their
        // fade-in plays out invisibly and the guest never sees any motion.
        // .bg-reveal is the same observer, applied to full-bleed section
        // photos instead of text content (see base.css).
        Mounstory.initScrollReveal(".reveal, .bg-reveal");
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
     Optional private webhook (e.g. a Google Apps Script Web App tied to
     the couple's own Sheet) — fire-and-forget so a slow/failed request
     never blocks the guest's own submit flow. no-cors means the response
     is unreadable here, which is fine: we don't need to confirm delivery
     client-side, just best-effort send it.
     ------------------------------------------------------------------- */

  function postToWebhook(url, payload) {
    if (!url || typeof fetch !== "function") return;
    try {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      }).catch(function () {});
    } catch (err) {
      /* best-effort only */
    }
  }

  /* ---------------------------------------------------------------------
     RSVP form
     ------------------------------------------------------------------- */

  function initRSVPForm(data) {
    var form = document.getElementById("rsvpForm");
    if (!form) return;
    var note = document.getElementById("rsvpNote");
    var webhookUrl = data && data.integrations && data.integrations.webhookUrl;
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // A guest double-tapping "Kirim Konfirmasi" (slow connection, or
      // just impatience) used to fire this twice — two identical rows in
      // the couple's sheet. Briefly disabling the button makes a second,
      // near-instant tap a no-op, while still allowing a genuine second
      // submission (e.g. correcting a typo) moments later.
      if (submitBtn && submitBtn.disabled) return;
      if (submitBtn) submitBtn.disabled = true;

      var payload = {
        name: form.elements.rsvpName.value.trim(),
        guests: form.elements.rsvpGuests ? form.elements.rsvpGuests.value : undefined,
        attendance: form.elements.rsvpAttendance.value,
      };
      console.log("[RSVP submitted]", payload);
      postToWebhook(webhookUrl, Object.assign({ type: "rsvp" }, payload));

      if (note) {
        note.textContent = "Terima kasih, " + (payload.name || "Tamu") + "! Konfirmasi kehadiranmu sudah kami catat.";
        note.classList.add("is-visible");
      }
      form.reset();
      if (submitBtn) setTimeout(function () { submitBtn.disabled = false; }, 1500);
    });
  }

  /* ---------------------------------------------------------------------
     Wishes form — prepends to the visible list only on pages that keep
     one (id="wishesList"); pages without it (a private-only guestbook)
     still submit and forward to the webhook, just skip the visual insert.
     ------------------------------------------------------------------- */

  function initWishesForm(data) {
    var form = document.getElementById("wishesForm");
    if (!form) return;
    var list = document.getElementById("wishesList");
    var webhookUrl = data && data.integrations && data.integrations.webhookUrl;
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitBtn && submitBtn.disabled) return;

      var wish = {
        name: form.elements.wishName.value.trim() || "Tamu Undangan",
        attendance: form.elements.wishAttendance ? form.elements.wishAttendance.value : undefined,
        message: form.elements.wishMessage.value.trim(),
      };
      if (!wish.message) return;

      // Same double-tap guard as RSVP — see the comment there.
      if (submitBtn) {
        submitBtn.disabled = true;
        setTimeout(function () { submitBtn.disabled = false; }, 1500);
      }

      console.log("[Wish submitted]", wish);
      postToWebhook(webhookUrl, Object.assign({ type: "wish" }, wish));
      if (list) list.insertAdjacentHTML("afterbegin", wishItemHTML(wish));
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
     Gift modal (optional — only wires up if a page includes a
     [data-open-gift] trigger and #giftModal, so pages that keep the
     inline bank-card layout are completely unaffected)
     ------------------------------------------------------------------- */

  function initGiftModal() {
    var modal = document.getElementById("giftModal");
    var openBtn = document.querySelector("[data-open-gift]");
    if (!modal || !openBtn) return;

    var closeBtn = modal.querySelector("[data-close-gift]");

    function open() {
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    function close() {
      modal.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
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

    var dataReady = fetchDataWithRetry(dataPath);

    // The cover has to work no matter what — a guest stuck staring at a
    // dead "Buka Undangan" button because of one bad network blip is a
    // total failure of the invitation, even though the richer content
    // behind it can't render without data.json. So this does not wait on
    // the fetch; only the optional auto-play-music step (which needs
    // data.meta.musicSrc) does, and it's written to just skip quietly if
    // data never arrives.
    initCover(function () {
      dataReady
        .then(function (data) {
          if (data.meta && data.meta.musicSrc) {
            var toggle = document.getElementById("musicToggle");
            if (toggle) toggle.click();
          }
        })
        .catch(function () {});
    });

    dataReady
      .then(function (data) {
        renderCouple(data);
        renderEvent(data);
        renderGallery(data);
        renderGift(data);
        renderWishes(data);
        renderLoveStory(data);

        initCountdown(data.event && data.event.weddingDate);
        initMusicPlayer(data.meta && data.meta.musicSrc);
        initRSVPForm(data);
        initWishesForm(data);
        initWishLikes();
        initCopyButtons();
        initGalleryLightbox();
        initGiftModal();
      })
      .catch(function (err) {
        console.error(err);
        Mounstory.showToast("Sebagian konten gagal dimuat. Coba muat ulang halaman.");
      });
  }

  Mounstory.Invitation = {
    init: init,
    getGuestName: getGuestName,
  };
})(window);
