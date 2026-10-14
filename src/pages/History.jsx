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
  Loader2,
  Pencil,
  X,
  Check
} from 'lucide-react';

export default function History() {
  const { injections, preferences, deleteInjection, updateInjection, loading } = useInjections();
  const { user } = useAuth();

  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // État pour la modification d'une injection
  const [editingInjection, setEditingInjection] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editZone, setEditZone] = useState(1);
  const [editLotNumber, setEditLotNumber] = useState('');
  const [editExpirationDate, setEditExpirationDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const startEditing = (inj) => {
    setEditingInjection(inj);
    try {
      setEditDate(inj.date ? format(inj.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    } catch {
      setEditDate(format(new Date(), 'yyyy-MM-dd'));
    }
    setEditZone(Number(inj.zone) || 1);
    setEditLotNumber(inj.lotNumber || '');
    try {
      setEditExpirationDate(inj.expirationDate ? format(inj.expirationDate, 'yyyy-MM-dd') : '');
    } catch {
      setEditExpirationDate('');
    }
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingInjection(null);
    setEditError(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingInjection) return;
    if (!editLotNumber.trim()) {
      setEditError('Veuillez renseigner un numéro de lot pour la traçabilité.');
      return;
    }
    if (!editExpirationDate) {
      setEditError("Veuillez renseigner une date d'expiration.");
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      await updateInjection(editingInjection.id, {
        date: new Date(editDate + 'T12:00:00'),
        zone: Number(editZone),
        lotNumber: editLotNumber.trim().toUpperCase(),
        expirationDate: new Date(editExpirationDate + 'T12:00:00'),
      });
      setEditingInjection(null);
    } catch (err) {
      console.error('Erreur modification injection [code]:', err?.code || 'unknown');
      setEditError("Impossible de modifier l'injection. Veuillez vérifier votre connexion.");
    } finally {
      setIsSaving(false);
    }
  };

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
    const str = format(date, "EEEE d MMMM yyyy", { locale: fr });
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
              Votre carnet est prêt. Dès votre première prise de VYVGART, notez-la pour commencer le suivi médical.
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

                {/* Ligne 3 : Actions, Modification et Confirmation de suppression */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Site : {zoneInfo.name}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Bouton Modifier */}
                    <button
                      onClick={() => startEditing(inj)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Modifier cette injection"
                      aria-label="Modifier cette injection"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Bouton / Confirmation Supprimer */}
                    {confirmDeleteId === inj.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in">
                        <span className="text-[11px] text-red-600 font-medium">Confirmer ?</span>
                        <button
                          onClick={() => handleDelete(inj.id)}
                          disabled={deletingId === inj.id}
                          className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          {deletingId === inj.id ? '...' : 'Supprimer'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(inj.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer cette injection"
                        aria-label="Supprimer cette injection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal interactif de modification d'une injection */}
      {editingInjection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Modifier l'injection</h3>
                  <p className="text-[11px] text-slate-500">Mettre à jour les données de traçabilité</p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Date de l'injection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Date de l'injection
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm font-medium bg-slate-50/50 outline-none"
                />
              </div>

              {/* Zone d'injection (Quadrants 1, 2, 3, 4) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Zone d'injection (Quadrant)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((zId) => {
                    const info = getZoneInfo(zId);
                    const isSelected = editZone === zId;
                    return (
                      <button
                        key={zId}
                        type="button"
                        onClick={() => setEditZone(zId)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 font-bold shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">Zone {zId}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">{info.shortName}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Numéro de Lot */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Numéro de Lot (Lot N°)
                </label>
                <input
                  type="text"
                  value={editLotNumber}
                  onChange={(e) => setEditLotNumber(e.target.value.toUpperCase())}
                  required
                  maxLength={50}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm font-mono uppercase bg-slate-50/50 outline-none"
                />
              </div>

              {/* Date d'expiration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Date d'expiration
                </label>
                <input
                  type="date"
                  value={editExpirationDate}
                  onChange={(e) => setEditExpirationDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm font-medium bg-slate-50/50 outline-none"
                />
              </div>

              {/* Boutons d'action */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Enregistrer les modifications</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
