// Níveis do sistema
export const NIVEIS = [
  { label: "Pedra",    codepoint: "1faa8", min: 0    },
  { label: "Bronze",   codepoint: "1f949", min: 201  },
  { label: "Prata",    codepoint: "1f948", min: 401  },
  { label: "Ouro",     codepoint: "1f947", min: 601  },
  { label: "Diamante", codepoint: "1f48e", min: 801  },
];

const XP_MAX = 1000;

/* 
* Retorna o nível correspondente ao XP informado.
 * Se o XP ultrapassar o máximo esperado (dados de teste, etc.),
 * retorna um nível especial com label "-" 
*/
export function getNivel(xp) {
  if (xp > XP_MAX) {
    return { label: "-", codepoint: null };
  }
  let nivel = NIVEIS[0];
  for (const n of NIVEIS) {
    if (xp >= n.min) nivel = n;
  }
  return nivel;
}