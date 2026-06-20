// 标准项封面图映射。
// key: chart_standard_items._id
// value: 对应国家/省份/项目的代表性图片 URL
//
// 说明：
// 1. 这里推荐填入你自己的云存储 CDN 地址，后续可稳定长期使用。
// 2. 修改完成后可运行：
//    - npm run db:seed:standard-items
//    - 或 npm run db:backfill:standard-item-icons
//
// 示例：
// const STANDARD_ITEM_ICON_MAP = {
//   country_japan: 'https://your-cdn.example.com/standard-items/country_japan.jpg',
//   province_yunnan: 'https://your-cdn.example.com/standard-items/province_yunnan.jpg',
// };

const WIKIMEDIA_THUMB_WIDTH = 330;

function toWikipediaThumbnailSource(url) {
  if (!url || !url.includes('upload.wikimedia.org')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);

    if (segments.length < 5 || segments[0] !== 'wikipedia') {
      return url;
    }

    const filename = segments[segments.length - 1].replace(/^\d+px-/, '');

    if (segments[2] === 'thumb') {
      return `${parsed.origin}/${segments.slice(0, -1).join('/')}/${WIKIMEDIA_THUMB_WIDTH}px-${filename}`;
    }

    const [wikiRoot, wikiProject, hashA, hashB, ...rest] = segments;
    const originalPath = rest.join('/');
    const originalFilename = rest[rest.length - 1];

    return `${parsed.origin}/${wikiRoot}/${wikiProject}/thumb/${hashA}/${hashB}/${originalPath}/${WIKIMEDIA_THUMB_WIDTH}px-${originalFilename}`;
  } catch (error) {
    return url;
  }
}

function toWikipediaOriginalSource(url) {
  if (!url || !url.includes('upload.wikimedia.org')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);

    if (segments.length < 5 || segments[0] !== 'wikipedia') {
      return url;
    }

    if (segments[2] !== 'thumb') {
      return url;
    }

    return `${parsed.origin}/${segments.slice(0, 2).join('/')}/${segments.slice(3, -1).join('/')}`;
  } catch (error) {
    return url;
  }
}

