/**
 * SyndicBloc - Default Structure & Initial Seed Data
 * Immeuble de 8 Étages (RDC + 7 Étages), 3 appartements par étage = 24 appartements
 * Taux mensuel = 500 DA par appartement (Total 12 000 DA)
 */

const FLOORS_CONFIG = [
  { floor: 7, name: "7ème Étage", apartments: [22, 23, 24] },
  { floor: 6, name: "6ème Étage", apartments: [19, 20, 21] },
  { floor: 5, name: "5ème Étage", apartments: [16, 17, 18] },
  { floor: 4, name: "4ème Étage", apartments: [13, 14, 15] },
  { floor: 3, name: "3ème Étage", apartments: [10, 11, 12] },
  { floor: 2, name: "2ème Étage", apartments: [7, 8, 9] },
  { floor: 1, name: "1er Étage",  apartments: [4, 5, 6] },
  { floor: 0, name: "RDC (Rez-de-chaussée)", apartments: [1, 2, 3] },
];

const DEFAULT_RESIDENTS = [
  // RDC
  { id: 1, floor: 0, floorName: "RDC", name: "M. Benali", phone: "0550 12 34 56", note: "Propriétaire" },
  { id: 2, floor: 0, floorName: "RDC", name: "Famille Mansouri", phone: "0661 23 45 67", note: "" },
  { id: 3, floor: 0, floorName: "RDC", name: "M. Khelifi", phone: "0770 34 56 78", note: "" },
  // 1er Étage
  { id: 4, floor: 1, floorName: "1er Étage", name: "Mme. Bouzid", phone: "0555 45 67 89", note: "" },
  { id: 5, floor: 1, floorName: "1er Étage", name: "Dr. Amrani", phone: "0662 56 78 90", note: "" },
  { id: 6, floor: 1, floorName: "1er Étage", name: "Famille Saidi", phone: "0771 67 89 01", note: "" },
  // 2ème Étage
  { id: 7, floor: 2, floorName: "2ème Étage", name: "M. Belhadj", phone: "0551 78 90 12", note: "" },
  { id: 8, floor: 2, floorName: "2ème Étage", name: "Mme. Cherif", phone: "0663 89 01 23", note: "" },
  { id: 9, floor: 2, floorName: "2ème Étage", name: "Famille Taleb", phone: "0772 90 12 34", note: "" },
  // 3ème Étage
  { id: 10, floor: 3, floorName: "3ème Étage", name: "M. Zerrouki", phone: "0552 01 23 45", note: "" },
  { id: 11, floor: 3, floorName: "3ème Étage", name: "Famille Benaissa", phone: "0664 12 34 56", note: "" },
  { id: 12, floor: 3, floorName: "3ème Étage", name: "M. Haddad", phone: "0773 23 45 67", note: "" },
  // 4ème Étage
  { id: 13, floor: 4, floorName: "4ème Étage", name: "Mme. Larbi", phone: "0553 34 56 78", note: "" },
  { id: 14, floor: 4, floorName: "4ème Étage", name: "M. Guettaf", phone: "0665 45 67 89", note: "" },
  { id: 15, floor: 4, floorName: "4ème Étage", name: "Famille Meziane", phone: "0774 56 78 90", note: "" },
  // 5ème Étage
  { id: 16, floor: 5, floorName: "5ème Étage", name: "M. Chaouch", phone: "0554 67 89 01", note: "" },
  { id: 17, floor: 5, floorName: "5ème Étage", name: "Famille Rahmani", phone: "0666 78 90 12", note: "" },
  { id: 18, floor: 5, floorName: "5ème Étage", name: "Mme. Allouache", phone: "0775 89 01 23", note: "" },
  // 6ème Étage
  { id: 19, floor: 6, floorName: "6ème Étage", name: "M. Ouali", phone: "0556 90 12 34", note: "" },
  { id: 20, floor: 6, floorName: "6ème Étage", name: "Famille Ait-Ahmed", phone: "0667 01 23 45", note: "" },
  { id: 21, floor: 6, floorName: "6ème Étage", name: "M. Mebarki", phone: "0776 12 34 56", note: "" },
  // 7ème Étage
  { id: 22, floor: 7, floorName: "7ème Étage", name: "Mme. Toumi", phone: "0557 23 45 67", note: "" },
  { id: 23, floor: 7, floorName: "7ème Étage", name: "Famille Boudiaf", phone: "0668 34 56 78", note: "" },
  { id: 24, floor: 7, floorName: "7ème Étage", name: "M. Brahimi", phone: "0777 45 67 89", note: "" },
];

const INITIAL_DEMO_EXPENSES_OCTOBER = [
  { id: "exp_1", description: "Femme de ménage (Octobre)", amount: 4000, date: "2026-10-04", category: "Nettoyage" },
  { id: "exp_2", description: "Achat ampoules LED pour les paliers", amount: 1500, date: "2026-10-06", category: "Électricité" }
];
