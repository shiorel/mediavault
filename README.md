# Media Vault · GitHub Pages

Anime, manga, kitap, film, dizi ve K-Drama için Türkçe kişisel medya arşivi.

## Kullanım

Siteyi açıp **Yeni Ekle** ile içerik ekleyin. Başlığı yazınca ücretsiz kaynaklardan kapak ve bilgiler aranır. Servis kullanılamıyorsa manuel kayıt her zaman kullanılabilir.

Kayıtlar bu cihazın bu tarayıcısında **IndexedDB** veritabanına kaydedilir. Site herkese açıktır, kişisel kütüphaneler GitHub’a gönderilmez. Otomatik cihaz eşitleme veya Google hesabıyla giriş yoktur. Başka cihaza taşımak için **İçe / Dışa Aktar → Tam yedek** dosyasını indirin, hedef cihazda JSON içe aktarın. Tarayıcı site verilerini silmek kayıtları da siler; düzenli yedek alın.

## Desteklenen işlevler

- Kayıt ekleme, düzenleme, silme; favoriler, puanlar, ilerleme ve toplu düzenleme.
- Kategori, durum, etiket, tür, yıl ve puan filtreleri.
- MyAnimeList XML/XML.GZ ve önceki Media Vault JSON yedeklerini içe aktarma.
- JSON/CSV dışa aktarma; aktivite günlüğünü içeren tam JSON yedeği.
- İstatistikler, yıllık özet ve paylaşılabilir özet görseli.
- AniList/Jikan/Kitsu, Google Books/Open Library, TMDB ve ücretsiz yedek kaynaklarla metadata arama.
- Kişiselleştirilmiş keşif ve planlanan içeriklerden öneri.
- Yayın takvimi; takvim uygulamasına aktarılabilen ICS hatırlatmaları.

## İsteğe bağlı bağlantılar

TMDB Read Access Token **Ayarlar** ekranından girilir ve bu tarayıcının site verilerinde kalıcı olarak saklanır. Edge kapatılıp açıldığında yeniden girilmesi gerekmez; **Tokenı kaldır** düğmesiyle veya tarayıcının site verileri temizlenerek silinebilir. Önceki sürümde açık sekmede saklanan token, sayfa yenilendiğinde otomatik taşınır. Gemini API anahtarı öneri ekranından girilir ve yalnızca sekmenin oturumunda saklanır. Anahtarlar kaynak dosyalarına yazılmaz. Dış API’lerin erişim, tarayıcı CORS ve kota koşulları değişebilir. Anahtarsız temel kütüphane işlevleri çalışır. Gemini seçilirse tercih başlıkları/puanları/türleri ve aday özetleri Google’a gönderilir. Günlük sınır bu cihaz için geçerlidir.

Apps Script sürümündeki Google Drive yedeği indirme olarak uyarlandı. Drive kapak önbelleği kaldırıldı. Takvim hatırlatması dış takvime doğrudan yazılmaz: indirilen ICS dosyasını takvim uygulamanıza aktarın. Uygulamada hatırlatma işaretini kapatmak dış takvimdeki etkinliği silmez.

## Yayın

Depo kökünde `index.html`, `styles.css`, `app.js`, `storage.js` ve `.nojekyll` bulunur. Derleme veya paket kurulumu gerekmez. GitHub **Settings → Pages → Deploy from a branch → main → /(root)** ayarıyla yayınlanır.

Göreli dosya yolları hem `kullanici.github.io/mediavault/` hem özel alan adlarında çalışır.

Resmî yayın belgesi: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
