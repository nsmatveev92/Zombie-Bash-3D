import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));

function detectAnimalTraits(promptText: string) {
  const lower = promptText.toLowerCase();

  let ears: string | null = null;
  let tail: string | null = null;
  let muzzle: string | null = null;
  let defaultFurSkin: string | null = null;
  let defaultHair: string | null = null;
  let defaultAccent: string | null = null;

  if (/лис|лисич|кицун|фенек|fox|kitsune/.test(lower)) {
    ears = "fox_ears";
    tail = "fox_tail";
    muzzle = "fox_muzzle";
    defaultFurSkin = "#F97316";
    defaultHair = "#EA580C";
    defaultAccent = "#FEF3C7";
  } else if (/кот|котик|кошк|кошеч|нэко|неко|мяу|cat|neko|kitty/.test(lower)) {
    ears = "cat_ears";
    tail = "cat_tail";
    muzzle = "cat_muzzle";
    defaultFurSkin = "#FB923C";
    defaultHair = "#F97316";
    defaultAccent = "#F472B6";
  } else if (/слон|слоник|мамонт|хобот|elephant|mammoth/.test(lower)) {
    ears = "elephant_ears";
    tail = "elephant_tail";
    muzzle = "elephant_trunk";
    defaultFurSkin = "#94A3B8";
    defaultHair = "#64748B";
    defaultAccent = "#FBCFE8";
  } else if (/крокодил|аллигатор|рептил|динозавр|ящер|croc|alligator|dino/.test(lower)) {
    ears = "croc_ridge";
    tail = "croc_tail";
    muzzle = "croc_snout";
    defaultFurSkin = "#16A34A";
    defaultHair = "#15803D";
    defaultAccent = "#FDE047";
  } else if (/лев|льв|тигр|царь зверей|lion|simba/.test(lower)) {
    ears = "lion_mane";
    tail = "lion_tail";
    muzzle = "lion_muzzle";
    defaultFurSkin = "#F59E0B";
    defaultHair = "#9A3412";
    defaultAccent = "#FEF3C7";
  } else if (/лягуш|жаб|пепе|квак|frog|toad|pepe/.test(lower)) {
    ears = "frog_eyes";
    tail = "none";
    muzzle = "frog_muzzle";
    defaultFurSkin = "#22C55E";
    defaultHair = "#16A34A";
    defaultAccent = "#F43F5E";
  } else if (/акул|рыб|плавник|челюст|shark|mako/.test(lower)) {
    ears = "shark_fin";
    tail = "shark_tail";
    muzzle = "shark_muzzle";
    defaultFurSkin = "#0284C7";
    defaultHair = "#0369A1";
    defaultAccent = "#F8FAFC";
  } else if (/олен|лось|косул|бэмби|рудольф|deer|stag|moose/.test(lower)) {
    ears = "deer_antlers";
    tail = "bunny_tail";
    muzzle = "deer_muzzle";
    defaultFurSkin = "#B45309";
    defaultHair = "#78350F";
    defaultAccent = "#FDE68A";
  } else if (/волк|волч|оборотен|пёс|пес|собак|хаски|wolf|werewolf|dog/.test(lower)) {
    ears = "wolf_ears";
    tail = "wolf_tail";
    muzzle = "wolf_muzzle";
    defaultFurSkin = "#64748B";
    defaultHair = "#475569";
    defaultAccent = "#E2E8F0";
  } else if (/заяц|зайк|зайч|кролик|bunny|rabbit/.test(lower)) {
    ears = "bunny_ears";
    tail = "bunny_tail";
    muzzle = "bunny_muzzle";
    defaultFurSkin = "#F8FAFC";
    defaultHair = "#F472B6";
    defaultAccent = "#F9A8D4";
  } else if (/медвед|мишк|панд|bear|panda/.test(lower)) {
    ears = "bear_ears";
    tail = "bunny_tail";
    muzzle = "wolf_muzzle";
    defaultFurSkin = /панд|panda/.test(lower) ? "#F8FAFC" : "#92400E";
    defaultHair = /панд|panda/.test(lower) ? "#0F172A" : "#78350F";
    defaultAccent = "#FDE68A";
  } else if (/демон|черт|чёрт|дьявол|рога|demon|devil|imp/.test(lower)) {
    ears = "demon_horns";
    tail = "devil_tail";
    muzzle = "none";
    defaultFurSkin = "#DC2626";
    defaultHair = "#1E293B";
    defaultAccent = "#FACC15";
  }

  // If user mentioned generic "уши / ушки" or "хвост / хвостик" without specific animal
  if (!ears && /уши|ушки|ушаст|ears/.test(lower)) {
    ears = "cat_ears";
  }
  if (!tail && /хвост|хвостик|tail/.test(lower)) {
    tail = ears === "fox_ears" ? "fox_tail" : ears === "wolf_ears" ? "wolf_tail" : "cat_tail";
  }

  return { ears, tail, muzzle, defaultFurSkin, defaultHair, defaultAccent };
}

