/*
 * public portfolio-manager.js
 * 공개용 Viewer 전용: GitHub API/Firebase/Firestore/fetch 사용 없음
 * 데이터는 index.html 내부 <script id="portfolio-data"> 에서 읽음
 */
'use strict';

let portfolioData = {};

function renderAllPortfolio(data){
  const d = data || portfolioData;
  Object.keys(d).forEach(gridId => renderGrid(gridId, d));
  if(typeof updateEmptyGrids==='function') updateEmptyGrids();
}

function renderGrid(gridId, data){
  const d = data || portfolioData;
  const grid = document.getElementById(gridId);
  if(!grid) return;
  grid.querySelectorAll(':scope > .generated-card, :scope > .pup-empty-grid-card').forEach(el=>el.remove());
  const items = d[gridId] || [];
  items.forEach(item=>{
    const normalized = {
      grid: gridId,
      type: item.type || 'image',
      title: item.title || '',
      desc: item.desc || '',
      url: item.src || item.url || '',
      sourcePath: item.src || item.url || '',
      sourceKind: (item.src||item.url||'').startsWith('http') ? 'link' : 'local',
      sha: item.sha || ''
    };
    if(typeof insertCardToGrid === 'function') insertCardToGrid(normalized, item.docId || normalized.url);
  });
}

window.renderAllPortfolio = renderAllPortfolio;
window.renderGrid = renderGrid;
