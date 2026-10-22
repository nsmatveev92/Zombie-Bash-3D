import React from 'react';

interface SkillIconProps {
  id: string;
  className?: string;
}

/**
 * Bespoke, high-contrast vector SVG icons for all 12 game skills/perks.
 * Designed for instant visual recognition in both the 3-card level-up selector
 * and the compact HUD bar.
 */
export const SkillIcon: React.FC<SkillIconProps> = ({
  id,
  className = 'w-11 h-11 sm:w-13 sm:h-13',
}) => {
  switch (id) {
    case 'chain_lightning':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="cl_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="cl_bolt" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#cl_bg)"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          {/* Secondary Chain Arcs */}
          <path
            d="M14 22L22 28L16 36L25 42"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          <path
            d="M50 18L43 26L51 33L42 44"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          {/* Main High-Voltage Bolt */}
          <path
            d="M36 8L17 34H31L26 56L48 28H34L36 8Z"
            fill="url(#cl_bolt)"
            stroke="#e0f2fe"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="22" r="2.5" fill="#bae6fd" />
          <circle cx="50" cy="18" r="2.5" fill="#bae6fd" />
          <circle cx="42" cy="44" r="2.5" fill="#bae6fd" />
        </svg>
      );

    case 'fire_nova':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="fn_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="fn_flame" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#fn_bg)"
            stroke="#f97316"
            strokeWidth="2.5"
          />
          {/* Outer Expanding Fire Ring */}
          <circle
            cx="32"
            cy="34"
            r="20"
            stroke="#fb923c"
            strokeWidth="3"
            strokeDasharray="6 4"
            opacity="0.85"
          />
          {/* Central Blazing Fire Core */}
          <path
            d="M32 10C32 10 47 21 45 36C43.5 46.5 36.5 52 32 52C27.5 52 20.5 46.5 19 36C17.5 26 26 20 26 20C26 20 24.5 27 28 29C27 21 32 10 32 10Z"
            fill="url(#fn_flame)"
            stroke="#fed7aa"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M32 25C32 25 39 31 38 39C37 44.5 34 47 32 47C30 47 27 44.5 26 39C25 33 32 25 32 25Z"
            fill="#fef08a"
          />
        </svg>
      );

    case 'frost_nova':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="fr_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="fr_ice" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#fr_bg)"
            stroke="#22d3ee"
            strokeWidth="2.5"
          />
          {/* Crisp 6-Point Ice Crystal Star & Snowflake */}
          <path
            d="M32 10V54M13 21L51 43M51 21L13 43"
            stroke="url(#fr_ice)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Crystal Branches */}
          <path
            d="M27 15L32 20L37 15M27 49L32 44L37 49M15 27L21 26L19 20M49 37L43 38L45 44M45 20L43 26L49 27M19 44L21 38L15 37"
            stroke="#cffafe"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points="32,22 40,27 40,37 32,42 24,37 24,27"
            fill="#22d3ee"
            fillOpacity="0.45"
            stroke="#ecfeff"
            strokeWidth="2"
          />
          <circle cx="32" cy="32" r="4" fill="#ffffff" />
        </svg>
      );

    case 'orbit_blades':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="ob_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="ob_blade" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ecfdf5" />
              <stop offset="50%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#ob_bg)"
            stroke="#34d399"
            strokeWidth="2.5"
          />
          {/* Orbit Trail */}
          <circle
            cx="32"
            cy="32"
            r="18"
            stroke="#34d399"
            strokeWidth="2.2"
            strokeDasharray="8 5"
          />
          {/* 3 Curved Whirling Glaive Blades */}
          <path
            d="M32 10C41 12 46 20 43 27C39 21 34 19 28 21L32 10Z"
            fill="url(#ob_blade)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M51 43C45 50 35 51 30 45C37 44 41 40 42 34L51 43Z"
            fill="url(#ob_blade)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M13 43C11 34 16 25 23 24C19 30 20 35 25 39L13 43Z"
            fill="url(#ob_blade)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle
            cx="32"
            cy="32"
            r="5.5"
            fill="#10b981"
            stroke="#ecfdf5"
            strokeWidth="2"
          />
        </svg>
      );

    case 'meteor_strike':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="ms_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#9333ea" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="ms_tail" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#ms_bg)"
            stroke="#c084fc"
            strokeWidth="2.5"
          />
          {/* Fiery Meteor Trail */}
          <path
            d="M52 12L30 24L20 44L40 34L52 12Z"
            fill="url(#ms_tail)"
          />
          <path
            d="M48 20L36 32M44 12L28 28"
            stroke="#f5d0fe"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Glowing Crater Meteor Core */}
          <circle
            cx="22"
            cy="42"
            r="11"
            fill="#a855f7"
            stroke="#fef08a"
            strokeWidth="2.5"
          />
          <circle cx="19" cy="40" r="3" fill="#fde047" />
          <circle cx="25" cy="45" r="2" fill="#fde047" />
          {/* Impact Shockwave Ring */}
          <ellipse
            cx="22"
            cy="51"
            rx="14"
            ry="4"
            stroke="#f0abfc"
            strokeWidth="2"
          />
        </svg>
      );

    case 'vampiric_strikes':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="vs_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="vs_drop" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="45%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#vs_bg)"
            stroke="#fb7185"
            strokeWidth="2.5"
          />
          {/* Bat Wings Silhouette */}
          <path
            d="M8 28C14 22 21 24 25 30C19 32 14 36 11 41C10 35 9 31 8 28Z"
            fill="#be123c"
            stroke="#fda4af"
            strokeWidth="1.5"
          />
          <path
            d="M56 28C50 22 43 24 39 30C45 32 50 36 53 41C54 35 55 31 56 28Z"
            fill="#be123c"
            stroke="#fda4af"
            strokeWidth="1.5"
          />
          {/* Crimson Life-Steal Heart / Blood Drop + Fangs */}
          <path
            d="M32 12C32 12 45 27 45 38C45 45.5 39.2 51 32 51C24.8 51 19 45.5 19 38C19 27 32 12 32 12Z"
            fill="url(#vs_drop)"
            stroke="#ffe4e6"
            strokeWidth="2"
          />
          {/* Vampire Fangs */}
          <path d="M26 24L28 33L31 25" fill="#ffffff" />
          <path d="M38 24L36 33L33 25" fill="#ffffff" />
          {/* Healing Cross Inside Drop */}
          <path
            d="M32 36V44M28 40H36"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'iron_grip':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="ig_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="ig_shield" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="50%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#ig_bg)"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          {/* Titanium Shield + Anvil Emblem */}
          <path
            d="M32 10L50 17V31C50 43 41.5 50.5 32 54C22.5 50.5 14 43 14 31V17L32 10Z"
            fill="url(#ig_shield)"
            stroke="#e0f2fe"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M32 15L45 20V30.5C45 39.5 38.5 45.5 32 48.5C25.5 45.5 19 39.5 19 30.5V20L32 15Z"
            fill="#0f172a"
            fillOpacity="0.55"
          />
          {/* Forged Hammer / Anvil Icon Inside Shield */}
          <path
            d="M23 27H41L38 33H26L23 27ZM28 33H36V39H28V33ZM24 39H40V43H24V39Z"
            fill="#e0f2fe"
          />
        </svg>
      );

    case 'heavy_swing':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="hs_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="hs_head" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#hs_bg)"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          {/* Impact Shock Sparks */}
          <path
            d="M14 20L20 24M48 16L42 22M52 30L44 31"
            stroke="#fde047"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Handle */}
          <path
            d="M16 50L38 28"
            stroke="#fcd34d"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Colossal War Hammer Head */}
          <path
            d="M27 14L49 36L41 44L19 22L27 14Z"
            fill="url(#hs_head)"
            stroke="#fef3c7"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'turbo_sneakers':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="ts_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="ts_boot" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#ts_bg)"
            stroke="#10b981"
            strokeWidth="2.5"
          />
          {/* Speed Lines */}
          <path
            d="M10 26H20M8 34H18M12 42H20"
            stroke="#a7f3d0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Golden Hermes Wing */}
          <path
            d="M22 25C22 17 31 12 42 13C37 18 36 21 44 21C38 25 35 27 28 29L22 25Z"
            fill="#fde047"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Turbo Sneaker Shoe */}
          <path
            d="M22 26H35L40 36L52 39C54 40 55 43 54 46H20C18 46 17 44 18 41L22 26Z"
            fill="url(#ts_boot)"
            stroke="#ecfdf5"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M18 46H54"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'whirlwind_reach':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="wr_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="wr_arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#ddd6fe" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#wr_bg)"
            stroke="#a78bfa"
            strokeWidth="2.5"
          />
          {/* Wide Crescent Cleave Wave */}
          <path
            d="M14 16C34 8 54 22 52 44C50 50 44 54 36 53C44 45 44 29 30 22C23 18 18 18 14 16Z"
            fill="url(#wr_arc)"
            stroke="#f5f3ff"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12 28C25 23 37 31 36 44"
            stroke="#c4b5fd"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Outward Range Arrows */}
          <path
            d="M14 48L26 36M26 36H19M26 36V43"
            stroke="#fde047"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'shatter_blast':
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="sb_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#sb_bg)"
            stroke="#f43f5e"
            strokeWidth="2.5"
          />
          {/* Explosive Starburst */}
          <polygon
            points="32,8 38,21 52,14 44,28 56,35 42,39 48,52 34,44 27,55 24,41 10,46 19,33 9,23 23,24"
            fill="#f43f5e"
            stroke="#fecdd3"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <polygon
            points="32,17 36,26 45,22 40,31 48,35 38,38 41,46 33,40 28,47 27,38 18,40 24,32 18,26 27,27"
            fill="#fde047"
          />
          <circle cx="32" cy="33" r="5" fill="#ffffff" />
        </svg>
      );

    case 'titan_vitality':
    default:
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="tv_bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="tv_heart" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#tv_bg)"
            stroke="#4ade80"
            strokeWidth="2.5"
          />
          {/* Armored Titan Heart */}
          <path
            d="M32 52C32 52 12 39 12 24.5C12 17.5 17.5 13 23.5 13C27.5 13 30.5 15 32 18C33.5 15 36.5 13 40.5 13C46.5 13 52 17.5 52 24.5C52 39 32 52 32 52Z"
            fill="url(#tv_heart)"
            stroke="#dcfce7"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Bright Vitality Plus Sign */}
          <path
            d="M32 23V39M24 31H40"
            stroke="#ffffff"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};
