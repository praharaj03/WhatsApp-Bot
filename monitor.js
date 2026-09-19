const http = require("http");

const PORT = Number(process.env.BOT_DASHBOARD_PORT || 3000);

function createMonitor() {
  const state = {
    status: "starting",
    authenticated: false,
    ready: false,
    connected: false,
    lastEvent: "starting",
    lastEventAt: new Date().toISOString(),
    lastError: null,
    loading: null,
    whatsappState: null,
    messages: 0,
    startedAt: new Date().toISOString(),
    llm: {
      provider: null,
      model: null,
      mood: null,
      moodLabel: null,
      usage: { messages: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    },
    moods: []
  };

  function update(event, values) {
    Object.assign(state, values, {
      lastEvent: event,
      lastEventAt: new Date().toISOString()
    });
    console.log(`[MONITOR] ${event}`);
  }

  function json(res, code, payload) {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
  }

  function setMoods(moods) {
    state.moods = moods.map((m) => ({ ...m, active: m.name === state.llm.mood }));
  }

  function setLlmInfo(info) {
    state.llm = {
      ...state.llm,
      provider: info.provider || state.llm.provider,
      model: info.model || state.llm.model,
      mood: info.mood || state.llm.mood,
      moodLabel: info.moodLabel || state.llm.moodLabel
    };
    state.moods = state.moods.map((m) => ({ ...m, active: m.name === state.llm.mood }));
  }

  function setUsage(usage) {
    state.llm.usage = { ...state.llm.usage, ...usage };
  }

  const server = http.createServer((request, response) => {
    if (request.url === "/api/status") {
      return json(response, 200, state);
    }
    if (request.url === "/api/moods") {
      return json(response, 200, state.moods);
    }
    if (request.url === "/api/usage") {
      return json(response, 200, state.llm.usage);
    }
    if (request.url.startsWith("/api/moods/")) {
      const name = decodeURIComponent(request.url.slice("/api/moods/".length));
      state.moods = state.moods.map((m) => ({ ...m, active: m.name === name }));
      update("mood", { lastError: null });
      console.log(`[MONITOR] Mood changed to "${name}"`);
      return json(response, 200, { ok: true, mood: name });
    }
    if (request.url !== "/" && request.url !== "/dashboard") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(renderDashboard());
  });

  server.on("error", error => {
    console.error(`[MONITOR] Dashboard unavailable on port ${PORT}:`, error.message);
  });
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`[MONITOR] Dashboard: http://127.0.0.1:${PORT}`);
  });

  return {
    state,
    event: update,
    message() {
      state.messages += 1;
    },
    error(error) {
      const message = error && error.stack ? error.stack : String(error);
      update("error", { status: "error", lastError: message, ready: false, connected: false });
    },
    llmUsage: setUsage,
    llmInfo: setLlmInfo,
    moods: setMoods
  };
}