// Smart semantic analyzer fallback so character creation always succeeds even if a model call fails
function buildSemanticAppearanceFromPrompt(promptText: string) {
  const lower = promptText.toLowerCase();

  let hash = 0;
  for (let i = 0; i < promptText.length; i++) {
    hash = (hash * 31 + promptText.charCodeAt(i)) >>> 0;
  }

  const pickHex = (palette: string[], offset = 0) =>
    palette[(hash + offset) % palette.length];

  const detectColor = (keywords: Record<string, string>, fallback: string) => {
    for (const [word, hex] of Object.entries(keywords)) {
      if (lower.includes(word)) return hex;
    }
    return fallback;
  };

  const animal = detectAnimalTraits(promptText);

  const furOrSkinColor = detectColor(
    {
      рыж: "#F97316",
      оранж: "#F97316",
      черн: "#334155",
      бел: "#F8FAFC",
      сер: "#64748B",
      розов: "#F472B6",
      голуб: "#38BDF8",
      син: "#3B82F6",
      фиолет: "#8B5CF6",
      золот: "#F59E0B",
      желт: "#FACC15",
      красн: "#EF4444",
      зелен: "#10B981",
      коричн: "#92400E",
    },
    animal.defaultFurSkin ||
      pickHex(["#F1C27D", "#FFDBAC", "#E0AC69", "#C68642"], 0)
  );

  const shirtColor = detectColor(
    {
      красн: "#EF4444",
      ал: "#F43F5E",
      бордов: "#9F1239",
      син: "#3B82F6",
      голуб: "#06B6D4",
      бирюз: "#14B8A6",
      зелен: "#10B981",
      изумруд: "#059669",
      хаки: "#4D7C0F",
      желт: "#FACC15",
      золот: "#F59E0B",
      оранж: "#F97316",
      фиолет: "#8B5CF6",
      пурпур: "#A855F7",
      розов: "#EC4899",
      неон: "#06B6D4",
      бел: "#F8FAFC",
      черн: "#1E293B",
      сер: "#64748B",
      коричн: "#92400E",
      кожан: "#78350F",
    },
    pickHex(["#06B6D4", "#EF4444", "#8B5CF6", "#10B981", "#F59E0B", "#3B82F6"], 1)
  );

  const hairColor = detectColor(
    {
      рыж: "#EA580C",
      оранж: "#F97316",
      розов: "#EC4899",
      зелен: "#22C55E",
      син: "#38BDF8",
      бел: "#F1F5F9",
      сед: "#CBD5E1",
      блонд: "#FDE047",
      русый: "#D97706",
      черн: "#0F172A",
      фиолет: "#A855F7",
    },
    animal.defaultHair ||
      pickHex(["#EC4899", "#F59E0B", "#38BDF8", "#78350F", "#1E293B", "#A855F7"], 2)
  );

  const accentColor = detectColor(
    {
      золот: "#FACC15",
      неон: "#22D3EE",
      огн: "#F97316",
      кислот: "#A3E635",
      кров: "#EF4444",
      лазер: "#F43F5E",
      бел: "#FEF3C7",
      розов: "#F472B6",
    },
    animal.defaultAccent ||
      pickHex(["#FACC15", "#22D3EE", "#F43F5E", "#A3E635", "#FB923C"], 3)
  );

  // Detect headgear (keep 'none' if animal ears are active and no specific hat was requested so ears stand out)
  let headgear = "none";
  if (/ирокез|панк|mohawk/.test(lower)) headgear = "mohawk";
  else if (/повар|колпак|шеф|chef/.test(lower)) headgear = "chef_hat";
  else if (/корон|король|царь|принц|crown/.test(lower)) headgear = "crown";
  else if (/капюшон|ассасин|маг|hood/.test(lower)) headgear = "hood";
  else if (/ковбой|шляп|шериф|рейнджер|hat/.test(lower)) headgear = "cowboy_hat";
  else if (/шлем|рыцарь|солдат|спецназ|космо|байкер|каск|helmet/.test(lower))
    headgear = "helmet";
  else if (/кепк|бейсбол|рэпер|скейт|cap/.test(lower)) headgear = "cap";
  else if (!animal.ears) {
    const hgPool = ["cap", "mohawk", "helmet", "hood", "cowboy_hat", "crown", "chef_hat"];
    headgear = hgPool[hash % hgPool.length];
  }

  let eyewear = "none";
  if (/визор|кибер|робот|лазер|будущ|visor/.test(lower)) eyewear = "visor";
  else if (/повязк|пират|одноглаз|eyepatch/.test(lower)) eyewear = "eyepatch";
  else if (/гоггл|авиатор|стимпанк|учен|goggles/.test(lower)) eyewear = "goggles";
  else if (/очк|темн|крут|агент|sunglass/.test(lower)) eyewear = "sunglasses";
  else if (!animal.muzzle && hash % 3 === 0) eyewear = "sunglasses";

  let backItem = "none";
  if (/плащ|супер|герой|вампир|рыцарь|cape/.test(lower)) backItem = "cape";
  else if (/гитар|рок|музыкант|бард|guitar/.test(lower)) backItem = "guitar_case";
  else if (/ранец|джетпак|реактив|космо|летать|jetpack/.test(lower))
    backItem = "jetpack";
  else if (/катан|меч|самурай|ниндзя|клин|katana/.test(lower))
    backItem = "katana_sheath";
  else if (/рюкзак|турист|сталкер|выжив|школьн|backpack/.test(lower))
    backItem = "backpack";
  else {
    const backPool = ["katana_sheath", "backpack", "cape", "jetpack", "guitar_case", "none"];
    backItem = backPool[(hash >> 2) % backPool.length];
  }

  let facialHair = "none";
  if (/бород|лесоруб|викинг|дворф|дед|beard/.test(lower)) facialHair = "beard";
  else if (/ус|усатый|шеф|гусар|mustache/.test(lower) && !animal.muzzle)
    facialHair = "mustache";
  else if (/маск|сталкер|респиратор|череп|mask/.test(lower))
    facialHair = "mask";

  let heightScale = 1.02;
  let torsoWidth = 1.0;
  let headScale = animal.ears ? 1.08 : 1.02;
  let limbThickness = 0.98;

  if (/высок|длинн|гигант|баскетбол|великан/.test(lower)) heightScale = 1.2;
  else if (/низк|карлик|гном|маленьк|коренаст|коротыш|мелк|котик|котёнок/.test(lower))
    heightScale = 0.92;

  if (/толст|широк|качок|здоровяк|богатыр|мощн|пухл|крупн/.test(lower)) {
    torsoWidth = 1.32;
    limbThickness = 1.24;
  } else if (/худ|тонк|ловк|строй|скелет|быстр|лис|кот/.test(lower)) {
    torsoWidth = 0.9;
    limbThickness = 0.9;
  }

  const cleanWords = promptText
    .replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const rawTitle = cleanWords.slice(0, 2).join(" ") || "Герой Пустоши";
  const capitalizedName =
    rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).slice(0, 20);

  return {
    name: capitalizedName,
    tagline: promptText.slice(0, 48),
    colors: {
      skin: furOrSkinColor,
      shirt: shirtColor,
      pants: pickHex(["#1E293B", "#0F172A", "#334155", "#1E3A8A", "#27272A"], 4),
      shoes: pickHex(["#F43F5E", "#F59E0B", "#10B981", "#38BDF8", "#1E293B"], 5),
      hair: hairColor,
      accent: accentColor,
    },
    proportions: {
      heightScale,
      torsoWidth,
      headScale,
      limbThickness,
    },
    accessories: {
      headgear,
      eyewear,
      backItem,
      facialHair,
      ears: animal.ears || "none",
      tail: animal.tail || "none",
      muzzle: animal.muzzle || "none",
    },
  };
}

