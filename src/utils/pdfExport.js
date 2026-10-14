import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getZoneInfo } from './zoneLogic';

/**
 * Exporte l'historique complet des injections au format PDF médical
 * @param {Array} injections - Liste chronologique des injections
 * @param {Object} preferences - Préférences patient (intervalle, etc.)
 * @param {Object} user - Données de l'utilisateur connecté
 */
export function exportInjectionsToPDF(injections, preferences, user) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [37, 99, 235]; // #2563eb
  const secondaryColor = [22, 163, 74]; // #16a34a
  const darkTextColor = [15, 23, 42]; // #0f172a
  const lightBgColor = [248, 250, 252]; // #f8fafc

  // En-tête Médical avec bandeau supérieur
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SUIVI MÉDICAL DU TRAITEMENT VYVGART', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text("Carnet de traçabilité d'injections sous-cutanées", 140, 14, { align: 'right' });

  // Informations patient et relevé
  doc.setTextColor(...darkTextColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations du patient & Traitement :', 14, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const patientEmail = user?.email || 'Patient personnel';
  doc.text(`Identifiant Patient : ${patientEmail}`, 14, 38);
  doc.text(`Date d'émission : ${format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}`, 14, 44);
  doc.text(`Protocole de fréquence : Tous les ${preferences?.intervalDays || 7} jours`, 14, 50);

  // Cartouche statistique à droite
  doc.setFillColor(...lightBgColor);
  doc.roundedRect(125, 27, 71, 26, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('SYNTHÈSE DU SUIVI', 130, 34);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkTextColor);
  doc.text(`Total injections notées : ${injections.length}`, 130, 41);
  const lastInjDate = injections.length > 0 && injections[0].date
    ? format(injections[0].date, 'dd/MM/yyyy', { locale: fr })
    : 'Aucune';
  doc.text(`Dernière injection : ${lastInjDate}`, 130, 48);

  // Ligne de séparation
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 57, 196, 57);

  // Préparation des lignes de la table
  const tableRows = injections.map((inj, index) => {
    const num = injections.length - index;
    const dateStr = inj.date ? format(inj.date, "dd/MM/yyyy", { locale: fr }) : '-';
    const zoneInfo = getZoneInfo(inj.zone);
    const expDateStr = inj.expirationDate ? format(inj.expirationDate, 'dd/MM/yyyy', { locale: fr }) : '-';

    return [
      `#${num}`,
      dateStr,
      `Zone ${inj.zone} (${zoneInfo.shortName})`,
      inj.lotNumber || 'Non renseigné',
      expDateStr,
      'Conforme'
    ];
  });

  // Tableau avec autotable
  autoTable(doc, {
    startY: 62,
    head: [['N°', 'Date', 'Site (Quadrant)', 'N° de Lot', 'Date Expiration', 'Traçabilité']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkTextColor,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 44 },
      3: { cellWidth: 38 },
      4: { cellWidth: 30 },
      5: { cellWidth: 20, halign: 'center' },
    },
    didDrawPage: (data) => {
      // Pied de page légal et médical
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Ce relevé est un document de suivi personnel destiné à être partagé avec votre médecin traitant ou spécialiste.",
        14,
        287
      );
      doc.text(
        `Page ${data.pageNumber} sur ${pageCount} — Application Suivi VYVGART`,
        196,
        287,
        { align: 'right' }
      );
    },
  });

  // Sauvegarde et téléchargement du PDF
  const filename = `suivi_injections_VYVGART_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}
