<?php
/** Aniverse Admin — Sync + Import page. */
if (!defined('ABSPATH')) exit;
$rest_url = esc_url_raw(rest_url('aniverse/v1'));
$nonce = wp_create_nonce('wp_rest');
$stats = Aniverse_Database::get_stats();
$seed_exists = file_exists(Aniverse_Import::seed_file());
?>
<div class="wrap">
  <h1>🔧 Aniverse — لوحة التحكم</h1>

  <div style="display:flex;gap:16px;margin:20px 0;flex-wrap:wrap">
    <div style="background:#fff;border:1px solid #ddd;padding:12px 20px;border-radius:8px">
      <div style="font-size:28px;font-weight:bold;color:#0B1C1D"><?php echo number_format($stats['anime']) ?></div>
      <div style="color:#666">أنمي</div>
    </div>
    <div style="background:#fff;border:1px solid #ddd;padding:12px 20px;border-radius:8px">
      <div style="font-size:28px;font-weight:bold;color:#0B1C1D"><?php echo number_format($stats['episodes']) ?></div>
      <div style="color:#666">حلقة</div>
    </div>
    <div style="background:#fff;border:1px solid #ddd;padding:12px 20px;border-radius:8px">
      <div style="font-size:28px;font-weight:bold;color:#0B1C1D"><?php echo number_format($stats['sources']) ?></div>
      <div style="color:#666">رابط مشاهدة</div>
    </div>
  </div>

  <?php if ($stats['anime'] == 0): ?>
  <!-- IMPORT SECTION -->
  <div style="background:#fff;border:1px solid #ddd;padding:24px;border-radius:8px;margin:20px 0">
    <h2>📥 استيراد البيانات الأولية</h2>
    <p>المكتبة فارغة حالياً. اضغط الزر أدناه لاستيراد <strong>2,193 أنمي + 25,885 حلقة + 149,382 رابط مشاهدة</strong> تلقائياً (بدون phpMyAdmin).</p>
    <?php if ($seed_exists): ?>
      <button id="aniverse-import-btn" class="button button-primary button-large">📥 استيراد البيانات</button>
      <div id="aniverse-import-progress" style="margin-top:16px"></div>
    <?php else: ?>
      <p style="color:#d63638">⚠️ ملف البيانات (aniverse-seed.sql.gz) غير موجود. أعد تثبيت الإضافة بكامل محتواها.</p>
    <?php endif; ?>
  </div>
  <?php endif; ?>

  <!-- SYNC SECTION -->
  <div style="background:#fff;border:1px solid #ddd;padding:24px;border-radius:8px;margin:20px 0">
    <h2>🔄 فحص الجديد من okanime</h2>
    <p>تفحص هذه الأداة خرائط موقع okanime وتضيف الأنميات والحلقات الجديدة.</p>
    <button id="aniverse-scan-btn" class="button button-primary button-large">🔍 فحص الجديد</button>
    <div id="aniverse-sync-result" style="margin-top:20px"></div>
    <div id="aniverse-sync-confirm" style="margin-top:20px;display:none">
      <button id="aniverse-update-btn" class="button button-primary button-large">✅ تحديث قاعدة البيانات</button>
    </div>
  </div>
</div>

