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
  country_rwanda: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Volcanoes_National_Park_Banner_Image.gif',
  country_botswana: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Okavango_Delta%2C_Botswana1.jpg',
  country_madagascar: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Adansonia_grandidieri_Pat_Hooper.jpg',

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
};

const STANDARD_ITEM_ICON_MAP = Object.fromEntries(
  Object.entries(RAW_STANDARD_ITEM_ICON_MAP).map(([itemId, url]) => [itemId, toWikipediaThumbnailSource(url)])
);

const STANDARD_ITEM_ORIGINAL_ICON_MAP = Object.fromEntries(
  Object.entries(RAW_STANDARD_ITEM_ICON_MAP).map(([itemId, url]) => [itemId, toWikipediaOriginalSource(url)])
);

module.exports = {
  STANDARD_ITEM_ICON_MAP,
  STANDARD_ITEM_ORIGINAL_ICON_MAP,
};
