const { STANDARD_ITEM_ICON_MAP, STANDARD_ITEM_ORIGINAL_ICON_MAP } = require('./standard_item_icons.seed');

const WORLD_COUNTRY_ROWS = [
  ['country_china', '中国', 'China', 'asia', 'A'],
  ['country_japan', '日本', 'Japan', 'asia', 'A'],
  ['country_south_korea', '韩国', 'South Korea', 'asia', 'A'],
  ['country_thailand', '泰国', 'Thailand', 'asia', 'A'],
  ['country_singapore', '新加坡', 'Singapore', 'asia', 'A'],
  ['country_malaysia', '马来西亚', 'Malaysia', 'asia', 'A'],
  ['country_indonesia', '印度尼西亚', 'Indonesia', 'asia', 'A'],
  ['country_vietnam', '越南', 'Vietnam', 'asia', 'A'],
  ['country_philippines', '菲律宾', 'Philippines', 'asia', 'B'],
  ['country_cambodia', '柬埔寨', 'Cambodia', 'asia', 'B'],
  ['country_laos', '老挝', 'Laos', 'asia', 'C'],
  ['country_myanmar', '缅甸', 'Myanmar', 'asia', 'C'],
  ['country_india', '印度', 'India', 'asia', 'B'],
  ['country_sri_lanka', '斯里兰卡', 'Sri Lanka', 'asia', 'B'],
  ['country_maldives', '马尔代夫', 'Maldives', 'asia', 'A'],
  ['country_nepal', '尼泊尔', 'Nepal', 'asia', 'B'],
  ['country_bhutan', '不丹', 'Bhutan', 'asia', 'C'],
  ['country_mongolia', '蒙古', 'Mongolia', 'asia', 'C'],
  ['country_united_arab_emirates', '阿联酋', 'United Arab Emirates', 'asia', 'A'],
  ['country_saudi_arabia', '沙特阿拉伯', 'Saudi Arabia', 'asia', 'B'],
  ['country_qatar', '卡塔尔', 'Qatar', 'asia', 'B'],
  ['country_turkey', '土耳其', 'Turkey', 'asia', 'A'],
  ['country_kazakhstan', '哈萨克斯坦', 'Kazakhstan', 'asia', 'C'],
  ['country_uzbekistan', '乌兹别克斯坦', 'Uzbekistan', 'asia', 'C'],
  ['country_georgia', '格鲁吉亚', 'Georgia', 'asia', 'B'],
  ['country_armenia', '亚美尼亚', 'Armenia', 'asia', 'C'],
  ['country_azerbaijan', '阿塞拜疆', 'Azerbaijan', 'asia', 'C'],
  ['country_israel', '以色列', 'Israel', 'asia', 'B'],
  ['country_jordan', '约旦', 'Jordan', 'asia', 'B'],
  ['country_iran', '伊朗', 'Iran', 'asia', 'C'],
  ['country_pakistan', '巴基斯坦', 'Pakistan', 'asia', 'C'],
  ['country_oman', '阿曼', 'Oman', 'asia', 'C'],
  ['country_kuwait', '科威特', 'Kuwait', 'asia', 'C'],
  ['country_bahrain', '巴林', 'Bahrain', 'asia', 'C'],
  ['country_lebanon', '黎巴嫩', 'Lebanon', 'asia', 'C'],

  ['country_united_kingdom', '英国', 'United Kingdom', 'europe', 'A'],
  ['country_france', '法国', 'France', 'europe', 'A'],
  ['country_germany', '德国', 'Germany', 'europe', 'A'],
  ['country_italy', '意大利', 'Italy', 'europe', 'A'],
  ['country_spain', '西班牙', 'Spain', 'europe', 'A'],
  ['country_portugal', '葡萄牙', 'Portugal', 'europe', 'A'],
  ['country_netherlands', '荷兰', 'Netherlands', 'europe', 'A'],
  ['country_belgium', '比利时', 'Belgium', 'europe', 'B'],
  ['country_luxembourg', '卢森堡', 'Luxembourg', 'europe', 'C'],
  ['country_switzerland', '瑞士', 'Switzerland', 'europe', 'A'],
  ['country_austria', '奥地利', 'Austria', 'europe', 'B'],
  ['country_czech_republic', '捷克', 'Czech Republic', 'europe', 'B'],
  ['country_hungary', '匈牙利', 'Hungary', 'europe', 'B'],
  ['country_poland', '波兰', 'Poland', 'europe', 'B'],
  ['country_greece', '希腊', 'Greece', 'europe', 'A'],
  ['country_croatia', '克罗地亚', 'Croatia', 'europe', 'B'],
  ['country_slovenia', '斯洛文尼亚', 'Slovenia', 'europe', 'C'],
  ['country_slovakia', '斯洛伐克', 'Slovakia', 'europe', 'C'],
  ['country_denmark', '丹麦', 'Denmark', 'europe', 'B'],
  ['country_sweden', '瑞典', 'Sweden', 'europe', 'B'],
  ['country_norway', '挪威', 'Norway', 'europe', 'B'],
  ['country_finland', '芬兰', 'Finland', 'europe', 'B'],
  ['country_iceland', '冰岛', 'Iceland', 'europe', 'A'],
  ['country_ireland', '爱尔兰', 'Ireland', 'europe', 'B'],
  ['country_russia', '俄罗斯', 'Russia', 'europe', 'B'],
  ['country_romania', '罗马尼亚', 'Romania', 'europe', 'C'],
  ['country_bulgaria', '保加利亚', 'Bulgaria', 'europe', 'C'],
  ['country_serbia', '塞尔维亚', 'Serbia', 'europe', 'C'],
  ['country_estonia', '爱沙尼亚', 'Estonia', 'europe', 'C'],
  ['country_latvia', '拉脱维亚', 'Latvia', 'europe', 'C'],
  ['country_lithuania', '立陶宛', 'Lithuania', 'europe', 'C'],

  ['country_united_states', '美国', 'United States', 'north_america', 'A'],
  ['country_canada', '加拿大', 'Canada', 'north_america', 'A'],
  ['country_mexico', '墨西哥', 'Mexico', 'north_america', 'B'],
  ['country_cuba', '古巴', 'Cuba', 'north_america', 'B'],
  ['country_dominican_republic', '多米尼加共和国', 'Dominican Republic', 'north_america', 'B'],
  ['country_costa_rica', '哥斯达黎加', 'Costa Rica', 'north_america', 'B'],
  ['country_panama', '巴拿马', 'Panama', 'north_america', 'C'],
  ['country_jamaica', '牙买加', 'Jamaica', 'north_america', 'C'],
  ['country_bahamas', '巴哈马', 'Bahamas', 'north_america', 'B'],

  ['country_brazil', '巴西', 'Brazil', 'south_america', 'B'],
  ['country_argentina', '阿根廷', 'Argentina', 'south_america', 'B'],
  ['country_chile', '智利', 'Chile', 'south_america', 'B'],
  ['country_peru', '秘鲁', 'Peru', 'south_america', 'B'],
  ['country_colombia', '哥伦比亚', 'Colombia', 'south_america', 'C'],
  ['country_ecuador', '厄瓜多尔', 'Ecuador', 'south_america', 'C'],
  ['country_bolivia', '玻利维亚', 'Bolivia', 'south_america', 'C'],
  ['country_uruguay', '乌拉圭', 'Uruguay', 'south_america', 'C'],

  ['country_australia', '澳大利亚', 'Australia', 'oceania', 'A'],
  ['country_new_zealand', '新西兰', 'New Zealand', 'oceania', 'A'],
  ['country_fiji', '斐济', 'Fiji', 'oceania', 'B'],
  ['country_papua_new_guinea', '巴布亚新几内亚', 'Papua New Guinea', 'oceania', 'C'],

  ['country_south_africa', '南非', 'South Africa', 'africa', 'B'],
  ['country_egypt', '埃及', 'Egypt', 'africa', 'A'],
  ['country_morocco', '摩洛哥', 'Morocco', 'africa', 'B'],
  ['country_kenya', '肯尼亚', 'Kenya', 'africa', 'B'],
  ['country_tanzania', '坦桑尼亚', 'Tanzania', 'africa', 'B'],
  ['country_ethiopia', '埃塞俄比亚', 'Ethiopia', 'africa', 'C'],
  ['country_seychelles', '塞舌尔', 'Seychelles', 'africa', 'B'],
  ['country_mauritius', '毛里求斯', 'Mauritius', 'africa', 'B'],
  ['country_namibia', '纳米比亚', 'Namibia', 'africa', 'C'],
  ['country_tunisia', '突尼斯', 'Tunisia', 'africa', 'C'],
  ['country_uganda', '乌干达', 'Uganda', 'africa', 'C'],
  ['country_rwanda', '卢旺达', 'Rwanda', 'africa', 'C'],
  ['country_botswana', '博茨瓦纳', 'Botswana', 'africa', 'C'],
  ['country_madagascar', '马达加斯加', 'Madagascar', 'africa', 'C'],
];

