import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInjections } from '../context/InjectionsContext';
import { useAuth } from '../context/AuthContext';
import { getZoneInfo } from '../utils/zoneLogic';
import { exportInjectionsToPDF } from '../utils/pdfExport';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileText, 
  Trash2, 
  Calendar, 
  Tag, 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  Clock, 
  ShieldAlert,
  Loader2
} from 'lucide-react';

export default function History() {
  const { injections, preferences, deleteInjection, loading } = useInjections();
  const { user } = useAuth();

  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    if (injections.length === 0) return;
    setIsExporting(true);
    try {
      exportInjectionsToPDF(injections, preferences, user);
    } catch (err) {
      console.error("Erreur lors de l'exportation PDF [code]:", err?.name || 'unknown');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteInjection(id);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Erreur suppression injection [code]:', err?.code || 'unknown');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFrenchFullDate = (date) => {
    if (!date) return '-';
    const str = format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* En-tête avec Titre et Bouton Export PDF */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Historique des injections
          </h2>
          <p className="text-xs text-slate-500">
            {injections.length} injection{injections.length > 1 ? 's' : ''} enregistrée{injections.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Bouton Exporter en PDF */}
        <button
          onClick={handleExportPDF}
          disabled={injections.length === 0 || isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span>📄 Exporter en PDF</span>
        </button>
      </div>

      {/* État de chargement */}
      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Chargement de votre carnet...</p>
        </div>
      )}

      {/* État vide si aucune injection */}
      {!loading && injections.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-xs my-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Aucune injection enregistrée</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Votre carnet est prêt. Dès votre première prise de VVG, notez-la pour commencer le suivi médical.
            </p>
          </div>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Noter ma première injection</span>
          </Link>
        </div>
      )}

      {/* Liste Chronologique des Cartes */}
      {!loading && injections.length > 0 && (
        <div className="space-y-3">
          {injections.map((inj, index) => {
            const zoneInfo = getZoneInfo(inj.zone);
            const isExpPassed = inj.expirationDate ? isPast(inj.expirationDate) : false;

            return (
              <div
                key={inj.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                {/* Ligne 1 : Date formatée & Badge Zone */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      #{injections.length - index}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {formatFrenchFullDate(inj.date)}
                      </h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Enregistré le {format(inj.createdAt, 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {/* Badge Zone coloré */}
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: `${zoneInfo.color}15`,
                      color: zoneInfo.color,
                      border: `1px solid ${zoneInfo.color}40`,
                    }}
                  >
                    <span>Zone {inj.zone}</span>
                    <span className="text-[10px] font-medium opacity-80">({zoneInfo.shortName})</span>
                  </span>
                </div>

                {/* Ligne 2 : Détails médicaux (Lot & Expiration) */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                  {/* Numéro de Lot */}
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block leading-tight">N° de Lot</span>
                      <span className="font-mono font-bold text-slate-900 uppercase">
                        {inj.lotNumber || 'Non renseigné'}
                      </span>
                    </div>
                  </div>

                  {/* Date d'expiration */}
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block leading-tight">Expiration</span>
                      <span className={`font-semibold ${isExpPassed ? 'text-amber-700 font-bold' : 'text-slate-800'}`}>
                        {inj.expirationDate ? format(inj.expirationDate, 'dd/MM/yyyy', { locale: fr }) : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ligne 3 : Actions et Confirmation de suppression */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Site : {zoneInfo.name}
                  </span>

                  {confirmDeleteId === inj.id ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in">
                      <span className="text-[11px] text-red-600 font-medium">Confirmer ?</span>
                      <button
                        onClick={() => handleDelete(inj.id)}
                        disabled={deletingId === inj.id}
                        className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                      >
                        {deletingId === inj.id ? '...' : 'Supprimer'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs hover:bg-slate-200 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(inj.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer cette injection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
