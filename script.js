(() => {
  'use strict';
  const menuButton = document.querySelector('.menu-button');
  const menuPanel = document.querySelector('#menuPanel');
  function closeMenu(returnFocus = false) {
    if (!menuButton || !menuPanel) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    menuPanel.hidden = true;
    if (returnFocus) menuButton.focus();
  }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuPanel.hidden = !open;
  });
  menuPanel?.addEventListener('click', event => {
    if (event.target.closest('a,button')) closeMenu();
  });
  document.addEventListener('click', event => {
    if (!menuPanel?.hidden && !menuPanel.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menuPanel?.hidden) closeMenu(true);
  });
  window.matchMedia('(min-width:851px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });

  // Native dialogs provide focus trapping, Escape-to-close and an inert background.
  const dialogTriggers = new WeakMap();
  document.querySelectorAll('[data-open]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const dialog = document.getElementById(trigger.dataset.open);
      if (!(dialog instanceof HTMLDialogElement)) return;
      dialogTriggers.set(dialog, trigger);
      dialog.showModal();
    });
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('.close-modal')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      const trigger = dialogTriggers.get(dialog);
      if (trigger && !trigger.closest('[hidden]')) trigger.focus();
    });
  });

  // The four steps are an explanatory illustration, not a simulated live agent run.
  const tabs = [...document.querySelectorAll('[role="tab"][data-step]')];
  let activeStep = 0;
  function selectStep(step, focus = false) {
    if (!tabs.length) return;
    activeStep = (step + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const selected = i === activeStep;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
    document.querySelectorAll('[data-orbit]').forEach(label => label.classList.toggle('is-current', Number(label.dataset.orbit) === activeStep));
    document.querySelector('.orbital-loop')?.style.setProperty('--travel-rotation', `${activeStep * 90}deg`);
    if (focus) tabs[activeStep].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectStep(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = activeStep + 1;
      if (event.key === 'ArrowLeft') next = activeStep - 1;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectStep(next, true);
    });
  });
  document.querySelector('#nextStep')?.addEventListener('click', () => selectStep(activeStep + 1));

  // No network submission, analytics, cookies or persistent storage in this review build.
  const form = document.getElementById('pilotForm');
  const formStatus = document.getElementById('formStatus');
  function buildBrief() {
    const data = new FormData(form);
    const value = key => String(data.get(key) || '').trim();
    return `RECURION — RESEARCH PILOT BRIEF\n\nName: ${value('name')}\nEmail: ${value('email')}\nTeam: ${value('team')}\nResearch area: ${value('area')}\nEvaluation: ${value('evaluation')}\n\nTHE IMPROVEMENT PROBLEM\n${value('problem')}\n\nPROPOSED NEXT STEP\nScope one measurable improvement problem, an evaluation and a bounded research budget.\n\nThis brief was created locally in the website review preview. It has not been submitted or sent.\n`;
  }
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const blob = new Blob([buildBrief()], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Recurion-Research-Brief.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    formStatus.textContent = 'Your brief is ready to share. No information was sent.';
  });
  document.getElementById('copyBrief')?.addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const brief = buildBrief();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(brief);
      formStatus.textContent = 'Brief copied. Paste it into your email or message. Nothing was sent.';
    } catch {
      // A visible selection also works in file:// previews and privacy-restricted browsers.
      let fallback = document.getElementById('briefFallback');
      if (!fallback) {
        fallback = document.createElement('textarea');
        fallback.id = 'briefFallback';
        fallback.readOnly = true;
        fallback.setAttribute('aria-label', 'Your pilot brief, ready to copy');
        fallback.rows = 7;
        form.appendChild(fallback);
      }
      fallback.value = brief;
      fallback.focus();
      fallback.select();
      formStatus.textContent = 'Automatic copying is blocked here. The brief is selected below; copy it or use Download brief.';
    }
  });


})();

(() => {
 'use strict';
 const encoded=document.getElementById('sceneSource');
 if(!encoded)return;
 const template=new TextDecoder().decode(Uint8Array.from(atob(encoded.textContent.trim()),c=>c.charCodeAt(0)));
 const hero=document.querySelector('.hero');const iframe=document.getElementById('mobiusHero');const modal=document.getElementById('sceneDialog');
 const button=document.getElementById('motionToggle');const pref=matchMedia('(prefers-reduced-motion: reduce)');let paused=pref.matches;let visible=true;
 const send=(action,value)=>iframe?.contentWindow?.postMessage({type:'improve-scene',action,value},'*');
 function sync(){button?.setAttribute('aria-pressed',String(paused));const label=button?.querySelector('.motion-label');if(label)label.textContent=paused?'Play motion':'Pause motion';const icon=button?.querySelector('.motion-icon');if(icon)icon.textContent=paused?'▷':'Ⅱ';send('running',!paused);}
 if(iframe){iframe.srcdoc=template.replace('<html lang="en">','<html lang="en" data-embedded="true">');iframe.onload=()=>{sync();send('visibility',visible&&!modal.open);};}
 window.addEventListener('message',e=>{if(e.source===iframe?.contentWindow&&e.data?.type==='improve-scene-ready'){sync();send('visibility',visible&&!modal.open);}});
 button?.addEventListener('click',()=>{paused=!paused;sync();});pref.addEventListener('change',e=>{paused=e.matches;sync();});
 if(hero)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;send('visibility',visible&&!modal.open);},{threshold:0}).observe(hero);
 let previousFocus=null;
 document.querySelectorAll('[data-explore-scene]').forEach(el=>el.addEventListener('click',()=>{
  previousFocus=el;modal.showModal();document.body.style.overflow='hidden';send('visibility',false);
  const f=document.createElement('iframe');f.id='sceneViewer';f.title='Interactive Möbius ribbon with electronic ants';
  f.srcdoc=template.replace('<html lang="en">','<html lang="en" data-viewer="true">');modal.prepend(f);document.getElementById('closeScene').focus();
 }));
 function close(){if(modal.open)modal.close();}
 document.getElementById('closeScene')?.addEventListener('click',close);
 modal?.addEventListener('close',()=>{modal.querySelector('iframe')?.remove();document.body.style.overflow='';send('visibility',visible);sync();previousFocus?.focus();});
 window.addEventListener('message',e=>{if(e.source===modal?.querySelector('iframe')?.contentWindow&&e.data?.type==='improve-viewer-close')close();});
 const route=()=>{const research=location.hash.startsWith('#/research-os');document.body.classList.toggle('research-route',research);document.body.classList.toggle('home-route',!research);};
 route();window.addEventListener('hashchange',route);window.addEventListener('popstate',route);
 document.addEventListener('click',e=>{if(e.target.closest('a[href^="#/"]'))setTimeout(route,0);});
 sync();
})();