const CHINA_PROVINCE_ROWS = [
  ['province_bj', '北京', 'Beijing', 'north_china'],
  ['province_tj', '天津', 'Tianjin', 'north_china'],
  ['province_he', '河北', 'Hebei', 'north_china'],
  ['province_sx', '山西', 'Shanxi', 'north_china'],
  ['province_nm', '内蒙古', 'Inner Mongolia', 'north_china'],
  ['province_ln', '辽宁', 'Liaoning', 'northeast'],
  ['province_jl', '吉林', 'Jilin', 'northeast'],
  ['province_hl', '黑龙江', 'Heilongjiang', 'northeast'],
  ['province_sh', '上海', 'Shanghai', 'east_china'],
  ['province_js', '江苏', 'Jiangsu', 'east_china'],
  ['province_zj', '浙江', 'Zhejiang', 'east_china'],
  ['province_ah', '安徽', 'Anhui', 'east_china'],
  ['province_fj', '福建', 'Fujian', 'east_china'],
  ['province_jx', '江西', 'Jiangxi', 'east_china'],
  ['province_sd', '山东', 'Shandong', 'east_china'],
  ['province_ha', '河南', 'Henan', 'central_china'],
  ['province_hb', '湖北', 'Hubei', 'central_china'],
  ['province_hn', '湖南', 'Hunan', 'central_china'],
  ['province_gd', '广东', 'Guangdong', 'south_china'],
  ['province_gx', '广西', 'Guangxi', 'south_china'],
  ['province_hi', '海南', 'Hainan', 'south_china'],
  ['province_cq', '重庆', 'Chongqing', 'southwest'],
  ['province_sc', '四川', 'Sichuan', 'southwest'],
  ['province_gz', '贵州', 'Guizhou', 'southwest'],
  ['province_yn', '云南', 'Yunnan', 'southwest'],
  ['province_xz', '西藏', 'Tibet', 'southwest'],
  ['province_sn', '陕西', 'Shaanxi', 'northwest'],
  ['province_gs', '甘肃', 'Gansu', 'northwest'],
  ['province_qh', '青海', 'Qinghai', 'northwest'],
  ['province_nx', '宁夏', 'Ningxia', 'northwest'],
  ['province_xj', '新疆', 'Xinjiang', 'northwest'],
  ['province_hk', '香港', 'Hong Kong', 'special_region'],
  ['province_mo', '澳门', 'Macao', 'special_region'],
  ['province_tw', '台湾', 'Taiwan', 'special_region'],
];

