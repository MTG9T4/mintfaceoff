const EXAMPLES = ['2PENPmfgJfq6CG3k4byj4oWwHf8SerqakmYHMkUupump', '3tzkdxJ1qVCaPAuWmd8FjRFKUbwMYpLUAq5gg4Vopump'];
const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const $ = (id) => document.getElementById(id);
const form = $('duel-form');
const inputs = [$('mint-a'), $('mint-b')];
let current = null;
let busy = false;

function status(message, kind = '') {
  $('status').textContent = message;
  $('status').className = `status ${kind}`;
}

function shortMint(mint) { return `${mint.slice(0, 5)}…${mint.slice(-5)}`; }
function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(n < 1 ? 2 : 0)}`;
}
function count(value) { const n = Number(value); return Number.isFinite(n) ? new Intl.NumberFormat('en-US').format(n) : '—'; }
function change(value) { const n = Number(value); return Number.isFinite(n) ? `${n > 0 ? '+' : ''}${n.toFixed(1)}%` : '—'; }
function safeText(value, fallback = 'Unknown token') { return typeof value === 'string' && value.trim() ? value.trim().slice(0, 50) : fallback; }

function bestPair(pairs, mint) {
  return pairs.filter(p => p.chainId === 'solana' && p.baseToken?.address === mint)
    .sort((a, b) => (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0))[0];
}

async function fetchPairData(mints) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mints.join(',')}`, {signal: controller.signal});
    if (!response.ok) throw new Error(`Market data returned HTTP ${response.status}. Try again shortly.`);
    const pairs = await response.json();
    if (!Array.isArray(pairs)) throw new Error('Market data had an unexpected format.');
    const selected = mints.map(mint => bestPair(pairs, mint));
    const missing = selected.map((pair, i) => !pair ? `Contender ${i ? 'B' : 'A'}` : null).filter(Boolean);
    if (missing.length) throw new Error(`No tracked Solana trading pair found for ${missing.join(' and ')}. Check the mint address or try another token.`);
    return selected;
  } finally { clearTimeout(timer); }
}

function renderCard(pair, mint, side) {
  $(`symbol-${side}`).textContent = safeText(pair.baseToken?.symbol, 'TOKEN');
  $(`name-${side}`).textContent = safeText(pair.baseToken?.name);
  $(`mint-short-${side}`).textContent = shortMint(mint);
  $(`volume-${side}`).textContent = money(pair.volume?.h24);
  $(`marketcap-${side}`).textContent = money(pair.marketCap ?? pair.fdv);
  const txns = (Number(pair.txns?.h24?.buys) || 0) + (Number(pair.txns?.h24?.sells) || 0);
  $(`trades-${side}`).textContent = count(txns);
  const changeEl = $(`change-${side}`);
  changeEl.textContent = change(pair.priceChange?.h24);
  changeEl.style.color = Number(pair.priceChange?.h24) < 0 ? '#ff998e' : '#a7fb69';
  $(`liquidity-${side}`).textContent = money(pair.liquidity?.usd);
  const source = $(`source-${side}`);
  source.href = `https://dexscreener.com/solana/${encodeURIComponent(pair.pairAddress || mint)}`;
}