function renderDashboard() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>InsideBot Dashboard</title>
<style>
  :root{
    --bg1:#000;--bg2:#000;--bg3:#000;
    --txt:#f0f3ff;--muted:#8b93ad;--line:rgba(255,255,255,.12);
    --glass:linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.03));
    --glass2:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02));
    --green:#34d399;--amber:#fbbf24;--red:#fb7185;--blue:#60a5fa;--violet:#a78bfa;--pink:#f472b6;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    min-height:100vh;
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,Inter,sans-serif;
    color:var(--txt);
    background:
      radial-gradient(1200px 600px at 15% -10%, rgba(255,255,255,.05), transparent 60%),
      radial-gradient(1000px 500px at 110% 110%, rgba(255,255,255,.04), transparent 55%),
      #000;
    background-attachment:fixed;
    overflow-x:hidden;
  }
  .blob{position:fixed;border-radius:50%;filter:blur(120px);opacity:.12;z-index:-1;pointer-events:none}
  .blob.b1{width:520px;height:520px;top:-160px;right:-120px;background:#ffffff}
  .blob.b2{width:420px;height:420px;bottom:-140px;left:-140px;background:#ffffff}
  .blob.b3{width:300px;height:300px;top:40%;left:55%;background:#ffffff}
  .wrap{max-width:1120px;margin:0 auto;padding:48px 24px 72px}
  .glass{
    position:relative;
    background:var(--glass2);
    border:1px solid rgba(255,255,255,.14);
    border-radius:26px;
    backdrop-filter:blur(28px) saturate(160%);
    -webkit-backdrop-filter:blur(28px) saturate(160%);
    box-shadow:0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.16), inset 0 -1px 0 rgba(255,255,255,.04);
  }
  .glass::before{
    content:"";
    position:absolute;inset:0;border-radius:inherit;
    background:linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,0) 40%);
    pointer-events:none;
  }
  header{margin-bottom:34px}
  .logo{display:flex;align-items:center;gap:18px}
  .icon{
    width:58px;height:58px;border-radius:18px;
    display:grid;place-items:center;font-size:28px;
    background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.04));
    border:1px solid rgba(255,255,255,.18);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.25), 0 10px 30px rgba(0,0,0,.5);
  }
  h1{font-size:26px;font-weight:700;letter-spacing:-.02em}
  .sub{color:var(--muted);font-size:13.5px;margin-top:4px}
  .pill{
    display:inline-flex;align-items:center;gap:8px;margin-left:auto;
    font-size:12.5px;font-weight:600;color:var(--txt);
    padding:8px 14px;border-radius:999px;background:var(--glass);border:1px solid var(--line);
  }
  .dot{width:9px;height:9px;border-radius:50%;background:var(--amber);box-shadow:0 0 0 0 var(--amber);animation:pulse 1.6s infinite}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(251,191,36,.55)}70%{box-shadow:0 0 0 9px rgba(251,191,36,0)}100%{box-shadow:0 0 0 0 rgba(251,191,36,0)}}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:26px}
  .card{padding:22px 22px}
  .label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.09em;font-weight:600}
  .value{font-size:30px;font-weight:700;margin-top:10px;letter-spacing:-.01em}
  .value small{font-size:15px;color:var(--muted);font-weight:500}
  .ok{color:var(--green)}.warn{color:var(--amber)}.bad{color:var(--red)}.blue{color:var(--blue)}.vio{color:var(--violet)}
  .row{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
  .bar{height:9px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:10px}
  .bar > i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--blue),var(--violet));width:0%;transition:width .7s cubic-bezier(.2,.8,.2,1)}
  .chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
  .chip{
    display:inline-flex;align-items:center;gap:8px;
    padding:10px 16px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;
    background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.04));
    border:1px solid rgba(255,255,255,.18);color:var(--txt);
    backdrop-filter:blur(14px) saturate(150%);
    -webkit-backdrop-filter:blur(14px) saturate(150%);
    transition:transform .15s ease, background .2s ease, border-color .2s ease;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.22), 0 6px 18px rgba(0,0,0,.45);
  }
  .chip:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.38)}
  .chip.active{
    background:linear-gradient(135deg,rgba(255,255,255,.22),rgba(255,255,255,.08));
    border-color:rgba(255,255,255,.55);
    box-shadow:0 10px 26px rgba(255,255,255,.14), inset 0 1px 0 rgba(255,255,255,.35);
  }
  .moods,.stats{display:grid;gap:18px;margin-top:18px}
  pre{
    white-space:pre-wrap;color:#b9c2e6;font-size:12px;line-height:1.55;
    padding:20px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);margin-top:18px;
    max-height:340px;overflow:auto;
  }
  .foot{color:var(--muted);font-size:12px;text-align:center;margin-top:34px}
</style>
</head>
<body>
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="wrap">
    <header>
      <div class="logo">
        <div class="icon">🤖</div>
        <div>
          <h1>InsideBot</h1>
          <div class="sub">WhatsApp AI Assistant &bull; Live Control Center</div>
        </div>
        <span class="pill"><span class="dot" id="dot"></span><span id="statusPill">Connecting...</span></span>
      </div>
    </header>

    <section class="grid">
      <div class="card glass">
        <div class="label">Status</div>
        <div class="value" id="cStatus">—</div>
      </div>
      <div class="card glass">
        <div class="label">Authenticated</div>
        <div class="value" id="cAuth">No</div>
      </div>
      <div class="card glass">
        <div class="label">Ready</div>
        <div class="value" id="cReady">No</div>
      </div>
      <div class="card glass">
        <div class="label">Messages</div>
        <div class="value" id="cMsg">0</div>
      </div>
    </section>

    <section class="grid" style="margin-top:18px">
      <div class="card glass">
        <div class="label">Provider</div>
        <div class="value blue" id="cProvider">—</div>
      </div>
      <div class="card glass">
        <div class="label">Model</div>
        <div class="value" id="cModel" style="font-size:20px;word-break:break-word">—</div>
      </div>
      <div class="card glass">
        <div class="label">Total Tokens</div>
        <div class="value vio" id="cTokens">0</div>
      </div>
      <div class="card glass">
        <div class="label">Uptime</div>
        <div class="value" id="cUptime" style="font-size:22px">0s</div>
      </div>
    </section>

    <section class="moods">
      <div class="card glass">
        <div class="row">
          <div class="label">LLM Quota / Usage</div>
          <div class="value" style="font-size:15px" id="qMsg">—</div>
        </div>
        <div style="margin-top:16px">
          <div class="row"><span class="label">Prompt tokens</span><span id="qPrompt">0</span></div>
          <div class="bar"><i data-w="qPrompt"></i></div>
        </div>
        <div style="margin-top:14px">
          <div class="row"><span class="label">Completion tokens</span><span id="qComp">0</span></div>
          <div class="bar"><i data-w="qComp" style="background:linear-gradient(90deg,#f472b6,#a78bfa)"></i></div>
        </div>
        <div style="margin-top:14px">
          <div class="row"><span class="label">Total tokens</span><span id="qTotal">0</span></div>
          <div class="bar"><i data-w="qTotal" style="background:linear-gradient(90deg,#34d399,#a78bfa)"></i></div>
        </div>
      </div>
    </section>

    <section class="stats">
      <div class="card glass">
        <div class="row">
          <div class="label">Choose Mood</div>
          <div style="font-size:13px;color:var(--muted)" id="moodNow">—</div>
        </div>
        <div class="chips" id="chips"></div>
      </div>
    </section>

    <pre id="details">Loading...</pre>
    <div class="foot">InsideBot &bull; Built with &#10084;&#65039; on whatsapp-web.js</div>
  </div>

