/**
 * Product categories, grouped into families. Any product fits one of them; "other" takes the
 * seller's own words for what it is. Kept free of Node imports so client components can use it.
 *
 * The first four keys are the original ones and stay unchanged so stored projects keep working.
 */
type Pair = { zh: string; en: string };

export const CATEGORY_KEYS = [
  "tea",
  "specialty",
  "cosmetics",
  "appliance",
  "snacks",
  "beverage",
  "health",
  "personalCare",
  "baby",
  "pet",
  "homeGoods",
  "electronics",
  "apparel",
  "toys",
  "other",
] as const;
export type Category = (typeof CATEGORY_KEYS)[number];

export const CATEGORIES: Record<Category, Pair> = {
  tea: { zh: "茶叶", en: "Tea" },
  specialty: { zh: "地方特产", en: "Local specialty" },
  cosmetics: { zh: "美妆护肤", en: "Cosmetics and skincare" },
  appliance: { zh: "家用电器", en: "Home appliance" },
  snacks: { zh: "休闲零食", en: "Snacks" },
  beverage: { zh: "酒水饮料", en: "Drinks" },
  health: { zh: "保健食品", en: "Health supplements" },
  personalCare: { zh: "个护清洁", en: "Personal care and cleaning" },
  baby: { zh: "母婴用品", en: "Baby products" },
  pet: { zh: "宠物用品", en: "Pet products" },
  homeGoods: { zh: "家居日用", en: "Home goods" },
  electronics: { zh: "数码配件", en: "Electronics accessories" },
  apparel: { zh: "服饰鞋包", en: "Clothing, shoes and bags" },
  toys: { zh: "玩具文创", en: "Toys and stationery" },
  other: { zh: "其他", en: "Other" },
};

/** Families, for the upload form and the homepage. */
export const CATEGORY_FAMILIES: { id: string; label: Pair; cats: Category[] }[] = [
  { id: "food", label: { zh: "食品饮料", en: "Food and drink" }, cats: ["tea", "snacks", "beverage", "specialty", "health"] },
  { id: "beauty", label: { zh: "美妆个护", en: "Beauty and personal care" }, cats: ["cosmetics", "personalCare"] },
  { id: "family", label: { zh: "母婴宠物", en: "Baby and pet" }, cats: ["baby", "pet"] },
  { id: "home", label: { zh: "家居家电", en: "Home" }, cats: ["homeGoods", "appliance"] },
  { id: "life", label: { zh: "数码与生活", en: "Tech and lifestyle" }, cats: ["electronics", "apparel", "toys"] },
  { id: "other", label: { zh: "都不是", en: "None of these" }, cats: ["other"] },
];

/** An example product name per category, shown as the placeholder in the upload form. */
export const CATEGORY_EXAMPLE: Record<Category, Pair> = {
  tea: { zh: "例如：明前龙井 100 克罐装", en: "e.g. Longjing green tea, 100 g tin" },
  specialty: { zh: "例如：金华火腿礼盒", en: "e.g. Jinhua ham gift box" },
  cosmetics: { zh: "例如：玻尿酸保湿精华 30ml", en: "e.g. Hyaluronic serum, 30 ml" },
  appliance: { zh: "例如：1.5 升电热水壶", en: "e.g. 1.5 L electric kettle" },
  snacks: { zh: "例如：每日坚果 7 袋装", en: "e.g. Daily mixed nuts, 7 packs" },
  beverage: { zh: "例如：杨梅酒 500ml", en: "e.g. Bayberry wine, 500 ml" },
  health: { zh: "例如：鱼油软胶囊 60 粒", en: "e.g. Fish oil softgels, 60 count" },
  personalCare: { zh: "例如：氨基酸洗发水 400ml", en: "e.g. Amino-acid shampoo, 400 ml" },
  baby: { zh: "例如：婴儿洗护套装", en: "e.g. Baby bath set" },
  pet: { zh: "例如：冻干猫粮 1.5 公斤", en: "e.g. Freeze-dried cat food, 1.5 kg" },
  homeGoods: { zh: "例如：陶瓷餐具四件套", en: "e.g. Four-piece ceramic tableware set" },
  electronics: { zh: "例如：无线蓝牙耳机", en: "e.g. Wireless earbuds" },
  apparel: { zh: "例如：真丝围巾", en: "e.g. Silk scarf" },
  toys: { zh: "例如：木质积木 100 块", en: "e.g. Wooden blocks, 100 pieces" },
  other: { zh: "例如：手工香皂", en: "e.g. Handmade soap" },
};

export const isCategory = (v: unknown): v is Category => typeof v === "string" && (CATEGORY_KEYS as readonly string[]).includes(v);
export const familyOf = (c: Category) => CATEGORY_FAMILIES.find((f) => f.cats.includes(c))?.id ?? "other";