app.post("/api/character/generate", async (req, res) => {
  const promptText = String(req.body?.prompt || "").trim();
  if (!promptText) {
    return res.status(400).json({ error: "Введите описание персонажа" });
  }

  const semanticFallback = buildSemanticAppearanceFromPrompt(promptText);
  const animalTraits = detectAnimalTraits(promptText);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.json(semanticFallback);
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const schema = {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "Короткое яркое имя героя на русском языке (до 22 символов).",
      },
      tagline: {
        type: Type.STRING,
        description: "Короткий харизматичный титул или описание внешности на русском (до 45 символов).",
      },
      colors: {
        type: Type.OBJECT,
        properties: {
          skin: { type: Type.STRING, description: "HEX цвет кожи или шерсти (#RRGGBB). Для лиса — рыжий #F97316, для кота/волка — цвет шерсти." },
          shirt: { type: Type.STRING, description: "HEX цвет куртки/верха (#RRGGBB)" },
          pants: { type: Type.STRING, description: "HEX цвет брюк/шорт (#RRGGBB)" },
          shoes: { type: Type.STRING, description: "HEX цвет обуви (#RRGGBB)" },
          hair: { type: Type.STRING, description: "HEX цвет волос, ушей и хвоста (#RRGGBB)" },
          accent: { type: Type.STRING, description: "HEX акцентный цвет кончика хвоста, внутренней части ушек и деталей (#RRGGBB)" },
        },
        required: ["skin", "shirt", "pants", "shoes", "hair", "accent"],
      },
      proportions: {
        type: Type.OBJECT,
        properties: {
          heightScale: {
            type: Type.NUMBER,
            description: "Множитель роста от 0.82 до 1.24",
          },
          torsoWidth: {
            type: Type.NUMBER,
            description: "Ширина торса и плеч от 0.78 до 1.40",
          },
          headScale: {
            type: Type.NUMBER,
            description: "Размер головы от 0.85 до 1.28",
          },
          limbThickness: {
            type: Type.NUMBER,
            description: "Толщина рук и ног от 0.80 до 1.35",
          },
        },
        required: ["heightScale", "torsoWidth", "headScale", "limbThickness"],
      },
      accessories: {
        type: Type.OBJECT,
        properties: {
          headgear: {
            type: Type.STRING,
            description: "Один из вариантов: none, cap, helmet, chef_hat, mohawk, crown, hood, cowboy_hat (выбирай none, если у героя звериные уши без шапки)",
          },
          eyewear: {
            type: Type.STRING,
            description: "Один из вариантов: none, sunglasses, visor, eyepatch, goggles",
          },
          backItem: {
            type: Type.STRING,
            description: "Один из вариантов: none, backpack, cape, guitar_case, jetpack, katana_sheath",
          },
          facialHair: {
            type: Type.STRING,
            description: "Один из вариантов: none, beard, mustache, mask",
          },
          ears: {
            type: Type.STRING,
            description: "Уши, грива, плавник или рога: none, cat_ears, fox_ears, wolf_ears, bunny_ears, bear_ears, demon_horns, elephant_ears, croc_ridge, lion_mane, frog_eyes, shark_fin, deer_antlers",
          },
          tail: {
            type: Type.STRING,
            description: "Хвост: none, cat_tail, fox_tail, wolf_tail, bunny_tail, devil_tail, elephant_tail, croc_tail, lion_tail, shark_tail",
          },
          muzzle: {
            type: Type.STRING,
            description: "Звериная мордочка, хобот или пасть: none, cat_muzzle, fox_muzzle, wolf_muzzle, bunny_muzzle, elephant_trunk, croc_snout, lion_muzzle, frog_muzzle, shark_muzzle, deer_muzzle",
          },
        },
        required: ["headgear", "eyewear", "backItem", "facialHair", "ears", "tail", "muzzle"],
      },
    },
    required: ["name", "tagline", "colors", "proportions", "accessories"],
  };

  const modelsToTry = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Создай 3D-облик персонажа для аркадного зомби-экшена по следующему текстовому описанию пользователя: "${promptText}".