const RAW_STANDARD_ITEM_ICON_MAP = {
  country_china: 'https://upload.wikimedia.org/wikipedia/commons/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg',
  country_japan: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg',
  country_south_korea: 'https://upload.wikimedia.org/wikipedia/commons/6/63/%EA%B4%91%ED%99%94%EB%AC%B8_%EC%9B%94%EB%8C%80.jpg',
  country_thailand: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg',
  country_singapore: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Marina_Bay_Sands_%28I%29.jpg',
  country_malaysia: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Taman_KLCC%2C_Kuala_Lumpur_20260428_102802.jpg/3840px-Taman_KLCC%2C_Kuala_Lumpur_20260428_102802.jpg',
  country_indonesia: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Pradaksina.jpg',
  country_vietnam: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Ha_Long_Bay_in_2019.jpg',
  country_philippines: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Kayangan_Lake%2C_Coron_-_Palawan.jpg',
  country_cambodia: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Angkor_Wat.jpg',
  country_laos: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Pha_That_Luang%2C_July_2023.jpg',
  country_myanmar: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Shwedagon_Pagoda_2017.jpg',
  country_india: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Taj_Mahal_%28Edited%29.jpeg',
  country_sri_lanka: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Sigiriya_%28141688197%29.jpeg',
  country_maldives: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Mal%C3%A9.jpg',
  country_nepal: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Mt._Everest_from_Gokyo_Ri_November_5%2C_2012.jpg',
  country_bhutan: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Paro_Taktsang%2C_Bhutan_%28edited%29.jpg',
  country_mongolia: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Genghis_Khan_Equestrian_Statue%2C_photo_by_Vaiz_Ha.jpg/3840px-Genghis_Khan_Equestrian_Statue%2C_photo_by_Vaiz_Ha.jpg',
  country_united_arab_emirates: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg',
  country_saudi_arabia: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Makkah_Ramadhan_1447_H_Tahun_2026.jpg',
  country_qatar: 'https://upload.wikimedia.org/wikipedia/en/c/c7/Museum_of_Islamic_Art_in_Doha%2C_Qatar_%2832673171432%29.jpg',
  country_turkey: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Cappadocia_balloon_trip%2C_Ortahisar_Castle_%2811893715185%29.jpg',
  country_kazakhstan: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/66/Central_Downtown_Astana_2.jpg/3840px-Central_Downtown_Astana_2.jpg',
  country_uzbekistan: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Registan_square_Samarkand.jpg',
  country_georgia: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Gergeti_Trinity_Church_09.23.jpg',
  country_armenia: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Monasterio_de_Geghard%2C_Armenia%2C_2016-10-02%2C_DD_63.jpg',
  country_azerbaijan: 'https://upload.wikimedia.org/wikipedia/en/0/08/Flame_towers_baku.jpg',
  country_israel: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Westernwall2.jpg',
  country_jordan: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Al_Deir_Petra.JPG',
  country_iran: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Naqsh-i_Jahan_Square%2C_Jan._2018.jpg',
  country_pakistan: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Ali_Mujtaba_WLM2017_FAISAL_MOSQUE_019.jpg',
  country_oman: 'https://upload.wikimedia.org/wikipedia/en/5/5b/Sultan_Qaboos_Grand_Mosque_RB.jpg',
  country_kuwait: 'https://upload.wikimedia.org/wikipedia/en/8/8c/Kuwait_Towers_RB.jpg',
  country_bahrain: 'https://upload.wikimedia.org/wikipedia/en/f/f1/Bahrain_WTC.JPG',
  country_lebanon: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Upper_Jeita_Grotto.jpg',
  country_united_kingdom: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Elizabeth_Tower%2C_June_2022.jpg',
  country_france: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg',
  country_germany: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Brandenburger_Tor_abends.jpg',
  country_italy: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Colosseo_2020.jpg',
  country_spain: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/SF_maig_2_cropped.jpg',
  country_portugal: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Torre_Bel%C3%A9m_April_2009-4a.jpg',
  country_netherlands: 'https://upload.wikimedia.org/wikipedia/commons/d/de/26Y_1599_2.jpg',
  country_belgium: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Grand-Place%2C_Brussels_-_panorama%2C_June_2018.jpg',
  country_luxembourg: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Burg_Vianden%2C_Luxemburg.jpg',
  country_switzerland: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Matterhorn_from_Domh%C3%BCtte_-_2.jpg',
  country_austria: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Wien_-_Schloss_Sch%C3%B6nbrunn.JPG',
  country_czech_republic: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg',
  country_hungary: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg',
  country_poland: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Wawel_%284%29.jpg',
  country_greece: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/1029_Acropolis_of_Athens_in_Greece_at_night_Photo_by_Giles_Laurent.jpg',
  country_croatia: 'https://upload.wikimedia.org/wikipedia/commons/6/67/The_walls_of_the_fortress_and_View_of_the_old_city._panorama.jpg',
  country_slovenia: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Lake_Bled_from_the_Mountain.jpg',
  country_slovakia: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Bratislava_-_Burg_%28b%29.JPG',
  country_denmark: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/The_Nyhavn_Canal_3.jpg',
  country_sweden: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Gamla_stan_September_2014_01.jpg/3840px-Gamla_stan_September_2014_01.jpg',
  country_norway: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Geirangerfjord_.jpg',
  country_finland: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Kirkko3.png',
  country_iceland: 'https://upload.wikimedia.org/wikipedia/en/0/00/Blue_Lagoon_Main_Building.JPG',
  country_ireland: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Cliffs-Of-Moher-OBriens-From-South.JPG',
  country_russia: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Saint_Basil%27s_Cathedral_in_Moscow.jpg',
  country_romania: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Castelul_Bran2.jpg',
  country_bulgaria: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Rila_Monastery%2C_August_2013.jpg',
  country_serbia: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/%D0%9A%D0%B0%D0%BB%D0%B5%D0%BC%D0%B5%D0%B3%D0%B4%D0%B0%D0%BD%2C_%D1%81%D0%BF%D0%BE%D0%BC%D0%B5%D0%BD%D0%B8%D0%BA_%D0%9F%D0%BE%D0%B1%D1%98%D0%B5%D0%B4%D0%BD%D0%B8%D0%BA%2C_%D0%91%D0%B8%D0%BE%D0%B3%D1%80%D0%B0%D0%B4.jpg',
  country_estonia: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Old_Town_of_Tallinn%2C_Tallinn%2C_Estonia_-_panoramio_%2858%29.jpg',
  country_latvia: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/House_of_Blackheads_at_Dusk_3%2C_Riga%2C_Latvia_-_Diliff.jpg/3840px-House_of_Blackheads_at_Dusk_3%2C_Riga%2C_Latvia_-_Diliff.jpg',
  country_lithuania: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Trakai_castle_2016.jpg',
  country_united_states: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Golden_Gate_Bridge_as_seen_from_Battery_East.jpg',
  country_canada: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Moraine_Lake_17092005.jpg',
  country_mexico: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Chichen_Itza_3.jpg',
  country_cuba: 'https://upload.wikimedia.org/wikipedia/commons/1/12/DJI_0197_crp_wiki.jpg',
  country_dominican_republic: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Cap_Cana_Marina_Dominican_Republic.jpg',
  country_costa_rica: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Arenal_volcano_%2870785p%29_%28cropped%29.jpg',
  country_panama: 'https://upload.wikimedia.org/wikipedia/commons/8/80/US_Navy_080813-N-6266K-036_American_and_Panamanian_security_forces_practice_water_steering_and_maneuvering-edit.jpg',
  country_jamaica: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Dunns_River_Falls_climb.JPG',
  country_bahamas: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/The_Atlantis_Paradise_Island_complex.jpg',
  country_brazil: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Christ_the_Redeemer_-_Cristo_Redentor.jpg',
  country_argentina: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Iguazu_Cataratas2.jpg',
  country_chile: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Torres_del_Paine_y_cuernos_del_Paine%2C_montaje.jpg',
  country_peru: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Machu_Picchu%2C_2023_%28012%29.jpg',
  country_colombia: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Museo_Naval_del_Caribe.JPG',
  country_ecuador: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Lobo_marino_%28Zalophus_californianus_wollebaeki%29%2C_Punta_Pitt%2C_isla_de_San_Crist%C3%B3bal%2C_islas_Gal%C3%A1pagos%2C_Ecuador%2C_2015-07-24%2C_DD_11.JPG',
  country_bolivia: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Salar_Uyuni_au01.jpg',
  country_uruguay: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Casapueblo.JPG',
  country_australia: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Sydney_Australia._%2821339175489%29.jpg',
  country_new_zealand: 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Milford_Sound_%28New_Zealand%29.JPG',
  country_fiji: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Mamanuca.jpg',
  country_papua_new_guinea: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Mount_Wilhelm.jpg',
  country_south_africa: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Table_Mountain_DanieVDM.jpg',
  country_egypt: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg',
  country_morocco: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Djemaa_el_Fna.jpg',
  country_kenya: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Masai_Mara_at_Sunset.jpg',
  country_tanzania: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Kilimanjaro_from_Amboseli.jpg',
  country_ethiopia: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Lalibela%2C_san_giorgio%2C_esterno_24.jpg',
  country_seychelles: 'https://upload.wikimedia.org/wikipedia/commons/9/97/La_Digue_asv2024-10_img22_Union_Estate.jpg',
  country_mauritius: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Le_Morne_Peninsula_in_Mauritius_%2853697779236%29.jpg',
  country_namibia: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Sossusvlei.jpg',
  country_tunisia: 'https://upload.wikimedia.org/wikipedia/commons/5/5d/The_Amphitheatre_of_El_Jem%2C_built_around_AD_238_in_Thysdrus_in_Africa_Proconsularis%2C_the_estimated_capacity_is_35%2C000%2C_Tunisia_-_52717762494.jpg',
  country_uganda: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Bwindi.JPG',
  country_rwanda: 'https://upload.wikimedia.org/wikipedia/commons/1/14/GisenyiBeach.jpg',
  country_botswana: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Okavango_Delta%2C_Botswana1.jpg',
  country_madagascar: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Adansonia_grandidieri_Pat_Hooper.jpg',
  country_afghanistan: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Afghanistan%27s_Grand_Canyon.jpg',
  country_bangladesh: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Save_the_sundarbans_20.jpg',
  country_brunei: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Sultan_Omar_Ali_Saifuddin_Mosque_with_the_ceremonial_ship.jpg',
  country_cyprus: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Roca_de_Afrodita%2C_Chipre%2C_2021-12-10%2C_DD_65.jpg',
  country_iraq: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Hawler_Castle.jpg',
  country_kyrgyzstan: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Issykkul_plyag.jpg',
  country_north_korea: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Laika_ac_Mt._Paekdu_%287998657081%29.jpg',
  country_palestine: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Church_of_the_Nativity_%287703592746%29.jpg',
  country_syria: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Palmyra_03.jpg',
  country_tajikistan: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Iskander-kul%2C_Tajikistan.JPG',
  country_timor_leste: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Christ_Dili.jpg',
  country_turkmenistan: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Darvasa_gas_crater_panorama.jpg',
  country_yemen: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Dragonblood_tree_in_Socotra_2.jpg',
  country_albania: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Berat_57.jpg',
  country_andorra: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Refuge_perafita_andorra.jpg',
  country_belarus:
    'https://upload.wikimedia.org/wikipedia/commons/d/d6/%D0%9A%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81_%D0%9C%D0%B8%D1%80%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%B7%D0%B0%D0%BC%D0%BA%D0%B0.JPG',
  country_bosnia_and_herzegovina: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Mostar_Old_Town_Panorama_2007.jpg',
  country_liechtenstein: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Liechtenstein_asv2022-10_img22_Vaduz_Schloss.jpg',
  country_malta: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/St_Sebastian_Curtain_%28cropped%29.jpg',
  country_moldova: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Stanca_deasupra_Rautului_Butuceni.jpg',
  country_monaco: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Panorama_von_Monaco-La_Turbie.jpg',
  country_montenegro:
    'https://upload.wikimedia.org/wikipedia/commons/2/26/20090719_Crkva_Gospa_od_Zdravlja_Kotor_Bay_Montenegro.jpg',
  country_north_macedonia: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Church_of_St._John_at_Kaneo_6.jpg',
  country_san_marino:
    'https://upload.wikimedia.org/wikipedia/commons/3/37/Guaita_Fortress_-_San_Marino_-_2024_02_13_-_GT_02_%28details%29.jpg',
  country_ukraine:
    'https://upload.wikimedia.org/wikipedia/commons/6/61/80-391-0151_Kyiv_St.Sophia%27s_Cathedral_RB_18_2_%28cropped%29.jpg',
  country_vatican_city:
    'https://upload.wikimedia.org/wikipedia/commons/f/f5/Basilica_di_San_Pietro_in_Vaticano_September_2015-1a.jpg',
  country_antigua_and_barbuda: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Nelson%27s_Dockyard.jpg',
  country_barbados: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Bathsheba%2C_Barbados_08.jpg',
  country_belize: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Great_Blue_Hole.jpg',
  country_dominica: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Dominica_Boiling_Lake.jpg',
  country_el_salvador: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Santa_Ana_Volcano.USAF.C-130.1.jpg',
  country_grenada: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/St_Georges_Grenada_Fort_-_panoramio.jpg',
  country_guatemala: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Tikal_3.jpg',
  country_haiti: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Citadelle_Laferri%C3%A8re.jpg',
  country_honduras: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Copan_sculpture.jpg',
  country_nicaragua: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Concepcion_%28volcano%29.jpg',
  country_saint_kitts_and_nevis: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/BrimstoneHill01.jpg',
  country_saint_lucia: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Pitons-aerial.jpg',
  country_saint_vincent_and_the_grenadines:
    'https://upload.wikimedia.org/wikipedia/commons/a/a3/Tobagocays2018.jpg',
  country_trinidad_and_tobago: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Pigeon_Point_beach.jpg',
  country_guyana: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/GuyanaKaieteurFalls2004.jpg',
  country_paraguay: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Salto_Monday_Paraguay.jpg',
  country_suriname: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Amazon_jungle_from_above.jpg',
  country_venezuela: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/SaltoAngel1.jpg',
  country_cook_islands: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/AST-01-039_Aituctaki_Atoll.jpg',
  country_kiribati: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Kiritimati-EO.jpg',
  country_marshall_islands: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Eneko_Islet_02.JPG',
  country_micronesia: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Nan_madol.jpg',
  country_nauru: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Living_on_a_Blue_Planet_-_Nauru.jpg',
  country_niue: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Alofi_Visitor_Information_Centre.jpg',
  country_palau: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Ngerukewid-2016-aerial-view-Luka-Peternel.jpg',
  country_samoa: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Lalomanu_Beach_-_Samoa.jpg',
  country_solomon_islands: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Vangunu_Island_NASA.jpg',
  country_tonga: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Ha%CA%BBamonga.jpg',
  country_tuvalu: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Funafuti_airport_-_Fiji_Airways.jpg',
  country_vanuatu:
    'https://upload.wikimedia.org/wikipedia/commons/0/06/Mount_Yasur_eruption_2006%2C_Tanna_Island%2C_Vanuatu%2C_VAN_0516.jpg',
  country_algeria: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/AlgerCasbah.jpg',
  country_angola:
    'https://upload.wikimedia.org/wikipedia/commons/9/95/Kalandula_waterfalls_of_the_Lucala-River_in_Malange%2C_Angola.JPG',
  country_benin:
    'https://upload.wikimedia.org/wikipedia/commons/a/ac/Ganvi%C3%A9_fishing_village_on_stilts_in_Benin_%2810282059623%29_%282%29.jpg',
  country_burkina_faso:
    'https://upload.wikimedia.org/wikipedia/commons/a/ac/2016.05-441-131ap_wall_Lorop%C3%A9ni_Ruins_nr.Lorop%C3%A9ni%28Poni_Prv.%29%2CBF_sun15may2016-1106h.jpg',
  country_burundi: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/BujumburaFromCathedral.jpg',
  country_cabo_verde: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Cape_Verde_Pico_do_Fogo_b.jpg',
  country_cameroon: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Mount_Cameroon_view_from_Buea_%28Soppo%29.jpg',
  country_central_african_republic: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Dzanga.jpg',
  country_chad: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Ounianga_Serir.jpg',
  country_comoros: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Mount_Karthala_%2811000398163%29.jpg',
  country_democratic_republic_of_the_congo:
    'https://upload.wikimedia.org/wikipedia/commons/2/2b/Virunga_National_Park-107997.jpg',
  country_republic_of_the_congo: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Les_lieux_de_Brazzaville_03.jpg',
  country_cote_divoire: 'https://upload.wikimedia.org/wikipedia/en/0/02/Notre_dame_de_la_paix_yamoussoukro_by_felix_krohn.jpg',
  country_djibouti: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Moucha_Island.jpg',
  country_equatorial_guinea: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Pico_Basil%C3%A9.jpg',
  country_eritrea: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Asmara_Montage.png',
  country_eswatini: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Zabras_in_Mlilwane_Wildlife_Sanctuary.jpg',
  country_gabon: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Lop%C3%A9_National_Park_river_crop.jpg',
  country_gambia: 'https://upload.wikimedia.org/wikipedia/commons/0/00/River_gambia_galleryfull.jpg',
  country_ghana: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Cape_Coast_Castle%2C_Cape_Coast%2C_Ghana.JPG',
  country_guinea: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Nimba_Range.jpg',
  country_guinea_bissau: 'https://upload.wikimedia.org/wikipedia/commons/0/06/L%27Archipel_des_Bijagos_vu_par_Sentinel_2.jpg',
  country_lesotho: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Maletsunyanefalls.JPG',
  country_liberia:
    'https://upload.wikimedia.org/wikipedia/commons/9/9d/Providence_Island_view_of_downtown_Monrovia.jpg',
  country_libya: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Leptis_Magna_%2829%29_%288288918733%29.jpg',
  country_malawi: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Lake_malawi_national_park.jpg',
  country_mali: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Djenne_great_mud_mosque.jpg',
  country_mauritania: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Chinguetti-Vue_Goblale_Vieille_ville.jpg',
  country_mozambique: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Bazaruto_island.jpg',
  country_niger: 'https://upload.wikimedia.org/wikipedia/commons/6/62/1997_277-9A_Agadez_mosque_cropped.jpg',
  country_nigeria: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Zuma_Rock.jpg',
  country_sao_tome_and_principe: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Pico_C%C3%A3o_Grande.jpg',
  country_senegal: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Ile-de-goree.jpg',
  country_sierra_leone: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Tiwai_Island_River.jpg',
  country_somalia: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Laas_Geel.jpg',
  country_south_sudan: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/John_Garang_Mausoleum_Square_in_Juba.JPG',
  country_sudan: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/NubianMeroePyramids30sep2005%282%29.jpg',
  country_togo: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Togo_Taberma_house_02.jpg',
  country_zambia:
    'https://upload.wikimedia.org/wikipedia/commons/d/da/Cataratas_Victoria%2C_Zambia-Zimbabue%2C_2018-07-27%2C_DD_04.jpg',
  country_zimbabwe:
    'https://upload.wikimedia.org/wikipedia/commons/d/d4/Conical_Tower_-_Great_Enclosure_III_%2833736918448%29.jpg',

  province_bj: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/The_Forbidden_City_-_View_from_Coal_Hill.jpg',
  province_tj: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/%E5%A4%A9%E6%B4%A5%E4%B9%8B%E7%9C%BC%E5%8C%971.jpg',
  province_he: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Old_Dragon%27s_Head_of_Great_Wall.jpg',
  province_sx: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Mount_Wutai.JPG',
  province_nm: 'https://upload.wikimedia.org/wikipedia/commons/6/60/%E5%91%BC%E4%BC%A6%E8%B4%9D%E5%B0%94_%E5%93%88%E5%85%8B_-_panoramio.jpg',
  province_ln: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Mukden_Palace_drone_view_5_%28cropped_%26_rotated%29.jpg',
  province_jl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/%E4%BB%8E%E9%95%BF%E7%99%BD%E5%B1%B1%E8%A5%BF%E5%9D%A1%E7%9C%8B%E5%A4%A9%E6%B1%A0-2017-08-24_1.jpg',
  province_hl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/West_facade_of_St._Sophia_Cathedral%2C_Harbin_%2820230721150450%29.jpg/3840px-West_facade_of_St._Sophia_Cathedral%2C_Harbin_%2820230721150450%29.jpg',
  province_sh: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Huangpu_Park_20124-Shanghai_%2832208802494%29.jpg',
  province_js: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Suzhou_Zhuozheng_Yuan_2015.04.23_08-13-49.jpg',
  province_zj: 'https://upload.wikimedia.org/wikipedia/commons/1/17/West_Lake%2C_Hangzhou_2025.jpg',
  province_ah: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Huangshan_pic_4.jpg/3840px-Huangshan_pic_4.jpg',
  province_fj: 'https://upload.wikimedia.org/wikipedia/commons/d/df/2018%E5%B9%B4%E7%9A%84%E9%BC%93%E6%B5%AA%E5%B1%BF.jpg',
  province_jx: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Pavilion_of_Prince_Teng_3.jpg',
  province_sd: 'https://upload.wikimedia.org/wikipedia/commons/7/71/50304-Taishan_%2849055660366%29.jpg',
  province_ha: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/27427-Luoyang_%2849067744628%29.jpg',
  province_hb: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/CN_-_Hubei_-_Wuhan_-_Kranichpagode.jpg',
  province_hn: 'https://upload.wikimedia.org/wikipedia/commons/7/77/1_tianzishan_wulingyuan_zhangjiajie_2012.jpg',
  province_gd: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Canton_Tower_20241027_%28cropped%29.jpg',
  province_gx: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Xiangshan_Scenic_Area_89468-Guilin_%2831130832628%29.jpg',
  province_hi: 'https://upload.wikimedia.org/wikipedia/commons/b/be/SuperStar_Aquarius_at_Phoenix_Island%2C_Sanya_Bay_-_01.jpg',
  province_cq: 'https://upload.wikimedia.org/wikipedia/commons/6/64/202308_Hongya_Cave_at_night_from_Qiansimen_Bridge.jpg',
  province_sc: 'https://upload.wikimedia.org/wikipedia/commons/2/28/1_jiuzhaigou_valley_wu_hua_hai_2011b.jpg',
  province_gz: 'https://upload.wikimedia.org/wikipedia/commons/3/30/HuangguoshuFall.jpg',
  province_yn: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Black_Dragon_%E9%BB%91%E9%BE%99%E6%BD%AD_%285496141333%29.jpg',
  province_xz: 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Potala_Palace_HQ.jpg',
  province_sn: 'https://upload.wikimedia.org/wikipedia/commons/8/88/51714-Terracota-Army.jpg',
  province_gs: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Mogao_Caves_%2854376969262%29.jpg',
  province_qh: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Qinghai_lake.jpg',
  province_nx: 'https://upload.wikimedia.org/wikipedia/commons/5/5d/Shapotou.jpg',
  province_xj: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/The_Heavenly_Lake_%E5%A4%A9%E6%B1%A0_%288064381762%29.jpg',
  province_hk: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Hong_Kong_Skyline_viewed_from_Victoria_Peak.jpg',
  province_mo: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/%E5%A4%A7%E4%B8%89%E5%B7%B4%E7%89%8C%E5%9D%8A.jpg',
  province_tw: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Taipei_101_from_Xiangshan_20250905.jpg',

  activity_bungee: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Bill%27s_Bungy_Jump.jpg',
  activity_skydiving: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Skydiver_Holding_Aircraft_Door_Before_Exit.jpg',
  activity_paragliding: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Flying_at_Skorobishta_mountains.JPG',
  activity_hot_air_balloon: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Skyline_de_Rio_Claro_%28cropped%29.jpg',
  activity_glider: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Glider_finishing.jpg',
  activity_scuba_diving:
    'https://upload.wikimedia.org/wikipedia/commons/2/29/Underwater_photograph_of_a_recreational_scuba_diver_in_Playa_del_Carmen_2006.jpg',
  activity_freediving: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Agata_Bogusz_wrakowe.png',
  activity_surfing: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Mavericks_Surf_Contest_2010b.jpg',
  activity_sailboat: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Regattafeld_vor_Laboe.jpg',
  activity_kayaking: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Woman_kayaking_on_a_turquoise_lake_%2851125937521%29.jpg',
  activity_rafting: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Upstream_view_Colorado_River_approximatly_Mile_59.0.jpg',
  activity_canyoning: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Bali_canyoning.jpg',
  activity_skiing: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Ski_Famille_-_Family_Ski_Holidays.jpg',
  activity_snowboarding: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Snowboarding.jpg',
  activity_sledding: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Volunteer_Mushing_on_Wonder_Lake_%287065286379%29.jpg',
  activity_snowmobile: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/SnowmobilesYellowstone.jpg',
  activity_hiking: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Hiking_to_the_Ice_Lakes._San_Juan_National_Forest%2C_Colorado.jpg',
  activity_mountaineering: 'https://upload.wikimedia.org/wikipedia/commons/3/38/M_Rainier.jpg',
  activity_rock_climbing: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Crack_climbing_in_Indian_Creek%2C_Utah.jpg',
  activity_via_ferrata: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Climber_on_fixed_rope_route_Piz_Mitgel_2.jpg',
  activity_zipline: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Texas_Zip_liner_5430.JPG',
  activity_offroad: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Landy4no.jpg',
  activity_gokart: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/%D0%9A%D0%BB%D0%B0%D1%81_60.jpg',
  activity_theme_park:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/%ED%8F%AC%EC%8B%9C%EC%A6%8C%EC%8A%A4_%EC%82%B0%EB%A6%AC%EC%98%A4%EB%8C%84%EC%8A%A4%ED%83%80%EC%9E%84_2025.jpg/3840px-%ED%8F%AC%EC%8B%9C%EC%A6%8C%EC%8A%A4_%EC%82%B0%EB%A6%AC%EC%98%A4%EB%8C%84%EC%8A%A4%ED%83%80%EC%9E%84_2025.jpg',
  activity_roller_coaster: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Luna_Park_Melbourne_scenic_railway.jpg',
  activity_safari: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Sabi_sabi_game_drive.jpg',
  activity_whale_watching: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Ballenafranca%2Balvina.jpg',
  activity_escape_room:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Tulleys_Farm_Outfitter_Escape_Room.jpg/3840px-Tulleys_Farm_Outfitter_Escape_Room.jpg',
  activity_scripted_murder_mystery:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Murder_mystery_merriment_at_RAF_Mildenhall_131025-F-DL987-126.jpg/3840px-Murder_mystery_merriment_at_RAF_Mildenhall_131025-F-DL987-126.jpg',
  activity_board_games:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/US_Navy_110713-N-NT881-124_Personnel_Specialist_2nd_Class_James_Vail%2C_left%2C_and_Boatswain%27s_Mate_2nd_Class_Nathaniel_Eaton_play_board_games_with_ch.jpg/3840px-US_Navy_110713-N-NT881-124_Personnel_Specialist_2nd_Class_James_Vail%2C_left%2C_and_Boatswain%27s_Mate_2nd_Class_Nathaniel_Eaton_play_board_games_with_ch.jpg',
  activity_karaoke: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/%E5%8D%A1%E6%8B%89OK.jpg',
  activity_bowling:
    'https://upload.wikimedia.org/wikipedia/commons/f/fd/US_Navy_090819-N-2259V-119_A_Sailor_releases_the_ball_down_the_lane_at_a_bowling_competition_during_the_2009_San_Diego_Surface_Line_Week.jpg',
  activity_billiards: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Niels_Feijen_NL.JPG',
  activity_standup_comedy: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Jesus_is_coming.._Look_Busy_%28George_Carlin%29.jpg',
  activity_livehouse:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/D%C3%BClmen%2C_D%C3%BClmener_Sommer%2C_Open-Air-Konzert%2C_%22Bounce%22_--_2018_--_0051.jpg/3840px-D%C3%BClmen%2C_D%C3%BClmener_Sommer%2C_Open-Air-Konzert%2C_%22Bounce%22_--_2018_--_0051.jpg',
  activity_concert:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/D%C3%BClmen%2C_D%C3%BClmener_Sommer%2C_Open-Air-Konzert%2C_%22Bounce%22_--_2018_--_0051.jpg/3840px-D%C3%BClmen%2C_D%C3%BClmener_Sommer%2C_Open-Air-Konzert%2C_%22Bounce%22_--_2018_--_0051.jpg',
  activity_golf: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Golfer_swing.jpg',
  activity_archery: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/ArcheryGermanyEarly1980s-2.jpg',
  activity_tennis: 'https://upload.wikimedia.org/wikipedia/commons/9/94/2013_Australian_Open_-_Guillaume_Rufin.jpg',
  activity_pickleball:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Pickleball_Pros.jpg/3840px-Pickleball_Pros.jpg',
  activity_badminton: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Olympics_2012_Mixed_Doubles_Final.jpg',
  activity_road_cycling: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Cycliste_%C3%A0_place_d%27Italie-Paris_crop.jpg',
  activity_mountain_biking: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Alexandra_Engen_2012_London_Olympics_002.jpg',
  activity_walking_tour: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Tourists_with_guide_in_lower_canyon%2C_Petra.jpg',
  activity_hot_spring: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Onsen_in_Nachikatsuura%2C_Japan.jpg',
  activity_spa: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Medicinal_spa_of_Hark%C3%A1ny.jpg',
  activity_massage: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Spa_Picture_2.jpg',
  activity_yoga_class:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Yoga4Love_Freedom_Gratitude.jpg/3840px-Yoga4Love_Freedom_Gratitude.jpg',
  activity_baking_class: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Freshly_baked_bread_loaves.jpg',
  activity_pottery_workshop:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Traditional_pottery_in_Nigeria_%28Ikpu_ite%29_19.jpg/3840px-Traditional_pottery_in_Nigeria_%28Ikpu_ite%29_19.jpg',
  activity_tea_ceremony:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Japanese_tea_ceremony_20100502_Japan_Matsuri_02.jpg/3840px-Japanese_tea_ceremony_20100502_Japan_Matsuri_02.jpg',
  activity_coffee_cupping:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Fancy_a_cupper.jpg/3840px-Fancy_a_cupper.jpg',
  activity_arcade_gaming:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Daikeien_amusement_arcade_2018-05-10.jpg/3840px-Daikeien_amusement_arcade_2018-05-10.jpg',
  activity_vr_experience: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Reality_check_ESA384313.jpg',
  activity_laser_tag: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Fort_Bliss_laser_tag_120705-A-WO769-016_%28cropped%29.jpg',
  activity_aquarium: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Amaterske_akvarium.jpg',
  activity_desert_camp: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Mountain_in_Wadi_Rum%2C_Jordan.jpg',
  activity_northern_lights_tour:
    'https://upload.wikimedia.org/wikipedia/commons/d/d3/Aurora_borealis_over_Eielson_Air_Force_Base%2C_Alaska.jpg',
  activity_helicopter_tour: 'https://upload.wikimedia.org/wikipedia/commons/7/70/VH-SUF_Taking_Off.jpg',
};

