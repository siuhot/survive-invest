<script>
  const year = new Date().getFullYear();
</script>

<div class="wrap">
  <header class="top">
    <div>
      <div class="title">Survive Invest</div>
      <div class="sub">Survivability-first • EOD-only</div>
    </div>
    <nav class="nav">
      <a href="/">Dashboard</a>
    </nav>
  </header>

  <main class="main">
    <slot />
  </main>

  <footer class="foot">© {year} • Built for risk survival</footer>
</div>

<style>
  :global(html,body){ margin:0; padding:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#0b1220; color:#eaf0ff; }
  a{ color:#27c6ff; text-decoration:none; }
  .wrap{ max-width: 1100px; margin: 0 auto; padding: 18px; }
  .top{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; border:1px solid rgba(255,255,255,.10); border-radius:16px; background: rgba(255,255,255,.06); }
  .title{ font-size:20px; font-weight:800; letter-spacing:.2px; }
  .sub{ font-size:12px; opacity:.75; margin-top:4px; }
  .nav{ display:flex; gap:12px; }
  .main{ margin-top: 16px; }
  .foot{ opacity:.6; font-size:12px; margin-top: 18px; text-align:center; }
</style>
