/*
 * public portfolio-manager.js
 * 공개용 Viewer 전용: GitHub API/Firebase/Firestore 사용 없음
 */
'use strict';

let portfolioData = {};

async function loadPortfolioData(){
  try{
    const res=await fetch('./portfolio.json?t='+Date.now());
    if(!res.ok) throw new Error('HTTP '+res.status);
    portfolioData=await res.json();
    window.portfolioData=portfolioData;
  }catch(e){
    console.error('portfolio.json 로드 실패:',e);
    portfolioData={};
    window.portfolioData=portfolioData;
  }
}

function renderAllPortfolio(){
  Object.keys(portfolioData).forEach(renderGrid);
  if(typeof updateEmptyGrids==='function') updateEmptyGrids();
}

function renderGrid(gridId){
  const grid=document.getElementById(gridId);
  if(!grid) return;
  grid.querySelectorAll(':scope > .generated-card, :scope > .pup-empty-grid-card').forEach(el=>el.remove());
  const items=portfolioData[gridId]||[];
  items.forEach(item=>{
    const normalized={
      grid:gridId,
      type:item.type||'image',
      title:item.title||'',
      desc:item.desc||'',
      url:item.src||item.url||'',
      sourcePath:item.src||item.url||'',
      sourceKind:(item.src||item.url||'').startsWith('http')?'link':'local',
      sha:item.sha||''
    };
    if(typeof insertCardToGrid==='function') insertCardToGrid(normalized, item.docId||normalized.url);
  });
}

window.addEventListener('DOMContentLoaded', async()=>{
  await loadPortfolioData();
  renderAllPortfolio();
  if(typeof loadProfile==='function') loadProfile();
  document.querySelectorAll('.card-del,.card-edit,.section-admin-controls,.card-add,.card-multi-upload,#port-unrg-panel,#unregistered-panel').forEach(el=>el.remove());
});

window.loadPortfolioData=loadPortfolioData;
window.renderAllPortfolio=renderAllPortfolio;
window.renderGrid=renderGrid;