// 对尚未单独配置图片的玩乐项目，先使用同类代表图做兜底，避免前端出现空图。
const ACTIVITY_ICON_ALIAS_MAP = {
  activity_parasailing: 'activity_paragliding',
  activity_hang_gliding: 'activity_paragliding',
  activity_cable_car: 'activity_hot_air_balloon',
  activity_seaplane_tour: 'activity_helicopter_tour',

  activity_snorkeling: 'activity_scuba_diving',
  activity_sea_walking: 'activity_scuba_diving',
  activity_shark_diving: 'activity_scuba_diving',

  activity_paddleboarding: 'activity_kayaking',
  activity_jet_ski: 'activity_surfing',
  activity_wakeboarding: 'activity_surfing',
  activity_windsurfing: 'activity_surfing',

  activity_river_tubing: 'activity_rafting',
  activity_canoeing: 'activity_kayaking',

  activity_yacht_cruise: 'activity_sailboat',
  activity_sunset_cruise: 'activity_sailboat',
  activity_catamaran_cruise: 'activity_sailboat',
  activity_speedboat_tour: 'activity_sailboat',
  activity_party_cruise: 'activity_sailboat',

  activity_island_hopping: 'activity_sailboat',
  activity_sea_cave_boat_tour: 'activity_sailboat',
  activity_glass_bottom_boat: 'activity_sailboat',
  activity_lagoon_tour: 'activity_sailboat',

  activity_cross_country_skiing: 'activity_skiing',
  activity_snowshoe_hiking: 'activity_hiking',
  activity_ice_skating: 'activity_skiing',
  activity_snow_tubing: 'activity_sledding',

  activity_camping: 'activity_hiking',
  activity_trail_running: 'activity_hiking',
  activity_bouldering: 'activity_rock_climbing',
  activity_canyon_swing: 'activity_zipline',

  activity_caving: 'activity_canyoning',
  activity_slot_canyon_hiking: 'activity_canyoning',
  activity_glacier_hiking: 'activity_mountaineering',

  activity_dune_bashing: 'activity_offroad',
  activity_sandboarding: 'activity_snowboarding',
  activity_camel_riding: 'activity_desert_camp',

  activity_dolphin_watching: 'activity_whale_watching',
  activity_birdwatching: 'activity_safari',
  activity_firefly_viewing: 'activity_safari',

  activity_atv: 'activity_offroad',
  activity_dune_buggy: 'activity_offroad',
  activity_drift_experience: 'activity_gokart',

  activity_ebike_tour: 'activity_road_cycling',
  activity_horseback_riding: 'activity_safari',

  activity_water_park: 'activity_theme_park',
  activity_amusement_arcade: 'activity_arcade_gaming',

  activity_escape_room: 'activity_theme_park',
  activity_scripted_murder_mystery: 'activity_theme_park',
  activity_board_games: 'activity_theme_park',
  activity_mahjong: 'activity_board_games',
  activity_trampoline_park: 'activity_theme_park',

  activity_handmade_candle: 'activity_pottery_workshop',
  activity_cooking_class: 'activity_baking_class',
  activity_silver_jewelry_workshop: 'activity_pottery_workshop',
  activity_painting_workshop: 'activity_pottery_workshop',
  activity_floral_arrangement: 'activity_tea_ceremony',
  activity_perfume_workshop: 'activity_tea_ceremony',
  activity_dance_class: 'activity_livehouse',

  activity_mini_golf: 'activity_theme_park',
  activity_frisbee: 'activity_pickleball',
  activity_climbing_gym: 'activity_rock_climbing',

  activity_theater: 'activity_concert',
  activity_musical: 'activity_concert',
  activity_cabaret_show: 'activity_concert',
  activity_magic_show: 'activity_standup_comedy',
  activity_immersive_theater: 'activity_concert',
  activity_opera: 'activity_concert',
  activity_crosstalk_show: 'activity_standup_comedy',
  activity_dj_party: 'activity_livehouse',

  activity_food_tour: 'activity_walking_tour',
  activity_wine_tasting: 'activity_coffee_cupping',
  activity_brewery_tasting: 'activity_coffee_cupping',
  activity_cocktail_experience: 'activity_coffee_cupping',
  activity_afternoon_tea: 'activity_tea_ceremony',

  activity_meditation_retreat: 'activity_yoga_class',

  activity_stargazing: 'activity_northern_lights_tour',
  activity_night_safari: 'activity_safari',
  activity_fireworks_cruise: 'activity_sailboat',
  activity_night_city_tour: 'activity_walking_tour',
  activity_night_boat_tour: 'activity_sailboat',

  activity_bike_tour: 'activity_road_cycling',
  activity_photography_walk: 'activity_walking_tour',
  activity_segway_tour: 'activity_walking_tour',
  activity_scavenger_hunt: 'activity_walking_tour',

  activity_zoo: 'activity_safari',
  activity_farm_experience: 'activity_safari',
  activity_fruit_picking: 'activity_baking_class',
  activity_science_center: 'activity_vr_experience',
  activity_hands_on_museum: 'activity_vr_experience',
  activity_playground_park: 'activity_theme_park',
  activity_forest_bathing: 'activity_hiking',
  activity_stargazing_camp: 'activity_northern_lights_tour',
};