Если пользователь просит зверушку (котика, лиса, слоника, крокодила, льва, лягушку, акулу, оленя, волка, зайца, медведя/панду или демона) — обязательно выбери соответствующие ears, tail и muzzle, а также подходящий цвет кожи/шерсти в skin и hair.`,
        config: {
          systemInstruction:
            "Ты — 3D арт-директор стилизованного зомби-экшена с поддержкой 12 видов антропоморфных зверей (котиков, лисов, слоников, крокодилов, львов, лягушек, акул, оленей, волков, зайцев, панд) и героев. Возвращай строго валидный JSON согласно схеме.",
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const rawText = (response.text || "")
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      if (rawText) {
        const parsed = JSON.parse(rawText);
        // Ensure animal traits detected in prompt are preserved even if model omitted them
        if (parsed.accessories) {
          if (animalTraits.ears && (!parsed.accessories.ears || parsed.accessories.ears === "none")) {
            parsed.accessories.ears = animalTraits.ears;
          }
          if (animalTraits.tail && (!parsed.accessories.tail || parsed.accessories.tail === "none")) {
            parsed.accessories.tail = animalTraits.tail;
          }
          if (animalTraits.muzzle && (!parsed.accessories.muzzle || parsed.accessories.muzzle === "none")) {
            parsed.accessories.muzzle = animalTraits.muzzle;
          }
        }
        return res.json(parsed);
      }
    } catch (err) {
      console.warn(`Model ${modelName} attempt failed, trying next or fallback...`, err);
    }
  }

  return res.json(semanticFallback);
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  app.get("/zombie-bash-3d.apk", (_req, res) => {
    const apkPath = path.resolve(__dirname, "public", "zombie-bash-3d.apk");
    res.download(apkPath, "Zombie-Bash-3D.apk");
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
