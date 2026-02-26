<script>
  import { onMount } from "svelte";
  import { apiGet, apiPost } from "$lib/api.js";

  let loading = true;
  let err = "";
  let data = null;

  // simple onboard form (optional)
  let income = 20000000;
  let fixed_cost = 12000000;
  let variable_cost = 2000000;
  let cash_reserve = 24000000;
  let principal = 100000000;
  let monthly_interest = 1000000;

  async function refresh(){
    err = "";
    loading = true;
    try {
      data = await apiGet("/api/dashboard");
    } catch(e){
      err = e?.message || String(e);
    } finally {
      loading = false;
    }
  }

  async function saveOnboard(){
    err = "";
    try{
      await apiPost("/api/onboard", { income, fixed_cost, variable_cost, cash_reserve, principal, monthly_interest });
      await refresh();
    }catch(e){
      err = e?.message || String(e);
    }
  }

  onMount(refresh);

  function pillColor(state){
    if(state==="GREEN") return "pill green";
    if(state==="YELLOW") return "pill yellow";
    if(state==="ORANGE") return "pill orange";
    if(state==="RED") return "pill red";
    return "pill";
  }
</script>

{#if err}
  <div class="card danger">
    <div class="h">Error</div>
    <div class="p">{err}</div>
    <div class="p">Hãy kiểm tra <code>API_BASE</code> trong <code>src/lib/api.js</code> và Worker đang chạy.</div>
  </div>
{/if}

<div class="grid">
  <div class="card">
    <div class="h">Onboard (Cashflow + Debt)</div>
    <div class="form">
      <label>Income / month<input type="number" bind:value={income} /></label>
      <label>Fixed cost / month<input type="number" bind:value={fixed_cost} /></label>
      <label>Variable cost / month<input type="number" bind:value={variable_cost} /></label>
      <label>Cash reserve<input type="number" bind:value={cash_reserve} /></label>
      <label>Principal<input type="number" bind:value={principal} /></label>
      <label>Monthly interest<input type="number" bind:value={monthly_interest} /></label>
      <button class="btn" on:click={saveOnboard}>Save</button>
      <button class="btn ghost" on:click={refresh}>Refresh</button>
    </div>
  </div>

  <div class="card">
    <div class="h">Survivability</div>
    {#if loading}
      <div class="p">Loading...</div>
    {:else if data}
      <div class="kpi">
        <div class="k">
          <div class="t">Runway (months)</div>
          <div class="v">{data.survivability.runway_total_months.toFixed(1)}</div>
        </div>
        <div class="k">
          <div class="t">Cash buffer ok</div>
          <div class="v">{data.survivability.cash_buffer_ok ? "YES" : "NO"}</div>
        </div>
        <div class="k">
          <div class="t">Required buffer</div>
          <div class="v">{data.survivability.required_cash_buffer.toLocaleString()}</div>
        </div>
        <div class="k">
          <div class="t">Weekly interest est</div>
          <div class="v">{data.survivability.weekly_interest_est.toLocaleString()}</div>
        </div>
      </div>
    {/if}
  </div>
</div>

<div class="card" style="margin-top:16px;">
  <div class="h">Watchlist (EOD close)</div>

  {#if loading}
    <div class="p">Loading...</div>
  {:else if data}
    {#if data.watchlist.length === 0}
      <div class="p">Chưa có mã nào trong watchlist. Dùng API: <code>/api/watchlist/add</code></div>
    {:else}
      <table class="tbl">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Last close</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {#each data.watchlist as row}
            <tr>
              <td><strong>{row.symbol}</strong></td>
              <td>{row.last_close ?? "-"}</td>
              <td><span class={pillColor(row.state)}>{row.state}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/if}
</div>

<div class="card" style="margin-top:16px;">
  <div class="h">Plans (Ladder + Stop)</div>

  {#if loading}
    <div class="p">Loading...</div>
  {:else if data}
    {#if !data.plans || data.plans.length === 0}
      <div class="p">Chưa có plan. Dùng API: <code>/api/plan/set</code></div>
    {:else}
      <table class="tbl">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Ladder</th>
            <th>Stop</th>
            <th>Max weight</th>
            <th>Risk</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {#each data.plans as pl}
            <tr>
              <td><strong>{pl.symbol}</strong></td>
              <td>
                {#if pl.ladder?.levels?.length}
                  {#each pl.ladder.levels as lv, i}
                    <div class="p">B{i+1}: {lv.price} ({Math.round(lv.weight*100)}%)</div>
                  {/each}
                {:else}
                  -
                {/if}
              </td>
              <td>{pl.stop?.stop_total ?? "-"}</td>
              <td>{pl.max_weight ?? "-"}</td>
              <td>{pl.risk_per_trade ?? "-"}</td>
              <td>{pl.updated_at ?? "-"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/if}
</div>

<div class="card" style="margin-top:16px;">
  <div class="h">Positions</div>
  {#if loading}
    <div class="p">Loading...</div>
  {:else if data}
    {#if data.positions.length === 0}
      <div class="p">Chưa có position. Dùng API: <code>/api/position/set</code></div>
    {:else}
      <table class="tbl">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Qty</th>
            <th>Avg</th>
            <th>Last</th>
            <th>PnL</th>
          </tr>
        </thead>
        <tbody>
          {#each data.positions as p}
            <tr>
              <td><strong>{p.symbol}</strong></td>
              <td>{p.qty}</td>
              <td>{p.avg_price}</td>
              <td>{p.last_close ?? "-"}</td>
              <td>{p.pnl ?? "-"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/if}
</div>

<style>
  .grid{ display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 900px){ .grid{ grid-template-columns: 1fr; } }

  .card{ border:1px solid rgba(255,255,255,.10); border-radius:16px; background: rgba(255,255,255,.06); padding:14px 16px; }
  .card.danger{ border-color: rgba(255,90,103,.6); }
  .h{ font-weight:800; margin-bottom: 10px; }
  .p{ opacity:.85; font-size: 13px; line-height: 1.4; }

  .form{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
  @media (max-width: 900px){ .form{ grid-template-columns: 1fr; } }
  label{ display:flex; flex-direction:column; gap:6px; font-size:12px; opacity:.9; }
  input{ padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background: rgba(11,18,32,.65); color:#eaf0ff; outline:none; }
  .btn{ padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background:#27c6ff; color:#06101d; font-weight:800; cursor:pointer; }
  .btn.ghost{ background: transparent; color:#eaf0ff; }

  .kpi{ display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .k{ border:1px solid rgba(255,255,255,.10); border-radius:14px; background: rgba(11,18,32,.35); padding: 12px; }
  .t{ font-size:12px; opacity:.75; }
  .v{ font-size:18px; font-weight:900; margin-top:6px; }

  .tbl{ width:100%; border-collapse: collapse; font-size: 13px; }
  .tbl th, .tbl td{ padding:10px 8px; border-bottom:1px solid rgba(255,255,255,.08); text-align:left; }
  .tbl th{ opacity:.75; font-size: 12px; }

  .pill{ display:inline-block; padding:4px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.14); font-size:12px; font-weight:800; }
  .pill.green{ border-color: rgba(39,198,255,.45); }
  .pill.yellow{ border-color: rgba(255,213,79,.55); }
  .pill.orange{ border-color: rgba(255,153,51,.55); }
  .pill.red{ border-color: rgba(255,90,103,.65); }
</style>
