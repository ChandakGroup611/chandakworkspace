"use client";

import React from "react";

interface VehicleBrandLogoProps {
  brand?: string | null;
  model?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  showName?: boolean;
}

// Smart Automotive Brand Resolver: Automatically infers the vehicle brand
// from Make, Model, Trims, Brand Aliases, or Composite text (e.g. "Toyota Fortuner", "Tata Nexon EV")
export const resolveVehicleBrandKey = (input: string): string => {
  const s = (input || "").trim().toLowerCase();
  if (!s) return "";

  if (s.includes("toyota") || /\b(innova|fortuner|corolla|glanza|hycross|hyryder|vellfire|hilux|camry|etios|yaris|land cruiser|urban cruiser)\b/i.test(s)) return "toyota";
  if (s.includes("tata") || /\b(nexon|harrier|safari|punch|tiago|tigor|altroz|curvv|sierra|hexa|aria|indica|indigo|sumo|winger|magic|ace gold|ace)\b/i.test(s)) return "tata";
  if (s.includes("mahindra") || /\b(scorpio|xuv700|xuv300|xuv400|xuv3xo|thar|bolero|marazzo|tuv300|xylo|verito|kuv100|supro|maxximo|jeeto)\b/i.test(s)) return "mahindra";
  if (s.includes("maruti") || s.includes("suzuki") || /\b(swift|dzire|ertiga|brezza|grand vitara|baleno|wagonr|wagon r|ciaz|xl6|eeco|alto|celerio|ignis|s-presso|jimny|fronx|invicto|ritz|omni|gypsy)\b/i.test(s)) return "suzuki";
  if (s.includes("hyundai") || /\b(creta|venue|verna|i20|i10|grand i10|alcazar|aura|tucson|exter|ioniq|kona|santro|elantra)\b/i.test(s)) return "hyundai";
  if (s.includes("honda") || /\b(city|amaze|elevate|jazz|wr-v|brio|civic|cr-v|activa|dio|shine|unicorn|hornet)\b/i.test(s)) return "honda";
  if (s.includes("kia") || /\b(seltos|sonet|carens|ev6|ev9|carnival)\b/i.test(s)) return "kia";
  if (s.includes("mg") || s.includes("morris") || /\b(hector|zs|astor|comet|gloster|windsor)\b/i.test(s)) return "mg";
  if (s.includes("skoda") || s.includes("škoda") || /\b(slavia|kushaq|kodiaq|superb|octavia|rapid|fabia|kylaq|yeti)\b/i.test(s)) return "skoda";
  if (s.includes("volkswagen") || s === "vw" || /\b(virtus|taigun|tiguan|polo|vento|passat|jetta|t-roc)\b/i.test(s)) return "volkswagen";
  if (s.includes("bmw") || /\b(3 series|5 series|7 series|x1|x3|x5|x7|m3|m5|i4|ix)\b/i.test(s)) return "bmw";
  if (s.includes("mercedes") || s.includes("benz") || /\b(glc|gle|gls|c-class|e-class|s-class|cla|gla|amg|maybach)\b/i.test(s)) return "mercedes";
  if (s.includes("audi") || /\b(a3|a4|a6|a8|q3|q5|q7|q8|e-tron)\b/i.test(s)) return "audi";
  if (s.includes("volvo") || /\b(xc90|xc60|xc40|c40|recharge)\b/i.test(s)) return "volvo";
  if (s.includes("royal enfield") || s.includes("enfield") || /\b(bullet|classic 350|hunter|meteor|himalayan|interceptor|continental gt|super meteor|shotgun)\b/i.test(s)) return "royal enfield";
  if (s.includes("bajaj") || /\b(pulsar|platina|ct100|ct110|dominar|avenger|chetak)\b/i.test(s)) return "bajaj";
  if (s.includes("hero") || /\b(splendor|hf deluxe|passion|glamour|xpulse|destini|vida|xtreme|pleasure|maestro)\b/i.test(s)) return "hero";
  if (s.includes("tvs") || /\b(jupiter|apache|raider|ntorq|iqube|ronin|xl100|radeon|sport|star city)\b/i.test(s)) return "tvs";
  if (s.includes("ashok") || s.includes("leyland") || /\b(dost|bada dost|ecomet|partner|boss|avtr)\b/i.test(s)) return "ashok leyland";
  if (s.includes("ford") || /\b(ecosport|endeavour|figo|mustang|freestyle|aspire)\b/i.test(s)) return "ford";
  if (s.includes("renault") || /\b(kwid|triber|kiger|duster|lodgy|pulse)\b/i.test(s)) return "renault";
  if (s.includes("jeep") || /\b(compass|wrangler|meridian|cherokee|rubicon)\b/i.test(s)) return "jeep";
  if (s.includes("byd") || /\b(atto|seal|e6|dolphin)\b/i.test(s)) return "byd";
  if (s.includes("nissan") || /\b(magnite|kicks|terrano|sunny|micra|gtr)\b/i.test(s)) return "nissan";
  if (s.includes("force") || /\b(gurkha|trax|cruiser|urbania)\b/i.test(s)) return "force";
  if (s.includes("eicher") || /\b(pro 2000|pro 3000|pro 6000)\b/i.test(s)) return "eicher";
  if (s.includes("ather") || /\b(450x|450s|rizta|450 apex)\b/i.test(s)) return "ather";
  if (s.includes("ola") || /\b(s1 pro|s1 air|s1 x|roadster)\b/i.test(s)) return "ola";
  
  return s;
};