function render(mints, pairs) {
  renderCard(pairs[0], mints[0], 'a');
  renderCard(pairs[1], mints[1], 'b');
  const volumes = pairs.map(p => Math.max(0, Number(p.volume?.h24) || 0));
  const total = volumes[0] + volumes[1];
  const left = total ? (volumes[0] / total) * 100 : 50;
  $('score-left').style.width = `${left}%`;
  $('score-right').style.width = `${100 - left}%`;
  $('score-track').setAttribute('aria-label', `Contender A has ${left.toFixed(0)} percent of combined 24-hour trading volume; contender B has ${(100-left).toFixed(0)} percent`);
  $('score-label-a').textContent = `${safeText(pairs[0].baseToken?.symbol, 'A')} · ${left.toFixed(0)}%`;
  $('score-label-b').textContent = `${safeText(pairs[1].baseToken?.symbol, 'B')} · ${(100-left).toFixed(0)}%`;
  $('leader-text').textContent = !total || Math.abs(volumes[0]-volumes[1]) < .01 ? 'EVEN MATCH' : `${safeText(pairs[volumes[0] > volumes[1] ? 0 : 1].baseToken?.symbol, 'TOKEN')} LEADS`;
  $('updated-at').textContent = `UPDATED ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
  $('arena').hidden = false;
  current = {mints, pairs};
}

async function compare({quiet = false} = {}) {
  if (busy) return;
  const mints = inputs.map(input => input.value.trim());
  if (!mints.every(mint => MINT.test(mint))) { status('Enter two valid Solana mint addresses.', 'error'); return; }
  if (mints[0] === mints[1]) { status('Choose two different tokens for a faceoff.', 'error'); return; }
  busy = true;
  $('compare-button').disabled = true;
  if (!quiet) status('Fetching live market data…');
  try {
    const pairs = await fetchPairData(mints);
    render(mints, pairs);
    const url = new URL(location.href);
    url.searchParams.set('a', mints[0]);
    url.searchParams.set('b', mints[1]);
    history.replaceState(null, '', url);
    if (!quiet) status('Live faceoff ready. Share it with your community.', 'success');
  } catch (error) {
    if (!quiet) status(error.name === 'AbortError' ? 'Market data timed out. Try again.' : error.message, 'error');
  } finally { busy = false; $('compare-button').disabled = false; }
}

form.addEventListener('submit', event => { event.preventDefault(); compare(); });
$('example-button').addEventListener('click', () => { inputs.forEach((input,i) => { input.value = EXAMPLES[i]; }); compare(); });
$('swap-button').addEventListener('click', () => { [inputs[0].value,inputs[1].value] = [inputs[1].value,inputs[0].value]; compare(); });
$('copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); status('Faceoff link copied.', 'success'); }
  catch { status('Could not copy automatically. Copy the address from your browser.', 'error'); }
});
$('challenge-x').addEventListener('click', () => {
  if (!current) return;
  const symbols = current.pairs.map(pair => safeText(pair.baseToken?.symbol, 'TOKEN'));
  const message = `${symbols[0]} vs ${symbols[1]} — which community brings more volume today? Live faceoff: ${location.href}`;
  window.open(`https://x.com/intent/post?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
});

function shareCard() {
  if (!current) return;
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const gradient = ctx.createLinearGradient(0,0,1200,630); gradient.addColorStop(0,'#0a111d'); gradient.addColorStop(1,'#17132c');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,1200,630);
  ctx.fillStyle = '#a7fb69'; ctx.font = 'bold 26px Arial'; ctx.fillText('MINTFACEOFF ◆',60,70);
  ctx.fillStyle = '#9aa9bc'; ctx.font = '22px Arial'; ctx.fillText('TWO TOKENS. ONE LIVE FACE OFF.',60,118);
  const [a,b] = current.pairs;
  const sides = [{p:a,x:60,color:'#a7fb69'},{p:b,x:622,color:'#ba8cff'}];
  sides.forEach(({p,x,color}) => {
    ctx.fillStyle = '#ffffff10'; ctx.fillRect(x,160,518,340);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x,160,518,340);
    ctx.fillStyle = color; ctx.font = 'bold 23px Arial'; ctx.fillText(x < 100 ? 'CONTENDER A' : 'CONTENDER B',x+28,207);
    ctx.fillStyle = '#f3f6fa'; ctx.font = 'bold 67px Arial'; ctx.fillText(safeText(p.baseToken?.symbol,'TOKEN').slice(0,12),x+28,293,455);
    ctx.fillStyle = '#aebacb'; ctx.font = '18px Arial'; ctx.fillText('24H TRADING VOLUME',x+28,363);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 51px Arial'; ctx.fillText(money(p.volume?.h24),x+28,429);
    ctx.fillStyle = '#aebacb'; ctx.font = '18px Arial'; ctx.fillText(`MARKET CAP  ${money(p.marketCap ?? p.fdv)}`,x+28,474);
  });
  ctx.fillStyle='#0a0c15';ctx.beginPath();ctx.arc(600,327,31,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 19px Arial';ctx.textAlign='center';ctx.fillText('VS',600,335);ctx.textAlign='left';
  ctx.fillStyle='#8797aa';ctx.font='18px Arial';ctx.fillText('Live data: DEX Screener  •  ' + new Date().toLocaleString(),60,565);
  ctx.fillText('Volume lead is not a prediction or endorsement.',60,597);
  const link=document.createElement('a');link.download='mintfaceoff.png';link.href=canvas.toDataURL('image/png');link.click();
  status('Share card saved.', 'success');
}
$('save-card').addEventListener('click', shareCard);

const params = new URLSearchParams(location.search);
const shared = [params.get('a'), params.get('b')];
if (shared.every(mint => mint && MINT.test(mint))) { inputs.forEach((input,i) => { input.value = shared[i]; }); compare(); }
setInterval(() => { if (current && !document.hidden) compare({quiet:true}); }, 60000);
