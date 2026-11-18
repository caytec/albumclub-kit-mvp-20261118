(function () {
  "use strict";

  var API_URL = typeof window.API_URL === "string" ? window.API_URL.trim() : "";
  var currentUrl = new URL(window.location.href);
  currentUrl.search = "";
  currentUrl.hash = "";

  if (!currentUrl.pathname.endsWith("/")) {
    currentUrl.pathname = currentUrl.pathname.replace(/\/[^/]*$/, "/");
  }

  var SITE_URL = currentUrl.href;
  var form = document.getElementById("kit-form");
  var button = document.getElementById("generate");
  var status = document.getElementById("status");
  var formError = document.getElementById("form-error");
  var results = document.getElementById("results");
  var output = document.getElementById("kit-output");
  var busy = false;
  var latest = null;

  function text(value, max) {
    return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
  }

  function safeString(value, max) {
    return typeof value === "string" &&
      value.length <= max &&
      !/[<>]/.test(value);
  }

  function readInput() {
    var rawTracks = document.getElementById("tracks").value.split(/\r?\n/);
    var tracks = rawTracks.map(function (item) {
      return text(item, 100);
    }).filter(Boolean).slice(0, 15);

    var rawGroupSize = text(document.getElementById("groupSize").value, 3);
    var numericGroupSize = Number(rawGroupSize);

    if (!Number.isInteger(numericGroupSize) || numericGroupSize < 1 || numericGroupSize > 999) {
      rawGroupSize = "";
    }

    return {
      album: text(document.getElementById("album").value, 100),
      artist: text(document.getElementById("artist").value, 100),
      tracks: tracks,
      context: document.getElementById("context").value,
      depth: document.getElementById("depth").value,
      groupSize: rawGroupSize,
      favorite: text(document.getElementById("favorite").value, 100),
      least: text(document.getElementById("least").value, 100),
      impression: text(document.getElementById("impression").value, 500),
      spoilers: document.getElementById("spoilers").checked
    };
  }

  function validInput(input) {
    return input &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      safeString(input.album, 100) &&
      safeString(input.artist, 100) &&
      Array.isArray(input.tracks) &&
      input.tracks.length >= 3 &&
      input.tracks.length <= 15 &&
      input.tracks.every(function (track) {
        return safeString(track, 100);
      }) &&
      safeString(input.context, 30) &&
      safeString(input.depth, 30) &&
      safeString(input.groupSize || "", 3) &&
      safeString(input.favorite || "", 100) &&
      safeString(input.least || "", 100) &&
      safeString(input.impression || "", 500) &&
      typeof input.spoilers === "boolean";
  }

  function fallback(input) {
    var tracks = input.tracks;
    var questions = [
      "What stands out about the album as a complete listening experience?",
      "How does the opening track establish the mood or expectations?",
      "Where do you hear the biggest change in direction?",
      "Which track feels most different from the rest, and why?",
      "Which two neighboring tracks make the most interesting pair?",
      "Which track would you introduce to someone new to this artist?",
      "Which moment surprised you most on first listen?",
      "What would you keep, remove, or reorder, and why?",
      "Which track connected with you most personally?",
      "What rating would you give the album today, and what might change it?"
    ];

    if (input.favorite) {
      questions[8] = "What makes “" + input.favorite + "” connect with you most personally?";
    }

    if (input.least) {
      questions[3] = "What about “" + input.least + "” challenges or changes your view of the album?";
    }

    if (input.impression) {
      questions[0] = "How does your first impression — “" + input.impression + "” — compare with your response after a full listen?";
    }

    var prompts = tracks.map(function (track, index) {
      var templates = [
        "What detail first caught your attention in “" + track + "”?",
        "How does “" + track + "” relate to the track before it?",
        "What role does “" + track + "” play in the album’s overall flow?"
      ];

      return {
        track: track,
        prompt: templates[index % templates.length]
      };
    });

    var groupText = input.groupSize ? " for a group of " + input.groupSize : "";
    var spoilerText = input.spoilers ? " The group can discuss narrative or thematic surprises openly." : "";

    return {
      album: input.album,
      artist: input.artist,
      overview: ("A " + input.depth.toLowerCase() + " conversation about “" + input.album + "” by " + input.artist + groupText + ", grounded in your group’s listening experience." + spoilerText).slice(0, 700),
      questions: questions,
      prompts: prompts,
      poll: {
        question: "Which track was the most surprising?",
        options: tracks.slice(0, 4)
      },
      agenda: [
        "5 min — Share a first impression without defending it.",
        "20 min — Compare the opening, midpoint, and closing tracks.",
        "10 min — Discuss the track prompts and vote in the poll.",
        "5 min — Choose a group rating and one track to revisit."
      ],
      rating: "Group rating: ____ / 10"
    };
  }

  function validKit(item, input) {
    return item &&
      safeString(item.overview, 700) &&
      Array.isArray(item.questions) &&
      item.questions.length === 10 &&
      item.questions.every(function (value) {
        return safeString(value, 300);
      }) &&
      Array.isArray(item.prompts) &&
      item.prompts.length === input.tracks.length &&
      item.prompts.every(function (value) {
        return value &&
          safeString(value.track, 100) &&
          safeString(value.prompt, 300);
      }) &&
      item.poll &&
      safeString(item.poll.question, 300) &&
      Array.isArray(item.poll.options) &&
      item.poll.options.length >= 2 &&
      item.poll.options.length <= 4 &&
      item.poll.options.every(function (value) {
        return safeString(value, 100);
      }) &&
      Array.isArray(item.agenda) &&
      item.agenda.length >= 3 &&
      item.agenda.length <= 5 &&
      item.agenda.every(function (value) {
        return safeString(value, 300);
      }) &&
      safeString(item.rating, 100);
  }

  async function requestKit(input) {
    if (!API_URL) {
      return null;
    }

    var response = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    var data = await response.json();

    if (!validKit(data, input)) {
      throw new Error("Invalid kit");
    }

    return data;
  }

  function encodedUrl(input, kit) {
    var data = {v: 1, input: input, kit: kit};
    var encoded = encodeURIComponent(
      btoa(unescape(encodeURIComponent(JSON.stringify(data))))
    );
    var url = SITE_URL + "?d=" + encoded;

    return url.length <= 8000 ? url : "";
  }

  function decodeUrl() {
    var value = new URLSearchParams(window.location.search).get("d");

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(
        decodeURIComponent(escape(atob(decodeURIComponent(value))))
      );
    } catch (error) {
      return null;
    }
  }

  function editable(value, className, labelText) {
    var field = document.createElement("textarea");
    field.className = className || "editable";
    field.value = value;
    field.rows = 2;
    field.setAttribute("aria-label", labelText || "Editable generated text");
    return field;
  }

  function announceResults(message) {
    status.textContent = message;
    var resultsTitle = document.getElementById("results-title");
    resultsTitle.focus();
  }

  function render(kit, input, shouldFocus) {
    latest = {kit: kit, input: input};
    output.textContent = "";

    document.getElementById("results-title").textContent = input.album;
    document.getElementById("result-meta").textContent =
      input.artist + " · " + input.context + " · " + input.depth;

    var card = document.createElement("article");
    card.className = "result-card";

    var title = document.createElement("h3");
    title.textContent = input.album + " — " + input.artist;
    card.appendChild(title);

    card.appendChild(editable(kit.overview, "editable", "Editable album overview"));

    var qTitle = document.createElement("h3");
    qTitle.textContent = "10 discussion questions";
    card.appendChild(qTitle);

    kit.questions.forEach(function (question, index) {
      var row = document.createElement("div");
      row.className = "question";

      var label = document.createElement("label");
      label.textContent = (index + 1) + ".";
      label.appendChild(editable(question, "editable", "Editable discussion question " + (index + 1)));
      row.appendChild(label);
      card.appendChild(row);
    });

    var tTitle = document.createElement("h3");
    tTitle.textContent = "Track-by-track prompts";
    card.appendChild(tTitle);

    kit.prompts.forEach(function (item) {
      var label = document.createElement("label");
      label.textContent = item.track;
      label.appendChild(editable(item.prompt, "editable", "Editable prompt for " + item.track));
      card.appendChild(label);
    });

    var pTitle = document.createElement("h3");
    pTitle.textContent = "Group poll";
    card.appendChild(pTitle);
    card.appendChild(editable(kit.poll.question, "editable", "Editable group poll question"));

    var options = document.createElement("p");
    options.textContent = "Options: " + kit.poll.options.join(" · ");
    card.appendChild(options);

    var aTitle = document.createElement("h3");
    aTitle.textContent = "Listening-club agenda";
    card.appendChild(aTitle);

    var agenda = document.createElement("ul");

    kit.agenda.forEach(function (item, index) {
      var li = document.createElement("li");
      li.appendChild(editable(item, "editable", "Editable agenda item " + (index + 1)));
      agenda.appendChild(li);
    });

    card.appendChild(agenda);
    card.appendChild(editable(kit.rating, "editable", "Editable group rating"));
    output.appendChild(card);

    var resultUrl = encodedUrl(input, kit);
    document.getElementById("result-url").value = resultUrl ||
      "This kit is too large to encode into a share URL.";

    results.hidden = false;

    if (shouldFocus) {
      announceResults("Kit ready. Results are now displayed below.");
    }
  }

  function allText() {
    return Array.prototype.map.call(
      output.querySelectorAll("textarea"),
      function (item) {
        return item.value;
      }
    ).join("\n");
  }

  async function copy(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        var fallbackField = document.createElement("textarea");
        fallbackField.value = value;
        fallbackField.style.position = "fixed";
        fallbackField.style.opacity = "0";
        document.body.appendChild(fallbackField);
        fallbackField.focus();
        fallbackField.select();
        document.execCommand("copy");
        fallbackField.remove();
      }

      status.textContent = "Copied to your clipboard.";
    } catch (error) {
      status.textContent = "Copy failed. Select and copy the text manually.";
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    var input = readInput();
    formError.textContent = "";

    if (!input.album || !input.artist || input.tracks.length < 3) {
      formError.textContent = "Add an album, artist, and at least three non-empty tracks.";
      return;
    }

    busy = true;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Building…";
    status.textContent = "Building your discussion kit.";

    var local = fallback(input);
    render(local, input, false);

    if (!API_URL) {
      status.textContent = "Rules-only kit ready. Edit any prompt before sharing.";
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = "Generate discussion kit";
      busy = false;
      announceResults("Rules-only kit ready. Results are now displayed below.");
      return;
    }

    try {
      var remote = await requestKit(input);

      if (remote) {
        render(remote, input, false);
      }

      status.textContent = "Kit ready. Edit any prompt before sharing.";
      announceResults("Kit ready. Results are now displayed below.");
    } catch (error) {
      status.textContent = "The API was unavailable. A rules-only kit is ready.";
      document.getElementById("results-title").focus();
    } finally {
      busy = false;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = "Generate discussion kit";
      results.scrollIntoView({behavior: "smooth", block: "start"});
    }
  });

  document.getElementById("copyAll").addEventListener("click", function () {
    if (latest) {
      copy(allText());
    }
  });

  document.getElementById("copyShare").addEventListener("click", function () {
    if (!latest) {
      return;
    }

    var url = document.getElementById("result-url").value;
    copy(
      latest.input.album + " — " + latest.input.artist +
      "\n\n" + latest.kit.questions.slice(0, 3).join("\n") +
      "\n\nPoll: " + latest.kit.poll.question +
      "\n\nMake your own kit: " + url
    );
  });

  document.getElementById("share").addEventListener("click", async function () {
    if (!latest) {
      return;
    }

    var url = document.getElementById("result-url").value;

    try {
      if (navigator.share && url.indexOf("This kit is too large") !== 0) {
        await navigator.share({
          title: latest.input.album + " discussion kit",
          text: "Join this album discussion.",
          url: url
        });
        status.textContent = "Share sheet opened.";
      } else {
        await copy(url);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        await copy(url);
      } else {
        status.textContent = "Share canceled.";
      }
    }
  });

  document.getElementById("download").addEventListener("click", function () {
    if (!latest) {
      return;
    }

    var canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 900;

    var ctx = canvas.getContext("2d");

    if (!ctx) {
      status.textContent = "Card export is unavailable in this browser.";
      return;
    }

    ctx.fillStyle = "#19132d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffca70";
    ctx.font = "bold 48px system-ui";
    ctx.fillText(latest.input.album.slice(0, 30), 70, 100);

    ctx.fillStyle = "#f7f4ff";
    ctx.font = "28px system-ui";
    ctx.fillText(latest.input.artist.slice(0, 45), 70, 150);

    ctx.font = "24px system-ui";

    latest.kit.questions.slice(0, 3).forEach(function (question, index) {
      var lines = wrapText(ctx, question, 1020);

      lines.forEach(function (line, lineIndex) {
        ctx.fillText(
          (lineIndex === 0 ? (index + 1) + ". " : "    ") + line,
          70,
          260 + index * 150 + lineIndex * 32
        );
      });
    });

    ctx.fillStyle = "#ffca70";
    ctx.font = "bold 22px system-ui";
    ctx.fillText("AlbumClub Kit · Create your own discussion", 70, 820);

    var link = document.createElement("a");
    link.download = "albumclub-kit-card";
    link.href = canvas.toDataURL("image/png");
    link.click();

    status.textContent = "Discussion card downloaded.";
  });

  document.getElementById("new-kit").addEventListener("click", function () {
    results.hidden = true;
    document.getElementById("album").focus();
  });

  var shared = decodeUrl();

  if (
    shared &&
    validInput(shared.input) &&
    shared.kit &&
    validKit(shared.kit, shared.input)
  ) {
    render(shared.kit, shared.input, false);
    status.textContent = "Shared kit loaded. You can edit it before copying.";
  }
}());