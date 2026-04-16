/**
 * Mock veri üretici — L1 notları ve L2 tasnif sonuçları
 * Kullanım: node scripts/seed-mock-data.mjs
 * 
 * 3 uzman, her biri L1 notu yazar ve L2'de tasnif yapar.
 * Bazı ihtiyaçlar aynı gruba konur (yüksek consensus), bazıları farklı (düşük consensus).
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRqfgzx_cobQu2n4B2298jcTSVBpOQKhwcFwIFZvDpz8UDcBrZHucj3ziBxI8H5sPsTw/exec';

async function post(data) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  // no-cors gibi davranıyor, response okunamayabilir
  console.log(`POST ${data.type} for ${data.expertName}: done`);
}

const experts = [
  {
    name: 'Ayşe Yılmaz',
    sessionId: 'mock_ayse_001',
    l1Notes: [
      'Fiziksel İhtiyaçlar\n- Temizlik malzemesi\n- Isınma sorunu\n- Ücretsiz öğün\n- Hijyen malzemesi',
      'Eğitim İhtiyaçları\n- Bilgisayar laboratuvarı\n- Rehberlik desteği\n- Öğretmenlere eğitim\n- Ders dışı aktiviteler',
      'Psikososyal\n- Güvende hissetmeme\n- Öğretmenlere psikososyal destek\n- Aile danışmanlığı',
      'Maddi\n- Burs\n- Kira yardımı\n- Gıda yardımı',
    ],
    l2Groups: [
      { id: 'g_ayse_1', name: 'Temel Fiziksel İhtiyaçlar', stage: 'selected' },
      { id: 'g_ayse_2', name: 'Eğitim Altyapısı', stage: 'selected' },
      { id: 'g_ayse_3', name: 'Psikososyal Destek', stage: 'selected' },
      { id: 'g_ayse_4', name: 'Ekonomik Destek', stage: 'selected' },
    ],
    l2Needs: [
      { id: 'n_a1', text: 'Temizlik malzemesi', stage: 'selected', groupId: 'g_ayse_1' },
      { id: 'n_a2', text: 'Isınma sorunu', stage: 'selected', groupId: 'g_ayse_1' },
      { id: 'n_a3', text: 'Ücretsiz öğün', stage: 'selected', groupId: 'g_ayse_1' },
      { id: 'n_a4', text: 'Hijyen malzemesi', stage: 'selected', groupId: 'g_ayse_1' },
      { id: 'n_a5', text: 'Bilgisayar laboratuvarı', stage: 'selected', groupId: 'g_ayse_2' },
      { id: 'n_a6', text: 'Rehberlik desteği', stage: 'selected', groupId: 'g_ayse_2' },
      { id: 'n_a7', text: 'Öğretmenlere eğitim', stage: 'selected', groupId: 'g_ayse_2' },
      { id: 'n_a8', text: 'Ders dışı aktiviteler', stage: 'selected', groupId: 'g_ayse_2' },
      { id: 'n_a9', text: 'Güvende hissetmeme', stage: 'selected', groupId: 'g_ayse_3' },
      { id: 'n_a10', text: 'Öğretmenlere psikososyal destek', stage: 'selected', groupId: 'g_ayse_3' },
      { id: 'n_a11', text: 'Aile danışmanlığı', stage: 'selected', groupId: 'g_ayse_3' },
      { id: 'n_a12', text: 'Burs', stage: 'selected', groupId: 'g_ayse_4' },
      { id: 'n_a13', text: 'Kira yardımı', stage: 'selected', groupId: 'g_ayse_4' },
      { id: 'n_a14', text: 'Gıda yardımı', stage: 'selected', groupId: 'g_ayse_4' },
      // Pool'da kalan
      { id: 'n_a15', text: 'Spor malzemesi', stage: 'pool' },
      { id: 'n_a16', text: 'Okul gezileri', stage: 'pool' },
    ],
  },
  {
    name: 'Mehmet Kara',
    sessionId: 'mock_mehmet_002',
    l1Notes: [
      'Okul\n- Temizlik malzemesi\n- Bilgisayar laboratuvarı\n- Rehberlik\n- Spor alanları',
      'Beslenme\n- Ücretsiz öğün\n- Gıda yardımı\n- Beslenme desteği',
      'Psikoloji\n- Güvende hissetmeme\n- Öğretmenlere psikososyal destek\n- Aile danışmanlığı',
      'Maddi\n- Burs\n- Kira yardımı\n- Ev tadilat yardımı',
    ],
    l2Groups: [
      { id: 'g_meh_1', name: 'Temel Fiziksel İhtiyaçlar', stage: 'selected' },
      { id: 'g_meh_2', name: 'Eğitim Altyapısı', stage: 'selected' },
      { id: 'g_meh_3', name: 'Psikososyal Destek', stage: 'selected' },
      { id: 'g_meh_4', name: 'Ekonomik Destek', stage: 'selected' },
    ],
    l2Needs: [
      { id: 'n_m1', text: 'Temizlik malzemesi', stage: 'selected', groupId: 'g_meh_1' },
      { id: 'n_m2', text: 'Ücretsiz öğün', stage: 'selected', groupId: 'g_meh_1' },
      { id: 'n_m3', text: 'Gıda yardımı', stage: 'selected', groupId: 'g_meh_1' },
      { id: 'n_m4', text: 'Beslenme desteği', stage: 'selected', groupId: 'g_meh_1' },
      { id: 'n_m5', text: 'Bilgisayar laboratuvarı', stage: 'selected', groupId: 'g_meh_2' },
      { id: 'n_m6', text: 'Rehberlik desteği', stage: 'selected', groupId: 'g_meh_2' },
      { id: 'n_m7', text: 'Spor alanları', stage: 'selected', groupId: 'g_meh_2' },
      { id: 'n_m8', text: 'Güvende hissetmeme', stage: 'selected', groupId: 'g_meh_3' },
      { id: 'n_m9', text: 'Öğretmenlere psikososyal destek', stage: 'selected', groupId: 'g_meh_3' },
      { id: 'n_m10', text: 'Aile danışmanlığı', stage: 'selected', groupId: 'g_meh_3' },
      { id: 'n_m11', text: 'Burs', stage: 'selected', groupId: 'g_meh_4' },
      { id: 'n_m12', text: 'Kira yardımı', stage: 'selected', groupId: 'g_meh_4' },
      { id: 'n_m13', text: 'Ev tadilat yardımı', stage: 'selected', groupId: 'g_meh_4' },
      // Pool'da kalan
      { id: 'n_m14', text: 'Isınma sorunu', stage: 'pool' },
      { id: 'n_m15', text: 'Hijyen malzemesi', stage: 'pool' },
    ],
  },
  {
    name: 'Fatma Demir',
    sessionId: 'mock_fatma_003',
    l1Notes: [
      'Temiz su ve hijyen\n- Hijyen malzemesi\n- Temizlik malzemesi\n- Diş bakımı',
      'Teknoloji\n- Bilgisayar laboratuvarı\n- Bilgisayar ekipmanı\n- Akıllı tahta',
      'Psikolojik\n- Güvende hissetmeme\n- Rehberlik desteği\n- Öğretmenlere psikososyal destek',
      'Para\n- Burs\n- Maddi yardım\n- Gıda yardımı',
    ],
    l2Groups: [
      { id: 'g_fat_1', name: 'Hijyen ve Sağlık', stage: 'selected' },         // Farklı grup adı!
      { id: 'g_fat_2', name: 'Eğitim Altyapısı', stage: 'selected' },         // Aynı
      { id: 'g_fat_3', name: 'Psikososyal Destek', stage: 'selected' },        // Aynı
      { id: 'g_fat_4', name: 'Maddi Yardımlar', stage: 'selected' },           // Farklı grup adı!
    ],
    l2Needs: [
      { id: 'n_f1', text: 'Hijyen malzemesi', stage: 'selected', groupId: 'g_fat_1' },
      { id: 'n_f2', text: 'Temizlik malzemesi', stage: 'selected', groupId: 'g_fat_1' },
      { id: 'n_f3', text: 'Diş bakımı', stage: 'selected', groupId: 'g_fat_1' },
      { id: 'n_f4', text: 'Bilgisayar laboratuvarı', stage: 'selected', groupId: 'g_fat_2' },
      { id: 'n_f5', text: 'Bilgisayar ekipmanı', stage: 'selected', groupId: 'g_fat_2' },
      { id: 'n_f6', text: 'Akıllı tahta', stage: 'selected', groupId: 'g_fat_2' },
      { id: 'n_f7', text: 'Güvende hissetmeme', stage: 'selected', groupId: 'g_fat_3' },
      { id: 'n_f8', text: 'Rehberlik desteği', stage: 'selected', groupId: 'g_fat_3' },
      { id: 'n_f9', text: 'Öğretmenlere psikososyal destek', stage: 'selected', groupId: 'g_fat_3' },
      { id: 'n_f10', text: 'Burs', stage: 'selected', groupId: 'g_fat_4' },
      { id: 'n_f11', text: 'Maddi yardım', stage: 'selected', groupId: 'g_fat_4' },
      { id: 'n_f12', text: 'Gıda yardımı', stage: 'selected', groupId: 'g_fat_4' },
      // Pool'da kalan
      { id: 'n_f13', text: 'Ücretsiz öğün', stage: 'pool' },
      { id: 'n_f14', text: 'Okul gezileri', stage: 'pool' },
    ],
  },
];

/*
 * BEKLENEN CONSENSUS (3 uzman):
 * 
 * Yüksek (3/3 = 1.0, aynı gruba):
 *   - Güvende hissetmeme → Psikososyal Destek (3/3)
 *   - Öğretmenlere psikososyal destek → Psikososyal Destek (3/3)
 *   - Bilgisayar laboratuvarı → Eğitim Altyapısı (3/3)
 *   - Burs → Ekonomik Destek/Maddi Yardımlar (2/3 vs 1/3)
 * 
 * Orta (2/3 ≈ 0.67):
 *   - Temizlik malzemesi → Temel Fiziksel (2/3) vs Hijyen (1/3)
 *   - Rehberlik desteği → Eğitim Altyapısı (2/3) vs Psikososyal (1/3)
 *   - Kira yardımı → Ekonomik Destek (2/3)
 *   - Gıda yardımı → farklı gruplar
 *
 * Düşük / Pool'da:
 *   - Spor malzemesi (sadece 1 uzman)
 *   - Akıllı tahta (sadece 1 uzman)
 *   - Diş bakımı (sadece 1 uzman)
 */

async function main() {
  console.log('=== Mock Veri Gönderimi Başlıyor ===\n');

  // 1) L1 Notları gönder
  for (const expert of experts) {
    await post({
      type: 'L1_NOTES',
      sessionId: expert.sessionId,
      expertName: expert.name,
      submittedAt: new Date().toISOString(),
      notes: expert.l1Notes,
    });
  }
  console.log('\n✓ L1 notları gönderildi\n');

  // 2) L2 Board sonuçları gönder
  for (const expert of experts) {
    await post({
      type: 'L2_BOARD',
      sessionId: expert.sessionId,
      expertName: expert.name,
      submittedAt: new Date().toISOString(),
      needs: expert.l2Needs,
      groups: expert.l2Groups,
    });
  }
  console.log('\n✓ L2 sonuçları gönderildi\n');

  console.log('=== Tamamlandı ===');
  console.log('Artık L3 moderatör boardında 3 uzmanın consensus verisi görünmeli.');
}

main().catch(console.error);