const ACTIVITY_ROWS = [
  ['activity_bungee', '蹦极', 'Bungee Jumping', 'air'],
  ['activity_skydiving', '跳伞', 'Skydiving', 'air'],
  ['activity_paragliding', '滑翔伞', 'Paragliding', 'air'],
  ['activity_hot_air_balloon', '热气球', 'Hot Air Balloon', 'air'],
  ['activity_glider', '滑翔机', 'Glider Flight', 'air'],
  ['activity_scuba_diving', '水肺潜水', 'Scuba Diving', 'water'],
  ['activity_freediving', '自由潜', 'Freediving', 'water'],
  ['activity_surfing', '冲浪', 'Surfing', 'water'],
  ['activity_sailboat', '帆船', 'Sailing', 'water'],
  ['activity_kayaking', '皮划艇', 'Kayaking', 'water'],
  ['activity_rafting', '漂流', 'Rafting', 'water'],
  ['activity_canyoning', '溯溪', 'Canyoning', 'water'],
  ['activity_skiing', '滑雪', 'Skiing', 'snow_ice'],
  ['activity_snowboarding', '单板滑雪', 'Snowboarding', 'snow_ice'],
  ['activity_sledding', '雪橇', 'Sledding', 'snow_ice'],
  ['activity_snowmobile', '雪地摩托', 'Snowmobile', 'snow_ice'],
  ['activity_hiking', '徒步', 'Hiking', 'mountain'],
  ['activity_mountaineering', '登山', 'Mountaineering', 'mountain'],
  ['activity_rock_climbing', '攀岩', 'Rock Climbing', 'mountain'],
  ['activity_via_ferrata', '铁道式攀登', 'Via Ferrata', 'mountain'],
  ['activity_zipline', '高空滑索', 'Zipline', 'mountain'],
  ['activity_offroad', '越野穿越', 'Off-road Adventure', 'motorsport'],
  ['activity_gokart', '卡丁车', 'Go-Kart', 'motorsport'],
  ['activity_theme_park', '主题乐园', 'Theme Park', 'theme'],
  ['activity_roller_coaster', '过山车', 'Roller Coaster', 'theme'],
  ['activity_safari', '野生动物 Safari', 'Safari', 'wildlife'],
  ['activity_whale_watching', '观鲸', 'Whale Watching', 'wildlife'],
  ['activity_desert_camp', '沙漠露营', 'Desert Camp', 'outdoor'],
  ['activity_northern_lights_tour', '极光追逐', 'Northern Lights Tour', 'outdoor'],
  ['activity_helicopter_tour', '直升机观光', 'Helicopter Tour', 'air'],
];