<script>
jQuery(function($){
  var restUrl = '<?php echo $rest_url ?>';
  var nonce = '<?php echo $nonce ?>';

  function ajaxPost(path, data) {
    return $.ajax({
      url: restUrl + path, method: 'POST',
      beforeSend: function(xhr){ xhr.setRequestHeader('X-WP-Nonce', nonce); },
      contentType: 'application/json', data: JSON.stringify(data)
    });
  }

  // ── IMPORT ──────────────────────────────────────────
  $('#aniverse-import-btn').on('click', function(){
    var btn = $(this); btn.prop('disabled', true);
    var prog = $('#aniverse-import-progress');
    prog.html('<p>⏳ جارٍ الاستيراد…</p>');
    var offset = 0, batchSize = 200, totalOk = 0, totalFail = 0;
    function next() {
      ajaxPost('/import', {offset: offset, batchSize: batchSize}).done(function(resp){
        totalOk += resp.succeeded; totalFail += resp.failed;
        var pct = Math.round((resp.nextOffset / resp.totalStatements) * 100);
        prog.html(
          '<div style="background:#f0f0f0;border-radius:8px;height:24px;width:100%;overflow:hidden">' +
          '<div style="background:#49D17A;height:100%;width:' + pct + '%;transition:width 0.3s"></div></div>' +
          '<p style="margin-top:8px">' + pct + '% — ' + resp.nextOffset + '/' + resp.totalStatements + ' عبارة (✅' + totalOk + ' ❌' + totalFail + ')</p>'
        );
        if (resp.done) {
          prog.append('<p style="color:#2a9d54;font-weight:bold;font-size:16px;margin-top:12px">✅ اكتمل الاستيراد!</p>');
          prog.append('<p>القاعدة الآن تحتوي على: ' + (resp.stats.anime||0) + ' أنمي، ' + (resp.stats.episodes||0) + ' حلقة، ' + (resp.stats.sources||0) + ' رابط.</p>');
          prog.append('<p><a href="<?php echo home_url() ?>" target="_blank" class="button button-primary">عرض الموقع ←</a></p>');
          btn.hide();
        } else {
          offset = resp.nextOffset;
          setTimeout(next, 200);
        }
      }).fail(function(xhr){
        prog.html('<p style="color:#d63638">❌ خطأ في الاستيراد: ' + (xhr.responseJSON?.message || xhr.statusText) + '</p>');
        btn.prop('disabled', false);
      });
    }
    next();
  });

  // ── SYNC ───────────────────────────────────────────
  $('#aniverse-scan-btn').on('click', function(){
    var btn = $(this); btn.prop('disabled', true);
    $('#aniverse-sync-result').html('<p>🔍 جارٍ فحص okanime…</p>');
    $('#aniverse-sync-confirm').hide();
    ajaxPost('/sync', {dryRun:true, limit:60}).done(function(resp){
      var r = resp.result;
      var html = '<div style="background:#f9f9f9;border:1px solid #eee;padding:16px;border-radius:8px">';
      html += '<h3>نتيجة الفحص</h3>';
      html += '<p>فحص ' + (r.sitemapAnime||0) + ' أنمي و ' + (r.sitemapEpisodes||0) + ' حلقة</p>';
      html += '<div style="display:flex;gap:12px;margin:12px 0">';
      html += '<span style="background:#0B1C1D;color:#49D17A;padding:4px 12px;border-radius:20px;font-weight:bold">' + (r.newAnimeInSitemap||0) + ' أنمي جديد</span>';
      html += '<span style="background:#0B1C1D;color:#49D17A;padding:4px 12px;border-radius:20px;font-weight:bold">' + (r.newEpisodesInSitemap||0) + ' حلقة جديدة</span>';
      html += '</div>';
      if (r.previewEpisodes && r.previewEpisodes.length) {
        html += '<h4>الحلقات الجديدة (' + r.previewEpisodes.length + ')</h4><div style="max-height:300px;overflow-y:auto">';
        r.previewEpisodes.forEach(function(e){
          html += '<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #f0f0f0"><span style="background:#0B1C1D;color:#49D17A;padding:2px 8px;border-radius:4px;font-size:11px">' + e.episodeNumber + '</span><span style="font-size:12px">' + e.animeTitle + ' (' + e.sourcesCount + ' رابط)</span></div>';
        });
        html += '</div>';
      }
      if ((r.newAnimeInSitemap||0) === 0 && (r.newEpisodesInSitemap||0) === 0) {
        html += '<p style="color:#2a9d54;font-weight:bold">✅ المكتبة محدّثة — لا يوجد جديد</p>';
      } else {
        $('#aniverse-sync-confirm').show();
      }
      html += '</div>';
      $('#aniverse-sync-result').html(html);
      btn.prop('disabled', false);
    }).fail(function(){ $('#aniverse-sync-result').html('<p style="color:#d63638">❌ تعذّر الفحص</p>'); btn.prop('disabled', false); });
  });

  $('#aniverse-update-btn').on('click', function(){
    var btn = $(this); btn.prop('disabled', true);
    $('#aniverse-sync-result').append('<p>⏳ جارٍ التحديث…</p>');
    ajaxPost('/sync', {dryRun:false, limit:200}).done(function(resp){
      var r = resp.result;
      $('#aniverse-sync-result').append('<p style="color:#2a9d54;font-weight:bold">✅ تم! +' + (r.insertedAnime||0) + ' أنمي، +' + (r.insertedEpisodes||0) + ' حلقة، +' + (r.insertedSources||0) + ' رابط</p>');
      btn.prop('disabled', false);
      $('#aniverse-sync-confirm').hide();
    }).fail(function(){ $('#aniverse-sync-result').append('<p style="color:#d63638">❌ تعذّر التحديث</p>'); btn.prop('disabled', false); });
  });
});
</script>
