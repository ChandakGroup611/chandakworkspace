/**
 * FleetDesk Instant Smart Autocomplete & Quick-Pick Engine
 * Provides zero-cost, instant client-side RTO district resolution,
 * popular brand/model quick-picks, and intelligent category inference.
 */

export interface BrandConfig {
  category: "CAR" | "BIKE" | "COMMERCIAL" | "BUS";
  models: string[];
  variants?: string[];
}

export const POPULAR_BRANDS: Record<string, BrandConfig> = {
  "Toyota": {
    category: "CAR",
    models: [
      "Innova Hycross",
      "Innova Crysta",
      "Fortuner",
      "Corolla Altis",
      "Urban Cruiser Hyryder",
      "Glanza",
      "Vellfire",
      "Hilux",
      "Camry"
    ],
    variants: ["ZX (O) Hybrid", "VX Hybrid", "GX", "2.8 4x4 AT", "1.8G Executive"]
  },
  "Maruti Suzuki": {
    category: "CAR",
    models: [
      "Dzire",
      "Swift",
      "Ertiga",
      "Brezza",
      "Grand Vitara",
      "Baleno",
      "WagonR",
      "Ciaz",
      "XL6",
      "Eeco"
    ],
    variants: ["ZXi Plus", "VXi", "ZXi", "Alpha Hybrid", "ZDi"]
  },
  "Tata": {
    category: "CAR",
    models: [
      "Nexon",
      "Nexon EV",
      "Harrier",
      "Safari",
      "Punch",
      "Tiago",
      "Tigor EV",
      "Winger",
      "Ace Gold"
    ],
    variants: ["Fearless+ S", "Empowered+ LR", "XZA Plus", "Creative", "Standard"]
  },
  "Mahindra": {
    category: "CAR",
    models: [
      "Scorpio-N",
      "XUV700",
      "Thar",
      "Scorpio Classic",
      "Bolero",
      "XUV300",
      "XUV400 EV",
      "Marazzo"
    ],
    variants: ["Z8L 4x4 AT", "AX7L AWD", "LX 4x4 Hard Top", "S11", "B6 Opt"]
  },
  "Hyundai": {
    category: "CAR",
    models: [
      "Creta",
      "Venue",
      "Verna",
      "i20",
      "Alcazar",
      "Aura",
      "Tucson",
      "Exter",
      "Ioniq 5"
    ],
    variants: ["SX (O) Turbo DCT", "SX", "Asta (O)", "Signature", "SX Tech"]
  },
  "Honda": {
    category: "CAR",
    models: [
      "City",
      "City e:HEV Hybrid",
      "Amaze",
      "Elevate"
    ],
    variants: ["ZX CVT", "VX", "V CVT", "ZX e:HEV"]
  },
  "Skoda": {
    category: "CAR",
    models: [
      "Slavia",
      "Kushaq",
      "Kodiaq",
      "Superb"
    ],
    variants: ["Style 1.5 TSI DSG", "Monte Carlo", "L&K"]
  },
  "Volkswagen": {
    category: "CAR",
    models: [
      "Virtus",
      "Taigun",
      "Tiguan"
    ],
    variants: ["GT Plus 1.5 DSG", "Topline", "Highline"]
  },
  "Mercedes-Benz": {
    category: "CAR",
    models: [
      "GLS 400d",
      "E-Class",
      "C-Class",
      "S-Class",
      "GLC",
      "GLE"
    ],
    variants: ["4MATIC AMG Line", "Exclusive", "Standard"]
  },
  "Audi": {
    category: "CAR",
    models: [
      "A3",
      "A4",
      "A6",
      "Q3",
      "Q5",
      "Q7"
    ],
    variants: ["Technology 45 TFSI", "Premium Plus", "Standard"]
  },
  "Volvo": {
    category: "CAR",
    models: [
      "XC90",
      "XC60",
      "XC40 Recharge"
    ],
    variants: ["B6 Inscription AWD", "Ultimate", "Plus"]
  },
  "BMW": {
    category: "CAR",
    models: [
      "3 Series",
      "5 Series",
      "7 Series",
      "X1",
      "X3",
      "X5"
    ],
    variants: ["M Sport", "Luxury Line", "xDrive"]
  },
  "Bajaj": {
    category: "BIKE",
    models: [
      "Pulsar 150",
      "Pulsar NS200",
      "Platina 110",
      "CT-100",
      "Dominar 400",
      "Avenger 220",
      "Chetak EV"
    ],
    variants: ["Twin Disc", "Single Disc", "ABS", "Standard"]
  },
  "Hero": {
    category: "BIKE",
    models: [
      "Splendor Plus",
      "HF Deluxe",
      "Passion Pro",
      "Glamour 125",
      "Xpulse 200 4V",
      "Destini 125",
      "Vida V1 Pro"
    ],
    variants: ["XTEC", "i3S", "Standard"]
  },
  "Honda (Two-Wheelers)": {
    category: "BIKE",
    models: [
      "Activa 6G",
      "Activa 125",
      "Shine 125",
      "SP 125",
      "Unicorn 160",
      "Dio 125"
    ],
    variants: ["H-Smart", "DLX", "Disc", "Drum"]
  },
  "Royal Enfield": {
    category: "BIKE",
    models: [
      "Classic 350",
      "Bullet 350",
      "Hunter 350",
      "Meteor 350",
      "Himalayan 450",
      "Continental GT 650"
    ],
    variants: ["Dark Series", "Halcyon", "Reborn", "Standard"]
  },
  "TVS": {
    category: "BIKE",
    models: [
      "Jupiter 110",
      "Jupiter 125",
      "Apache RTR 160 4V",
      "Apache RTR 200 4V",
      "Raider 125",
      "Ntorq 125",
      "iQube EV"
    ],
    variants: ["SmartXonnect", "Disc", "Race Edition", "Standard"]
  }
};