const CATEGORY_LABEL_MAP = {
  asia: '亚洲',
  europe: '欧洲',
  north_america: '北美洲',
  south_america: '南美洲',
  oceania: '大洋洲',
  africa: '非洲',
  north_china: '华北',
  northeast: '东北',
  east_china: '华东',
  central_china: '华中',
  south_china: '华南',
  southwest: '西南',
  northwest: '西北',
  special_region: '港澳台',
  air: '高空类',
  water: '水上类',
  snow_ice: '冰雪类',
  mountain: '山野类',
  motorsport: '速度类',
  theme: '主题乐园',
  wildlife: '野生动物',
  outdoor: '户外类',
};

function getCategoryLabel(category) {
  return CATEGORY_LABEL_MAP[category] || category;
}

function buildItems(rows, config) {
  return rows.map((row, index) => {
    const category = row[3];
    const categoryLabelZh = getCategoryLabel(category);
    const item = {
      _id: row[0],
      item_type: config.itemType,
      leaderboard_code: config.leaderboardCode,
      name_zh: row[1],
      name_en: row[2],
      category,
      category_label_zh: categoryLabelZh,
      icon: STANDARD_ITEM_ICON_MAP[row[0]] || '',
      icon_original: STANDARD_ITEM_ORIGINAL_ICON_MAP[row[0]] || '',
      is_active: true,
      sort_order: index + 1,
    };

    if (config.itemType === 'country') {
      item.continent = category;
      item.tier = row[4] || '';
    }

    if (config.itemType === 'province') {
      item.region_group = category;
    }

    if (config.itemType === 'activity') {
      item.activity_group = category;
    }

    return item;
  });
}

const WORLD_ITEMS = buildItems(WORLD_COUNTRY_ROWS, {
  itemType: 'country',
  leaderboardCode: 'world_travel',
});

const CHINA_ITEMS = buildItems(CHINA_PROVINCE_ROWS, {
  itemType: 'province',
  leaderboardCode: 'china_travel',
});

const ACTIVITY_ITEMS = buildItems(ACTIVITY_ROWS, {
  itemType: 'activity',
  leaderboardCode: 'activity',
});

const STANDARD_ITEMS = [...WORLD_ITEMS, ...CHINA_ITEMS, ...ACTIVITY_ITEMS];

const STANDARD_ITEMS_BY_SCOPE = {
  world: WORLD_ITEMS,
  china: CHINA_ITEMS,
  activity: ACTIVITY_ITEMS,
  all: STANDARD_ITEMS,
};

module.exports = {
  STANDARD_ITEMS,
  STANDARD_ITEMS_BY_SCOPE,
};
