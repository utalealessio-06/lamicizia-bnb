const burger=document.querySelector('.burger'),nav=document.getElementById('nav');
burger.addEventListener('click',()=>{const o=nav.classList.toggle('open');burger.setAttribute('aria-expanded',o)});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const fmt=v=>v.trim()||'—';
document.getElementById('bookform').addEventListener('submit',e=>{
  e.preventDefault();
  const n=document.getElementById('f-name').value.trim();
  const msg=`Buongiorno Maddalena, sono ${n||'interessato/a'}. Vorrei sapere se avete disponibilità dal ${fmt(document.getElementById('f-in').value)} al ${fmt(document.getElementById('f-out').value)} per ${document.getElementById('f-guests').value} ospiti (camera: ${document.getElementById('f-room').value}). Grazie!`;
  window.open('https://wa.me/393288712971?text='+encodeURIComponent(msg),'_blank');
});
