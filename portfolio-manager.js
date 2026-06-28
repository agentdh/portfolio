/*
 * portfolio-manager.js
 * JSON 기반 포트폴리오 관리자 - GitHub API 호출 없음
 * 최초 1회 portfolio.json fetch → 메모리 캐시 → 모든 UI 조작
 */

'use strict';

// ── 전역 캐시
let portfolioData = {};      // { gridId: [ {title,desc,src,type,sha,...} ] }
let autoFolderItems = [];    // loadCards 호환용 (빈 배열 유지)
let _pupGithubCache = {};
let _pupFetching = {};

// ── 폴더 매핑 (이미지 경로용)
const FOLDER_MAP = {
  'thumbnail-ld':        'images/thumbnail/ld',
  'thumbnail-sd':        'images/thumbnail/sd',
  'thumbnail-composite': 'images/thumbnail/composite',
  'illust-simple':       'images/illust/simple',
  'illust-line':         'images/illust/line',
  'illust-semi-painted': 'images/illust/semi-painted',
  'illust-cover':        'images/illust/cover',
  'illust-conceptart':   'images/illust/conceptart',
  'work3d-character':    'images/3d/character',
  'work3d-item':         'images/3d/item',
  'work3d-bg':           'images/3d/bg',
  'live2d-work':         'images/live2d',
  'pixel-cursor':        'images/pixel/cursor',
  'pixel-illust':        'images/pixel/illust',
  'pixel-game':          'images/pixel/game',
  'mc-skin':             'images/minecraft/skin',
  'mc-model':            'images/minecraft/model',
  'mc-animation':        'images/minecraft/animation',
  'mc-resource':         'images/minecraft/resource',
  'mvAnimationGrid':     'images/animation/mv',
  'animation2DGrid':     'images/animation/2d',
  'animation3DGrid':     'images/animation/3d',
  'virtualPropGrid':     'images/animation/prop',
  'brand-wait':          'images/branding/wait',
  'brand-symbol':        'images/branding/symbol',
  'brand-emote':         'images/branding/emote',
  'brand-poster':        'images/branding/poster',
  'brand-etc':           'images/branding/etc',
};

