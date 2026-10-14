import React from 'react';
import { ZONES } from '../utils/zoneLogic';
import { Check, Sparkles } from 'lucide-react';

/**
 * Composant interactif BodyMap
 * Silhouette anatomique du torse avec 4 quadrants abdominaux cliquables
 * @param {number} selectedZone - Zone actuellement sélectionnée (1, 2, 3 ou 4)
 * @param {Function} onSelectZone - Callback de changement de zone
 * @param {number} suggestedZone - Zone recommandée par l'algorithme de rotation
 */
export default function BodyMap({ selectedZone, onSelectZone, suggestedZone }) {
  // Coordonnées anatomiques des 4 zones sur le SVG (vue de face : Gauche de l'écran = Côté Droit du patient)
  // Centre du nombril : (150, 190)
  const zoneCoords = {
    1: { cx: 105, cy: 155, label: '1', title: 'Sup. Droit' },
    2: { cx: 195, cy: 155, label: '2', title: 'Sup. Gauche' },
    3: { cx: 105, cy: 225, label: '3', title: 'Inf. Droit' },
    4: { cx: 195, cy: 225, label: '4', title: 'Inf. Gauche' },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Zone d'injection abdominale</h3>
          <p className="text-xs text-slate-500">Touchez un quadrant pour sélectionner le site</p>
        </div>
        {suggestedZone && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            Suggérée : Zone {suggestedZone}
          </span>
        )}
      </div>

      {/* Silhouette SVG & Quadrants */}
      <div className="relative flex justify-center items-center py-2 bg-slate-50/60 rounded-xl border border-slate-100">
        <svg
          viewBox="0 0 300 320"
          className="w-full max-w-[260px] sm:max-w-[290px] h-auto drop-shadow-sm select-none"
        >
          {/* Grille et repères anatomiques discrets */}
          <defs>
            <linearGradient id="bodySkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f8fafc" />
              <stop offset="100%" stop-color="#e2e8f0" />
            </linearGradient>
            <filter id="glowEffect" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#2563eb" flood-opacity="0.35" />
            </filter>
          </defs>

          {/* Silhouette stylisée du torse humain (épaules, poitrine, taille, hanches) */}
          <path
            d="M 50,40 
               C 85,38 100,55 150,55 
               C 200,55 215,38 250,40 
               C 275,45 285,95 280,130 
               C 275,155 255,160 250,185 
               C 245,215 265,245 270,290 
               C 265,298 230,305 150,305 
               C 70,305 35,298 30,290 
               C 35,245 55,215 50,185 
               C 45,160 25,155 20,130 
               C 15,95 25,45 50,40 Z"
            fill="url(#bodySkin)"
            stroke="#cbd5e1"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Lignes de repère anatomiques douces (clavicules & pectoraux) */}
          <path d="M 80,68 C 115,75 130,80 150,80 C 170,80 185,75 220,68" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
          <path d="M 75,115 C 105,125 135,120 150,122 C 165,120 195,125 225,115" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />

          {/* Délimitation douce de l'abdomen */}
          <ellipse cx="150" cy="190" rx="70" ry="60" fill="none" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1.5" />

          {/* Axe horizontal et vertical passant par le nombril */}
          <line x1="85" y1="190" x2="215" y2="190" stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1" />
          <line x1="150" y1="135" x2="150" y2="245" stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1" />

          {/* Nombril (Repère central) */}
          <circle cx="150" cy="190" r="5.5" fill="#64748b" />
          <circle cx="150" cy="190" r="8" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          <text x="150" y="205" fontSize="8" fill="#64748b" textAnchor="middle" fontWeight="bold">Nombril</text>

          {/* Indications d'orientation médicale (vue de face) */}
          <text x="45" y="195" fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="middle">CÔTÉ</text>
          <text x="45" y="207" fontSize="9" fill="#64748b" fontWeight="bold" textAnchor="middle">DROIT</text>

          <text x="255" y="195" fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="middle">CÔTÉ</text>
          <text x="255" y="207" fontSize="9" fill="#64748b" fontWeight="bold" textAnchor="middle">GAUCHE</text>

          {/* Les 4 Cercles d'injection interactifs */}
          {[1, 2, 3, 4].map((zoneId) => {
            const coord = zoneCoords[zoneId];
            const isSelected = selectedZone === zoneId;
            const isSuggested = suggestedZone === zoneId;

            return (
              <g
                key={zoneId}
                onClick={() => onSelectZone(zoneId)}
                className="cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
                role="button"
                tabIndex={0}
                aria-label={`Zone ${zoneId} : ${coord.title}`}
              >
                {/* Halo d'effet pour la zone suggérée */}
                {isSuggested && (
                  <circle
                    cx={coord.cx}
                    cy={coord.cy}
                    r={isSelected ? 30 : 26}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    className="animate-spin"
                    style={{ transformOrigin: `${coord.cx}px ${coord.cy}px`, animationDuration: '8s' }}
                  />
                )}

                {/* Cercle d'arrière-plan */}
                <circle
                  cx={coord.cx}
                  cy={coord.cy}
                  r={isSelected ? 24 : 20}
                  fill={isSelected ? '#2563eb' : (isSuggested ? '#eff6ff' : '#ffffff')}
                  stroke={isSelected ? '#1d4ed8' : (isSuggested ? '#2563eb' : '#94a3b8')}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={isSelected ? 'url(#glowEffect)' : undefined}
                  className="transition-all duration-200"
                />

                {/* Numéro de la zone */}
                <text
                  x={coord.cx}
                  y={coord.cy + (isSelected ? 5 : 4)}
                  fontSize={isSelected ? '16' : '14'}
                  fontWeight="bold"
                  fill={isSelected ? '#ffffff' : (isSuggested ? '#1d4ed8' : '#334155')}
                  textAnchor="middle"
                  className="select-none pointer-events-none"
                >
                  {coord.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sélecteur en grille pour validation et clarté maximale */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        {[
          { id: 1, name: 'Zone 1 : Sup. Droit' },
          { id: 2, name: 'Zone 2 : Sup. Gauche' },
          { id: 3, name: 'Zone 3 : Inf. Droit' },
          { id: 4, name: 'Zone 4 : Inf. Gauche' },
        ].map((item) => {
          const isSelected = selectedZone === item.id;
          const isSuggested = suggestedZone === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectZone(item.id)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-600 text-blue-950 font-semibold ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.id}
                </span>
                <span className="text-xs truncate">{item.name}</span>
              </div>
              {isSelected ? (
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
              ) : isSuggested ? (
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-100/70 px-1.5 py-0.5 rounded">
                  Reco
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Guide de rotation médicale */}
      <div className="mt-3 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2 text-xs text-blue-900">
        <span className="font-bold text-blue-700 shrink-0">Rotation :</span>
        <span>
          Ordre recommandé : <strong>1 → 2 → 3 → 4</strong>. Alterner les quadrants évite l'épaississement sous-cutané et assure une efficacité optimale de VYVGART.
        </span>
      </div>
    </div>
  );
}
