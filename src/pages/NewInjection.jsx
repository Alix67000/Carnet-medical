import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInjections } from '../context/InjectionsContext';
import BodyMap from '../components/BodyMap';
import { format, addMonths } from 'date-fns';
import confetti from 'canvas-confetti';
import { 
  Calendar, 
  Clock, 
  Hash, 
  Check, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  Loader2,
  HelpCircle
} from 'lucide-react';

export default function NewInjection() {
  const navigate = useNavigate();
  const { addInjection, nextSuggestedZone, lastInjection } = useInjections();

  // Date de l'injection par défaut (au format date HTML5 : YYYY-MM-DD)
  const [dateStr, setDateStr] = useState(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  // Zone pré-sélectionnée avec la zone suggérée
  const [selectedZone, setSelectedZone] = useState(nextSuggestedZone || 1);

  // Mettre à jour si nextSuggestedZone change
  useEffect(() => {
    if (nextSuggestedZone) {
      setSelectedZone(nextSuggestedZone);
    }
  }, [nextSuggestedZone]);

  // N° de lot (reprend le lot précédent si disponible pour faciliter la saisie rapide de la boîte en cours)
  const [lotNumber, setLotNumber] = useState(lastInjection?.lotNumber || '');

  // Date d'expiration (par défaut : 6 mois après aujourd'hui ou date précédente)
  const [expirationDateStr, setExpirationDateStr] = useState(() => {
    if (lastInjection?.expirationDate) {
      try {
        return format(lastInjection.expirationDate, 'yyyy-MM-dd');
      } catch (e) {
        // fallback
      }
    }
    return format(addMonths(new Date(), 6), 'yyyy-MM-dd');
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!lotNumber.trim()) {
      setFormError('Veuillez renseigner le numéro de lot pour assurer la traçabilité médicale.');
      return;
    }

    if (!expirationDateStr) {
      setFormError("Veuillez renseigner la date d'expiration du lot.");
      return;
    }

    setIsSubmitting(true);

    try {
      const injectionDate = new Date(dateStr + 'T12:00:00');
      const expirationDate = new Date(expirationDateStr + 'T12:00:00');

      await addInjection({
        date: injectionDate,
        zone: Number(selectedZone),
        lotNumber: lotNumber.trim().toUpperCase(),
        expirationDate: expirationDate,
      });

      // Animation festive et gratification
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#2563eb', '#16a34a', '#38bdf8']
        });
      } catch (e) {
        // silencieux
      }

      // Redirection immédiate vers l'accueil
      navigate('/', { replace: true });
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de l'injection [code]:", err?.code || 'unknown');
      setFormError("Impossible d'enregistrer l'injection. Veuillez vérifier votre connexion.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-200">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Nouvelle Injection VYVGART
          </h2>
          <p className="text-xs text-slate-500">
            Enregistrez les informations pour la traçabilité du traitement
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date de l'injection */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Date de l'injection
          </label>
          <div className="relative">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              required
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm font-medium bg-slate-50/50 outline-none transition-all"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Sélectionnez le jour de réalisation de l'injection.
          </p>
        </div>

        {/* Composant Visuel BodyMap */}
        <BodyMap
          selectedZone={selectedZone}
          onSelectZone={(zoneId) => setSelectedZone(zoneId)}
          suggestedZone={nextSuggestedZone}
        />

        {/* Traçabilité Médicale : Numéro de lot & Date d'expiration */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Traçabilité du flacon / stylo
            </h3>
          </div>

          {/* Numéro de Lot */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Numéro de Lot (Lot N°) <span className="text-red-500">*</span>
              </label>
              {lastInjection?.lotNumber && (
                <button
                  type="button"
                  onClick={() => setLotNumber(lastInjection.lotNumber)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                >
                  Reprendre lot précédent ({lastInjection.lotNumber})
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: VYV-9428-B"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value.toUpperCase())}
                required
                maxLength={50}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm font-mono uppercase bg-slate-50/50 outline-none transition-all placeholder:normal-case placeholder:font-sans placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Inscrit sur la boîte ou directement sur le corps du stylo / flacon VYVGART.
            </p>
          </div>

          {/* Date d'expiration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Date d'expiration <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={expirationDateStr}
              onChange={(e) => setExpirationDateStr(e.target.value)}
              required
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm font-medium bg-slate-50/50 outline-none transition-all"
            />
          </div>
        </div>

        {/* Boutons Enregistrer (vert) et Annuler */}
        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all duration-200 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[2.6]" />
                <span>Enregistrer l'injection</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-sm transition-colors cursor-pointer text-center"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
