<?php
/** Aniverse Admin — Sync page (scan okanime → preview → update). */
if (!defined('ABSPATH')) exit;
$rest_url = esc_url_raw(rest_url('aniverse/v1'));
$nonce = wp_create_nonce('wp_rest');
$stats = Aniverse_Database::get_stats();
?>
<div class="wrap">
  <h1>🔧 Aniverse — أداة التحديث</h1>
  <div style="display:flex;gap:16px;margin:20px 0">
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
  <p>تفحص هذه الأداة خرائط موقع okanime وتضيف الأنميات والحلقات الجديدة إلى قاعدة بياناتك.</p>
  <button id="aniverse-scan-btn" class="button button-primary button-large">🔍 فحص الجديد</button>
  <div id="aniverse-sync-result" style="margin-top:20px"></div>
  <div id="aniverse-sync-confirm" style="margin-top:20px;display:none">
    <button id="aniverse-update-btn" class="button button-primary button-large">✅ تحديث قاعدة البيانات</button>
  </div>
</div>
<script>
jQuery(function($){
  var restUrl = '<?php echo $rest_url ?>';
  var nonce = '<?php echo $nonce ?>';

  $('#aniverse-scan-btn').on('click', function(){
    var btn = $(this); btn.prop('disabled', true);
    $('#aniverse-sync-result').html('<p>🔍 جارٍ فحص okanime…</p>');
    $('#aniverse-sync-confirm').hide();
    $.ajax({
      url: restUrl + '/sync', method: 'POST',
      beforeSend: function(xhr){ xhr.setRequestHeader('X-WP-Nonce', nonce); },
      contentType: 'application/json', data: JSON.stringify({dryRun:true, limit:60}),
      success: function(resp){
        var r = resp.result;
        var html = '<div style="background:#fff;border:1px solid #ddd;padding:16px;border-radius:8px">';
        html += '<h3>نتيجة الفحص</h3>';
        html += '<p>فحص ' + (r.sitemapAnime||0) + ' أنمي و ' + (r.sitemapEpisodes||0) + ' حلقة</p>';
        html += '<div style="display:flex;gap:12px;margin:12px 0">';
        html += '<span style="background:#0B1C1D;color:#49D17A;padding:4px 12px;border-radius:20px;font-weight:bold">' + (r.newAnimeInSitemap||0) + ' أنمي جديد</span>';
        html += '<span style="background:#0B1C1D;color:#49D17A;padding:4px 12px;border-radius:20px;font-weight:bold">' + (r.newEpisodesInSitemap||0) + ' حلقة جديدة</span>';
        html += '</div>';
        if (r.previewAnime && r.previewAnime.length) {
          html += '<h4>الأنميات الجديدة (' + r.previewAnime.length + ')</h4><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">';
          r.previewAnime.forEach(function(a){
            html += '<div style="border:1px solid #eee;padding:8px;border-radius:6px"><img src="'+a.posterUrl+'" style="width:100%;border-radius:4px"><div style="font-size:12px;font-weight:bold;margin-top:4px">'+a.title+'</div></div>';
          });
          html += '</div>';
        }
        if (r.previewEpisodes && r.previewEpisodes.length) {
          html += '<h4>الحلقات الجديدة (' + r.previewEpisodes.length + ')</h4><div style="max-height:300px;overflow-y:auto">';
          r.previewEpisodes.forEach(function(e){
            html += '<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #f0f0f0"><span style="background:#0B1C1D;color:#49D17A;padding:2px 8px;border-radius:4px;font-size:11px">'+e.episodeNumber+'</span><span style="font-size:12px">'+e.animeTitle+' ('+e.sourcesCount+' رابط)</span></div>';
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
      },
      error: function(){ $('#aniverse-sync-result').html('<p style="color:#d63638">❌ تعذّر الفحص</p>'); btn.prop('disabled', false); }
    });
  });

  $('#aniverse-update-btn').on('click', function(){
    var btn = $(this); btn.prop('disabled', true);
    $('#aniverse-sync-result').append('<p>⏳ جارٍ التحديث…</p>');
    $.ajax({
      url: restUrl + '/sync', method: 'POST',
      beforeSend: function(xhr){ xhr.setRequestHeader('X-WP-Nonce', nonce); },
      contentType: 'application/json', data: JSON.stringify({dryRun:false, limit:200}),
      success: function(resp){
        var r = resp.result;
        $('#aniverse-sync-result').append('<p style="color:#2a9d54;font-weight:bold">✅ تم! +' + (r.insertedAnime||0) + ' أنمي، +' + (r.insertedEpisodes||0) + ' حلقة، +' + (r.insertedSources||0) + ' رابط</p>');
        btn.prop('disabled', false);
        $('#aniverse-sync-confirm').hide();
      },
      error: function(){ $('#aniverse-sync-result').append('<p style="color:#d63638">❌ تعذّر التحديث</p>'); btn.prop('disabled', false); }
    });
  });
});
</script>