const RESOLVED_RAW_STANDARD_ITEM_ICON_MAP = {
  ...RAW_STANDARD_ITEM_ICON_MAP,
  ...Object.fromEntries(
    Object.entries(ACTIVITY_ICON_ALIAS_MAP)
      .filter(([itemId, sourceItemId]) => !RAW_STANDARD_ITEM_ICON_MAP[itemId] && Boolean(RAW_STANDARD_ITEM_ICON_MAP[sourceItemId]))
      .map(([itemId, sourceItemId]) => [itemId, RAW_STANDARD_ITEM_ICON_MAP[sourceItemId]])
  ),
};

const STANDARD_ITEM_ICON_MAP = Object.fromEntries(
  Object.entries(RESOLVED_RAW_STANDARD_ITEM_ICON_MAP).map(([itemId, url]) => [itemId, toWikipediaThumbnailSource(url)])
);

const STANDARD_ITEM_ORIGINAL_ICON_MAP = Object.fromEntries(
  Object.entries(RESOLVED_RAW_STANDARD_ITEM_ICON_MAP).map(([itemId, url]) => [itemId, toWikipediaOriginalSource(url)])
);

module.exports = {
  STANDARD_ITEM_ICON_MAP,
  STANDARD_ITEM_ORIGINAL_ICON_MAP,
};
