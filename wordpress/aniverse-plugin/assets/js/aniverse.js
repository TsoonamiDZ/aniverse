/**
 * Aniverse — vanilla JS controller (no React).
 * Handles view switching, API calls, rendering.
 */
(function(){
  'use strict';
  var API = ANIVERSE.restUrl;
  var HOME = ANIVERSE.homeUrl;
  var app = document.getElementById('aniverse-app');

  // ── State ──────────────────────────────────────────
  var state = { view: 'home', anime: null, watch: null, page: 1, sort: 'recent', q: '', filters: {} };

  // ── Helpers ─────────────────────────────────────────
  function api(path){ return fetch(API + path, {credentials: 'same-origin', headers: {'X-WP-Nonce': ANIVERSE.nonce}}).then(function(r){return r.json()}); }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function getParam(k){ var u = new URL(location.href); return u.searchParams.get(k); }
  function navigate(url){ history.pushState({}, '', url); handleRoute(); window.scrollTo(0,0); }
  function fmt(n){ return (n||0).toLocaleString('en-US'); }

  // ── Router ─────────────────────────────────────────
  function handleRoute(){
    var w = getParam('watch'), a = getParam('anime'), v = getParam('view');
    state.q = getParam('q') || '';
    state.sort = getParam('sort') || 'recent';
    state.page = parseInt(getParam('page')||'1') || 1;
    state.filters = {
      airing: getParam('airing')==='1', type: getParam('type'), season: getParam('season'),
      year: getParam('year')?parseInt(getParam('year')):null, genre: getParam('genre')
    };
    if (w){ state.view='watch'; state.watch=w; renderWatch(); }
    else if (a){ state.view='anime'; state.anime=a; renderAnimeDetail(); }
    else if (v==='schedule'){ state.view='schedule'; renderSchedule(); }
    else if (v==='library' || state.q || state.filters.airing || state.filters.type || state.filters.season || state.filters.genre || state.sort!=='recent' || state.page>1){
      state.view='library'; renderLibrary();
    }
    else { state.view='home'; renderHome(); }
  }

  // ── Header + Nav ───────────────────────────────────
  function renderHeader(){
    var s = HOME + (state.q ? '?q='+encodeURIComponent(state.q) : '');
    return '<div class="aniverse-header"><div class="aniverse-header-inner">'+
      '<a href="'+HOME+'" class="aniverse-logo"><img src="'+HOME+'wp-content/plugins/aniverse/assets/img/logo.png" alt="Aniverse" style="filter:invert(0) brightness(100)"></a>'+
      '<div class="aniverse-search"><span class="search-icon">🔍</span><input type="search" value="'+esc(state.q)+'" placeholder="ابحث عن أنمي..." id="aniverse-search-input"></div>'+
      '</div></div>'+
      '<nav class="aniverse-nav"><div class="aniverse-nav-inner" id="aniverse-nav">'+
      navLink('عرض الآن', HOME+'?airing=1', state.filters.airing)+
      navLink('أفلام', HOME+'?view=library&type=MOVIE', state.filters.type==='MOVIE')+
      navLink('أنمي', HOME+'?view=library', getParam('view')==='library' && !state.filters.type)+
      navLink('أنميات الموسم', HOME+'?season=FALL&year=2026', false)+
      navLink('جدول البث', HOME+'?view=schedule', state.view==='schedule')+
      navLink('الأعلى تقييماً', HOME+'?sort=rating', state.sort==='rating')+
      '<button id="aniverse-random-btn">🔀 أنمي عشوائي</button>'+
      '</div></nav>';
  }
  function navLink(label, href, active){ return '<a href="'+href+'"'+(active?' class="active"':'')+'>'+label+'</a>'; }

  // ── Card ───────────────────────────────────────────
  function cardHTML(a){
    var poster = a.coverImage || a.posterUrl || '';
    var score = a.score ? '<div class="aniverse-card-badge">★ '+(a.score/10).toFixed(1)+'</div>' : '';
    var type = a.animeType ? '<div class="aniverse-card-chip">'+esc(a.animeType)+(a.airedYear?' · '+a.airedYear:'')+'</div>' : '';
    return '<a class="aniverse-card" href="'+HOME+'?anime='+encodeURIComponent(a.slug)+'">'+
      '<div class="aniverse-card-img">'+(poster?'<img src="'+esc(poster)+'" alt="'+esc(a.titleEnglish||a.title)+'" loading="lazy">':'')+
      score+type+'</div>'+
      '<div class="aniverse-card-body"><div class="aniverse-card-title">'+esc(a.titleEnglish||a.title)+'</div>'+
      '<div class="aniverse-card-sub">'+fmt(a.episodeCount)+' حلقة</div></div></a>';
  }

  // ── Home ────────────────────────────────────────────
  function renderHome(){
    app.innerHTML = renderHeader() + '<div class="aniverse-main" id="aniverse-content"><div class="aniverse-loading">جارٍ التحميل…</div></div>';
    bindSearch(); bindRandom();
    Promise.all([api('/anime?sort=popular&pageSize=8'), api('/recent/episodes?limit=8'), api('/recent/anime?limit=12'), api('/anime?airing=1&sort=popular&pageSize=12'), api('/anime?sort=rating&pageSize=10')])
    .then(function(d){
      var hero=d[0], recEps=d[1], recAnime=d[2].items, airing=d[3].items, topRated=d[4].items;
      var h='';
      // Hero
      if (hero.items && hero.items.length){
        var an = hero.items[0];
        h += '<div class="aniverse-hero"><div class="aniverse-hero-overlay"></div><div class="aniverse-hero-content">'+
          '<div class="aniverse-hero-poster">'+(an.coverImage?'<img src="'+esc(an.coverImage)+'">':'')+'</div>'+
          '<div class="aniverse-hero-text"><span class="aniverse-hero-badge">● مميّز الآن</span>'+
          '<h2 class="aniverse-hero-title">'+esc(an.titleEnglish||an.title)+'</h2>'+
          '<div class="aniverse-hero-meta">'+
          (an.score?'<span>★ '+(an.score/10).toFixed(1)+'/10</span>':'')+
          '<span>📺 '+fmt(an.episodeCount)+' حلقة</span>'+
          '</div><div class="aniverse-hero-btns">'+
          '<a class="primary" href="'+HOME+'?anime='+encodeURIComponent(an.slug)+'">▶ شاهد الآن</a>'+
          '<a class="secondary" href="'+HOME+'?anime='+encodeURIComponent(an.slug)+'">التفاصيل</a></div></div></div></div>';
      }
      // Recent episodes
      h += '<div class="aniverse-two-col"><div>';
      h += '<div class="aniverse-section-title">📺 أحدث الحلقات المضافة</div><div class="aniverse-recent-eps">';
      recEps.forEach(function(e){
        var poster = e.coverImage || e.posterUrl || '';
        h += '<a class="aniverse-card" href="'+HOME+'?watch='+encodeURIComponent(e.id)+'" style="border-radius:8px">'+
          '<div class="aniverse-card-img" style="aspect-ratio:16/9">'+(poster?'<img src="'+esc(poster)+'" loading="lazy">':'')+
          '<div class="aniverse-card-chip">حلقة '+esc(e.episodeNumber)+'</div></div>'+
          '<div class="aniverse-card-body"><div class="aniverse-card-title">'+esc(e.animeTitle)+'</div></div></a>';
      });
      h += '</div>';
      // Airing
      if (airing && airing.length){
        h += '<div class="aniverse-section-title">🔄 أنميات مستمرة</div><div class="aniverse-grid">';
        airing.slice(0,10).forEach(function(a){ h += cardHTML(a); });
        h += '</div>';
      }
      // Recent anime
      if (recAnime && recAnime.length){
        h += '<div class="aniverse-section-title">🆕 أحدث الأنميات المضافة</div><div class="aniverse-grid">';
        recAnime.slice(0,10).forEach(function(a){ h += cardHTML(a); });
        h += '</div>';
      }
      h += '</div>'; // end main col
      // Sidebar: top rated
      h += '<div class="aniverse-sidebar"><div class="aniverse-sidebar-head">⭐ الأعلى تقييماً</div>';
      topRated.forEach(function(a, i){
        var poster = a.coverImage || a.posterUrl || '';
        h += '<a class="aniverse-sidebar-item" href="'+HOME+'?anime='+encodeURIComponent(a.slug)+'">'+
          '<span class="aniverse-sidebar-rank">'+(i+1)+'</span>'+
          '<div class="aniverse-sidebar-poster">'+(poster?'<img src="'+esc(poster)+'">':'')+'</div>'+
          '<div class="aniverse-sidebar-info"><div class="aniverse-sidebar-title">'+esc(a.titleEnglish||a.title)+'</div>'+
          '<div class="aniverse-sidebar-score">'+(a.score?'★ '+(a.score/10).toFixed(1):'')+(a.airedYear?' · '+a.airedYear:'')+'</div></div></a>';
      });
      h += '</div>'; // end sidebar
      h += '</div>'; // end two-col
      document.getElementById('aniverse-content').innerHTML = h;
    }).catch(function(e){ document.getElementById('aniverse-content').innerHTML = '<div class="aniverse-loading">تعذّر التحميل</div>'; });
  }

  // ── Library ────────────────────────────────────────
  function renderLibrary(){
    app.innerHTML = renderHeader() + '<div class="aniverse-main" id="aniverse-content"><div class="aniverse-loading">جارٍ التحميل…</div></div>';
    bindSearch(); bindRandom();
    var params = '?page='+state.page+'&pageSize=24&sort='+state.sort;
    if (state.q) params += '&q='+encodeURIComponent(state.q);
    if (state.filters.airing) params += '&airing=1';
    if (state.filters.type) params += '&type='+state.filters.type;
    if (state.filters.season) params += '&season='+state.filters.season;
    if (state.filters.year) params += '&year='+state.filters.year;
    if (state.filters.genre) params += '&genre='+encodeURIComponent(state.filters.genre);
    Promise.all([api('/anime'+params), api('/genres')])
    .then(function(d){
      var list = d[0], genres = d[1].items || [];
      var sorts = [['recent','الأحدث'],['popular','الأكثر رواجًا'],['episodes','الأكثر حلقات'],['rating','الأعلى تقييماً'],['title','أبجديًا'],['shuffle','اكتشاف']];
      var h = '<div class="aniverse-tabs">';
      sorts.forEach(function(s){
        var p = '?sort='+s[0]; if (state.q) p+='&q='+encodeURIComponent(state.q);
        if (state.filters.airing) p+='&airing=1'; if (state.filters.type) p+='&type='+state.filters.type;
        if (state.filters.season) p+='&season='+state.filters.season; if (state.filters.genre) p+='&genre='+encodeURIComponent(state.filters.genre);
        h += '<a href="'+HOME+p+'"'+(s[0]===state.sort?' class="active"':'')+'>'+s[1]+'</a>';
      });
      h += '</div>';
      // Genre chips
      h += '<div class="aniverse-tabs" style="flex-wrap:wrap">';
      genres.slice(0,18).forEach(function(g){
        var p = '?genre='+encodeURIComponent(g.genre)+'&sort='+state.sort;
        h += '<a href="'+HOME+p+'"'+(state.filters.genre===g.genre?' class="active"':'')+' style="font-size:11px">'+g.label+' ('+g.count+')</a>';
      });
      h += '</div>';
      h += '<div style="margin-bottom:16px;font-size:14px;color:var(--muted)">'+fmt(list.total)+' أنمي · صفحة '+state.page+' من '+list.totalPages+'</div>';
      h += '<div class="aniverse-grid">';
      (list.items||[]).forEach(function(a){ h += cardHTML(a); });
      h += '</div>';
      // Pagination
      h += '<div class="aniverse-pagination">';
      for (var i=1; i<=Math.min(list.totalPages,10); i++){
        var ph = '?page='+i+'&sort='+state.sort;
        if (state.q) ph+='&q='+encodeURIComponent(state.q);
        if (state.filters.genre) ph+='&genre='+encodeURIComponent(state.filters.genre);
        h += '<a href="'+HOME+ph+'"'+(i===state.page?' class="active"':'')+'>'+i+'</a>';
      }
      h += '</div>';
      document.getElementById('aniverse-content').innerHTML = h;
    });
  }

  // ── Anime detail ────────────────────────────────────
  function renderAnimeDetail(){
    app.innerHTML = renderHeader() + '<div class="aniverse-main" id="aniverse-content"><div class="aniverse-loading">جارٍ التحميل…</div></div>';
    bindSearch(); bindRandom();
    api('/anime/'+encodeURIComponent(state.anime)).then(function(an){
      if (!an || an.code){ document.getElementById('aniverse-content').innerHTML='<div class="aniverse-loading">الأنمي غير موجود</div>'; return; }
      var poster = an.coverImage || an.posterUrl || '';
      var banner = an.bannerImage || poster;
      var genres = an.genres ? an.genres.split(',').map(function(s){return s.trim()}) : [];
      var h = '<div class="aniverse-breadcrumb"><a href="'+HOME+'">الرئيسية</a> / '+esc(an.titleEnglish||an.title)+'</div>';
      h += '<div class="aniverse-hero" style="height:340px">'+(banner?'<img class="aniverse-hero-bg" src="'+esc(banner)+'">':'')+'<div class="aniverse-hero-overlay"></div></div>';
      h += '<div style="display:flex;gap:20px;margin-top:-120px;position:relative;z-index:2">';
      h += '<div style="width:160px;aspect-ratio:2/3;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,0.15);flex-shrink:0">'+(poster?'<img src="'+esc(poster)+'" style="width:100%;height:100%;object-fit:cover">':'')+'</div>';
      h += '<div style="flex:1;padding-top:60px">';
      h += '<h1 style="font-size:28px;font-weight:900">'+esc(an.titleEnglish||an.title)+'</h1>';
      if (an.score) h += '<div style="margin:8px 0;font-size:24px;font-weight:bold;color:var(--primary)">★ '+(an.score/10).toFixed(1)+'/10</div>';
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">';
      genres.forEach(function(g){ h += '<span class="aniverse-badge emerald">'+esc(g)+'</span>'; });
      h += '</div>';
      var firstEp = an.episodes && an.episodes.length ? an.episodes[an.episodes.length-1] : null;
      if (firstEp) h += '<a href="'+HOME+'?watch='+encodeURIComponent(firstEp.id)+'" class="aniverse-hero-btns"><span class="primary aniverse-hero-btns" style="padding:10px 20px;border-radius:8px;background:var(--primary);color:var(--primary-fg);text-decoration:none;font-weight:600">▶ مشاهدة الحلقة الأولى</span></a>';
      h += '</div></div>';
      // Synopsis
      if (an.synopsisAr || an.synopsis){
        h += '<div style="margin-top:24px;padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--card)"><h3 style="margin-bottom:12px">📖 القصة</h3><p style="line-height:1.8;white-space:pre-line">'+esc(an.synopsisAr||an.synopsis)+'</p></div>';
      }
      // Episodes
      h += '<div style="margin-top:24px"><div class="aniverse-section-title">📺 الحلقات ('+fmt(an.episodeCount)+')</div>';
      h += '<div class="aniverse-ep-list">';
      (an.episodes||[]).forEach(function(e){
        var poster = e.posterUrl || an.posterUrl || '';
        h += '<a class="aniverse-ep-card" href="'+HOME+'?watch='+encodeURIComponent(e.id)+'">'+
          '<div class="aniverse-ep-thumb">'+(poster?'<img src="'+esc(poster)+'" loading="lazy">':'')+'</div>'+
          '<div><div class="aniverse-ep-num">حلقة '+esc(e.episodeNumber)+'</div><div class="aniverse-ep-title">'+esc(e.title)+'</div></div></a>';
      });
      h += '</div></div>';
      document.getElementById('aniverse-content').innerHTML = h;
    });
  }

  // ── Watch ──────────────────────────────────────────
  function renderWatch(){
    app.innerHTML = renderHeader() + '<div class="aniverse-main" id="aniverse-content"><div class="aniverse-loading">جارٍ التحميل…</div></div>';
    bindSearch(); bindRandom();
    api('/episode/'+encodeURIComponent(state.watch)).then(function(d){
      if (!d || d.code){ document.getElementById('aniverse-content').innerHTML='<div class="aniverse-loading">الحلقة غير موجودة</div>'; return; }
      var ep = d.episode, an = d.anime, sources = d.sources||[];
      var h = '<div class="aniverse-breadcrumb"><a href="'+HOME+'">الرئيسية</a> / <a href="'+HOME+'?anime='+(an?encodeURIComponent(an.slug):'')+'">'+esc(ep.animeTitle)+'</a> / الحلقة '+esc(ep.episodeNumber)+'</div>';
      h += '<div style="display:grid;gap:20px" class="aniverse-two-col"><div>';
      // Player
      var src = sources[0] ? sources[0].watchUrl : '';
      h += '<div class="aniverse-player" id="aniverse-player">'+(src?'<iframe src="'+esc(src)+'" allowfullscreen></iframe>':'لا يوجد مشغّل')+'</div>';
      h += '<h2 style="margin:16px 0 8px;font-size:18px;font-weight:bold">'+esc(ep.animeTitle)+' — الحلقة '+esc(ep.episodeNumber)+'</h2>';
      // Sources
      if (sources.length){
        h += '<div class="aniverse-sources"><h3>📺 مزوّدات المشاهدة ('+sources.length+')</h3><div>';
        sources.forEach(function(s,i){
          h += '<button class="aniverse-source-btn'+(i===0?' active':'')+'" data-src="'+esc(s.watchUrl)+'">'+esc(s.quality)+' '+esc(s.provider)+'</button>';
        });
        h += '</div></div>';
      }
      // Prev/next
      h += '<div style="margin-top:16px;display:flex;gap:12px">';
      if (d.prev) h += '<a href="'+HOME+'?watch='+encodeURIComponent(d.prev.id)+'" class="aniverse-source-btn">→ السابقة</a>';
      if (d.next) h += '<a href="'+HOME+'?watch='+encodeURIComponent(d.next.id)+'" class="aniverse-source-btn" style="background:var(--primary);color:var(--primary-fg)">التالية ←</a>';
      h += '</div>';
      h += '</div>'; // end main
      h += '<div class="aniverse-sidebar"><div class="aniverse-sidebar-head">📺 حلقات '+esc(ep.animeTitle)+'</div><div style="max-height:70vh;overflow-y:auto">';
      // Load episodes list
      if (an) api('/anime/'+encodeURIComponent(an.slug)).then(function(anime){
        var listHtml = '';
        (anime.episodes||[]).forEach(function(e){
          listHtml += '<a class="aniverse-ep-card'+(e.id===ep.id?' active':'')+'" href="'+HOME+'?watch='+encodeURIComponent(e.id)+'" style="padding:6px">'+
            '<div class="aniverse-ep-thumb" style="width:60px">'+(e.posterUrl||an.posterUrl?'<img src="'+esc(e.posterUrl||an.posterUrl)+'" loading="lazy">':'')+'</div>'+
            '<div><div class="aniverse-ep-num">'+esc(e.episodeNumber)+'</div></div></a>';
        });
        h += listHtml + '</div></div>';
      });
      h += '</div></div>'; // end sidebar + two-col
      document.getElementById('aniverse-content').innerHTML = h;
      // Source switcher
      document.querySelectorAll('.aniverse-source-btn[data-src]').forEach(function(btn){
        btn.addEventListener('click', function(){
          document.querySelectorAll('.aniverse-source-btn').forEach(function(b){b.classList.remove('active')});
          btn.classList.add('active');
          document.getElementById('aniverse-player').innerHTML = '<iframe src="'+btn.dataset.src+'" allowfullscreen></iframe>';
        });
      });
    });
  }

  // ── Schedule ────────────────────────────────────────
  function renderSchedule(){
    app.innerHTML = renderHeader() + '<div class="aniverse-main" id="aniverse-content"><div class="aniverse-loading">جارٍ التحميل…</div></div>';
    bindSearch(); bindRandom();
    api('/schedule').then(function(d){
      var h = '<h1 style="font-size:24px;font-weight:bold;margin-bottom:16px">📅 جدول البث</h1>';
      (d.schedule||[]).forEach(function(day){
        if (!day.items.length) return;
        h += '<div style="margin-bottom:16px"><h3 style="margin-bottom:8px">'+day.day+'</h3>';
        day.items.forEach(function(a){
          var poster = a.coverImage || a.posterUrl || '';
          h += '<a href="'+HOME+'?anime='+encodeURIComponent(a.slug)+'" style="display:flex;gap:8px;padding:6px;border:1px solid var(--border);border-radius:6px;margin-bottom:4px;text-decoration:none;color:inherit">'+
            '<div style="width:24px;aspect-ratio:2/3;border-radius:4px;overflow:hidden">'+(poster?'<img src="'+esc(poster)+'" style="width:100%;height:100%;object-fit:cover">':'')+'</div>'+
            '<span style="font-size:12px">'+esc(a.titleEnglish||a.title)+'</span></a>';
        });
        h += '</div>';
      });
      document.getElementById('aniverse-content').innerHTML = h;
    });
  }

  // ── Event bindings ──────────────────────────────────
  function bindSearch(){
    var input = document.getElementById('aniverse-search-input');
    if (!input) return;
    var timer;
    input.addEventListener('input', function(){
      clearTimeout(timer);
      timer = setTimeout(function(){
        var v = input.value.trim();
        var url = HOME + (v ? '?q='+encodeURIComponent(v) : '');
        navigate(url);
      }, 500);
    });
  }
  function bindRandom(){
    var btn = document.getElementById('aniverse-random-btn');
    if (!btn) return;
    btn.addEventListener('click', function(){
      btn.textContent = '⏳…';
      api('/anime/random').then(function(d){
        if (d.slug) navigate(HOME+'?anime='+encodeURIComponent(d.slug));
      });
    });
  }

  // ── Init ────────────────────────────────────────────
  window.addEventListener('popstate', handleRoute);
  handleRoute();
})();