<script>
var pendingW = {};
function refresh() {
  fetch("/api/status").then(function(r){return r.json()}).then(function(s){
    pendingW = {};
    document.getElementById("statusPill").textContent = s.ready ? "Online" : (s.lastError ? "Error" : s.status);
    var dot = document.getElementById("dot");
    dot.style.background = s.ready ? "#34d399" : (s.lastError ? "#fb7185" : "#fbbf24");
    document.getElementById("cStatus").textContent = s.lastEvent || s.status;
    document.getElementById("cAuth").textContent = s.authenticated ? "Yes" : "No";
    document.getElementById("cAuth").className = "value " + (s.authenticated ? "ok" : "");
    document.getElementById("cReady").textContent = s.ready ? "Yes" : "No";
    document.getElementById("cReady").className = "value " + (s.ready ? "ok" : "");
    document.getElementById("cMsg").textContent = s.messages || 0;
    document.getElementById("cProvider").textContent = s.llm.provider || "—";
    document.getElementById("cModel").textContent = s.llm.model || "—";
    var up = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000);
    var h = Math.floor(up/3600), m = Math.floor((up%3600)/60), sec = up%60;
    document.getElementById("cUptime").textContent = (h>0?h+"h ":"") + (m>0?m+"m ":"") + sec+"s";
    var u = s.llm.usage || {};
    document.getElementById("qPrompt").textContent = u.promptTokens || 0;
    document.getElementById("qComp").textContent = u.completionTokens || 0;
    document.getElementById("qTotal").textContent = u.totalTokens || 0;
    document.getElementById("qMsg").textContent = "Requests: " + (u.messages || 0);
    document.getElementById("cTokens").textContent = u.totalTokens || 0;
    var bars = document.querySelectorAll(".bar > i");
    bars.forEach(function(b){
      var key = b.getAttribute("data-w");
      var val = key === "qPrompt" ? (u.promptTokens||0) : (key === "qComp" ? (u.completionTokens||0) : (u.totalTokens||0));
      var max = Math.max((u.totalTokens||0) * 100, 1000);
      pendingW[key] = Math.min(100, (val / max) * 100);
      b.style.width = pendingW[key] + "%";
    });
    document.getElementById("moodNow").textContent = s.llm.moodLabel ? "Current: " + s.llm.moodLabel : "—";
    var chips = document.getElementById("chips");
    chips.innerHTML = "";
    (s.moods || []).forEach(function(m){
      var c = document.createElement("button");
      c.className = "chip" + (m.active ? " active" : "");
      c.textContent = (m.emoji || "") + " " + m.label;
      c.onclick = function(){
        fetch("/api/moods/" + encodeURIComponent(m.name)).then(function(){ refresh(); });
      };
      chips.appendChild(c);
    });
    document.getElementById("details").textContent = JSON.stringify(s, null, 2);
  }).catch(function(e){
    document.getElementById("details").textContent = "Dashboard unreachable: " + e.message;
  });
}
refresh();
setInterval(refresh, 2000);
</script>
</body>
</html>`;
}

module.exports = { createMonitor };