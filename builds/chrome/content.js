/* Experimental WhatsApp Web automation. UI selectors may change. No evasion or hidden sending. */
(() => {
  if (window.__wbsRunner) return;
  window.__wbsRunner = true;
  let timer;
  const contextAlive = () => {
    try { return Boolean(chrome?.runtime?.id); } catch { return false; }
  };
  const stopStaleRunner = () => {
    if (timer) clearInterval(timer);
    window.__wbsRunner = false;
  };
  const storage = {
    async get(keys) {
      if (!contextAlive()) { stopStaleRunner(); throw new Error('Extension context invalidated'); }
      return chrome.storage.local.get(keys);
    },
    async set(value) {
      if (!contextAlive()) { stopStaleRunner(); throw new Error('Extension context invalidated'); }
      return chrome.storage.local.set(value);
    }
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rendered = (message, item) => message.replace(/\{name\}/gi, item.name || "there");
  let busy = false;
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      const {queue, running} = await storage.get(['queue','running']);
      if (!running || !queue?.contacts?.length || !queue.message) return;
      const active = queue.contacts.find(c => c.status === 'opening' || c.status === 'submitting');
      if (active?.status === 'submitting') {
        // Never retry a potentially submitted message automatically.
        await storage.set({running:false, error:'Submission uncertain for '+active.number+'. Review manually before continuing.'});
        return;
      }
      const item = active || queue.contacts.find(c => c.status === 'pending');
      const msg = item ? rendered(queue.message, item) : "";
      if (!item) { await storage.set({running:false}); return; }
      if (!active) {
        item.status = 'opening'; item.updatedAt = new Date().toISOString();
        await storage.set({queue});
        location.href = `https://web.whatsapp.com/send?phone=${encodeURIComponent(item.number)}&text=${encodeURIComponent(msg)}`;
        return;
      }
      const urlNumber = new URL(location.href).searchParams.get('phone');
      if (urlNumber !== item.number) {
        location.href = `https://web.whatsapp.com/send?phone=${encodeURIComponent(item.number)}&text=${encodeURIComponent(msg)}`;
        return;
      }
      // Allow WhatsApp Web time to resolve the recipient and render the composer.
      let sendButton;
      for (let i=0; i<30; i++) {
        const state = await storage.get('running');
        if (!state.running) return;
        if (document.querySelector('[data-testid="popup-controls-ok"], [data-testid="invalid-number"], [role="alertdialog"]')) throw Error('WhatsApp requires attention');
        const footer = document.querySelector('footer');
        const editor = footer?.querySelector('[contenteditable="true"][role="textbox"]');
        const candidate = footer?.querySelector('[data-testid="send"],button[aria-label="Send"],span[data-icon="send"]');
        if (editor && editor.innerText.trim() === msg.trim() && candidate) {
          sendButton = candidate.closest('button') || candidate;
          break;
        }
        await sleep(1000);
      }
      if (!sendButton) throw Error('Message composer or Send control not found; no message submitted');
      // Save uncertainty BEFORE click to prevent duplicate sends after crash/reload.
      item.status = 'submitting'; item.updatedAt = new Date().toISOString();
      await storage.set({queue});
      sendButton.click();
      await sleep(1400);
      const latest = await storage.get('running');
      if (!latest.running) return;
      item.status = 'submitted'; item.updatedAt = new Date().toISOString(); // NOT a delivery receipt
      await storage.set({queue});
      // No speed/rate tricks. One sequential UI interaction at a time.
      await sleep(Math.max(3000, Math.min(120000, Number(queue.delayMs) || 5000)));
    } catch(e) {
      if (!contextAlive() || /Extension context invalidated/i.test(String(e?.message || e))) {
        stopStaleRunner();
        return;
      }
      try { await storage.set({running:false,error:String(e.message||e)}); }
      catch (storageError) { stopStaleRunner(); }
    } finally {busy=false;}
  }
  timer = setInterval(tick, 1500);
  tick();
})();
