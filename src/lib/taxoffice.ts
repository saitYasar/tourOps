// Türkiye Vergi Daireleri Listesi (İl bazında)
export interface TaxOffice {
  id: number;
  name: string;
  city: string;
}

export const taxOffices: TaxOffice[] = [
  // İstanbul - Avrupa
  { id: 1, name: 'Bakırköy Vergi Dairesi', city: 'İstanbul' },
  { id: 2, name: 'Bahçelievler Vergi Dairesi', city: 'İstanbul' },
  { id: 3, name: 'Bağcılar Vergi Dairesi', city: 'İstanbul' },
  { id: 4, name: 'Başakşehir Vergi Dairesi', city: 'İstanbul' },
  { id: 5, name: 'Bayrampaşa Vergi Dairesi', city: 'İstanbul' },
  { id: 6, name: 'Beşiktaş Vergi Dairesi', city: 'İstanbul' },
  { id: 7, name: 'Beylikdüzü Vergi Dairesi', city: 'İstanbul' },
  { id: 8, name: 'Beyoğlu Vergi Dairesi', city: 'İstanbul' },
  { id: 9, name: 'Büyükçekmece Vergi Dairesi', city: 'İstanbul' },
  { id: 10, name: 'Çatalca Vergi Dairesi', city: 'İstanbul' },
  { id: 11, name: 'Esenler Vergi Dairesi', city: 'İstanbul' },
  { id: 12, name: 'Esenyurt Vergi Dairesi', city: 'İstanbul' },
  { id: 13, name: 'Eyüpsultan Vergi Dairesi', city: 'İstanbul' },
  { id: 14, name: 'Fatih Vergi Dairesi', city: 'İstanbul' },
  { id: 15, name: 'Gaziosmanpaşa Vergi Dairesi', city: 'İstanbul' },
  { id: 16, name: 'Güngören Vergi Dairesi', city: 'İstanbul' },
  { id: 17, name: 'Kağıthane Vergi Dairesi', city: 'İstanbul' },
  { id: 18, name: 'Küçükçekmece Vergi Dairesi', city: 'İstanbul' },
  { id: 19, name: 'Sarıyer Vergi Dairesi', city: 'İstanbul' },
  { id: 20, name: 'Silivri Vergi Dairesi', city: 'İstanbul' },
  { id: 21, name: 'Sultangazi Vergi Dairesi', city: 'İstanbul' },
  { id: 22, name: 'Şişli Vergi Dairesi', city: 'İstanbul' },
  { id: 23, name: 'Zeytinburnu Vergi Dairesi', city: 'İstanbul' },
  { id: 24, name: 'Avcılar Vergi Dairesi', city: 'İstanbul' },
  { id: 25, name: 'Arnavutköy Vergi Dairesi', city: 'İstanbul' },
  // İstanbul - Anadolu
  { id: 26, name: 'Ataşehir Vergi Dairesi', city: 'İstanbul' },
  { id: 27, name: 'Beykoz Vergi Dairesi', city: 'İstanbul' },
  { id: 28, name: 'Çekmeköy Vergi Dairesi', city: 'İstanbul' },
  { id: 29, name: 'Kadıköy Vergi Dairesi', city: 'İstanbul' },
  { id: 30, name: 'Kartal Vergi Dairesi', city: 'İstanbul' },
  { id: 31, name: 'Maltepe Vergi Dairesi', city: 'İstanbul' },
  { id: 32, name: 'Pendik Vergi Dairesi', city: 'İstanbul' },
  { id: 33, name: 'Sancaktepe Vergi Dairesi', city: 'İstanbul' },
  { id: 34, name: 'Sultanbeyli Vergi Dairesi', city: 'İstanbul' },
  { id: 35, name: 'Şile Vergi Dairesi', city: 'İstanbul' },
  { id: 36, name: 'Tuzla Vergi Dairesi', city: 'İstanbul' },
  { id: 37, name: 'Ümraniye Vergi Dairesi', city: 'İstanbul' },
  { id: 38, name: 'Üsküdar Vergi Dairesi', city: 'İstanbul' },
  { id: 39, name: 'Adalar Vergi Dairesi', city: 'İstanbul' },
  // İstanbul - Özel
  { id: 40, name: 'Boğaziçi Kurumlar Vergi Dairesi', city: 'İstanbul' },
  { id: 41, name: 'Marmara Kurumlar Vergi Dairesi', city: 'İstanbul' },
  { id: 42, name: 'Anadolu Kurumlar Vergi Dairesi', city: 'İstanbul' },
  { id: 43, name: 'Büyük Mükellefler Vergi Dairesi', city: 'İstanbul' },

  // Ankara
  { id: 44, name: 'Altındağ Vergi Dairesi', city: 'Ankara' },
  { id: 45, name: 'Çankaya Vergi Dairesi', city: 'Ankara' },
  { id: 46, name: 'Etimesgut Vergi Dairesi', city: 'Ankara' },
  { id: 47, name: 'Gölbaşı Vergi Dairesi', city: 'Ankara' },
  { id: 48, name: 'Keçiören Vergi Dairesi', city: 'Ankara' },
  { id: 49, name: 'Mamak Vergi Dairesi', city: 'Ankara' },
  { id: 50, name: 'Polatlı Vergi Dairesi', city: 'Ankara' },
  { id: 51, name: 'Pursaklar Vergi Dairesi', city: 'Ankara' },
  { id: 52, name: 'Sincan Vergi Dairesi', city: 'Ankara' },
  { id: 53, name: 'Yenimahalle Vergi Dairesi', city: 'Ankara' },
  { id: 54, name: 'Başkent Vergi Dairesi', city: 'Ankara' },
  { id: 55, name: 'Dışkapı Vergi Dairesi', city: 'Ankara' },
  { id: 56, name: 'Hitit Vergi Dairesi', city: 'Ankara' },
  { id: 57, name: 'Maliye Vergi Dairesi', city: 'Ankara' },
  { id: 58, name: 'Mithatpaşa Vergi Dairesi', city: 'Ankara' },
  { id: 59, name: 'Ostim Vergi Dairesi', city: 'Ankara' },
  { id: 60, name: 'Ulus Vergi Dairesi', city: 'Ankara' },

  // İzmir
  { id: 61, name: 'Alsancak Vergi Dairesi', city: 'İzmir' },
  { id: 62, name: 'Balçova Vergi Dairesi', city: 'İzmir' },
  { id: 63, name: 'Bayraklı Vergi Dairesi', city: 'İzmir' },
  { id: 64, name: 'Bornova Vergi Dairesi', city: 'İzmir' },
  { id: 65, name: 'Buca Vergi Dairesi', city: 'İzmir' },
  { id: 66, name: 'Çiğli Vergi Dairesi', city: 'İzmir' },
  { id: 67, name: 'Gaziemir Vergi Dairesi', city: 'İzmir' },
  { id: 68, name: 'Güzelbahçe Vergi Dairesi', city: 'İzmir' },
  { id: 69, name: 'Karabağlar Vergi Dairesi', city: 'İzmir' },
  { id: 70, name: 'Karşıyaka Vergi Dairesi', city: 'İzmir' },
  { id: 71, name: 'Konak Vergi Dairesi', city: 'İzmir' },
  { id: 72, name: 'Menemen Vergi Dairesi', city: 'İzmir' },
  { id: 73, name: 'Narlıdere Vergi Dairesi', city: 'İzmir' },
  { id: 74, name: 'Torbalı Vergi Dairesi', city: 'İzmir' },
  { id: 75, name: 'Ege Vergi Dairesi', city: 'İzmir' },

  // Antalya
  { id: 76, name: 'Alanya Vergi Dairesi', city: 'Antalya' },
  { id: 77, name: 'Kepez Vergi Dairesi', city: 'Antalya' },
  { id: 78, name: 'Konyaaltı Vergi Dairesi', city: 'Antalya' },
  { id: 79, name: 'Manavgat Vergi Dairesi', city: 'Antalya' },
  { id: 80, name: 'Muratpaşa Vergi Dairesi', city: 'Antalya' },
  { id: 81, name: 'Serik Vergi Dairesi', city: 'Antalya' },
  { id: 82, name: 'Akdeniz Vergi Dairesi', city: 'Antalya' },

  // Bursa
  { id: 83, name: 'Gemlik Vergi Dairesi', city: 'Bursa' },
  { id: 84, name: 'İnegöl Vergi Dairesi', city: 'Bursa' },
  { id: 85, name: 'Mudanya Vergi Dairesi', city: 'Bursa' },
  { id: 86, name: 'Nilüfer Vergi Dairesi', city: 'Bursa' },
  { id: 87, name: 'Osmangazi Vergi Dairesi', city: 'Bursa' },
  { id: 88, name: 'Yıldırım Vergi Dairesi', city: 'Bursa' },
  { id: 89, name: 'Uludağ Vergi Dairesi', city: 'Bursa' },

  // Adana
  { id: 90, name: 'Ceyhan Vergi Dairesi', city: 'Adana' },
  { id: 91, name: 'Çukurova Vergi Dairesi', city: 'Adana' },
  { id: 92, name: 'Sarıçam Vergi Dairesi', city: 'Adana' },
  { id: 93, name: 'Seyhan Vergi Dairesi', city: 'Adana' },
  { id: 94, name: 'Yüreğir Vergi Dairesi', city: 'Adana' },
  { id: 95, name: 'Adana Vergi Dairesi', city: 'Adana' },

  // Konya
  { id: 96, name: 'Karatay Vergi Dairesi', city: 'Konya' },
  { id: 97, name: 'Meram Vergi Dairesi', city: 'Konya' },
  { id: 98, name: 'Selçuklu Vergi Dairesi', city: 'Konya' },
  { id: 99, name: 'Konya Vergi Dairesi', city: 'Konya' },

  // Gaziantep
  { id: 100, name: 'Şahinbey Vergi Dairesi', city: 'Gaziantep' },
  { id: 101, name: 'Şehitkamil Vergi Dairesi', city: 'Gaziantep' },
  { id: 102, name: 'Nizip Vergi Dairesi', city: 'Gaziantep' },
  { id: 103, name: 'Gaziantep Vergi Dairesi', city: 'Gaziantep' },

  // Mersin
  { id: 104, name: 'Akdeniz Vergi Dairesi', city: 'Mersin' },
  { id: 105, name: 'Mezitli Vergi Dairesi', city: 'Mersin' },
  { id: 106, name: 'Tarsus Vergi Dairesi', city: 'Mersin' },
  { id: 107, name: 'Toroslar Vergi Dairesi', city: 'Mersin' },
  { id: 108, name: 'Yenişehir Vergi Dairesi', city: 'Mersin' },

  // Kayseri
  { id: 109, name: 'Kocasinan Vergi Dairesi', city: 'Kayseri' },
  { id: 110, name: 'Melikgazi Vergi Dairesi', city: 'Kayseri' },
  { id: 111, name: 'Talas Vergi Dairesi', city: 'Kayseri' },
  { id: 112, name: 'Kayseri Vergi Dairesi', city: 'Kayseri' },

  // Eskişehir
  { id: 113, name: 'Odunpazarı Vergi Dairesi', city: 'Eskişehir' },
  { id: 114, name: 'Tepebaşı Vergi Dairesi', city: 'Eskişehir' },
  { id: 115, name: 'Eskişehir Vergi Dairesi', city: 'Eskişehir' },

  // Diyarbakır
  { id: 116, name: 'Bağlar Vergi Dairesi', city: 'Diyarbakır' },
  { id: 117, name: 'Kayapınar Vergi Dairesi', city: 'Diyarbakır' },
  { id: 118, name: 'Sur Vergi Dairesi', city: 'Diyarbakır' },
  { id: 119, name: 'Yenişehir Vergi Dairesi', city: 'Diyarbakır' },

  // Samsun
  { id: 120, name: 'Atakum Vergi Dairesi', city: 'Samsun' },
  { id: 121, name: 'Canik Vergi Dairesi', city: 'Samsun' },
  { id: 122, name: 'İlkadım Vergi Dairesi', city: 'Samsun' },
  { id: 123, name: 'Samsun Vergi Dairesi', city: 'Samsun' },

  // Denizli
  { id: 124, name: 'Merkezefendi Vergi Dairesi', city: 'Denizli' },
  { id: 125, name: 'Pamukkale Vergi Dairesi', city: 'Denizli' },
  { id: 126, name: 'Denizli Vergi Dairesi', city: 'Denizli' },

  // Şanlıurfa
  { id: 127, name: 'Eyyübiye Vergi Dairesi', city: 'Şanlıurfa' },
  { id: 128, name: 'Haliliye Vergi Dairesi', city: 'Şanlıurfa' },
  { id: 129, name: 'Karaköprü Vergi Dairesi', city: 'Şanlıurfa' },
  { id: 130, name: 'Şanlıurfa Vergi Dairesi', city: 'Şanlıurfa' },

  // Malatya
  { id: 131, name: 'Battalgazi Vergi Dairesi', city: 'Malatya' },
  { id: 132, name: 'Yeşilyurt Vergi Dairesi', city: 'Malatya' },
  { id: 133, name: 'Malatya Vergi Dairesi', city: 'Malatya' },

  // Trabzon
  { id: 134, name: 'Ortahisar Vergi Dairesi', city: 'Trabzon' },
  { id: 135, name: 'Trabzon Vergi Dairesi', city: 'Trabzon' },

  // Erzurum
  { id: 136, name: 'Aziziye Vergi Dairesi', city: 'Erzurum' },
  { id: 137, name: 'Palandöken Vergi Dairesi', city: 'Erzurum' },
  { id: 138, name: 'Yakutiye Vergi Dairesi', city: 'Erzurum' },
  { id: 139, name: 'Erzurum Vergi Dairesi', city: 'Erzurum' },

  // Van
  { id: 140, name: 'İpekyolu Vergi Dairesi', city: 'Van' },
  { id: 141, name: 'Tuşba Vergi Dairesi', city: 'Van' },
  { id: 142, name: 'Van Vergi Dairesi', city: 'Van' },

  // Muğla
  { id: 143, name: 'Bodrum Vergi Dairesi', city: 'Muğla' },
  { id: 144, name: 'Fethiye Vergi Dairesi', city: 'Muğla' },
  { id: 145, name: 'Marmaris Vergi Dairesi', city: 'Muğla' },
  { id: 146, name: 'Menteşe Vergi Dairesi', city: 'Muğla' },
  { id: 147, name: 'Milas Vergi Dairesi', city: 'Muğla' },

  // Aydın
  { id: 148, name: 'Efeler Vergi Dairesi', city: 'Aydın' },
  { id: 149, name: 'Kuşadası Vergi Dairesi', city: 'Aydın' },
  { id: 150, name: 'Nazilli Vergi Dairesi', city: 'Aydın' },
  { id: 151, name: 'Söke Vergi Dairesi', city: 'Aydın' },

  // Manisa
  { id: 152, name: 'Akhisar Vergi Dairesi', city: 'Manisa' },
  { id: 153, name: 'Şehzadeler Vergi Dairesi', city: 'Manisa' },
  { id: 154, name: 'Turgutlu Vergi Dairesi', city: 'Manisa' },
  { id: 155, name: 'Yunusemre Vergi Dairesi', city: 'Manisa' },

  // Balıkesir
  { id: 156, name: 'Altıeylül Vergi Dairesi', city: 'Balıkesir' },
  { id: 157, name: 'Bandırma Vergi Dairesi', city: 'Balıkesir' },
  { id: 158, name: 'Edremit Vergi Dairesi', city: 'Balıkesir' },
  { id: 159, name: 'Karesi Vergi Dairesi', city: 'Balıkesir' },

  // Kocaeli
  { id: 160, name: 'Darıca Vergi Dairesi', city: 'Kocaeli' },
  { id: 161, name: 'Gebze Vergi Dairesi', city: 'Kocaeli' },
  { id: 162, name: 'İzmit Vergi Dairesi', city: 'Kocaeli' },
  { id: 163, name: 'Körfez Vergi Dairesi', city: 'Kocaeli' },

  // Sakarya
  { id: 164, name: 'Adapazarı Vergi Dairesi', city: 'Sakarya' },
  { id: 165, name: 'Erenler Vergi Dairesi', city: 'Sakarya' },
  { id: 166, name: 'Serdivan Vergi Dairesi', city: 'Sakarya' },

  // Tekirdağ
  { id: 167, name: 'Çerkezköy Vergi Dairesi', city: 'Tekirdağ' },
  { id: 168, name: 'Çorlu Vergi Dairesi', city: 'Tekirdağ' },
  { id: 169, name: 'Süleymanpaşa Vergi Dairesi', city: 'Tekirdağ' },

  // Hatay
  { id: 170, name: 'Antakya Vergi Dairesi', city: 'Hatay' },
  { id: 171, name: 'Defne Vergi Dairesi', city: 'Hatay' },
  { id: 172, name: 'İskenderun Vergi Dairesi', city: 'Hatay' },

  // Kahramanmaraş
  { id: 173, name: 'Dulkadiroğlu Vergi Dairesi', city: 'Kahramanmaraş' },
  { id: 174, name: 'Onikişubat Vergi Dairesi', city: 'Kahramanmaraş' },
  { id: 175, name: 'Kahramanmaraş Vergi Dairesi', city: 'Kahramanmaraş' },

  // Afyonkarahisar
  { id: 176, name: 'Afyonkarahisar Vergi Dairesi', city: 'Afyonkarahisar' },
  { id: 177, name: 'Merkez Vergi Dairesi', city: 'Afyonkarahisar' },

  // Sivas
  { id: 178, name: 'Sivas Vergi Dairesi', city: 'Sivas' },
  { id: 179, name: 'Merkez Vergi Dairesi', city: 'Sivas' },

  // Diğer İller
  { id: 180, name: 'Adıyaman Vergi Dairesi', city: 'Adıyaman' },
  { id: 181, name: 'Ağrı Vergi Dairesi', city: 'Ağrı' },
  { id: 182, name: 'Aksaray Vergi Dairesi', city: 'Aksaray' },
  { id: 183, name: 'Amasya Vergi Dairesi', city: 'Amasya' },
  { id: 184, name: 'Ardahan Vergi Dairesi', city: 'Ardahan' },
  { id: 185, name: 'Artvin Vergi Dairesi', city: 'Artvin' },
  { id: 186, name: 'Bartın Vergi Dairesi', city: 'Bartın' },
  { id: 187, name: 'Batman Vergi Dairesi', city: 'Batman' },
  { id: 188, name: 'Bayburt Vergi Dairesi', city: 'Bayburt' },
  { id: 189, name: 'Bilecik Vergi Dairesi', city: 'Bilecik' },
  { id: 190, name: 'Bingöl Vergi Dairesi', city: 'Bingöl' },
  { id: 191, name: 'Bitlis Vergi Dairesi', city: 'Bitlis' },
  { id: 192, name: 'Bolu Vergi Dairesi', city: 'Bolu' },
  { id: 193, name: 'Burdur Vergi Dairesi', city: 'Burdur' },
  { id: 194, name: 'Çanakkale Vergi Dairesi', city: 'Çanakkale' },
  { id: 195, name: 'Çankırı Vergi Dairesi', city: 'Çankırı' },
  { id: 196, name: 'Çorum Vergi Dairesi', city: 'Çorum' },
  { id: 197, name: 'Düzce Vergi Dairesi', city: 'Düzce' },
  { id: 198, name: 'Edirne Vergi Dairesi', city: 'Edirne' },
  { id: 199, name: 'Elazığ Vergi Dairesi', city: 'Elazığ' },
  { id: 200, name: 'Erzincan Vergi Dairesi', city: 'Erzincan' },
  { id: 201, name: 'Giresun Vergi Dairesi', city: 'Giresun' },
  { id: 202, name: 'Gümüşhane Vergi Dairesi', city: 'Gümüşhane' },
  { id: 203, name: 'Hakkari Vergi Dairesi', city: 'Hakkari' },
  { id: 204, name: 'Iğdır Vergi Dairesi', city: 'Iğdır' },
  { id: 205, name: 'Isparta Vergi Dairesi', city: 'Isparta' },
  { id: 206, name: 'Karabük Vergi Dairesi', city: 'Karabük' },
  { id: 207, name: 'Karaman Vergi Dairesi', city: 'Karaman' },
  { id: 208, name: 'Kars Vergi Dairesi', city: 'Kars' },
  { id: 209, name: 'Kastamonu Vergi Dairesi', city: 'Kastamonu' },
  { id: 210, name: 'Kırıkkale Vergi Dairesi', city: 'Kırıkkale' },
  { id: 211, name: 'Kırklareli Vergi Dairesi', city: 'Kırklareli' },
  { id: 212, name: 'Kırşehir Vergi Dairesi', city: 'Kırşehir' },
  { id: 213, name: 'Kilis Vergi Dairesi', city: 'Kilis' },
  { id: 214, name: 'Mardin Vergi Dairesi', city: 'Mardin' },
  { id: 215, name: 'Muş Vergi Dairesi', city: 'Muş' },
  { id: 216, name: 'Nevşehir Vergi Dairesi', city: 'Nevşehir' },
  { id: 217, name: 'Niğde Vergi Dairesi', city: 'Niğde' },
  { id: 218, name: 'Ordu Vergi Dairesi', city: 'Ordu' },
  { id: 219, name: 'Osmaniye Vergi Dairesi', city: 'Osmaniye' },
  { id: 220, name: 'Rize Vergi Dairesi', city: 'Rize' },
  { id: 221, name: 'Siirt Vergi Dairesi', city: 'Siirt' },
  { id: 222, name: 'Sinop Vergi Dairesi', city: 'Sinop' },
  { id: 223, name: 'Şırnak Vergi Dairesi', city: 'Şırnak' },
  { id: 224, name: 'Tokat Vergi Dairesi', city: 'Tokat' },
  { id: 225, name: 'Tunceli Vergi Dairesi', city: 'Tunceli' },
  { id: 226, name: 'Uşak Vergi Dairesi', city: 'Uşak' },
  { id: 227, name: 'Yalova Vergi Dairesi', city: 'Yalova' },
  { id: 228, name: 'Yozgat Vergi Dairesi', city: 'Yozgat' },
  { id: 229, name: 'Zonguldak Vergi Dairesi', city: 'Zonguldak' },
];

// Get unique cities
export const getTaxOfficeCities = (): string[] => {
  return [...new Set(taxOffices.map(t => t.city))].sort((a, b) => a.localeCompare(b, 'tr'));
};

// Get tax offices by city
export const getTaxOfficesByCity = (city: string): TaxOffice[] => {
  return taxOffices.filter(t => t.city === city);
};

// Search tax offices
export const searchTaxOffices = (query: string, city?: string): TaxOffice[] => {
  const normalizedQuery = query.toLowerCase().trim();
  let results = taxOffices;

  if (city) {
    results = results.filter(t => t.city === city);
  }

  if (normalizedQuery) {
    results = results.filter(t =>
      t.name.toLowerCase().includes(normalizedQuery) ||
      t.city.toLowerCase().includes(normalizedQuery)
    );
  }

  return results;
};