// ══════════════════════════════════════════════
// 1. JSON 로드 (최초 1회)
// ══════════════════════════════════════════════
async function loadPortfolioData() {
  try {
    const res = await fetch('./portfolio.json?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    portfolioData = await res.json();
    console.log('portfolio.json 로드 완료:', Object.keys(portfolioData).length, '그리드');
  } catch (e) {
    console.warn('portfolio.json 로드 실패 - 빈 데이터로 시작:', e);
    portfolioData = {};
  }
}

// ══════════════════════════════════════════════
// 2. 렌더링
// ══════════════════════════════════════════════
function renderAllPortfolio() {
  Object.keys(portfolioData).forEach(gridId => renderGrid(gridId));
  // 빈 그리드 placeholder
  if (typeof updateEmptyGrids === 'function') updateEmptyGrids();
  // 드래그 설정
  if (typeof setupDragSortable === 'function') setupDragSortable();
}

function renderGrid(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  // 기존 생성 카드만 제거 (card-add, card-multi-upload 등 유지)
  grid.querySelectorAll(':scope > .generated-card, :scope > .pup-empty-grid-card').forEach(el => el.remove());
  const items = portfolioData[gridId] || [];
  items.forEach(item => {
    // insertCardToGrid 호환 형식으로 변환
    const normalized = {
      grid:       gridId,
      type:       item.type || 'image',
      title:      item.title || '',
      desc:       item.desc  || '',
      url:        item.src   || item.url || '',
      sourcePath: item.src   || item.url || '',
      sourceKind: item.src && !item.src.startsWith('http') ? 'local' : (item.sourceKind || 'github'),
      sha:        item.sha   || '',
    };
    if (typeof insertCardToGrid === 'function') {
      insertCardToGrid(normalized, item.docId || normalized.url);
    }
  });
}

// ══════════════════════════════════════════════
// 3. 메모리 데이터 수정 (카드 추가/삭제/이동)
// ══════════════════════════════════════════════
function pmAddCard(gridId, item) {
  if (!portfolioData[gridId]) portfolioData[gridId] = [];
  portfolioData[gridId].push(item);
}

function pmRemoveCard(gridId, srcOrUrl) {
  if (!portfolioData[gridId]) return;
  portfolioData[gridId] = portfolioData[gridId].filter(
    item => (item.src || item.url) !== srcOrUrl
  );
}

function pmMoveCard(fromGridId, toGridId, srcOrUrl) {
  if (!portfolioData[fromGridId]) return;
  const idx = portfolioData[fromGridId].findIndex(item => (item.src || item.url) === srcOrUrl);
  if (idx < 0) return;
  const [item] = portfolioData[fromGridId].splice(idx, 1);
  if (!portfolioData[toGridId]) portfolioData[toGridId] = [];
  portfolioData[toGridId].push(item);
}

// ══════════════════════════════════════════════
// 4. JSON 저장 (다운로드)
// ══════════════════════════════════════════════
function downloadPortfolioJson() {
  const blob = new Blob(
    [JSON.stringify(portfolioData, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'portfolio.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ══════════════════════════════════════════════
// 5. 미등록 패널 - JSON 기반 (GitHub API 없음)
// ══════════════════════════════════════════════

// 현재 탭의 등록된 src/url Set
function pupRegisteredSrcs() {
  const srcs = new Set();
  const subEl = document.getElementById('port-sub-' + _pupCurrentTab);
  if (!subEl) return srcs;
  subEl.querySelectorAll('.card').forEach(card => {
    const sp = card.dataset.sourcePath || card.dataset.url || '';
    if (sp) srcs.add(sp);
  });
  return srcs;
}

// 패널 표시/숨김
function pupShowPanel() {
  const panel = document.getElementById('port-unrg-panel');
  if (!panel) return;
  const workActive = document.getElementById('tab-work')?.classList.contains('active');
  if (typeof isAdmin !== 'undefined' && isAdmin && workActive) {
    panel.classList.add('admin-visible');
    pupRenderFromData();
  } else {
    panel.classList.remove('admin-visible');
  }
}
function pupHidePanel() {
  document.getElementById('port-unrg-panel')?.classList.remove('admin-visible');
}

// 탭 전환 시 패널 갱신 (API 없음 - 메모리만)
function pupRenderFromData() {
  if (typeof _pupCurrentTab === 'undefined') return;
  const folderEl = document.getElementById('pup-folder-label');
  if (folderEl) folderEl.textContent = '📁 ' + (_pupCurrentTab || '');
  // 패널은 이미 _pupItems/_pupLinkItems 기반으로 pupRender()가 처리
  if (typeof pupRender === 'function') pupRender();
}

// ══════════════════════════════════════════════
// 6. DOMContentLoaded - 최초 1회 JSON fetch
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', async () => {
  // JSON 로드 (1회)
  await loadPortfolioData();

  // Firestore에서 등록 정보 로드 (grid 위치, 순서 등)
  if (typeof loadGridOrder === 'function') await loadGridOrder();

  // JSON 기본 위치 + Firestore 메타를 합쳐 렌더링
  await loadCardsFromFirestore();

  // 드래그/UI 초기화
  if (typeof setupDragSortable === 'function') setupDragSortable();
  if (typeof updateEmptyGrids === 'function') updateEmptyGrids();
  if (typeof applyAllGridOrders === 'function') applyAllGridOrders();
  if (typeof loadProfile === 'function') loadProfile();

  // 포트폴리오 탭이 초기 활성이면 패널 표시
  const workActive = document.getElementById('tab-work')?.classList.contains('active');
  if (workActive && typeof isAdmin !== 'undefined' && isAdmin) pupShowPanel();
});

// ══════════════════════════════════════════════
// 7. Firestore 연동 카드 로드
//    JSON에 있는 파일 중 Firestore에 grid 저장된 것 → 해당 grid
//    Firestore에 없는 것 → _pupItems (미등록 패널)
// ══════════════════════════════════════════════
function clearRenderedPortfolioCards() {
  document.querySelectorAll('#tab-work .grid-3[id], #tab-work .grid-2[id]').forEach(grid => {
    grid.querySelectorAll(':scope > .generated-card, :scope > .pup-empty-grid-card').forEach(el => el.remove());
  });
}

async function loadCardsFromFirestore() {
  clearRenderedPortfolioCards();

  const metaBySource = {};
  const metaByStaticKey = {};
  const linkItems = [];

  if (typeof FIRESTORE_READY !== 'undefined' && FIRESTORE_READY) {
    try {
      const snap = await getCardsCol().orderBy('createdAt', 'asc').get();
      snap.forEach(doc => {
        const item = doc.data(); item._docId = doc.id;
        if (item.sourcePath)     metaBySource[item.sourcePath] = item;
        else if (item.staticKey) metaByStaticKey[item.staticKey] = item;
        else                     linkItems.push(item);
      });
    } catch (err) {
      console.error('Firestore 로드 실패:', err);
    }
  }

  // JSON 데이터의 각 항목에 대해:
  // Firestore에 grid 정보 있으면 → 해당 grid에 렌더
  // 없으면 → _pupItems (미등록)
  const allJsonItems = [];
  Object.entries(portfolioData).forEach(([defaultGrid, items]) => {
    items.forEach(item => {
      allJsonItems.push({ ...item, defaultGrid });
    });
  });

  const registeredSrcs = new Set(Object.keys(metaBySource));
  const unregistered = [];

  allJsonItems.forEach(item => {
    const src = item.src || item.url || '';
    const fsMeta = metaBySource[src];
    const targetGrid = (fsMeta && fsMeta.grid) ? fsMeta.grid : item.defaultGrid;

    // Firestore 메타가 없어도 portfolio.json의 기본 grid에 반드시 렌더링한다.
    // 이게 빠지면 모든 카드가 미등록 패널로 빠져 각 탭이 빈 상태가 된다.
    if (targetGrid && typeof insertCardToGrid === 'function') {
      insertCardToGrid({
        grid: targetGrid,
        type: item.type || 'image',
        title: (fsMeta && fsMeta.title) || item.title || '',
        desc: (fsMeta && fsMeta.desc) || item.desc || '',
        url: src,
        sourcePath: src,
        sourceKind: (fsMeta && fsMeta.sourceKind) || item.sourceKind || (src.startsWith('http') ? 'link' : 'local'),
        sha: item.sha || '',
      }, (fsMeta && fsMeta._docId) || item.docId || src);
    }

    if (fsMeta) {
      delete metaBySource[src];
    }
  });

  // Firestore에만 있는 카드 (JSON에 없는 링크 등)
  Object.values(metaBySource).forEach(item => {
    if (!item.grid) return;
    if (typeof insertCardToGrid === 'function') insertCardToGrid(item, item._docId);
  });
  linkItems.forEach(item => {
    if (typeof insertCardToGrid === 'function') insertCardToGrid(item, item._docId);
  });

  if (typeof applyStaticMetadata === 'function') applyStaticMetadata(metaByStaticKey);
  if (typeof enhanceStaticPortfolioCards === 'function') enhanceStaticPortfolioCards();
  if (typeof setupMultiUploadButtons === 'function') setupMultiUploadButtons();
  if (typeof setupSectionAdminControls === 'function') setupSectionAdminControls();

  // 미등록 → _pupItems
  if (typeof _pupItems !== 'undefined') {
    _pupItems = unregistered;
  }

  // 패널 열려있으면 렌더
  const panel = document.getElementById('port-unrg-panel');
  if (panel && panel.classList.contains('admin-visible') && typeof pupRender === 'function') {
    pupRender();
  }
}
