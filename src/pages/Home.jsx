import React from 'react';
import { Link } from 'react-router-dom';
import { useInjections } from '../context/InjectionsContext';
import { getZoneInfo } from '../utils/zoneLogic';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, 
  MapPin, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function Home() {
  const { 
    injections, 
    preferences, 
    lastInjection, 
    nextSuggestedZone, 
    nextInjectionDate, 
    daysUntilNext, 
    scheduleStatus,
    totalInjections 
  } = useInjections();

  const suggestedZoneInfo = getZoneInfo(nextSuggestedZone);
  const lastZoneInfo = lastInjection ? getZoneInfo(lastInjection.zone) : null;

  // Formatage propre en français avec majuscule
  const formatFrenchDate = (date) => {
    if (!date) return '-';
    const str = format(date, "EEEE d MMMM yyyy", { locale: fr });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-300">
      {/* Carte Principale de Suivi & Compte à Rebours */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-blue-600/20 relative overflow-hidden">
        {/* Motifs décoratifs médicaux discrets */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-xs border border-white/20">
              <Clock className="w-3.5 h-3.5" />
              Traitement VVG · Tous les {preferences.intervalDays} jours
            </span>

            {scheduleStatus === 'today' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-400 text-slate-900 animate-pulse">
                Aujourd'hui
              </span>
            )}
            {scheduleStatus === 'overdue' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-300 text-amber-950">
                <AlertTriangle className="w-3.5 h-3.5" /> En retard
              </span>
            )}
          </div>

          {/* Titre Principal du décompte */}
          {lastInjection ? (
            <div>
              <p className="text-xs text-blue-100 font-medium uppercase tracking-wider">Échéance</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                {scheduleStatus === 'today' && "Injection prévue aujourd'hui !"}
                {scheduleStatus === 'overdue' && `En retard de ${Math.abs(daysUntilNext)} jour${Math.abs(daysUntilNext) > 1 ? 's' : ''}`}
                {scheduleStatus === 'future' && `Prochaine injection dans ${daysUntilNext} jour${daysUntilNext > 1 ? 's' : ''}`}
              </h2>

              <div className="mt-3 flex items-center gap-2 text-blue-100 text-sm">
                <Calendar className="w-4 h-4 shrink-0 text-blue-200" />
                <span className="font-semibold text-white">
                  {formatFrenchDate(nextInjectionDate)}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-blue-100 font-medium uppercase tracking-wider">Démarrage du suivi</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                Prêt pour votre 1ère injection
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm mt-2 leading-relaxed">
                Enregistrez votre première injection VVG pour démarrer le calcul du calendrier et la rotation automatique des quadrants.
              </p>
            </div>
          )}

          {/* Encart Zone Recommandée */}
          <div className="mt-5 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                {nextSuggestedZone}
              </div>
              <div>
                <p className="text-[11px] text-blue-200 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> Zone recommandée
                </p>
                <p className="text-sm font-bold text-white">
                  {suggestedZoneInfo.name}
                </p>
              </div>
            </div>
            <Link
              to="/new"
              className="px-3 py-1.5 rounded-xl bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm shrink-0"
            >
              Choisir
            </Link>
          </div>
        </div>
      </section>

      {/* Gros Bouton d'action Principale "➕ Noter mon injection du jour" */}
      <section>
        <Link
          to="/new"
          className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-[0.99] cursor-pointer"
        >
          <PlusCircle className="w-6 h-6 stroke-[2.4]" />
          <span>➕ Noter mon injection du jour</span>
        </Link>
      </section>

      {/* Résumé Rapide & Statistiques */}
      <section className="grid grid-cols-2 gap-3">
        {/* Total Injections */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Total réalisées</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalInjections}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Injections enregistrées</p>
        </div>

        {/* Date de la dernière */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Dernière injection</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-800 truncate">
            {lastInjection ? format(lastInjection.date, 'dd/MM/yyyy', { locale: fr }) : 'Aucune'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {lastInjection ? `Zone ${lastInjection.zone} (${lastZoneInfo?.shortName})` : 'Pas encore débuté'}
          </p>
        </div>
      </section>

      {/* Schéma de Rotation Médicale Active */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Cycle de rotation des 4 quadrants
          </h3>
          <span className="text-[11px] font-semibold text-blue-600">Ordre : 1 → 2 → 4 → 3</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {[1, 2, 4, 3].map((zoneId, idx) => {
            const isCurrentSuggested = nextSuggestedZone === zoneId;
            const isLast = lastInjection?.zone === zoneId;

            return (
              <div
                key={zoneId}
                className={`p-2.5 rounded-xl border transition-all ${
                  isCurrentSuggested
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-bold shadow-xs'
                    : isLast
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="text-sm font-black">Zone {zoneId}</div>
                <div className="text-[10px] mt-0.5 truncate">
                  {zoneId === 1 && 'Sup. Droit'}
                  {zoneId === 2 && 'Sup. Gauche'}
                  {zoneId === 4 && 'Inf. Gauche'}
                  {zoneId === 3 && 'Inf. Droit'}
                </div>
                {isCurrentSuggested && (
                  <span className="inline-block mt-1 text-[9px] px-1 py-0.2 bg-blue-600 text-white rounded font-bold">
                    Suivante
                  </span>
                )}
                {isLast && !isCurrentSuggested && (
                  <span className="inline-block mt-1 text-[9px] px-1 py-0.2 bg-slate-200 text-slate-600 rounded">
                    Dernière
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Raccourci vers l'historique et PDF */}
      <section className="bg-blue-50/60 rounded-2xl border border-blue-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Rendez-vous médical ?</h4>
            <p className="text-[11px] text-slate-600">Exportez votre relevé au format PDF pour votre consultation.</p>
          </div>
        </div>
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 shrink-0 ml-2"
        >
          <span>Historique</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </div>
  );
}