export const TOP_BRAND_NAMES = [
  "Toyota",
  "Maruti Suzuki",
  "Tata",
  "Mahindra",
  "Hyundai",
  "Honda",
  "Bajaj",
  "Hero",
  "Royal Enfield"
];

// Standard Indian State Codes
export const STATE_MAP: Record<string, string> = {
  "MH": "Maharashtra",
  "DL": "Delhi",
  "HR": "Haryana",
  "KA": "Karnataka",
  "GJ": "Gujarat",
  "TN": "Tamil Nadu",
  "TS": "Telangana",
  "UP": "Uttar Pradesh",
  "RJ": "Rajasthan",
  "WB": "West Bengal",
  "GA": "Goa",
  "MP": "Madhya Pradesh",
  "AP": "Andhra Pradesh",
  "PB": "Punjab",
  "CH": "Chandigarh",
  "KL": "Kerala",
  "OR": "Odisha",
  "OD": "Odisha",
  "BR": "Bihar",
  "JH": "Jharkhand",
  "UK": "Uttarakhand",
  "UA": "Uttarakhand",
  "HP": "Himachal Pradesh",
  "JK": "Jammu & Kashmir",
  "AS": "Assam"
};

// All 50 Maharashtra Regional Transport Offices (RTOs)
export const MH_RTO_MAP: Record<string, string> = {
  "MH01": "MH-01 (Mumbai South / Tardeo RTO)",
  "MH02": "MH-02 (Mumbai West / Andheri RTO)",
  "MH03": "MH-03 (Mumbai East / Wadala RTO)",
  "MH04": "MH-04 (Thane RTO)",
  "MH05": "MH-05 (Kalyan / Dombivli RTO)",
  "MH06": "MH-06 (Raigad / Pen RTO)",
  "MH07": "MH-07 (Sindhudurg RTO)",
  "MH08": "MH-08 (Ratnagiri RTO)",
  "MH09": "MH-09 (Kolhapur RTO)",
  "MH10": "MH-10 (Sangli RTO)",
  "MH11": "MH-11 (Satara RTO)",
  "MH12": "MH-12 (Pune Central RTO)",
  "MH13": "MH-13 (Solapur RTO)",
  "MH14": "MH-14 (Pimpri-Chinchwad RTO)",
  "MH15": "MH-15 (Nashik RTO)",
  "MH16": "MH-16 (Ahmednagar RTO)",
  "MH17": "MH-17 (Shrirampur RTO)",
  "MH18": "MH-18 (Dhule RTO)",
  "MH19": "MH-19 (Jalgaon RTO)",
  "MH20": "MH-20 (Aurangabad / Chh. Sambhajinagar RTO)",
  "MH21": "MH-21 (Jalna RTO)",
  "MH22": "MH-22 (Parbhani RTO)",
  "MH23": "MH-23 (Beed RTO)",
  "MH24": "MH-24 (Latur RTO)",
  "MH25": "MH-25 (Osmanabad / Dharashiv RTO)",
  "MH26": "MH-26 (Nanded RTO)",
  "MH27": "MH-27 (Amravati RTO)",
  "MH28": "MH-28 (Buldhana RTO)",
  "MH29": "MH-29 (Yavatmal RTO)",
  "MH30": "MH-30 (Akola RTO)",
  "MH31": "MH-31 (Nagpur City RTO)",
  "MH32": "MH-32 (Wardha RTO)",
  "MH33": "MH-33 (Gadchiroli RTO)",
  "MH34": "MH-34 (Chandrapur RTO)",
  "MH35": "MH-35 (Gondia RTO)",
  "MH36": "MH-36 (Bhandara RTO)",
  "MH37": "MH-37 (Washim RTO)",
  "MH38": "MH-38 (Hingoli RTO)",
  "MH39": "MH-39 (Nandurbar RTO)",
  "MH40": "MH-40 (Nagpur Rural RTO)",
  "MH41": "MH-41 (Malegaon RTO)",
  "MH42": "MH-42 (Baramati RTO)",
  "MH43": "MH-43 (Navi Mumbai / Vashi RTO)",
  "MH44": "MH-44 (Ambejogai RTO)",
  "MH45": "MH-45 (Akluj / Solapur District RTO)",
  "MH46": "MH-46 (Panvel / Navi Mumbai South RTO)",
  "MH47": "MH-47 (Mumbai North / Borivali RTO)",
  "MH48": "MH-48 (Vasai-Virar / Palghar RTO)",
  "MH49": "MH-49 (Nagpur East RTO)",
  "MH50": "MH-50 (Karad / Satara RTO)"
};