export const VehicleBrandLogo: React.FC<VehicleBrandLogoProps> = ({
  brand,
  model,
  className = "",
  size = "md",
  showName = false,
}) => {
  const combinedText = [brand || "", model || ""].join(" ").trim();
  const normalized = resolveVehicleBrandKey(combinedText || brand || "");

  // Dimension helpers
  let dim = 24;
  if (typeof size === "number") {
    dim = size;
  } else {
    switch (size) {
      case "xs":
        dim = 14;
        break;
      case "sm":
        dim = 18;
        break;
      case "md":
        dim = 24;
        break;
      case "lg":
        dim = 32;
        break;
      case "xl":
        dim = 44;
        break;
    }
  }

  // Render authentic SVG emblems for automotive manufacturers
  const renderSvgLogo = () => {
    // 1. TOYOTA (Iconic triple overlapping ovals)
    if (normalized.includes("toyota")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#EB0A1E" fillOpacity="0.12" />
          <ellipse cx="50" cy="50" rx="42" ry="29" stroke="#EB0A1E" strokeWidth="6" />
          <ellipse cx="50" cy="38" rx="25" ry="12" stroke="#EB0A1E" strokeWidth="5.5" />
          <ellipse cx="50" cy="52" rx="14" ry="24" stroke="#EB0A1E" strokeWidth="5.5" />
        </svg>
      );
    }

    // 2. TATA (Iconic blue oval with dual curved sweeping road loops)
    if (normalized.includes("tata")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#0066B3" fillOpacity="0.12" />
          <ellipse cx="50" cy="50" rx="44" ry="34" stroke="#0066B3" strokeWidth="6" />
          <path
            d="M50 25 C34 25 24 38 24 55 C24 64 30 72 38 72 C45 72 48 64 48 55 L48 30 M50 25 C66 25 76 38 76 55 C76 64 70 72 62 72 C55 72 52 64 52 55 L52 30"
            stroke="#0066B3"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    // 3. MAHINDRA (Twin Peaks modern metallic emblem)
    if (normalized.includes("mahindra")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#E31837" fillOpacity="0.12" />
          <path
            d="M20 70 L38 28 C41 22 45 22 48 28 L50 32 L52 28 C55 22 59 22 62 28 L80 70"
            stroke="#E31837"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M34 52 L50 68 L66 52"
            stroke="#E31837"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    // 4. MARUTI SUZUKI / SUZUKI (Iconic angular 'S' emblem)
    if (normalized.includes("suzuki") || normalized.includes("maruti")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#E31E24" fillOpacity="0.12" />
          <path
            d="M68 20 L30 40 L70 60 L32 80 L76 74 L42 55 L80 36 Z"
            fill="#E31E24"
          />
        </svg>
      );
    }

    // 5. HYUNDAI (Iconic italicized 'H' in slanted oval)
    if (normalized.includes("hyundai")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#002C6C" fillOpacity="0.12" />
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="29"
            transform="rotate(-8 50 50)"
            stroke="#002C6C"
            strokeWidth="6"
          />
          <path
            d="M36 28 C36 40 40 65 32 72 M64 28 C64 40 60 65 68 72 M34 50 C44 46 56 46 66 50"
            stroke="#002C6C"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    // 6. HONDA (Bold geometric 'H' in rounded badge)
    if (normalized.includes("honda")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#CC0000" fillOpacity="0.12" />
          <rect x="15" y="15" width="70" height="70" rx="16" stroke="#CC0000" strokeWidth="5.5" />
          <path
            d="M32 26 L38 74 M68 26 L62 74 M35 48 C43 45 57 45 65 48"
            stroke="#CC0000"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    // 7. KIA (Modern connected KIA lettering)
    if (normalized.includes("kia")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#05141F" fillOpacity="0.12" />
          <path
            d="M20 72 L20 28 L40 72 M40 28 L54 72 M54 28 L72 72 L80 28"
            stroke="#05141F"
            className="dark:stroke-white"
            strokeWidth="7"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      );
    }

    // 8. MG / MORRIS GARAGES (Octagonal MG badge)
    if (normalized.includes("mg") || normalized.includes("morris")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#6A1B1A" fillOpacity="0.12" />
          <polygon
            points="30,14 70,14 86,30 86,70 70,86 30,86 14,70 14,30"
            stroke="#6A1B1A"
            strokeWidth="6"
          />
          <text
            x="50"
            y="60"
            fontSize="30"
            fontWeight="900"
            fontFamily="sans-serif"
            fill="#6A1B1A"
            textAnchor="middle"
            letterSpacing="1"
          >
            MG
          </text>
        </svg>
      );
    }

    // 9. SKODA (Winged arrow in green circle)
    if (normalized.includes("skoda") || normalized.includes("škoda")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#4BA82E" fillOpacity="0.12" />
          <circle cx="50" cy="50" r="40" stroke="#4BA82E" strokeWidth="5.5" />
          <path
            d="M34 64 C42 58 54 48 68 34 L56 36 L68 34 L66 46 C52 58 40 66 34 64 Z"
            fill="#4BA82E"
          />
          <circle cx="44" cy="46" r="4" fill="#4BA82E" />
        </svg>
      );
    }

    // 10. VOLKSWAGEN (VW circular emblem)
    if (normalized.includes("volkswagen") || normalized === "vw") {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#001E50" fillOpacity="0.12" />
          <circle cx="50" cy="50" r="40" stroke="#001E50" strokeWidth="6" />
          <path
            d="M30 30 L44 65 L50 50 L56 65 L70 30 M38 52 L50 80 L62 52"
            stroke="#001E50"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    // 11. BMW (Bavarian blue & white quarterly circle)
    if (normalized.includes("bmw")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="44" stroke="#0066B1" strokeWidth="6" fill="#1C1C1C" />
          <circle cx="50" cy="50" r="30" fill="white" />
          <path d="M50 20 A30 30 0 0 1 80 50 L50 50 Z" fill="#0066B1" />
          <path d="M50 50 L20 50 A30 30 0 0 1 50 80 Z" fill="#0066B1" />
        </svg>
      );
    }

    // 12. MERCEDES-BENZ (Three-pointed star in chrome ring)
    if (normalized.includes("mercedes") || normalized.includes("benz")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#333333" fillOpacity="0.12" />
          <circle cx="50" cy="50" r="40" stroke="#333333" className="dark:stroke-slate-200" strokeWidth="5.5" />
          <path
            d="M50 50 L50 14 M50 50 L20 72 M50 50 L80 72"
            stroke="#333333"
            className="dark:stroke-slate-200"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    // 13. AUDI (Four overlapping rings)
    if (normalized.includes("audi")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#BB0A30" fillOpacity="0.12" />
          <circle cx="26" cy="50" r="16" stroke="#BB0A30" strokeWidth="4.5" />
          <circle cx="42" cy="50" r="16" stroke="#BB0A30" strokeWidth="4.5" />
          <circle cx="58" cy="50" r="16" stroke="#BB0A30" strokeWidth="4.5" />
          <circle cx="74" cy="50" r="16" stroke="#BB0A30" strokeWidth="4.5" />
        </svg>
      );
    }

    // 14. VOLVO (Iron mark circle with diagonal top-right arrow)
    if (normalized.includes("volvo")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#003057" fillOpacity="0.12" />
          <circle cx="46" cy="54" r="32" stroke="#003057" strokeWidth="6" />
          <path d="M46 54 L76 24 M64 24 L76 24 L76 36" stroke="#003057" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    }

    // 15. ROYAL ENFIELD (Wings with RE Monogram)
    if (normalized.includes("royal enfield") || normalized.includes("enfield")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#B31920" fillOpacity="0.12" />
          <circle cx="50" cy="50" r="40" stroke="#B31920" strokeWidth="5" />
          <text
            x="50"
            y="58"
            fontSize="24"
            fontWeight="900"
            fontFamily="serif"
            fill="#B31920"
            textAnchor="middle"
          >
            RE
          </text>
        </svg>
      );
    }

    // 16. BAJAJ (Blue Wings & 'B' Hexagon)
    if (normalized.includes("bajaj")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#004B87" fillOpacity="0.12" />
          <path
            d="M32 24 L56 24 C68 24 76 30 76 40 C76 46 72 50 64 52 C74 54 80 60 80 68 C80 78 70 84 56 84 L32 84 Z"
            stroke="#004B87"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <line x1="32" y1="52" x2="62" y2="52" stroke="#004B87" strokeWidth="6" />
        </svg>
      );
    }

    // 17. TVS (Galloping horse racing emblem)
    if (normalized.includes("tvs")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#003399" fillOpacity="0.12" />
          <path
            d="M20 30 L40 70 L60 30 M55 50 L85 50 M70 30 L85 70"
            stroke="#003399"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    // 18. HERO / HERO MOTOCORP (Sharp geometric 'H' emblem)
    if (normalized.includes("hero")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#E41E2B" fillOpacity="0.12" />
          <path
            d="M25 25 L40 25 L40 45 L60 45 L60 25 L75 25 L75 75 L60 75 L60 55 L40 55 L40 75 L25 75 Z"
            fill="#E41E2B"
          />
        </svg>
      );
    }

    // 19. ASHOK LEYLAND (Wheel / Radiant Sun emblem)
    if (normalized.includes("ashok") || normalized.includes("leyland")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#008080" fillOpacity="0.12" />
          <circle cx="50" cy="50" r="38" stroke="#008080" strokeWidth="5" />
          <circle cx="50" cy="50" r="14" fill="#008080" />
          <path d="M50 12 L50 26 M50 74 L50 88 M12 50 L26 50 M74 50 L88 50" stroke="#008080" strokeWidth="5" />
        </svg>
      );
    }

    // 20. FORD (Blue Oval)
    if (normalized.includes("ford")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="50" cy="50" rx="46" ry="30" fill="#003478" />
          <text
            x="50"
            y="58"
            fontSize="26"
            fontWeight="bold"
            fontStyle="italic"
            fontFamily="serif"
            fill="white"
            textAnchor="middle"
          >
            Ford
          </text>
        </svg>
      );
    }

    // 21. RENAULT (Diamond emblem)
    if (normalized.includes("renault")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#FFCC00" fillOpacity="0.15" />
          <polygon
            points="50,14 78,50 50,86 22,50"
            stroke="#111111"
            className="dark:stroke-amber-400"
            strokeWidth="7"
            fill="none"
          />
        </svg>
      );
    }

    // 22. JEEP (7-Slot Grille)
    if (normalized.includes("jeep")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#4B5320" fillOpacity="0.15" />
          <circle cx="20" cy="50" r="9" stroke="#4B5320" strokeWidth="3" />
          <circle cx="80" cy="50" r="9" stroke="#4B5320" strokeWidth="3" />
          <rect x="34" y="38" width="5" height="24" rx="2" fill="#4B5320" />
          <rect x="44" y="38" width="5" height="24" rx="2" fill="#4B5320" />
          <rect x="54" y="38" width="5" height="24" rx="2" fill="#4B5320" />
          <rect x="64" y="38" width="5" height="24" rx="2" fill="#4B5320" />
        </svg>
      );
    }

    // 23. BYD (High tech electric red/silver)
    if (normalized.includes("byd")) {
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#D32F2F" fillOpacity="0.12" />
          <ellipse cx="50" cy="50" rx="44" ry="28" stroke="#D32F2F" strokeWidth="5.5" />
          <text
            x="50"
            y="59"
            fontSize="22"
            fontWeight="900"
            fontFamily="sans-serif"
            fill="#D32F2F"
            textAnchor="middle"
            letterSpacing="2"
          >
            BYD
          </text>
        </svg>
      );
    }

    // Dynamic High-Fidelity Automotive Emblem Fallback
    const initial = (brand || "V").trim().charAt(0).toUpperCase();
    return (
      <div
        style={{ width: dim, height: dim }}
        className="rounded-lg bg-theme-btn-primary/10 border border-theme-btn-primary/25 flex items-center justify-center font-bold text-theme-btn-primary shrink-0 select-none shadow-2xs font-mono"
      >
        <span style={{ fontSize: Math.max(10, Math.floor(dim * 0.48)) }}>
          {initial}
        </span>
      </div>
    );
  };

  return (
    <span className={`inline-flex items-center gap-1.5 align-middle ${className}`}>
      {renderSvgLogo()}
      {showName && brand && (
        <span className="font-semibold text-foreground text-xs truncate">{brand}</span>
      )}
    </span>
  );
};
