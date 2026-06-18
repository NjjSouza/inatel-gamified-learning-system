/**
 * NivelIcon.jsx
 * Ícone SVG do nível do aluno. Substitui TwemojiImg nos contextos de nível.
 *
 * Props:
 *   nivel  - string: "Pedra" | "Bronze" | "Prata" | "Ouro" | "Diamante"
 *   size   - number (px): tamanho do ícone. Padrão: 32
 *   alt    - string: texto alternativo para acessibilidade
 */
export default function NivelIcon({ nivel, size = 32, alt }) {
  const label = alt || nivel || "";

  const icons = {

    Pedra: (
        <svg
            viewBox="0 0 58 58"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={label}
        >
            <title>{label}</title>

            <g transform="translate(2.5 2.5) scale(0.92)">
                <path d="M29 4 L40 10 L50 8 L54 20 L50 32 L54 44 L42 52 L28 54 L16 50 L6 42 L4 28 L10 16 L8 6 Z" fill="#BDBDBD"/>
                <path d="M29 4 L40 10 L36 20 L22 18 L10 16 L8 6 Z" fill="#E0E0E0"/>
                <path d="M40 10 L50 8 L54 20 L50 32 L38 28 L36 20 Z" fill="#9E9E9E"/>
                <path d="M50 32 L54 44 L42 52 L38 42 L38 28 Z" fill="#757575"/>
                <path d="M42 52 L28 54 L16 50 L20 42 L38 42 Z" fill="#9E9E9E"/>
                <path d="M16 50 L6 42 L4 28 L10 16 L22 18 L20 42 Z" fill="#BDBDBD"/>
                <path d="M22 18 L36 20 L38 28 L38 42 L20 42 L10 16 Z" fill="#CACACA"/>
                <path d="M12 10 L22 6 L26 14 L14 16 Z" fill="white" opacity="0.4"/>
                <path d="M42 10 L50 10 L50 18 L44 16 Z" fill="white" opacity="0.2"/>
            </g>
        </svg>
    ),

    Bronze: (
      <svg viewBox="0 0 56 60" fill="none" xmlns="http://www.w3.org/2000/svg"
        role="img" aria-label={label}>
        <title>{label}</title>
        <path d="M14 38 L10 25 L18 12 L30 8 L42 15 L48 30 L43 43 L30 50 L16 46 Z" fill="#C1440E"/>
        <path d="M14 38 L10 25 L18 12 L22 24 Z" fill="#962F08"/>
        <path d="M18 12 L30 8 L32 20 L22 24 Z" fill="#E8622A"/>
        <path d="M30 8 L42 15 L38 22 L32 20 Z" fill="#C1440E"/>
        <path d="M42 15 L48 30 L42 32 L38 22 Z" fill="#7A2206"/>
        <path d="M22 24 L32 20 L38 22 L42 32 L43 43 L30 50 L16 46 L14 38 Z" fill="#AD3C0C"/>
        <path d="M20 14 L28 10 L30 17 L22 20 Z" fill="white" opacity="0.3"/>
        <path d="M36 24 L42 18 L44 26 L38 28 Z" fill="white" opacity="0.15"/>
        <path d="M30 8 L36 10 L38 16 L32 14 Z" fill="#F4845F" opacity="0.6"/>
      </svg>
    ),

    Prata: (
      <svg viewBox="0 0 60 64" fill="none" xmlns="http://www.w3.org/2000/svg"
        role="img" aria-label={label}>
        <title>{label}</title>
        <path d="M20 8 L40 8 L52 22 L52 42 L40 56 L20 56 L8 42 L8 22 Z" fill="#B0BEC5"/>
        <path d="M20 8 L40 8 L34 20 L26 20 Z" fill="#ECEFF1"/>
        <path d="M40 8 L52 22 L44 22 L34 20 Z" fill="#CFD8DC"/>
        <path d="M8 22 L20 8 L26 20 L16 22 Z" fill="#CFD8DC"/>
        <path d="M16 22 L26 20 L34 20 L44 22 L52 42 L40 56 L20 56 L8 42 Z" fill="#90A4AE"/>
        <path d="M26 20 L34 20 L38 32 L30 36 L22 32 Z" fill="#B0BEC5"/>
        <path d="M22 10 L32 8 L30 16 L20 16 Z" fill="white" opacity="0.45"/>
        <path d="M44 24 L50 30 L46 34 L40 26 Z" fill="white" opacity="0.2"/>
      </svg>
    ),

    Ouro: (
      <svg viewBox="0 0 60 66" fill="none" xmlns="http://www.w3.org/2000/svg"
        role="img" aria-label={label}>
        <title>{label}</title>
        <path d="M22 6 L38 6 L52 18 L54 36 L46 54 L30 62 L14 54 L6 36 L8 18 Z" fill="#FFC107"/>
        <path d="M22 6 L38 6 L34 18 L26 18 Z" fill="#FFE082"/>
        <path d="M38 6 L52 18 L46 20 L34 18 Z" fill="#FFD54F"/>
        <path d="M8 18 L22 6 L26 18 L14 22 Z" fill="#FFD54F"/>
        <path d="M52 18 L54 36 L48 36 L46 20 Z" fill="#FFA000"/>
        <path d="M6 36 L8 18 L14 22 L12 38 Z" fill="#FFA000"/>
        <path d="M14 22 L26 18 L34 18 L46 20 L48 36 L46 54 L30 62 L14 54 L12 38 Z" fill="#FFB300"/>
        <path d="M26 18 L34 18 L38 30 L30 34 L22 30 Z" fill="#FFD740"/>
        <path d="M24 8 L34 6 L32 14 L22 14 Z" fill="white" opacity="0.5"/>
        <path d="M46 22 L52 28 L48 32 L42 24 Z" fill="white" opacity="0.25"/>
        <circle cx="30" cy="38" r="3" fill="#FFF9C4" opacity="0.6"/>
      </svg>
    ),

    Diamante: (
      <svg viewBox="0 0 62 68" fill="none" xmlns="http://www.w3.org/2000/svg"
        role="img" aria-label={label}>
        <title>{label}</title>
        <path d="M31 4 L50 20 L31 28 L12 20 Z" fill="#B3E5FC"/>
        <path d="M20 12 L42 12 L50 20 L31 28 L12 20 Z" fill="#E1F5FE"/>
        <path d="M12 20 L31 28 L50 20 L54 26 L31 36 L8 26 Z" fill="#81D4FA"/>
        <path d="M8 26 L31 36 L31 64 Z" fill="#29B6F6"/>
        <path d="M31 36 L54 26 L31 64 Z" fill="#0288D1"/>
        <path d="M31 4 L42 12 L31 28 Z" fill="#B3E5FC" opacity="0.7"/>
        <path d="M31 4 L20 12 L31 28 Z" fill="#E1F5FE" opacity="0.8"/>
        <path d="M22 14 L31 10 L36 16 L28 20 Z" fill="white" opacity="0.6"/>
        <path d="M44 18 L50 22 L44 24 L40 20 Z" fill="white" opacity="0.35"/>
        <path d="M31 38 L36 50 L31 58 Z" fill="#4FC3F7" opacity="0.5"/>
        <line x1="31" y1="0" x2="31" y2="3" stroke="#B3E5FC" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="55" y1="10" x2="53" y2="12" stroke="#B3E5FC" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="7" y1="10" x2="9" y2="12" stroke="#B3E5FC" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    ),
  };

  const icon = icons[nivel];
  if (!icon) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      {icon}
    </span>
  );
}