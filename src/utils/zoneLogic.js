/**
 * Logique médicale de rotation des zones d'injection VVG
 * Ordre de rotation obligatoire : 1 → 2 → 4 → 3 → 1 → 2 → 4 → 3...
 * Cette rotation sur les 4 quadrants de l'abdomen prévient la lipohypertrophie
 * et favorise une absorption régulière du traitement hebdomadaire.
 */

export const ZONE_ROTATION_MAP = {
  1: 2,
  2: 4,
  4: 3,
  3: 1,
};

export const ZONES = {
  1: {
    id: 1,
    title: 'Zone 1',
    name: 'Abdomen Supérieur Droit',
    shortName: 'Sup. Droit',
    side: 'Droit (patient)',
    description: 'Quadrant supérieur droit, à au moins 5 cm du nombril.',
    color: '#2563eb', // Blue
  },
  2: {
    id: 2,
    title: 'Zone 2',
    name: 'Abdomen Supérieur Gauche',
    shortName: 'Sup. Gauche',
    side: 'Gauche (patient)',
    description: 'Quadrant supérieur gauche, à au moins 5 cm du nombril.',
    color: '#0284c7', // Sky Blue
  },
  4: {
    id: 4,
    title: 'Zone 4',
    name: 'Abdomen Inférieur Gauche',
    shortName: 'Inf. Gauche',
    side: 'Gauche (patient)',
    description: 'Quadrant inférieur gauche, sous le nombril.',
    color: '#059669', // Emerald
  },
  3: {
    id: 3,
    title: 'Zone 3',
    name: 'Abdomen Inférieur Droit',
    shortName: 'Inf. Droit',
    side: 'Droit (patient)',
    description: 'Quadrant inférieur droit, sous le nombril.',
    color: '#16a34a', // Green
  },
};

/**
 * Calcule la zone suivante selon la rotation 1 -> 2 -> 4 -> 3
 * @param {number|null|undefined} lastZone - Numéro de la dernière zone injectée
 * @returns {number} Numéro de la prochaine zone recommandée
 */
export function getNextZone(lastZone) {
  if (!lastZone || typeof lastZone !== 'number') {
    return 1;
  }
  return ZONE_ROTATION_MAP[lastZone] || 1;
}

/**
 * Récupère les métadonnées d'une zone
 * @param {number} zoneId 
 */
export function getZoneInfo(zoneId) {
  return ZONES[zoneId] || {
    id: zoneId,
    title: `Zone ${zoneId}`,
    name: `Zone ${zoneId}`,
    shortName: `Z${zoneId}`,
    description: 'Zone abdominale',
    color: '#2563eb'
  };
}