// National key metro RTOs
export const NATIONAL_RTO_MAP: Record<string, string> = {
  ...MH_RTO_MAP,
  "DL01": "DL-01 (Delhi North / Mall Road RTO)",
  "DL02": "DL-02 (Delhi New Delhi / Tilak Marg RTO)",
  "DL03": "DL-03 (Delhi South / Sheikh Sarai RTO)",
  "DL04": "DL-04 (Delhi West / Janakpuri RTO)",
  "DL08": "DL-08 (Delhi North West / Wazirpur RTO)",
  "HR26": "HR-26 (Gurugram / Gurgaon RTO)",
  "HR55": "HR-55 (Gurugram South RTO)",
  "KA01": "KA-01 (Bangalore Central / Koramangala RTO)",
  "KA03": "KA-03 (Bangalore East / Indiranagar RTO)",
  "KA05": "KA-05 (Bangalore South / Jayanagar RTO)",
  "GJ01": "GJ-01 (Ahmedabad RTO)",
  "GJ06": "GJ-06 (Vadodara RTO)",
  "GJ27": "GJ-27 (Ahmedabad East RTO)",
  "TS09": "TS-09 (Hyderabad Central / Khairatabad RTO)",
  "TN01": "TN-01 (Chennai Central / Ayanavaram RTO)"
};

/**
 * Instant client-side analysis of an Indian vehicle plate number.
 * Returns decoded RTO jurisdiction and state without making any network request.
 */
export function analyzeIndianPlate(rawInput: string): {
  cleanPlate: string;
  formattedPlate: string;
  stateCode: string;
  stateName: string;
  districtCode: string;
  rtoName: string;
  isRecognized: boolean;
} {
  const clean = (rawInput || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const stateCode = clean.slice(0, 2);
  const districtCode = clean.slice(0, 4);

  const stateName = STATE_MAP[stateCode] || (stateCode ? `${stateCode} State` : "India");
  const rtoName = NATIONAL_RTO_MAP[districtCode] || (districtCode.length >= 4 ? `${districtCode} Regional Transport Office` : "");

  let formatted = clean;
  const match = clean.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{1,4})$/);
  if (match) {
    const [, st, dt, sr, nm] = match;
    formatted = `${st}-${dt.padStart(2, "0")}${sr ? `-${sr}` : ""}-${nm.padStart(4, "0")}`;
  }

  return {
    cleanPlate: clean,
    formattedPlate: formatted,
    stateCode,
    stateName,
    districtCode,
    rtoName,
    isRecognized: Boolean(rtoName)
  };
}
